import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

type PublishableApiKey = {
  id: string;
};

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map(
            (currency) => {
              return {
                currency_code: currency.currency_code,
                is_default: currency.is_default ?? false,
              };
            }
          ),
        },
      };
    });

    const stores = updateStoresStep(normalizedInput);

    return new WorkflowResponse(stores);
  }
);

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  // Bangladesh only setup
  const countries = ["bd"];

  logger.info("🇧🇩 Seeding Bangladesh-only demo data...");
  const [store] = await storeModuleService.listStores();
  if (!store) {
    throw new Error("No store found. Run initial Medusa setup before seeding.");
  }

  // ==================== SALES CHANNEL ====================
  logger.info("📦 Creating Bangladesh Sales Channel...");
  let bangladeshSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Bangladesh Online Store",
  });

  if (!bangladeshSalesChannel.length) {
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Bangladesh Online Store",
          },
        ],
      },
    });
    bangladeshSalesChannel = salesChannelResult;
  }

  const bangladeshSalesChannelId = bangladeshSalesChannel[0]?.id;
  if (!bangladeshSalesChannelId) {
    throw new Error("Failed to create Bangladesh Sales Channel.");
  }
  logger.info(`✅ Bangladesh Sales Channel: ${bangladeshSalesChannelId}`);

  // ==================== CURRENCIES ====================
  logger.info("💱 Adding BDT currency to store...");
  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [
        {
          currency_code: "bdt",
          is_default: true,
        },
      ],
    },
  });
  logger.info("✅ BDT currency added.");

  // ==================== DEFAULT SALES CHANNEL ====================
  logger.info("📦 Ensuring default sales channel exists...");
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "Default Sales Channel",
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  const defaultSalesChannelId = defaultSalesChannel[0]?.id;
  if (!defaultSalesChannelId) {
    throw new Error("Failed to resolve Default Sales Channel.");
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: defaultSalesChannelId,
      },
    },
  });
  logger.info(`✅ Default Sales Channel: ${defaultSalesChannelId}`);

  // ==================== REGION ====================
  logger.info("🌍 Creating Bangladesh region...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Bangladesh",
          currency_code: "bdt",
          countries,
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const region = regionResult[0];
  if (!region) {
    throw new Error("Failed to create Bangladesh region.");
  }
  logger.info(`✅ Bangladesh Region: ${region.id}`);

  // ==================== TAX REGIONS ====================
  logger.info("🏛️ Setting up tax region for Bangladesh...");
  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code,
      provider_id: "tp_system",
    })),
  });
  logger.info("✅ Tax region configured.");

  // ==================== STOCK LOCATION ====================
  logger.info("📍 Creating Dhaka Warehouse stock location...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Dhaka Warehouse",
          address: {
            city: "Dhaka",
            country_code: "BD",
            address_1: "123 Main Street",
          },
        },
      ],
    },
  });
  const stockLocation = stockLocationResult[0];
  if (!stockLocation) {
    throw new Error("Failed to create Dhaka Warehouse.");
  }
  logger.info(`✅ Dhaka Warehouse: ${stockLocation.id}`);

  // Set as default location
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: stockLocation.id,
      },
    },
  });

  // ==================== SHIPPING PROFILE ====================
  logger.info("🚚 Creating Bangladesh Shipping Profile...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [
            {
              name: "Bangladesh Shipping Profile",
              type: "default",
            },
          ],
        },
      });
    shippingProfile = shippingProfileResult[0];
  }

  if (!shippingProfile) {
    throw new Error("Failed to create shipping profile.");
  }
  logger.info(`✅ Shipping Profile: ${shippingProfile.id}`);

  // ==================== FULFILLMENT SET ====================
  logger.info("📦 Creating Bangladesh fulfillment set...");
  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Dhaka Warehouse Delivery",
    type: "shipping",
    service_zones: [
      {
        name: "Bangladesh",
        geo_zones: [
          {
            country_code: "bd",
            type: "country",
          },
        ],
      },
    ],
  });

  const fulfillmentServiceZoneId = fulfillmentSet.service_zones?.[0]?.id;
  if (!fulfillmentServiceZoneId) {
    throw new Error("Failed to create fulfillment service zone.");
  }
  logger.info(`✅ Fulfillment Set: ${fulfillmentSet.id}`);
  logger.info(`✅ Service Zone (BD): ${fulfillmentServiceZoneId}`);

  // ==================== LINKAGES ====================
  logger.info("🔗 Creating fulfillment linkages...");

  // Link: Stock Location ↔ Fulfillment Provider (Manual)
  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });
  logger.info("✅ Linked: Stock Location ↔ Manual Fulfillment Provider");

  // Link: Stock Location ↔ Fulfillment Set
  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });
  logger.info("✅ Linked: Dhaka Warehouse ↔ Bangladesh Fulfillment Set");

  // Link: Stock Location ↔ Bangladesh Sales Channel
  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [bangladeshSalesChannelId],
    },
  });
  logger.info("✅ Linked: Dhaka Warehouse ↔ Bangladesh Sales Channel");

  // Also link stock location to default sales channel
  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannelId],
    },
  });
  logger.info("✅ Linked: Dhaka Warehouse ↔ Default Sales Channel");

  // ==================== SHIPPING OPTIONS ====================
  logger.info("🚚 Creating Bangladesh shipping options...");
  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentServiceZoneId,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Delivery in 5-7 business days.",
          code: "standard",
        },
        prices: [
          {
            currency_code: "bdt",
            amount: 15000, // ৳150 (in smallest unit)
          },
          {
            region_id: region.id,
            amount: 15000,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Express Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentServiceZoneId,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Delivery in 1-2 business days.",
          code: "express",
        },
        prices: [
          {
            currency_code: "bdt",
            amount: 30000, // ৳300 (in smallest unit)
          },
          {
            region_id: region.id,
            amount: 30000,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  });
  logger.info("✅ Shipping options created: Standard (৳150) & Express (৳300)");

  // ==================== PUBLISHABLE API KEY ====================
  logger.info("🔑 Setting up publishable API key...");
  let publishableApiKey: PublishableApiKey | null = null;
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["id"],
    filters: {
      type: "publishable",
    },
  });

  publishableApiKey = (data?.[0] as PublishableApiKey | undefined) ?? null;

  if (!publishableApiKey) {
    const {
      result: [publishableApiKeyResult],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Webshop",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });

    publishableApiKey = { id: publishableApiKeyResult.id };
  }

  if (!publishableApiKey) {
    throw new Error("Failed to create publishable API key.");
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [bangladeshSalesChannelId],
    },
  });
  logger.info(`✅ API Key linked to Bangladesh Sales Channel`);

  // ==================== PRODUCT CATEGORIES ====================
  logger.info("📚 Creating product categories...");
  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        {
          name: "Shirts",
          is_active: true,
        },
        {
          name: "Sweatshirts",
          is_active: true,
        },
        {
          name: "Pants",
          is_active: true,
        },
      ],
    },
  });

  const categoryIdByName = new Map(categoryResult.map((cat) => [cat.name, cat.id]));
  const getCategoryIdOrThrow = (name: string) => {
    const categoryId = categoryIdByName.get(name);
    if (!categoryId) {
      throw new Error(`Missing required category: ${name}`);
    }
    return categoryId;
  };

  // ==================== PRODUCTS ====================
  logger.info("📦 Creating products with Bangladesh pricing...");
  const { result: productResult } = await createProductsWorkflow(
    container
  ).run({
    input: {
      products: [
        {
          title: "Bangladesh T-Shirt",
          category_ids: [getCategoryIdOrThrow("Shirts")],
          description: "Classic cotton T-shirt available in Bangladesh.",
          handle: "bd-t-shirt",
          weight: 400,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
            {
              title: "Color",
              values: ["Black", "White"],
            },
          ],
          variants: [
            {
              title: "S / Black",
              sku: "BD-SHIRT-S-BLACK",
              options: {
                Size: "S",
                Color: "Black",
              },
              prices: [
                {
                  amount: 100000, // ৳1000 (in smallest unit)
                  currency_code: "bdt",
                },
              ],
            },
            {
              title: "S / White",
              sku: "BD-SHIRT-S-WHITE",
              options: {
                Size: "S",
                Color: "White",
              },
              prices: [
                {
                  amount: 100000,
                  currency_code: "bdt",
                },
              ],
            },
            {
              title: "M / Black",
              sku: "BD-SHIRT-M-BLACK",
              options: {
                Size: "M",
                Color: "Black",
              },
              prices: [
                {
                  amount: 100000,
                  currency_code: "bdt",
                },
              ],
            },
            {
              title: "M / White",
              sku: "BD-SHIRT-M-WHITE",
              options: {
                Size: "M",
                Color: "White",
              },
              prices: [
                {
                  amount: 100000,
                  currency_code: "bdt",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: bangladeshSalesChannelId,
            },
          ],
        },
        {
          title: "Bangladesh Sweatshirt",
          category_ids: [getCategoryIdOrThrow("Sweatshirts")],
          description: "Cozy sweatshirt for Bangladesh market.",
          handle: "bd-sweatshirt",
          weight: 500,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
          ],
          variants: [
            {
              title: "S",
              sku: "BD-SWEATSHIRT-S",
              options: {
                Size: "S",
              },
              prices: [
                {
                  amount: 150000, // ৳1500 (in smallest unit)
                  currency_code: "bdt",
                },
              ],
            },
            {
              title: "M",
              sku: "BD-SWEATSHIRT-M",
              options: {
                Size: "M",
              },
              prices: [
                {
                  amount: 150000,
                  currency_code: "bdt",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: bangladeshSalesChannelId,
            },
          ],
        },
        {
          title: "Bangladesh Sweatpants",
          category_ids: [getCategoryIdOrThrow("Pants")],
          description: "Comfortable sweatpants for Bangladesh market.",
          handle: "bd-sweatpants",
          weight: 600,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-front.png",
            },
          ],
          options: [
            {
              title: "Size",
              values: ["S", "M", "L", "XL"],
            },
          ],
          variants: [
            {
              title: "S",
              sku: "BD-SWEATPANTS-S",
              options: {
                Size: "S",
              },
              prices: [
                {
                  amount: 120000, // ৳1200 (in smallest unit)
                  currency_code: "bdt",
                },
              ],
            },
            {
              title: "M",
              sku: "BD-SWEATPANTS-M",
              options: {
                Size: "M",
              },
              prices: [
                {
                  amount: 120000,
                  currency_code: "bdt",
                },
              ],
            },
          ],
          sales_channels: [
            {
              id: bangladeshSalesChannelId,
            },
          ],
        },
      ],
    },
  });

  logger.info(`✅ Created ${productResult.length} products`);

  // ==================== INVENTORY ====================
  logger.info("📊 Setting inventory levels for products...");
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const inventoryLevels: CreateInventoryLevelInput[] = inventoryItems.map(
    (inventoryItem) => ({
      inventory_item_id: inventoryItem.id,
      location_id: stockLocation.id,
      stocked_quantity: 100,
    })
  );

  if (inventoryLevels.length > 0) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: inventoryLevels,
      },
    });
    logger.info(`✅ Set inventory for ${inventoryLevels.length} variants`);
  }

  logger.info("✨ Bangladesh seeding complete!");
  logger.info("📋 Summary:");
  logger.info(`   Region: Bangladesh (${region.id})`);
  logger.info(`   Currency: BDT`);
  logger.info(`   Sales Channel: ${bangladeshSalesChannelId}`);
  logger.info(`   Warehouse: Dhaka (${stockLocation.id})`);
  logger.info(`   Shipping Profile: ${shippingProfile.id}`);
  logger.info(`   Fulfillment Set: ${fulfillmentSet.id}`);
  logger.info(`   Products: ${productResult.length} with inventory in Dhaka Warehouse`);
  logger.info(`   Ready to test checkout! 🎉`);
}
