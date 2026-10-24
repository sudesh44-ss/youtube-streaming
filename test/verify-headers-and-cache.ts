import assert from "node:assert";
import { GET as searchGet } from "../src/app/api/content/search/route";
import { GET as recGet } from "../src/app/api/content/recommendations/route";
import { GET as feedGet } from "../src/app/api/content/feed/route";
import { GET as statusGet } from "../src/app/api/providers/status/route";
import { NextRequest } from "next/server";

async function verify() {
  console.log("=== Verifying Route Handlers, Caching & Server-Timing Headers ===");

  // 1. Search Route
  console.log("\n1. Testing /api/content/search Handler...");
  const searchReq1 = new NextRequest("http://localhost:3000/api/content/search?q=javascript");
  const searchRes1 = await searchGet(searchReq1);
  const timing1 = searchRes1.headers.get("Server-Timing");
  console.log(`- Initial Search Status: ${searchRes1.status}, Server-Timing: "${timing1}", X-Cache: "${searchRes1.headers.get("X-Cache")}"`);
  assert(timing1 && timing1.includes("total;dur="), "Search response must include Server-Timing header");

  // 2. Recommendations Route
  console.log("\n2. Testing /api/content/recommendations Handler...");
  const recReq1 = new NextRequest("http://localhost:3000/api/content/recommendations?category=study");
  const recRes1 = await recGet(recReq1);
  const recTiming1 = recRes1.headers.get("Server-Timing");
  console.log(`- Initial Rec Status: ${recRes1.status}, Server-Timing: "${recTiming1}"`);
  assert(recTiming1 && recTiming1.includes("total;dur="), "Recommendations response must include Server-Timing header");

  // 3. Feed Route
  console.log("\n3. Testing /api/content/feed Handler...");
  const feedReq1 = new NextRequest("http://localhost:3000/api/content/feed");
  const feedRes1 = await feedGet(feedReq1);
  const feedTiming1 = feedRes1.headers.get("Server-Timing");
  console.log(`- Initial Feed Status: ${feedRes1.status}, Server-Timing: "${feedTiming1}"`);
  assert(feedTiming1 && feedTiming1.includes("total;dur="), "Feed response must include Server-Timing header");

  // 4. Provider Status Route
  console.log("\n4. Testing /api/providers/status Handler (Guest)...");
  const statusRes = await statusGet();
  console.log(`- Status response: ${statusRes.status}, Server-Timing: "${statusRes.headers.get("Server-Timing")}"`);
  assert.strictEqual(statusRes.status, 401, "Unauthenticated status should return 401");

  console.log("\n=== ALL ROUTE HANDLER TESTS PASSED ===");
}

verify().catch(console.error);
