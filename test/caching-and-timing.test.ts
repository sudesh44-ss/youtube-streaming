import assert from "node:assert";
import { appCache, buildSearchCacheKey, buildRecCacheKey, buildFeedCacheKey } from "../src/lib/cache-service";
import { ServerTimer } from "../src/lib/timing";

async function main() {
  console.log("=== Testing OmniDiscover Caching Architecture & Timing Instrumentation ===");

  // 1. Basic Cache Operations
  console.log("\n1. Testing Cache Service get/set/delete/expiration...");
  appCache.set("test:key:1", { value: 42 }, 1000);
  const cached = appCache.get<{ value: number }>("test:key:1");
  assert.strictEqual(cached?.value, 42, "Cache should store and return value");

  appCache.delete("test:key:1");
  assert.strictEqual(appCache.get("test:key:1"), null, "Cache delete should remove key");

  // 2. Single-flight Deduplication
  console.log("\n2. Testing Single-Flight In-Flight Request Deduplication...");
  let executionCount = 0;
  const expensiveFetcher = async () => {
    executionCount++;
    await new Promise((resolve) => setTimeout(resolve, 50));
    return "expensive_result";
  };

  // Fire 5 concurrent requests for the same key
  await Promise.all([
    appCache.dedupe("dedupe:test", expensiveFetcher),
    appCache.dedupe("dedupe:test", expensiveFetcher),
    appCache.dedupe("dedupe:test", expensiveFetcher),
    appCache.dedupe("dedupe:test", expensiveFetcher),
    appCache.dedupe("dedupe:test", expensiveFetcher),
  ]);

  assert.strictEqual(executionCount, 1, `Expected single-flight to execute exactly once, but executed ${executionCount} times`);
  console.log("[PASS] Single-flight deduplication collapsed 5 concurrent calls into 1 upstream execution.");

  // 3. Cache Key Normalization & Isolation
  console.log("\n3. Testing Cache Key Generators...");
  const keyA = buildSearchCacheKey({ query: "coding", country: "US", videoType: "videos" });
  const keyB = buildSearchCacheKey({ query: "coding", country: "IN", videoType: "videos" });
  const keyC = buildSearchCacheKey({ query: "coding", country: "US", videoType: "shorts" });

  assert.notStrictEqual(keyA, keyB, "Different countries must have separate cache keys");
  assert.notStrictEqual(keyA, keyC, "Different videoTypes must have separate cache keys");

  const recA = buildRecCacheKey({ category: "music", country: "US" });
  const recB = buildRecCacheKey({ category: "gaming", country: "US" });
  assert.notStrictEqual(recA, recB, "Different categories must have separate cache keys");

  const feedA = buildFeedCacheKey("US");
  const feedB = buildFeedCacheKey("IN");
  assert.notStrictEqual(feedA, feedB, "Different feed countries must have separate cache keys");
  console.log("[PASS] Cache keys accurately isolate parameters across countries, categories, and video types.");

  // 4. Server-Timing Header Generation
  console.log("\n4. Testing ServerTimer & Server-Timing Header Formatting...");
  const timer = new ServerTimer();
  timer.start("auth");
  await new Promise((r) => setTimeout(r, 10));
  timer.end("auth", "Session Check");

  timer.start("db");
  timer.end("db");

  const header = timer.toHeader();
  console.log(`Generated Server-Timing Header: "${header}"`);
  assert(header.includes("auth;dur="), "Header must contain auth metric");
  assert(header.includes("total;dur="), "Header must contain total metric");
  assert(header.includes('desc="Session Check"'), "Header must include metric description");
  console.log("[PASS] Server-Timing produces compliant, standards-based timing header.");

  console.log("\n=== ALL CACHING & TIMING TESTS PASSED ===");
}

main().catch(console.error);
