#!/usr/bin/env node

import { randomUUID } from "node:crypto";

/*
 * Transaction stress harness for Medusa Store API.
 * Simulates concurrent shoppers doing browse -> cart -> line item -> optional checkout attempt.
 */

const BASE_URL = process.env.STRESS_BASE_URL || "http://localhost:9000";
const CONCURRENCY = Number(process.env.STRESS_CONCURRENCY || 20);
const DURATION_SECONDS = Number(process.env.STRESS_DURATION_SECONDS || 900);
const PRODUCTS_LIMIT = Number(process.env.STRESS_PRODUCTS_LIMIT || 24);
const REQUEST_TIMEOUT_MS = Number(process.env.STRESS_REQUEST_TIMEOUT_MS || 15000);
const CHECKOUT_ATTEMPT = (process.env.STRESS_CHECKOUT_ATTEMPT || "false").toLowerCase() === "true";
const PUBLISHABLE_KEY = process.env.STRESS_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const DEBUG = (process.env.STRESS_DEBUG || "false").toLowerCase() === "true";

const FIRST_NAMES = ["Alex", "Sam", "Jamie", "Taylor", "Jordan", "Casey", "Morgan", "Riley"];
const LAST_NAMES = ["Nguyen", "Patel", "Garcia", "Brown", "Kim", "Lopez", "Davis", "Wilson"];
const STREET_NAMES = ["Maple", "Oak", "Cedar", "Pine", "Elm", "Birch", "Willow", "Sunset"];
const CITIES = ["Austin", "Seattle", "Chicago", "Denver", "Atlanta", "Boston", "Portland", "Phoenix"];
const STABLE_PRODUCT_TITLES = new Set(["Kawami Matcha Powder", "Thai Green Cup Noodle"]);

const metrics = {
  startedAt: new Date(),
  completedFlows: 0,
  failedFlows: 0,
  browseOk: 0,
  browseFail: 0,
  cartCreateOk: 0,
  cartCreateFail: 0,
  addLineItemOk: 0,
  addLineItemFail: 0,
  checkoutAttemptOk: 0,
  checkoutAttemptFail: 0,
  http4xx: 0,
  http5xx: 0,
  networkErrors: 0,
  flowDurationsMs: [],
};

let checkoutCompletionQueue = Promise.resolve();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function headers(extra = {}) {
  const h = {
    "content-type": "application/json",
    ...extra,
  };

  if (PUBLISHABLE_KEY) {
    h["x-publishable-api-key"] = PUBLISHABLE_KEY;
  }

  return h;
}

