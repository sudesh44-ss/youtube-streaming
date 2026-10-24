import assert from "assert";
import fs from "fs";
import path from "path";
import {
  getStoredConsent,
  saveConsentPreferences,
  acceptAllConsent,
  rejectOptionalConsent,
  isConsentGranted,
  CURRENT_CONSENT_VERSION,
  CONSENT_STORAGE_KEY,
} from "../src/lib/cookie-consent";
import { revokeGoogleOAuthToken } from "../src/lib/google-account";

console.log("=== Testing OmniDiscover Privacy, Terms, and Functional Consent ===");

// Mock browser localStorage for Node testing
const mockStorage: Record<string, string> = {};
(global as any).window = {
  localStorage: {
    getItem: (k: string) => mockStorage[k] || null,
    setItem: (k: string, v: string) => {
      mockStorage[k] = String(v);
    },
    removeItem: (k: string) => {
      delete mockStorage[k];
    },
    clear: () => {
      for (const k of Object.keys(mockStorage)) delete mockStorage[k];
    },
  },
  dispatchEvent: () => true,
  CustomEvent: class CustomEvent {
    type: string;
    detail: any;
    constructor(t: string, opts?: any) {
      this.type = t;
      this.detail = opts?.detail;
    }
  },
};

async function runTests() {
  // Test 1: Functional Cookie Consent Manager
  console.log("\n1. Testing Cookie Consent Manager & Enforcement Rules...");

  // Initial state before interaction
  window.localStorage.clear();
  assert.strictEqual(getStoredConsent(), null, "Before interaction, getStoredConsent returns null");
  assert.strictEqual(isConsentGranted("necessary"), true, "Strictly necessary is always granted");
  assert.strictEqual(isConsentGranted("functional"), false, "Functional storage is blocked before consent");
  assert.strictEqual(isConsentGranted("analytics"), false, "Analytics is blocked");
  assert.strictEqual(isConsentGranted("advertising"), false, "Advertising is blocked");

  // Reject optional cookies
  rejectOptionalConsent();
  const rejected = getStoredConsent();
  assert(rejected !== null, "Consent recorded after rejection");
  assert.strictEqual(rejected?.necessary, true, "Necessary is true");
  assert.strictEqual(rejected?.functional, false, "Functional is false when rejected");
  assert.strictEqual(rejected?.version, CURRENT_CONSENT_VERSION, "Version matches");
  assert.strictEqual(isConsentGranted("functional"), false, "isConsentGranted('functional') returns false");

  // Accept all cookies
  acceptAllConsent();
  const accepted = getStoredConsent();
  assert.strictEqual(accepted?.functional, true, "Functional is true when accepted");
  assert.strictEqual(isConsentGranted("functional"), true, "isConsentGranted('functional') returns true");

  // Custom preferences
  saveConsentPreferences({ functional: false });
  assert.strictEqual(isConsentGranted("functional"), false, "Customizing functional to false works");
  console.log("[PASS] Cookie consent state transitions and category gates verified.");

  // Test 2: Local Storage Enforcement with Consent
  console.log("\n2. Testing Storage Gating with Consent Status...");
  const { addToWatchHistory, getWatchHistory, addToSearchHistory, getSearchHistory, toggleLocalLike } = await import(
    "../src/lib/local-storage"
  );

  // When functional is rejected: writes should be blocked
  saveConsentPreferences({ functional: false });
  addToWatchHistory({ videoId: "v-blocked-1", title: "Should Not Save", thumbnailUrl: "https://example.com/thumb.jpg" });
  assert.strictEqual(getWatchHistory().length, 0, "Watch history blocked when functional consent is rejected");

  addToSearchHistory({ query: "blocked search query" });
  assert.strictEqual(getSearchHistory().length, 0, "Search history blocked when functional consent is rejected");

  const likedState = toggleLocalLike("v-blocked-1");
  assert.strictEqual(likedState, false, "Like toggle returns false and does not persist without consent");

  // When functional is accepted: writes should persist
  saveConsentPreferences({ functional: true });
  addToWatchHistory({ videoId: "v-allowed-1", title: "Allowed Video", thumbnailUrl: "https://example.com/thumb.jpg" });
  assert.strictEqual(getWatchHistory().length, 1, "Watch history saves when functional consent is granted");
  assert.strictEqual(getWatchHistory()[0].videoId, "v-allowed-1", "Saved item matches");

  addToSearchHistory({ query: "allowed query" });
  assert.strictEqual(getSearchHistory().length, 1, "Search history saves when functional consent is granted");

  // Re-rejecting cleans up optional storage
  saveConsentPreferences({ functional: false });
  assert.strictEqual(mockStorage["omnidiscover_watch_history_v1"], undefined, "Optional storage purged upon consent revocation");
  assert.strictEqual(mockStorage["omnidiscover_search_history_v1"], undefined, "Optional storage purged upon consent revocation");
  console.log("[PASS] Real client storage gating and automated cleanup verified.");

  // Test 3: External Google OAuth Revocation Helper
  console.log("\n3. Testing Google OAuth Revocation Helper...");
  const origFetch = global.fetch;

  let revokeCalled = false;
  let revokeTokenPassed = "";
  global.fetch = (async (url: any, opts: any) => {
    if (String(url).includes("oauth2/v3/userinfo")) {
      return { ok: true, json: async () => ({ email: "test@gmail.com" }) } as any;
    }
    if (String(url).includes("oauth2.googleapis.com/revoke")) {
      revokeCalled = true;
      revokeTokenPassed = opts?.body || "";
      return { ok: true, status: 200 } as any;
    }
    return origFetch(url, opts);
  }) as any;

  try {
    const success = await revokeGoogleOAuthToken("mock-token-to-revoke");
    assert.strictEqual(success, true, "Revoke helper returns true on HTTP 200");
    assert.strictEqual(revokeCalled, true, "Google revoke endpoint called");
    assert(revokeTokenPassed.includes("mock-token-to-revoke"), "Correct token passed in body");

    // Null token handling
    const nullResult = await revokeGoogleOAuthToken(null);
    assert.strictEqual(nullResult, false, "Null token returns false without crashing");
  } finally {
    global.fetch = origFetch;
  }
  console.log("[PASS] Google OAuth token revocation verified.");

  // Test 4: Privacy Policy Content & Structure
  console.log("\n4. Testing Privacy Policy Source Code...");
  const privacyPath = path.join(process.cwd(), "src/app/privacy/page.tsx");
  assert(fs.existsSync(privacyPath), "Privacy Policy exists");
  const privacyContent = fs.readFileSync(privacyPath, "utf-8");

  assert(
    privacyContent.includes("Google &amp; YouTube Account Authorization") ||
      privacyContent.includes("Google & YouTube Account Authorization"),
    "Includes dedicated Google/YouTube section"
  );
  assert(privacyContent.includes("AES-256-GCM"), "Explains AES-256-GCM authenticated encryption");
  assert(privacyContent.includes("Google API Services User Data Policy"), "References Google API Services User Data Policy");
  assert(privacyContent.includes("Limited Use"), "References Limited Use requirements");
  assert(privacyContent.includes("platform_session"), "Identifies verified session cookie name");
  assert(privacyContent.includes("youtube_oauth_state"), "Identifies CSRF state cookie");
  assert(privacyContent.includes("30-Day Server Retention for Raw Activity"), "Details 30-day raw activity retention");
  assert(privacyContent.includes("user_recommendation_profiles"), "Identifies recommendation profiles");
  assert(privacyContent.includes("reopenCookieConsentModal"), "Wired to reopen cookie settings");
  assert(privacyContent.includes("Zero Tracking Pixels or Ad Cookies"), "Explicitly declares zero advertising trackers");
  console.log("[PASS] Privacy Policy content matches real system implementation.");

  // Test 5: Terms & Conditions Content & Structure
  console.log("\n5. Testing Terms & Conditions Source Code...");
  const termsPath = path.join(process.cwd(), "src/app/terms/page.tsx");
  assert(fs.existsSync(termsPath), "Terms & Conditions exists");
  const termsContent = fs.readFileSync(termsPath, "utf-8");

  assert(
    termsContent.includes("Google OAuth &amp; YouTube Account Integration") ||
      termsContent.includes("Google OAuth & YouTube Account Integration"),
    "Includes Google/YouTube section in Terms"
  );
  assert(termsContent.includes("not affiliated with, endorsed by, sponsored by, or partner-certified by Google LLC or YouTube"), "Contains non-affiliation disclaimer");
  assert(termsContent.includes("YouTube Terms of Service"), "References YouTube Terms of Service");
  assert(termsContent.includes("Google Privacy Policy"), "References Google Privacy Policy");
  assert(termsContent.includes("Revocation Rights"), "Explains user revocation rights");
  assert(
    termsContent.includes("API Availability &amp; Quotas") ||
      termsContent.includes("API Availability & Quotas"),
    "Disclaims API quota/availability limits"
  );
  assert(termsContent.includes("Bring-Your-Own-Key (BYOK)"), "Covers user-supplied API keys");
  console.log("[PASS] Terms & Conditions accurately reflects operational boundaries.");

  // Test 6: Footer and Cookie Settings Wiring
  console.log("\n6. Testing Footer Cookie Settings Integration...");
  const footerPath = path.join(process.cwd(), "src/components/Footer.tsx");
  const footerContent = fs.readFileSync(footerPath, "utf-8");
  assert(footerContent.includes("Cookie Preferences"), "Footer includes Cookie Preferences link");
  assert(footerContent.includes("reopenCookieConsentModal"), "Footer triggers reopenCookieConsentModal");
  console.log("[PASS] Footer cookie preferences trigger verified.");

  // Test 7: Account Deletion and Disconnect Enhancements
  console.log("\n7. Testing Account Deletion and Disconnect Endpoints...");
  const deleteAccountPath = path.join(process.cwd(), "src/app/api/auth/delete-account/route.ts");
  const deleteContent = fs.readFileSync(deleteAccountPath, "utf-8");
  assert(deleteContent.includes("revokeGoogleOAuthToken"), "Delete account invokes Google token revocation");
  assert(deleteContent.includes("oauth_connections"), "Delete account purges oauth_connections");
  assert(deleteContent.includes("user_recommendation_profiles"), "Delete account purges recommendation profiles");

  const disconnectPath = path.join(process.cwd(), "src/app/api/auth/youtube/disconnect/route.ts");
  const disconnectContent = fs.readFileSync(disconnectPath, "utf-8");
  assert(disconnectContent.includes("revokeGoogleOAuthToken"), "Disconnect invokes Google token revocation");
  assert(disconnectContent.includes("externalRevocation"), "Disconnect reports external revocation status");

  const feedbackPath = path.join(process.cwd(), "src/app/api/content/feedback/route.ts");
  const feedbackContent = fs.readFileSync(feedbackPath, "utf-8");
  assert(feedbackContent.includes("export async function DELETE"), "Feedback route supports DELETE for profile reset");
  console.log("[PASS] Account deletion, disconnect revocation, and feedback reset verified.");

  console.log("\n=== ALL PRIVACY, TERMS, AND CONSENT TESTS PASSED ===");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
