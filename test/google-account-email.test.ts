import assert from "assert";
import fs from "fs";
import path from "path";
import {
  extractEmailFromIdToken,
  cacheGoogleAccount,
  getGoogleAccountDetails,
  invalidateGoogleAccountCache,
} from "../src/lib/google-account";

console.log("=== Testing OmniDiscover Google Account Email & Status Feature ===");

async function runTests() {
  // Test 1: ID Token parsing
  console.log("\n1. Testing extractEmailFromIdToken...");

  const fakeHeader = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const fakePayload1 = Buffer.from(
    JSON.stringify({
      iss: "https://accounts.google.com",
      sub: "1234567890",
      email: "creator@example.com",
      email_verified: true,
    })
  ).toString("base64url");
  const fakeSig = "invalidsignature";
  const validJwt = `${fakeHeader}.${fakePayload1}.${fakeSig}`;

  const res1 = extractEmailFromIdToken(validJwt);
  assert(res1 !== null, "Parsed valid JWT");
  assert.strictEqual(res1?.email, "creator@example.com", "Extracted email matches");
  assert.strictEqual(res1?.emailVerified, true, "Extracted email_verified matches");

  // Malformed JWTs
  assert.strictEqual(extractEmailFromIdToken(""), null, "Empty string returns null");
  assert.strictEqual(extractEmailFromIdToken("bad.token"), null, "Malformed token returns null");
  assert.strictEqual(extractEmailFromIdToken(null as any), null, "Null returns null");

  const noEmailPayload = Buffer.from(JSON.stringify({ sub: "123" })).toString("base64url");
  assert.strictEqual(
    extractEmailFromIdToken(`${fakeHeader}.${noEmailPayload}.${fakeSig}`),
    null,
    "JWT without email returns null"
  );
  console.log("[PASS] extractEmailFromIdToken parsed valid tokens and safely rejected invalid ones.");

  // Test 2: In-memory cache & invalidation
  console.log("\n2. Testing in-memory cache and invalidation...");
  const testUserId = "user-test-uuid-999";

  cacheGoogleAccount(testUserId, "cached-user@gmail.com", true);
  const fromCache = await getGoogleAccountDetails(testUserId);
  assert(fromCache !== null, "Retrieved from cache without access token");
  assert.strictEqual(fromCache?.email, "cached-user@gmail.com", "Cached email matches");
  assert.strictEqual(fromCache?.emailVerified, true, "Cached emailVerified matches");

  invalidateGoogleAccountCache(testUserId);
  const afterInvalidate = await getGoogleAccountDetails(testUserId);
  assert.strictEqual(afterInvalidate, null, "Cache invalidation successfully clears entry");
  console.log("[PASS] In-memory cache and cache invalidation verified.");

  // Test 3: Fallback & Error resilience (simulating UserInfo endpoint failure)
  console.log("\n3. Testing Google UserInfo fallback and error handling...");
  const originalFetch = global.fetch;

  // Mock fetch returning 401 Unauthorized
  global.fetch = (async (url: any) => {
    if (String(url).includes("oauth2/v3/userinfo")) {
      return {
        ok: false,
        status: 401,
        json: async () => ({ error: "invalid_token" }),
      } as any;
    }
    return originalFetch(url);
  }) as any;

  try {
    const errorRes = await getGoogleAccountDetails("user-fail-test", "bad_token");
    assert.strictEqual(errorRes, null, "Returns null gracefully on HTTP 401 error");
  } finally {
    global.fetch = originalFetch;
  }

  // Mock fetch returning successful userinfo
  global.fetch = (async (url: any) => {
    if (String(url).includes("oauth2/v3/userinfo")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          sub: "google-sub-123",
          email: "live-account@gmail.com",
          email_verified: true,
        }),
      } as any;
    }
    return originalFetch(url);
  }) as any;

  try {
    const successRes = await getGoogleAccountDetails("user-success-test", "valid_access_token");
    assert(successRes !== null, "Successfully fetched from mock Google UserInfo");
    assert.strictEqual(successRes?.email, "live-account@gmail.com", "Email received");
    assert.strictEqual(successRes?.emailVerified, true, "Email verified received");

    // Check that it was placed in cache
    const cachedAgain = await getGoogleAccountDetails("user-success-test");
    assert.strictEqual(cachedAgain?.email, "live-account@gmail.com", "Entry cached after fetch");
  } finally {
    global.fetch = originalFetch;
  }
  console.log("[PASS] Google UserInfo network fetching, error resilience, and caching verified.");

  // Test 4: Settings Page UI Elements Inspection
  console.log("\n4. Testing Settings Page UI Structure...");
  const settingsPagePath = path.join(process.cwd(), "src/app/settings/page.tsx");
  assert(fs.existsSync(settingsPagePath), "Settings page file exists");
  const settingsContent = fs.readFileSync(settingsPagePath, "utf-8");

  assert(settingsContent.includes("Google Account"), "Includes 'Google Account' label");
  assert(settingsContent.includes("Loading account details…"), "Includes 'Loading account details…' placeholder");
  assert(settingsContent.includes("Email unavailable"), "Includes 'Email unavailable' fallback");
  assert(settingsContent.includes("wordBreak: \"break-all\""), "Includes responsive wordBreak for email");
  assert(settingsContent.includes("Connected YouTube Channel"), "Placed alongside Connected YouTube Channel");
  console.log("[PASS] Settings page UI elements, loading states, and responsive styling verified.");

  // Test 5: Status API Endpoint Inspection
  console.log("\n5. Testing Status API Route Implementation...");
  const statusRoutePath = path.join(process.cwd(), "src/app/api/auth/youtube/status/route.ts");
  assert(fs.existsSync(statusRoutePath), "Status route file exists");
  const statusContent = fs.readFileSync(statusRoutePath, "utf-8");

  assert(statusContent.includes("getGoogleAccountDetails"), "Status route calls getGoogleAccountDetails");
  assert(statusContent.includes("email,"), "Status route returns email");
  assert(statusContent.includes("emailVerified,"), "Status route returns emailVerified");
  assert(!statusContent.includes("accessToken:"), "Never exposes access tokens in JSON response");
  assert(!statusContent.includes("refreshToken:"), "Never exposes refresh tokens in JSON response");
  console.log("[PASS] Status route securely passes email and excludes raw tokens.");

  // Test 6: Callback & Disconnect Routes Inspection
  console.log("\n6. Testing Callback & Disconnect Routes...");
  const callbackRoutePath = path.join(process.cwd(), "src/app/api/auth/youtube/callback/route.ts");
  const callbackContent = fs.readFileSync(callbackRoutePath, "utf-8");
  assert(callbackContent.includes("extractEmailFromIdToken"), "Callback checks id_token for immediate email caching");
  assert(callbackContent.includes("cacheGoogleAccount"), "Callback pre-populates account cache");

  const disconnectRoutePath = path.join(process.cwd(), "src/app/api/auth/youtube/disconnect/route.ts");
  const disconnectContent = fs.readFileSync(disconnectRoutePath, "utf-8");
  assert(disconnectContent.includes("invalidateGoogleAccountCache"), "Disconnect route wipes cached email");
  console.log("[PASS] Callback caching and disconnect invalidation verified.");

  console.log("\n=== ALL GOOGLE ACCOUNT EMAIL TESTS PASSED ===");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
