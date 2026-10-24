import { performance } from "node:perf_hooks";
import { getCurrentSession } from "../src/lib/auth";
import { getUserProviderKeyAsync, getProviderStatusListAsync, getSavedContentForUser, getWatchProgressForUser } from "../src/lib/data-service";
import { YouTubeAdapter } from "../src/lib/providers/youtube";
import { queryUnifiedContentWithPagination } from "../src/lib/providers";
import { getRecommendedContent } from "../src/lib/recommendations";
import { getCachedFeed, setCachedFeed, clearFeedCache } from "../src/lib/feed-cache";
import { getDb } from "../src/lib/db";
import { decryptSecret, encryptSecret } from "../src/lib/crypto";

async function measure<T>(label: string, fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  console.log(`  - ${label}: ${durationMs.toFixed(2)}ms`);
  return { result, durationMs };
}

async function runAudit() {
  console.log("=================================================");
  console.log("   OMNIDISCOVER PERFORMANCE AUDIT & BENCHMARK   ");
  console.log("=================================================\n");

  const results: Record<string, number> = {};

  // 1. Database & Crypto Timings
  console.log("1. Measuring Database & Decryption Primitives:");
  const testKey = "AIzaSyFakeKeyForBenchmarkingPurpose12345";
  const enc = encryptSecret(testKey);

  const { durationMs: decMs } = await measure("AES-256-GCM Decrypt (Single Secret)", async () => {
    return decryptSecret(enc.ciphertext, enc.iv, enc.authTag);
  });
  results["crypto_decrypt"] = decMs;

  const { durationMs: dbInitMs } = await measure("SQLite getDb() & statement prepare", async () => {
    const db = getDb();
    return db.prepare("SELECT 1").get();
  });
  results["db_query"] = dbInitMs;

  // 2. Data Service Key & Status Retrieval
  console.log("\n2. Measuring Data Service Operations:");
  const { durationMs: keyLookupGuestMs } = await measure("getUserProviderKeyAsync (Guest)", async () => {
    return getUserProviderKeyAsync(undefined, "youtube");
  });
  results["key_lookup_guest"] = keyLookupGuestMs;

  const { durationMs: provStatusGuestMs } = await measure("getProviderStatusListAsync (Simulated)", async () => {
    return getProviderStatusListAsync("00000000-0000-0000-0000-000000000000");
  });
  results["provider_status"] = provStatusGuestMs;

  const { durationMs: savedContentMs } = await measure("getSavedContentForUser (Simulated User)", async () => {
    return getSavedContentForUser("00000000-0000-0000-0000-000000000000");
  });
  results["saved_content"] = savedContentMs;

  const { durationMs: watchProgressMs } = await measure("getWatchProgressForUser (Simulated User)", async () => {
    return getWatchProgressForUser("00000000-0000-0000-0000-000000000000");
  });
  results["watch_progress"] = watchProgressMs;

  // 3. YouTube Provider Adapter (Live or Curated)
  console.log("\n3. Measuring YouTube Provider Adapter Operations:");
  const ytAdapter = new YouTubeAdapter();

  const { durationMs: trendingMs } = await measure("ytAdapter.getTrending('US', 8)", async () => {
    return ytAdapter.getTrending("US", 8);
  });
  results["yt_trending"] = trendingMs;

  const { durationMs: searchVidMs } = await measure("ytAdapter.search({ query: 'coding', limit: 20 })", async () => {
    return ytAdapter.search({ query: "coding", limit: 20, mode: "normal" });
  });
  results["yt_search_videos"] = searchVidMs;

  const { durationMs: searchChMs } = await measure("ytAdapter.searchChannels('technology')", async () => {
    return ytAdapter.searchChannels("technology");
  });
  results["yt_search_channels"] = searchChMs;

  // 4. Recommendation Engine
  console.log("\n4. Measuring Recommendation Engine & Unified Content Query:");
  const { durationMs: queryUnifiedMs } = await measure("queryUnifiedContentWithPagination({ mode: 'normal', limit: 20 })", async () => {
    return queryUnifiedContentWithPagination({ mode: "normal", limit: 20 });
  });
  results["query_unified"] = queryUnifiedMs;

  const { durationMs: recEngineMs } = await measure("getRecommendedContent({ mode: 'normal', limit: 16 })", async () => {
    return getRecommendedContent({ mode: "normal", limit: 16 });
  });
  results["rec_engine"] = recEngineMs;

  // 5. Feed Caching Simulation
  console.log("\n5. Measuring Feed Cache Performance (Cold vs Warm):");
  clearFeedCache("audit_test_key");
  const { durationMs: coldFeedMs } = await measure("Cold Feed Cache Miss", async () => {
    return getCachedFeed("audit_test_key");
  });
  results["feed_cold"] = coldFeedMs;

  setCachedFeed("audit_test_key", {
    trending: [],
    recommended: [],
    music: [],
    gaming: [],
    study: [],
    items: [],
    cachedAt: Date.now(),
  });

  const { durationMs: warmFeedMs } = await measure("Warm Feed Cache Hit", async () => {
    return getCachedFeed("audit_test_key");
  });
  results["feed_warm"] = warmFeedMs;

  console.log("\n=================================================");
  console.log("             AUDIT SUMMARY METRICS              ");
  console.log("=================================================");
  console.log(JSON.stringify(results, null, 2));
}

runAudit().catch(console.error);
