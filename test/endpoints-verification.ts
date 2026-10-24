import assert from "node:assert";
import { NextRequest } from "next/server";

// Import route handlers
import { GET as getProvidersStatus } from "../src/app/api/providers/status/route";
import { GET as getWatchProgress, POST as postWatchProgress } from "../src/app/api/content/watch-progress/route";
import { GET as getHistory } from "../src/app/api/content/history/route";
import { GET as getSaved, POST as postSaved } from "../src/app/api/content/saved/route";
import { GET as getYouTubeStatus } from "../src/app/api/auth/youtube/status/route";
import { POST as postYouTubeLike } from "../src/app/api/content/youtube-like/route";
import { POST as postYouTubeSubscribe } from "../src/app/api/content/youtube-subscribe/route";
import { GET as getContentSearch } from "../src/app/api/content/search/route";
import { GET as getContentRecommendations } from "../src/app/api/content/recommendations/route";

async function runVerification() {
  console.log("=== VERIFYING ALL 10 PRODUCTION ENDPOINTS ===\n");
  let passed = 0;
  let failed = 0;

  async function check(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`[FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // 1. GET /api/providers/status (Unauthenticated returns 401, data service returns catalog)
  await check("1. GET /api/providers/status returns 401 for guest, data service yields resilient catalog", async () => {
    const res = await getProvidersStatus();
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    const { getProviderStatusListAsync } = await import("../src/lib/data-service");
    const catalog = await getProviderStatusListAsync("00000000-0000-0000-0000-000000000000");
    assert(Array.isArray(catalog), "Expected providers array");
    const yt = catalog.find((p: any) => p.id === "youtube");
    assert(yt, "Expected YouTube provider in catalog");
    assert.strictEqual(yt.name, "YouTube Data API v3", "Expected YouTube provider name");
  });

  // 2. GET /api/content/watch-progress (Unauthenticated safe return)
  await check("2. GET /api/content/watch-progress returns 200 with empty array for guests", async () => {
    const res = await getWatchProgress();
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, "Expected success: true");
    assert(Array.isArray(data.history), "Expected history array");
  });

  // 3. GET /api/content/history (Guest requires auth)
  await check("3. GET /api/content/history returns 401 for unauthenticated request", async () => {
    const res = await getHistory();
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  });

  // 4. GET /api/content/saved (Guest requires auth)
  await check("4. GET /api/content/saved returns 401 for unauthenticated request", async () => {
    const res = await getSaved();
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  });

  // 5. GET /api/auth/youtube/status
  await check("5. GET /api/auth/youtube/status returns 200 with connected:false for guest", async () => {
    const res = await getYouTubeStatus();
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.strictEqual(data.connected, false, "Expected connected: false");
  });

  // 6. POST /api/content/youtube-like
  await check("6. POST /api/content/youtube-like returns 200 with local preference for guest", async () => {
    const req = new NextRequest("http://localhost:3000/api/content/youtube-like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoId: "dQw4w9WgXcQ", rating: "like" }),
    });
    const res = await postYouTubeLike(req);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, "Expected success: true");
    assert.strictEqual(data.localOnly, true, "Expected localOnly: true");
  });

  // 7. POST /api/content/youtube-subscribe
  await check("7. POST /api/content/youtube-subscribe returns 401 for unauthenticated request", async () => {
    const req = new NextRequest("http://localhost:3000/api/content/youtube-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: "UC_x5XG1OV2P6uZZ5FSM9Ttw" }),
    });
    const res = await postYouTubeSubscribe(req);
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  });

  // 8. GET /api/content/search
  await check("8. GET /api/content/search returns clean response without crashing", async () => {
    const req = new NextRequest("http://localhost:3000/api/content/search?q=nextjs");
    const res = await getContentSearch(req);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, "Expected success: true");
    assert(Array.isArray(data.items), "Expected items array");
  });

  // 9. GET /api/content/recommendations with Study category
  await check("9. GET /api/content/recommendations?category=education returns clean response", async () => {
    const req = new NextRequest("http://localhost:3000/api/content/recommendations?category=education");
    const res = await getContentRecommendations(req);
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, "Expected success: true");
    assert(Array.isArray(data.items), "Expected items array");
  });

  // 10. GET /api/content/recommendations with Music and videoType
  await check("10. GET /api/content/recommendations?category=music (all, shorts, videos)", async () => {
    for (const vType of ["all", "shorts", "videos"] as const) {
      const req = new NextRequest(`http://localhost:3000/api/content/recommendations?category=music&videoType=${vType}`);
      const res = await getContentRecommendations(req);
      assert.strictEqual(res.status, 200, `Expected 200 for videoType=${vType}, got ${res.status}`);
      const data = await res.json();
      assert(data.success === true, `Expected success: true for videoType=${vType}`);
      assert(Array.isArray(data.items), `Expected items array for videoType=${vType}`);
    }
  });

  console.log(`\n=== ENDPOINT RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runVerification().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
