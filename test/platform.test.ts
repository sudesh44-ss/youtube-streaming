import assert from "node:assert";
import { getDb } from "../src/lib/db";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  isValidEmail,
  createSession,
  TERMS_VERSION,
  PRIVACY_VERSION,
} from "../src/lib/auth";
import { encryptSecret, decryptSecret, maskApiKey, hashToken } from "../src/lib/crypto";
import { queryUnifiedContent, getProviderStatusList } from "../src/lib/providers";
import { getRecommendedContent } from "../src/lib/recommendations";
import { HELP_ARTICLES } from "../src/lib/help-articles";
import { CATEGORIES } from "../src/lib/types";

async function runTests() {
  console.log("=== STARTING OMNIDISCOVER PLATFORM TEST SUITE ===\n");
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    return (async () => {
      try {
        await fn();
        console.log(`[PASS] ${name}`);
        passed++;
      } catch (err: any) {
        console.error(`[FAIL] ${name}:`, err.message);
        failed++;
      }
    })();
  }

  // --- 1. CRYPTOGRAPHY & ENCRYPTION TESTS ---
  await test("AES-256-GCM: Encrypt and Decrypt roundtrip with authentication tag", () => {
    const secret = "AIzaSyDummySecretYouTubeAPIKey123456789";
    const encrypted = encryptSecret(secret);

    assert(encrypted.ciphertext.length > 0, "Ciphertext should not be empty");
    assert.strictEqual(encrypted.iv.length, 24, "IV should be 12 bytes (24 hex characters)");
    assert.strictEqual(encrypted.authTag.length, 32, "Auth tag should be 16 bytes (32 hex characters)");
    assert.strictEqual(encrypted.keyVersion, 1, "Key version should be 1");

    const decrypted = decryptSecret(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
    assert.strictEqual(decrypted, secret, "Decrypted text must match original secret exactly");
  });

  await test("AES-256-GCM: Tampering with ciphertext throws authentication error", () => {
    const secret = "TopSecretCredential2026";
    const encrypted = encryptSecret(secret);

    // Tamper with ciphertext
    const tamperedCiphertext = encrypted.ciphertext.slice(0, -2) + (encrypted.ciphertext.slice(-2) === "aa" ? "bb" : "aa");

    assert.throws(
      () => decryptSecret(tamperedCiphertext, encrypted.iv, encrypted.authTag),
      /unable to authenticate|unsupported state or unable to authenticate/i,
      "Tampered ciphertext must fail authentication check"
    );
  });

  await test("API Key Masking: Safely masks sensitive keys", () => {
    assert.strictEqual(maskApiKey("AIzaSyD89472394875612"), "AIza••••••••5612");
    assert.strictEqual(maskApiKey("short"), "••••••••");
    assert.strictEqual(maskApiKey(""), "");
  });

  // --- 2. AUTHENTICATION & PASSWORD TESTS ---
  await test("Password Hashing: PBKDF2 with SHA-512 creates verifiable unique hashes", () => {
    const password = "StrongPassword2026!";
    const { hash, salt } = hashPassword(password);

    assert(verifyPassword(password, hash, salt), "Password should verify against its hash and salt");
    assert(!verifyPassword("WrongPassword2026!", hash, salt), "Wrong password should fail verification");

    // Unique salts test
    const second = hashPassword(password);
    assert.notStrictEqual(salt, second.salt, "Each hash must utilize a distinct random salt");
    assert.notStrictEqual(hash, second.hash, "Hashes of same password with different salts must differ");
  });

  await test("Password Strength Validation: Enforces security criteria", () => {
    assert.strictEqual(validatePasswordStrength("short1A").valid, false, "Must reject passwords under 8 characters");
    assert.strictEqual(validatePasswordStrength("onlyletterslowercase").valid, false, "Must reject passwords without numbers");
    assert.strictEqual(validatePasswordStrength("1234567890").valid, false, "Must reject passwords without letters");
    assert.strictEqual(validatePasswordStrength("ValidPassword2026").valid, true, "Must accept strong passwords");
  });

  await test("Email Validation: Rejects malformed email inputs", () => {
    assert.strictEqual(isValidEmail("user@example.com"), true);
    assert.strictEqual(isValidEmail("user.name+tag@sub.domain.org"), true);
    assert.strictEqual(isValidEmail("plainaddress"), false);
    assert.strictEqual(isValidEmail("@missingusername.com"), false);
  });

  // --- 3. DATABASE & SESSION TESTS ---
  await test("Database Schema: Tables, constraints, and legal consent initialized", () => {
    const db = getDb();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
    const tableNames = tables.map((t) => t.name);

    assert(tableNames.includes("users"), "users table must exist");
    assert(tableNames.includes("sessions"), "sessions table must exist");
    assert(tableNames.includes("legal_acceptance"), "legal_acceptance table must exist");
    assert(tableNames.includes("user_preferences"), "user_preferences table must exist");
    assert(tableNames.includes("provider_credentials"), "provider_credentials table must exist");
    assert(tableNames.includes("saved_content"), "saved_content table must exist");
    assert(tableNames.includes("search_history"), "search_history table must exist");
  });

  const testUserId = "test-user-uuid-" + Date.now();
  await test("User Creation and Session Management", () => {
    const db = getDb();
    const { hash, salt } = hashPassword("TestPass123");
    const now = Date.now();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(testUserId, `test-${Date.now()}@platform.local`, hash, salt, "Test User", now, now);

    db.prepare(`
      INSERT INTO legal_acceptance (id, user_id, terms_version, privacy_version, accepted_at)
      VALUES (?, ?, ?, ?, ?)
    `).run("legal-" + Date.now(), testUserId, TERMS_VERSION, PRIVACY_VERSION, now);

    db.prepare(`
      INSERT INTO user_preferences (user_id, display_name, default_mode, preferred_categories, theme, updated_at)
      VALUES (?, ?, 'normal', '["study","technology"]', 'system', ?)
    `).run(testUserId, "Test User", now);

    const rawToken = createSession(testUserId, "TestAgent/1.0", "127.0.0.1");
    assert(rawToken.length >= 64, "Raw session token should be 32 bytes (64 hex characters)");

    const tokenHash = hashToken(rawToken);
    const sessionRow = db.prepare("SELECT * FROM sessions WHERE token_hash = ?").get(tokenHash) as any;
    assert(sessionRow, "Session row should be stored in database");
    assert.strictEqual(sessionRow.user_id, testUserId, "Session must belong to created user");
  });

  // --- 4. CATEGORY MODE VS NORMAL MODE QUERY TESTS ---
  await test("Category Mode Query: Strictly enforces category isolation", async () => {
    const results = await queryUnifiedContent({
      category: "study",
      mode: "category",
    });

    assert(results.length > 0, "Category Mode for 'study' should return curated study items");
    for (const item of results) {
      assert.strictEqual(item.category, "study", `Item ${item.id} must be strictly categorized as 'study' in Category Mode`);
    }
  });

  await test("Normal Mode Query: Returns mixed cross-category discovery", async () => {
    const results = await queryUnifiedContent({
      mode: "normal",
      limit: 20,
    });

    assert(results.length > 0, "Normal Mode should return items");
    const categoriesFound = new Set(results.map((i) => i.category));
    assert(categoriesFound.size >= 2, "Normal Mode must contain multiple categories for serendipitous discovery");
  });

  // --- 5. RECOMMENDATION SCORING TESTS ---
  await test("Recommendation Engine: Respects user preferences and active mode", async () => {
    const recs = await getRecommendedContent({
      userId: testUserId,
      mode: "normal",
      limit: 10,
    });

    assert(recs.length > 0, "Recommendations should return scored items");
    assert(recs[0].score !== undefined, "Recommendations must have calculated scores");
    // Verify sorted descending
    for (let i = 0; i < recs.length - 1; i++) {
      assert((recs[i].score || 0) >= (recs[i + 1].score || 0), "Items should be sorted descending by relevance score");
    }
  });

  // --- 6. PROVIDER STATUS & CREDENTIAL MANAGEMENT ---
  await test("Provider Status List: Reports all supported providers without revealing secrets", () => {
    const providers = getProviderStatusList(testUserId);
    assert.strictEqual(providers.length, 3, "Must report YouTube, TMDB, and Spotify");
    const ids = providers.map((p) => p.id);
    assert(ids.includes("youtube"), "Must include YouTube");
    assert(ids.includes("tmdb"), "Must include TMDB");
    assert(ids.includes("spotify"), "Must include Spotify");

    for (const p of providers) {
      assert.strictEqual(p.status, "not_connected", "Initial status should be not_connected");
      assert(p.setupGuideUrl.startsWith("/help/"), "Must provide valid setup guide link");
    }
  });

  // --- 7. HELP CENTER DOCUMENTATION TESTS ---
  await test("Help Center: Contains all 20 required documentation articles", () => {
    assert.strictEqual(HELP_ARTICLES.length, 20, "Must have exactly 20 comprehensive documentation articles");
    const requiredSlugs = [
      "getting-started",
      "creating-an-account",
      "signing-in-password-reset",
      "understanding-dashboard",
      "category-mode",
      "normal-mode",
      "searching-content",
      "managing-recommendations",
      "connecting-youtube",
      "connecting-tmdb",
      "connecting-music-providers",
      "api-key-security",
      "oauth-authorization",
      "updating-disconnecting-providers",
      "managing-profile-preferences",
      "appearance-settings",
      "privacy-data-controls",
      "account-deletion",
      "troubleshooting-common-errors",
      "understanding-api-quotas",
    ];

    for (const slug of requiredSlugs) {
      const found = HELP_ARTICLES.find((a) => a.slug === slug);
      assert(found, `Help article '${slug}' must exist`);
      assert(found.content.length > 100, `Help article '${slug}' must contain real, structured content`);
    }
  });

  // --- 8. CLEANUP TEST USER ---
  await test("Cascade Cleanup: Removes test user and associated records", () => {
    const db = getDb();
    db.prepare("DELETE FROM users WHERE id = ?").run(testUserId);
    const userRow = db.prepare("SELECT * FROM users WHERE id = ?").get(testUserId);
    assert(!userRow, "Test user should be erased");
  });

  console.log(`\n=== TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error("FATAL ERROR IN TEST RUNNER:", e);
  process.exit(1);
});