async function requestJson(path, init = {}) {
  const { timeoutMs = REQUEST_TIMEOUT_MS, ...fetchInit } = init;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const requestBody =
    init.body && typeof init.body === "object" ? JSON.stringify(init.body) : init.body;

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...fetchInit,
      body: requestBody,
      headers: headers(init.headers || {}),
      signal: controller.signal,
    });

    const text = await response.text();
    let responseBody;
    try {
      responseBody = text ? JSON.parse(text) : {};
    } catch {
      responseBody = { raw: text };
    }

    if (!response.ok) {
      if (response.status >= 400 && response.status < 500) metrics.http4xx += 1;
      if (response.status >= 500) metrics.http5xx += 1;
      const message =
        responseBody?.message || responseBody?.error || JSON.stringify(responseBody);
      throw new Error(`${response.status} ${response.statusText} | ${message}`);
    }

    return responseBody;
  } catch (error) {
    if (error.name === "AbortError") {
      metrics.networkErrors += 1;
      throw new Error(`Request timeout after ${REQUEST_TIMEOUT_MS}ms for ${path}`);
    }

    if (!/\d{3}\s/.test(error.message || "")) {
      metrics.networkErrors += 1;
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function getRegionContext() {
  const regionsRes = await requestJson("/store/regions", { method: "GET" });
  const region = regionsRes?.regions?.[0];
  const regionId = region?.id;
  if (!regionId) {
    throw new Error("No region found. Seed data is likely missing.");
  }

  const countryCode = region?.countries?.[0]?.iso_2 || "us";
  return { regionId, countryCode };
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function pickStableProduct(products) {
  const stableProducts = products.filter((product) => STABLE_PRODUCT_TITLES.has(product?.title))
  return pickRandom(stableProducts.length ? stableProducts : products)
}

function createCheckoutAddress(countryCode, flowId) {
  const normalizedCountry = (countryCode || "us").toLowerCase();
  const firstName = pickRandom(FIRST_NAMES);
  const lastName = pickRandom(LAST_NAMES);
  const city = pickRandom(CITIES);
  const street = pickRandom(STREET_NAMES);
  const suffix = flowId.slice(-6);

  return {
    first_name: firstName,
    last_name: lastName,
    address_1: `${randomInt(100, 999)} ${street} St`,
    address_2: `Unit ${randomInt(1, 40)}`,
    company: "",
    postal_code: `${randomInt(10000, 99999)}`,
    city,
    country_code: normalizedCountry,
    province: normalizedCountry === "us" ? pickRandom(["CA", "NY", "TX", "WA", "IL"]) : "",
    phone: `+1${randomInt(2000000000, 9999999999)}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${suffix}@stress.test`,
  }
}

async function updateCartCheckoutDetails(cartId, countryCode, flowId) {
  const address = createCheckoutAddress(countryCode, flowId)

  await requestJson(`/store/carts/${cartId}`, {
    method: "POST",
    body: {
      email: address.email,
      shipping_address: {
        first_name: address.first_name,
        last_name: address.last_name,
        address_1: address.address_1,
        address_2: address.address_2,
        company: address.company,
        postal_code: address.postal_code,
        city: address.city,
        country_code: address.country_code,
        province: address.province,
        phone: address.phone,
      },
      billing_address: {
        first_name: address.first_name,
        last_name: address.last_name,
        address_1: address.address_1,
        address_2: address.address_2,
        company: address.company,
        postal_code: address.postal_code,
        city: address.city,
        country_code: address.country_code,
        province: address.province,
        phone: address.phone,
      },
    },
  })

  return address
}

async function addShippingMethod(cartId) {
  const shippingOptionsRes = await requestJson(`/store/shipping-options?cart_id=${cartId}`, {
    method: "GET",
  })
  const shippingOptions = shippingOptionsRes?.shipping_options || []

  if (!shippingOptions.length) {
    throw new Error("No shipping options available for cart")
  }

  const shippingOption =
    shippingOptions.find((option) => option?.service_zone?.fulfillment_set?.type !== "pickup") ||
    shippingOptions[0]

  if (!shippingOption?.id) {
    throw new Error("Selected shipping option is missing an id")
  }

  await requestJson(`/store/carts/${cartId}/shipping-methods`, {
    method: "POST",
    body: { option_id: shippingOption.id },
  })

  return shippingOption
}

async function selectPaymentProvider(regionId) {
  const paymentProvidersRes = await requestJson(`/store/payment-providers?region_id=${regionId}`, {
    method: "GET",
  })
  const paymentProviders = paymentProvidersRes?.payment_providers || []

  if (!paymentProviders.length) {
    throw new Error("No payment providers available for region")
  }

  return (
    paymentProviders.find((provider) => provider?.id?.startsWith("pp_system_default")) ||
    paymentProviders[0]
  )
}

async function initializePaymentSession(cartId, providerId) {
  const paymentCollectionRes = await requestJson(`/store/payment-collections`, {
    method: "POST",
    body: { cart_id: cartId },
  })

  const paymentCollectionId = paymentCollectionRes?.payment_collection?.id

  if (!paymentCollectionId) {
    throw new Error("Payment collection creation returned no id")
  }

  const paymentCollection = await requestJson(
    `/store/payment-collections/${paymentCollectionId}/payment-sessions`,
    {
      method: "POST",
      body: { provider_id: providerId },
    }
  )

  return paymentCollection?.payment_collection
}

async function withCheckoutCompletionLock(task) {
  const previous = checkoutCompletionQueue
  let release
  checkoutCompletionQueue = new Promise((resolve) => {
    release = resolve
  })

  await previous

  try {
    return await task()
  } finally {
    release()
  }
}

async function completeCheckout(cartId, idempotencyKey) {
  const maxAttempts = 3

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const result = await requestJson(`/store/carts/${cartId}/complete`, {
        method: "POST",
        headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {},
        timeoutMs: Math.max(REQUEST_TIMEOUT_MS, 60000),
      })

      if (result?.type !== "order" || !result?.order?.id) {
        const message =
          result?.error?.message || result?.error || result?.message || "Checkout did not complete"
        throw new Error(message)
      }

      return result.order
    } catch (error) {
      const message = error?.message || ""
      const isConflict = message.includes("409 Conflict")
      const isRetryableServerError =
        message.includes("500 Internal Server Error") ||
        message.includes("502 Bad Gateway") ||
        message.includes("503 Service Unavailable") ||
        message.includes("504 Gateway Timeout")

      if ((isConflict || isRetryableServerError) && attempt < maxAttempts) {
        await sleep(250 * attempt)
        continue
      }

      throw error
    }
  }
}

async function runOneFlow(region) {
  const started = Date.now();
  const flowId = randomUUID();
  let currentStep = "browse-products";

  try {
    currentStep = "browse-products";
    const productsRes = await requestJson(`/store/products?limit=${PRODUCTS_LIMIT}`, { method: "GET" });
    const products = productsRes?.products || [];
    if (!products.length) {
      metrics.browseFail += 1;
      throw new Error("No products returned from /store/products");
    }
    metrics.browseOk += 1;

    const product = pickStableProduct(products);
    const variant = product?.variants?.find((v) => !!v?.id);
    if (DEBUG) {
      console.error(
        `[flow ${flowId}] product=${product?.title || product?.id || "unknown"} variant=${variant?.id || "unknown"}`
      );
    }
    if (!variant?.id) {
      metrics.browseFail += 1;
      throw new Error("Selected product has no variants");
    }

    currentStep = "create-cart";
    const cartRes = await requestJson("/store/carts", {
      method: "POST",
      body: { region_id: region.regionId },
    });
    const cartId = cartRes?.cart?.id;
    if (!cartId) {
      metrics.cartCreateFail += 1;
      throw new Error("Cart creation returned no cart id");
    }
    metrics.cartCreateOk += 1;

    currentStep = "add-line-item";
    await requestJson(`/store/carts/${cartId}/line-items`, {
      method: "POST",
      body: { variant_id: variant.id, quantity: 1 },
    });
    metrics.addLineItemOk += 1;

    if (CHECKOUT_ATTEMPT) {
      currentStep = "set-addresses";
      await updateCartCheckoutDetails(cartId, region.countryCode, flowId);
      currentStep = "add-shipping-method";
      const shippingOption = await addShippingMethod(cartId);
      currentStep = "init-payment-session";
      const provider = await selectPaymentProvider(region.regionId);
      if (DEBUG) {
        console.error(
          `[flow ${flowId}] shipping=${shippingOption?.id || "unknown"} provider=${provider?.id || "unknown"}`
        );
      }
      await initializePaymentSession(cartId, provider.id);
      await sleep(1000 + randomInt(0, 1000));
      currentStep = "complete-checkout";
      await withCheckoutCompletionLock(() => completeCheckout(cartId, flowId));
      metrics.checkoutAttemptOk += 1;
      metrics.completedFlows += 1;
      metrics.flowDurationsMs.push(Date.now() - started);
      return;
    }

    metrics.completedFlows += 1;
    metrics.flowDurationsMs.push(Date.now() - started);
  } catch (error) {
    metrics.failedFlows += 1;
    if (CHECKOUT_ATTEMPT) {
      metrics.checkoutAttemptFail += 1;
    }
    if (DEBUG) {
      console.error(`[flow ${flowId}] step=${currentStep} error=${error?.message || error}`);
    }
    const elapsed = Date.now() - started;
    if (elapsed > 0) metrics.flowDurationsMs.push(elapsed);
  }
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function worker(deadlineTs, region) {
  while (Date.now() < deadlineTs) {
    await runOneFlow(region);
    // Small jitter to avoid synchronized bursts.
    await sleep(Math.floor(Math.random() * 200));
  }
}

async function main() {
  console.log("========================================================");
  console.log(" Medusa Transaction Stress Test");
  console.log("========================================================");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Duration: ${DURATION_SECONDS}s`);
  console.log(`Products per browse request: ${PRODUCTS_LIMIT}`);
  console.log(`Checkout attempt: ${CHECKOUT_ATTEMPT ? "enabled" : "disabled"}`);
  console.log(`Publishable key header: ${PUBLISHABLE_KEY ? "provided" : "not provided"}`);
  console.log("");

  const region = await getRegionContext();
  console.log(`Using region: ${region.regionId}`);
  console.log(`Checkout country code: ${region.countryCode}`);
  if (CHECKOUT_ATTEMPT) {
    console.log("Checkout prerequisites: address + shipping method + payment session + complete");
    console.log("Payment provider preference: manual if available");
  }

  const deadlineTs = Date.now() + DURATION_SECONDS * 1000;
  const workers = Array.from({ length: CONCURRENCY }, () => worker(deadlineTs, region));

  await Promise.all(workers);

  const endedAt = new Date();
  const elapsedSeconds = Math.max(1, Math.floor((endedAt.getTime() - metrics.startedAt.getTime()) / 1000));
  const totalFlows = metrics.completedFlows + metrics.failedFlows;

  console.log("");
  console.log("===================== SUMMARY =====================");
  console.log(`Started at: ${metrics.startedAt.toISOString()}`);
  console.log(`Ended at:   ${endedAt.toISOString()}`);
  console.log(`Elapsed:    ${elapsedSeconds}s`);
  console.log(`Total flows: ${totalFlows}`);
  console.log(`Completed flows: ${metrics.completedFlows}`);
  console.log(`Failed flows:    ${metrics.failedFlows}`);
  console.log(`Flow success rate: ${totalFlows ? ((metrics.completedFlows / totalFlows) * 100).toFixed(2) : "0.00"}%`);
  console.log(`Flows per second: ${(totalFlows / elapsedSeconds).toFixed(2)}`);
  console.log("");
  console.log("Step counters:");
  console.log(`- Browse ok/fail: ${metrics.browseOk}/${metrics.browseFail}`);
  console.log(`- Cart create ok/fail: ${metrics.cartCreateOk}/${metrics.cartCreateFail}`);
  console.log(`- Add line item ok/fail: ${metrics.addLineItemOk}/${metrics.addLineItemFail}`);
  if (CHECKOUT_ATTEMPT) {
    console.log(`- Checkout attempt ok/fail: ${metrics.checkoutAttemptOk}/${metrics.checkoutAttemptFail}`);
  }
  console.log("");
  console.log("Errors:");
  console.log(`- HTTP 4xx: ${metrics.http4xx}`);
  console.log(`- HTTP 5xx: ${metrics.http5xx}`);
  console.log(`- Network/timeout: ${metrics.networkErrors}`);
  console.log("");
  console.log("Latency (flow duration):");
  console.log(`- p50: ${Math.round(percentile(metrics.flowDurationsMs, 50))}ms`);
  console.log(`- p95: ${Math.round(percentile(metrics.flowDurationsMs, 95))}ms`);
  console.log(`- p99: ${Math.round(percentile(metrics.flowDurationsMs, 99))}ms`);
  console.log("===================================================");

  // Fail process if critical failure rate is high.
  const failureRate = totalFlows ? metrics.failedFlows / totalFlows : 1;
  if (failureRate > 0.1) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Stress test failed to start:", error?.message || error);
  process.exit(1);
});
