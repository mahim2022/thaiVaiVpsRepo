#!/usr/bin/env node

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: headers(init.headers || {}),
      signal: controller.signal,
    });

    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text };
    }

    if (!response.ok) {
      if (response.status >= 400 && response.status < 500) metrics.http4xx += 1;
      if (response.status >= 500) metrics.http5xx += 1;
      const message = body?.message || body?.error || JSON.stringify(body);
      throw new Error(`${response.status} ${response.statusText} | ${message}`);
    }

    return body;
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

async function getRegionId() {
  const body = await requestJson("/store/regions", { method: "GET" });
  const regionId = body?.regions?.[0]?.id;
  if (!regionId) {
    throw new Error("No region found. Seed data is likely missing.");
  }
  return regionId;
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

async function runOneFlow(regionId) {
  const started = Date.now();

  try {
    const productsRes = await requestJson(`/store/products?limit=${PRODUCTS_LIMIT}`, { method: "GET" });
    const products = productsRes?.products || [];
    if (!products.length) {
      metrics.browseFail += 1;
      throw new Error("No products returned from /store/products");
    }
    metrics.browseOk += 1;

    const product = pickRandom(products);
    const variant = product?.variants?.find((v) => !!v?.id);
    if (!variant?.id) {
      metrics.browseFail += 1;
      throw new Error("Selected product has no variants");
    }

    const cartRes = await requestJson("/store/carts", {
      method: "POST",
      body: JSON.stringify({ region_id: regionId }),
    });
    const cartId = cartRes?.cart?.id;
    if (!cartId) {
      metrics.cartCreateFail += 1;
      throw new Error("Cart creation returned no cart id");
    }
    metrics.cartCreateOk += 1;

    await requestJson(`/store/carts/${cartId}/line-items`, {
      method: "POST",
      body: JSON.stringify({ variant_id: variant.id, quantity: 1 }),
    });
    metrics.addLineItemOk += 1;

    if (CHECKOUT_ATTEMPT) {
      try {
        await requestJson(`/store/carts/${cartId}/complete`, { method: "POST" });
        metrics.checkoutAttemptOk += 1;
      } catch {
        // Payment/shipping may not be fully configured; track as checkout-attempt failure.
        metrics.checkoutAttemptFail += 1;
      }
    }

    metrics.completedFlows += 1;
    metrics.flowDurationsMs.push(Date.now() - started);
  } catch {
    metrics.failedFlows += 1;
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

async function worker(deadlineTs, regionId) {
  while (Date.now() < deadlineTs) {
    await runOneFlow(regionId);
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

  const regionId = await getRegionId();
  console.log(`Using region: ${regionId}`);

  const deadlineTs = Date.now() + DURATION_SECONDS * 1000;
  const workers = Array.from({ length: CONCURRENCY }, () => worker(deadlineTs, regionId));

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
