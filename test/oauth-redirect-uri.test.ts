import assert from "node:assert";
import {
  PRODUCTION_BASE_URL,
  YOUTUBE_OAUTH_CALLBACK_PATH,
  CANONICAL_PRODUCTION_REDIRECT_URI,
  CANONICAL_LOCAL_REDIRECT_URI,
  getAppBaseUrl,
  getYouTubeOAuthRedirectUri,
  getGoogleOAuthCredentials,
  getGoogleCloudConsoleRequirements,
} from "../src/lib/oauth-config";

console.log("=== Testing OmniDiscover OAuth Configuration & Redirect URI Safety ===");

// 1. Verify Constants and Canonical Paths
console.log("\n1. Testing OAuth Constants & Canonical Paths...");
assert.strictEqual(PRODUCTION_BASE_URL, "https://youtube-streaming-ten.vercel.app");
assert.strictEqual(YOUTUBE_OAUTH_CALLBACK_PATH, "/api/auth/youtube/callback");
assert.strictEqual(
  CANONICAL_PRODUCTION_REDIRECT_URI,
  "https://youtube-streaming-ten.vercel.app/api/auth/youtube/callback",
  "Canonical production redirect URI matches exact specification"
);
assert.strictEqual(
  CANONICAL_LOCAL_REDIRECT_URI,
  "http://localhost:3000/api/auth/youtube/callback",
  "Canonical local redirect URI matches standard development port"
);
console.log("[PASS] Constants and paths verified.");

// 2. Production Base URL & Host Header Injection Protection
console.log("\n2. Testing Production Redirect URI Resolution & Security...");
const originalNodeEnv = process.env.NODE_ENV;
const originalAppUrl = process.env.APP_URL;
const originalNextAppUrl = process.env.NEXT_PUBLIC_APP_URL;

try {
  // Set production environment
  (process.env as any).NODE_ENV = "production";
  delete process.env.APP_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;

  // A. Default in production must strictly be the production canonical URL
  const prodUri = getYouTubeOAuthRedirectUri();
  assert.strictEqual(
    prodUri,
    "https://youtube-streaming-ten.vercel.app/api/auth/youtube/callback",
    "Production default URI must be canonical Vercel production domain"
  );

  // B. Attacker attempts Host Header injection via incoming Request
  const mockEvilRequest = new Request("http://evil-phishing-domain.com/api/auth/youtube/connect", {
    headers: {
      host: "evil-phishing-domain.com",
      "x-forwarded-host": "evil-phishing-domain.com",
      "x-forwarded-proto": "http",
    },
  });

  const securedProdUri = getYouTubeOAuthRedirectUri(mockEvilRequest);
  assert.strictEqual(
    securedProdUri,
    "https://youtube-streaming-ten.vercel.app/api/auth/youtube/callback",
    "Production MUST ignore arbitrary incoming request Host and X-Forwarded headers"
  );
  assert(!securedProdUri.includes("evil-phishing-domain"), "Evil host header rejected in production");

  // C. Insecure HTTP APP_URL in production must be rejected
  process.env.APP_URL = "http://insecure-http-domain.com";
  const rejectedInsecureUri = getYouTubeOAuthRedirectUri();
  assert.strictEqual(
    rejectedInsecureUri,
    "https://youtube-streaming-ten.vercel.app/api/auth/youtube/callback",
    "Insecure HTTP APP_URL rejected in production; falls back to canonical HTTPS"
  );

  // D. Valid HTTPS APP_URL with trailing slash normalized cleanly
  process.env.APP_URL = "https://youtube-streaming-ten.vercel.app/";
  const normalizedUri = getYouTubeOAuthRedirectUri();
  assert.strictEqual(
    normalizedUri,
    "https://youtube-streaming-ten.vercel.app/api/auth/youtube/callback",
    "Trailing slash from APP_URL normalized without double slashes"
  );
  assert(!normalizedUri.includes("//api"), "No duplicate slash in normalized path");

  console.log("[PASS] Production environment strictly enforces HTTPS and rejects header injection.");
} finally {
  (process.env as any).NODE_ENV = originalNodeEnv;
  if (originalAppUrl !== undefined) process.env.APP_URL = originalAppUrl;
  else delete process.env.APP_URL;
  if (originalNextAppUrl !== undefined) process.env.NEXT_PUBLIC_APP_URL = originalNextAppUrl;
  else delete process.env.NEXT_PUBLIC_APP_URL;
}

// 3. Development Environment Behavior
console.log("\n3. Testing Development & Localhost Behavior...");
try {
  (process.env as any).NODE_ENV = "development";
  delete process.env.APP_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;

  // Default dev fallback
  const devDefault = getYouTubeOAuthRedirectUri();
  assert.strictEqual(devDefault, "http://localhost:3000/api/auth/youtube/callback");

  // Localhost on custom port (e.g. port 3001)
  const localReq3001 = new Request("http://localhost:3001/api/auth/youtube/connect");
  const dev3001 = getYouTubeOAuthRedirectUri(localReq3001);
  assert.strictEqual(dev3001, "http://localhost:3001/api/auth/youtube/callback");

  // Local loopback IP 127.0.0.1
  const localReqIp = new Request("http://127.0.0.1:8080/api/auth/youtube/connect");
  const devIp = getYouTubeOAuthRedirectUri(localReqIp);
  assert.strictEqual(devIp, "http://127.0.0.1:8080/api/auth/youtube/callback");

  // Dev explicit APP_URL
  process.env.APP_URL = "http://localhost:4000";
  const devConfigured = getYouTubeOAuthRedirectUri();
  assert.strictEqual(devConfigured, "http://localhost:4000/api/auth/youtube/callback");

  console.log("[PASS] Development environment safely accommodates localhost ports.");
} finally {
  (process.env as any).NODE_ENV = originalNodeEnv;
  if (originalAppUrl !== undefined) process.env.APP_URL = originalAppUrl;
  else delete process.env.APP_URL;
  if (originalNextAppUrl !== undefined) process.env.NEXT_PUBLIC_APP_URL = originalNextAppUrl;
  else delete process.env.NEXT_PUBLIC_APP_URL;
}

// 4. Google Credentials Resolution
console.log("\n4. Testing Google Credentials Resolution...");
const creds = getGoogleOAuthCredentials();
assert(typeof creds === "object", "Credentials helper returns an object");
assert("clientId" in creds, "Credentials helper includes clientId property");
assert("clientSecret" in creds, "Credentials helper includes clientSecret property");
console.log("[PASS] Google OAuth credentials helper verified.");

// 5. Google Cloud Console Requirement Formatter
console.log("\n5. Testing Google Cloud Console Requirements Output...");
const reqs = getGoogleCloudConsoleRequirements();
assert.strictEqual(reqs.production.origin, "https://youtube-streaming-ten.vercel.app");
assert.strictEqual(reqs.production.redirectUri, "https://youtube-streaming-ten.vercel.app/api/auth/youtube/callback");
assert.strictEqual(reqs.localDevelopment.origin, "http://localhost:3000");
assert.strictEqual(reqs.localDevelopment.redirectUri, "http://localhost:3000/api/auth/youtube/callback");
console.log("[PASS] Console requirements output matches specifications.");

console.log("\n=== ALL OAUTH REDIRECT URI & CONFIG TESTS PASSED ===");
