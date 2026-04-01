import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import { createProductsWorkflow } from "@medusajs/medusa/core-flows";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

const TEST_PRODUCTS_COUNT = 500;
const BATCH_SIZE = 50; // Process in batches of 50 to avoid overwhelming the system
const IMAGES_PER_PRODUCT = 3;

// List of product image URLs (using publicly available images)
const PRODUCT_IMAGES = [
  "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png",
  "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-back.png",
  "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-front.png",
  "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-back.png",
  "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shirt-blue-front.png",
  "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shirt-blue-back.png",
];

// Helper function to download images
async function downloadImage(url: string, filename: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    }).on("error", reject);
  });
}

interface StressTestReport {
  startTime: Date;
  endTime?: Date;
  totalProductsAttempted: number;
  totalProductsCreated: number;
  totalProductsFailed: number;
  batchResults: BatchResult[];
  errors: string[];
  durationSeconds?: number;
  productsPerSecond?: number;
  storageUsedBytes?: number;
}

interface BatchResult {
  batchNumber: number;
  batchStartTime: Date;
  batchEndTime?: Date;
  productsInBatch: number;
  productsCreated: number;
  productsFailed: number;
  errors: string[];
  durationSeconds?: number;
}

export default async function stressTestProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info(`🔥 Starting stress test: ${TEST_PRODUCTS_COUNT} products with ${IMAGES_PER_PRODUCT} images each`);

  const report: StressTestReport = {
    startTime: new Date(),
    totalProductsAttempted: TEST_PRODUCTS_COUNT,
    totalProductsCreated: 0,
    totalProductsFailed: 0,
    batchResults: [],
    errors: [],
  };

  try {
    // Get required IDs for product creation
    logger.info("📋 Fetching required configuration...");
    const { data: regions } = await query.graph({
      entity: "region",
      fields: ["id"],
    });

    if (!regions || regions.length === 0) {
      throw new Error("No regions found. Run seed script first.");
    }

    const { data: shippingProfiles } = await query.graph({
      entity: "shipping_profile",
      fields: ["id"],
      filters: { type: "default" },
    });

    if (!shippingProfiles || shippingProfiles.length === 0) {
      throw new Error("No shipping profiles found. Run seed script first.");
    }

    const { data: categories } = await query.graph({
      entity: "product_category",
      fields: ["id", "name"],
    });

    const regionId = (regions[0] as any)?.id;
    const shippingProfileId = (shippingProfiles[0] as any)?.id;

    logger.info(`✓ Found region: ${regionId}`);
    logger.info(`✓ Found shipping profile: ${shippingProfileId}`);
    logger.info(`✓ Found ${categories?.length || 0} product categories`);

    // Process products in batches
    const totalBatches = Math.ceil(TEST_PRODUCTS_COUNT / BATCH_SIZE);

    for (let batch = 0; batch < totalBatches; batch++) {
      const batchStartIdx = batch * BATCH_SIZE;
      const batchEndIdx = Math.min(batchStartIdx + BATCH_SIZE, TEST_PRODUCTS_COUNT);
      const batchSize = batchEndIdx - batchStartIdx;

      const batchResult: BatchResult = {
        batchNumber: batch + 1,
        batchStartTime: new Date(),
        productsInBatch: batchSize,
        productsCreated: 0,
        productsFailed: 0,
        errors: [],
      };

      logger.info(`\n📦 Batch ${batchResult.batchNumber}/${totalBatches} (products ${batchStartIdx + 1}-${batchEndIdx})...`);

      // Generate batch of products
      const products = [];
      for (let i = batchStartIdx; i < batchEndIdx; i++) {
        const productNum = i + 1;
        const categoryIdx = productNum % (categories?.length || 1);
        const selectedCategoryId = (categories?.[categoryIdx] as any)?.id || categories?.[0]?.id;

        products.push({
          title: `Stress Test Product ${productNum}`,
          handle: `stress-test-product-${productNum}`,
          description: `This is product #${productNum} created during stress testing. Product contains ${IMAGES_PER_PRODUCT} images and variants.`,
          status: ProductStatus.PUBLISHED,
          category_ids: selectedCategoryId ? [selectedCategoryId] : [],
          shipping_profile_id: shippingProfileId,
          weight: Math.floor(Math.random() * 2000) + 100,
          // Select 3 random images for this product
          // Note: Medusa v2.13.5 handles external image URLs directly
          // Images are linked via URLs to AWS S3, no local file upload needed
          images: PRODUCT_IMAGES.slice(0, IMAGES_PER_PRODUCT).map((url) => ({
            url,
          })),
          options: [
            {
              title: "Size",
              values: ["XS", "S", "M", "L", "XL", "XXL"],
            },
            {
              title: "Color",
              values: ["Black", "White", "Red", "Blue"],
            },
          ],
          variants: generateVariants(productNum, regionId),
        });
      }

      // Create batch of products
      try {
        const { result: createdProducts } = await createProductsWorkflow(container).run({
          input: { products },
        });

        batchResult.productsCreated = createdProducts?.length || 0;
        batchResult.productsFailed = batchSize - (createdProducts?.length || 0);
        report.totalProductsCreated += batchResult.productsCreated;
        report.totalProductsFailed += batchResult.productsFailed;

        logger.info(`✓ Batch ${batch + 1} complete: ${batchResult.productsCreated}/${batchSize} products created`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error(`✗ Batch ${batch + 1} failed: ${errorMsg}`);
        batchResult.errors.push(errorMsg);
        batchResult.productsFailed = batchSize;
        report.totalProductsFailed += batchSize;
      }

      batchResult.batchEndTime = new Date();
      batchResult.durationSeconds = (batchResult.batchEndTime.getTime() - batchResult.batchStartTime.getTime()) / 1000;
      report.batchResults.push(batchResult);

      logger.info(`⏱️  Batch duration: ${batchResult.durationSeconds.toFixed(2)}s`);

      // Add breathing room between batches
      if (batch < totalBatches - 1) {
        logger.info("⏰ Waiting 5 seconds before next batch...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    // Final validation
    logger.info("\n📊 Validating created products...");
    const { data: allProducts } = await query.graph({
      entity: "product",
      fields: ["id", "title", "images"],
    });

    const generatedProducts = allProducts?.filter((p: any) => p.title.startsWith("Stress Test Product")) || [];
    logger.info(
      `✓ Database contains ${generatedProducts.length} stress test products`
    );

    // Verify image count
    let totalImagesInDb = 0;
    generatedProducts.forEach((p: any) => {
      totalImagesInDb += p.images?.length || 0;
    });
    logger.info(`✓ Total images in database: ${totalImagesInDb}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`❌ Test failed with error: ${errorMsg}`);
    report.errors.push(errorMsg);
  }

  // Finalize report
  report.endTime = new Date();
  report.durationSeconds = (report.endTime.getTime() - report.startTime.getTime()) / 1000;
  report.productsPerSecond = report.totalProductsCreated / report.durationSeconds;

  // Save report
  const reportPath = path.join("/tmp", `stress-test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print summary
  logger.info("\n═════════════════════════════════════════");
  logger.info("📈 STRESS TEST SUMMARY");
  logger.info("═════════════════════════════════════════");
  logger.info(`Total Duration: ${report.durationSeconds?.toFixed(2)}s`);
  logger.info(`Products Created: ${report.totalProductsCreated}/${report.totalProductsAttempted}`);
  logger.info(`Products Failed: ${report.totalProductsFailed}`);
  logger.info(`Throughput: ${report.productsPerSecond?.toFixed(2)} products/sec`);
  logger.info(`Success Rate: ${((report.totalProductsCreated / report.totalProductsAttempted) * 100).toFixed(2)}%`);

  if (report.errors.length > 0) {
    logger.error("\n❌ Errors encountered:");
    report.errors.forEach((err) => logger.error(`  - ${err}`));
  }

  logger.info(`\n📄 Full report saved to: ${reportPath}`);
  logger.info("═════════════════════════════════════════\n");
}

function generateVariants(productNum: number, regionId: string): any[] {
  const variants = [];
  const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
  const colors = ["Black", "White", "Red", "Blue"];

  // Create 2 size x 2 color = 4 variants per product (manageable)
  for (let s = 0; s < Math.min(sizes.length, 2); s++) {
    for (let c = 0; c < Math.min(colors.length, 2); c++) {
      const basePrice = 20 + (productNum % 100);
      variants.push({
        title: `${sizes[s]} / ${colors[c]}`,
        sku: `STRESS-${productNum}-${sizes[s]}-${colors[c]}`,
        options: {
          Size: sizes[s],
          Color: colors[c],
        },
        prices: [
          {
            amount: basePrice,
            currency_code: "eur",
          },
          {
            amount: Math.round(basePrice * 1.2),
            currency_code: "usd",
          },
        ],
      });
    }
  }

  return variants;
}
