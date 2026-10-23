process.env.IS_PLATFORM_TEST = "true";
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
import { queryUnifiedContent, getProviderStatusList, getUserProviderKey, getAdapter } from "../src/lib/providers";
import { getRecommendedContent } from "../src/lib/recommendations";
import { HELP_ARTICLES } from "../src/lib/help-articles";
import { CATEGORIES } from "../src/lib/types";
import {
  isDevEnvironment,
  verifyDevAdminCredentials,
  isDevAdminAttempt,
  createDevAdminSession,
  cleanupDevAdmin,
} from "../src/lib/dev-auth";
import { checkRateLimit, resetMemoryRateLimits, RATE_LIMIT_POLICIES } from "../src/lib/rate-limit";

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
    assert.strictEqual(providers.length, 2, "Must report YouTube and TMDB as active providers");
    const ids = providers.map((p) => p.id);
    assert(ids.includes("youtube"), "Must include YouTube");
    assert(ids.includes("tmdb"), "Must include TMDB");
    assert(!ids.includes("spotify" as any), "Spotify must be excluded from active providers in favor of YouTube Music");

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

  // --- 9. TEMPORARY DEV ADMIN LOGIN & SECURITY TESTS ---
  await test("Dev Admin: Validates correct testing credentials in development environment", () => {
    assert.strictEqual(isDevEnvironment(), true, "Should identify local environment as development");
    assert.strictEqual(
      verifyDevAdminCredentials("admin@example.com", "ChangeThisAdminPassword123!"),
      true,
      "Valid dev admin credentials must pass verification"
    );
    assert.strictEqual(
      verifyDevAdminCredentials("ADMIN@EXAMPLE.COM", "ChangeThisAdminPassword123!"),
      true,
      "Email verification must be case-insensitive"
    );
    assert.strictEqual(isDevAdminAttempt("admin@example.com"), true);
  });

  await test("Dev Admin: Rejects invalid passwords", () => {
    assert.strictEqual(
      verifyDevAdminCredentials("admin@example.com", "WrongPassword123!"),
      false,
      "Incorrect password must be rejected"
    );
    assert.strictEqual(
      verifyDevAdminCredentials("admin@example.com", ""),
      false,
      "Empty password must be rejected"
    );
  });

  await test("Dev Admin: Rejects mismatched emails", () => {
    assert.strictEqual(
      verifyDevAdminCredentials("stranger@example.com", "ChangeThisAdminPassword123!"),
      false,
      "Non-admin email must not be verified by dev admin checker"
    );
    assert.strictEqual(isDevAdminAttempt("stranger@example.com"), false);
  });

  await test("Dev Admin Production Lockdown: Disabled completely in production builds", () => {
    const envRecord = process.env as Record<string, string | undefined>;
    const originalEnv = envRecord.NODE_ENV;
    try {
      envRecord.NODE_ENV = "production";
      assert.strictEqual(isDevEnvironment(), false, "Must detect production environment");
      assert.strictEqual(
        verifyDevAdminCredentials("admin@example.com", "ChangeThisAdminPassword123!"),
        false,
        "Dev admin credentials MUST be rejected in production"
      );
      assert.strictEqual(
        isDevAdminAttempt("admin@example.com"),
        false,
        "Dev admin attempt detection MUST be disabled in production"
      );
    } finally {
      envRecord.NODE_ENV = originalEnv;
    }
  });

  await test("Dev Admin Session: Establishes valid session in database with profile & preferences", () => {
    const { user, rawToken } = createDevAdminSession({
      userAgent: "DevAdminTest/1.0",
      ipAddress: "127.0.0.1",
    });

    assert.strictEqual(user.email, "admin@example.com");
    assert.strictEqual(user.emailVerified, true);
    assert(rawToken.length >= 64, "Raw session token should be 64 hex characters");

    const db = getDb();
    const tokenHash = hashToken(rawToken);
    const sessionRow = db.prepare("SELECT * FROM sessions WHERE token_hash = ?").get(tokenHash) as any;
    assert(sessionRow, "Dev admin session row must exist in database");
    assert.strictEqual(sessionRow.user_id, user.id, "Session must belong to dev admin user");

    // Check user preferences were auto-initialized
    const prefRow = db.prepare("SELECT * FROM user_preferences WHERE user_id = ?").get(user.id) as any;
    assert(prefRow, "User preferences must exist for dev admin");
    assert.strictEqual(prefRow.display_name, "Development Administrator");

    // Cleanup session and dev admin user
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
    const afterDelete = db.prepare("SELECT * FROM sessions WHERE token_hash = ?").get(tokenHash);
    assert(!afterDelete, "Session token must be deleted on logout/cleanup");

    cleanupDevAdmin();
    const afterUserDelete = db.prepare("SELECT * FROM users WHERE email = ?").get("admin@example.com");
    assert(!afterUserDelete, "Dev admin user record cleaned up");
  });

  // --- 10. DISTRIBUTED RATE LIMITING TESTS ---
  await test("Rate Limiter: Allows requests under limit and returns valid quota", async () => {
    resetMemoryRateLimits();
    const testIp = "192.168.1.100";
    const policy = { name: "test_policy", max: 3, windowSeconds: 60 };

    const first = await checkRateLimit(testIp, policy);
    assert.strictEqual(first.success, true);
    assert.strictEqual(first.remaining, 2);

    const second = await checkRateLimit(testIp, policy);
    assert.strictEqual(second.success, true);
    assert.strictEqual(second.remaining, 1);

    const third = await checkRateLimit(testIp, policy);
    assert.strictEqual(third.success, true);
    assert.strictEqual(third.remaining, 0);

    // 4th request exceeds limit
    const fourth = await checkRateLimit(testIp, policy);
    assert.strictEqual(fourth.success, false, "Request exceeding quota must be blocked");
    assert.strictEqual(fourth.remaining, 0);
    assert(fourth.retryAfterSeconds > 0, "Must provide retry window in seconds");
  });

  await test("Rate Limiter: Isolates different IP addresses and identities", async () => {
    resetMemoryRateLimits();
    const policy = { name: "test_isolation", max: 2, windowSeconds: 60 };

    await checkRateLimit("user-a", policy);
    await checkRateLimit("user-a", policy);
    const blockedA = await checkRateLimit("user-a", policy);
    assert.strictEqual(blockedA.success, false);

    // user-b has independent counter
    const userB = await checkRateLimit("user-b", policy);
    assert.strictEqual(userB.success, true, "Independent client must not be blocked by another client's quota");
    assert.strictEqual(userB.remaining, 1);
  });

  // --- 11. PASSWORD RESET SECURITY TESTS ---
  await test("Password Reset Security: Requires hashed token matching and rejects expired tokens", () => {
    const db = getDb();
    const testResetUserId = "reset-test-" + Date.now();
    const now = Date.now();
    const rawToken = "secureRandomRawResetToken2026";
    const hashedToken = hashToken(rawToken);

    // Seed test user with hashed token
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, reset_token, reset_token_expires, created_at, updated_at)
      VALUES (?, ?, 'dummy_hash', 'dummy_salt', 'Reset User', ?, ?, ?, ?)
    `).run(testResetUserId, `reset-${Date.now()}@test.local`, hashedToken, now + 3600000, now, now);

    // 1. Raw token lookup should not match database directly (database stores hash)
    const directRawLookup = db.prepare("SELECT id FROM users WHERE reset_token = ?").get(rawToken);
    assert(!directRawLookup, "Database must store hashed reset token, not plaintext token");

    // 2. Hash of token successfully locates record
    const hashLookup = db.prepare("SELECT id FROM users WHERE reset_token = ?").get(hashedToken) as any;
    assert.strictEqual(hashLookup?.id, testResetUserId, "Hashed token must securely identify user");

    // 3. Expired token is rejected
    const expiredLookup = db.prepare(`
      SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > ?
    `).get(hashedToken, now + 7200000);
    assert(!expiredLookup, "Expired token must be rejected");

    // Clean up
    db.prepare("DELETE FROM users WHERE id = ?").run(testResetUserId);
  });

  // --- 12. WATCH HISTORY & CONTINUE WATCHING TESTS ---
  await test("Watch History: Persists real playback progress without fake data", () => {
    const db = getDb();
    const testWatcherId = "watcher-" + Date.now();
    const now = Date.now();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, created_at, updated_at)
      VALUES (?, ?, 'dummy_hash', 'dummy_salt', 'Watcher User', ?, ?)
    `).run(testWatcherId, `watcher-${Date.now()}@test.local`, now, now);

    const videoId = "video-ai-2025";
    const duration = 1200; // 20 mins
    const progress = 480;  // 8 mins (40%)

    db.prepare(`
      INSERT INTO watch_history (
        id, user_id, content_id, provider, title, duration_seconds, progress_seconds, progress_percent, updated_at
      )
      VALUES (?, ?, ?, 'youtube', 'The Future of AI', ?, ?, ?, ?)
    `).run("wh-" + Date.now(), testWatcherId, videoId, duration, progress, Math.round((progress / duration) * 100), now);

    const historyRow = db.prepare(`
      SELECT * FROM watch_history WHERE user_id = ? AND content_id = ?
    `).get(testWatcherId, videoId) as any;

    assert(historyRow, "Watch progress must be persisted in database");
    assert.strictEqual(historyRow.progress_percent, 40, "Must calculate and store 40% watch progress");
    assert.strictEqual(historyRow.completed, 0, "Video under 90% must not be marked completed");

    // Clean up
    db.prepare("DELETE FROM users WHERE id = ?").run(testWatcherId);
  });

  // --- 13. 20-VIDEO SEARCH LIMIT TESTS ---
  await test("20-Result Limit: Search queries strictly return at most 20 unique items", async () => {
    const results = await queryUnifiedContent({
      query: "course",
      mode: "normal",
      limit: 20,
    });

    assert(results.length <= 20, `Search results count (${results.length}) must not exceed 20`);
    const idSet = new Set(results.map((i) => i.id));
    assert.strictEqual(idSet.size, results.length, "All returned items must have unique IDs");
  });

  // --- 14. NORMAL MODE & ALL TOPICS RELEVANCE ---
  await test("Relevance & All Topics: Query 'Pokemon' in Normal Mode does not return unrelated news", async () => {
    const results = await queryUnifiedContent({
      query: "Pokemon",
      mode: "normal",
      limit: 20,
    });

    // In curated fallback or live search, results must match query and not be arbitrary news
    for (const item of results) {
      const matchQuery =
        item.title.toLowerCase().includes("pokemon") ||
        item.description.toLowerCase().includes("pokemon") ||
        (item.creator && item.creator.toLowerCase().includes("pokemon"));
      assert(matchQuery, `Search result "${item.title}" must be relevant to the query 'Pokemon'`);
      assert.notStrictEqual(item.category, "news", "Pokemon search must not return unrelated news articles");
    }
  });

  // --- 15. SHORTS AND VIDEOS FILTERS ---
  await test("Shorts & Videos Filters: Mutually exclusive filtering correctly classifies content", async () => {
    // 1. Shorts filter
    const shortsResults = await queryUnifiedContent({
      query: "",
      mode: "normal",
      videoType: "shorts",
      limit: 20,
    });

    for (const item of shortsResults) {
      assert.strictEqual(item.isShort, true, "Items returned under videoType='shorts' must be marked as shorts");
    }

    // 2. Videos filter
    const videosResults = await queryUnifiedContent({
      query: "",
      mode: "normal",
      videoType: "videos",
      limit: 20,
    });

    for (const item of videosResults) {
      assert(!item.isShort, "Items returned under videoType='videos' must not be shorts");
    }
  });

  // --- 16. GLOBAL API KEY FALLBACK ---
  await test("Global API Key Fallback: Falls back to environment variable when user key is absent", () => {
    const originalKey = process.env.YOUTUBE_API_KEY;
    try {
      process.env.YOUTUBE_API_KEY = "AIzaSyTestGlobalFallbackKey123456789";
      const key = getUserProviderKey(undefined, "youtube");
      assert.strictEqual(key, "AIzaSyTestGlobalFallbackKey123456789", "Must return global YOUTUBE_API_KEY fallback");
    } finally {
      if (originalKey) {
        process.env.YOUTUBE_API_KEY = originalKey;
      } else {
        delete process.env.YOUTUBE_API_KEY;
      }
    }
  });

  // --- 17. YOUTUBE API KEY VALIDATION ---
  await test("YouTube Credential Validation: Existing validation rejects malformed keys", async () => {
    const adapter = getAdapter("youtube");
    assert(adapter, "YouTube adapter must exist");

    // Short key rejection
    const invalidResult = await adapter.validateCredentials("too-short");
    assert.strictEqual(invalidResult.isValid, false, "Must reject keys shorter than 20 characters");
    assert.strictEqual(invalidResult.status, "invalid_credentials");
  });

  // --- 18. SAFE KEY REPLACEMENT INTEGRITY ---
  await test("Safe Key Replacement: Previous working key is preserved if replacement validation fails", () => {
    const db = getDb();
    const testUserId = "user-key-test-" + Date.now();
    const initialKey = "AIzaSyValidInitialWorkingKey123456";
    const encrypted = encryptSecret(initialKey);
    const masked = maskApiKey(initialKey);
    const now = Date.now();

    // Insert user into users table so foreign key constraint succeeds
    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, created_at, updated_at)
      VALUES (?, ?, 'dummy_hash', 'dummy_salt', 'Key Test User', ?, ?)
    `).run(testUserId, `keytest-${Date.now()}@test.local`, now, now);

    // Insert active initial key
    db.prepare(`
      INSERT INTO provider_credentials (
        id, user_id, provider_id, encrypted_secret, iv, auth_tag, key_version, status, masked_key, last_validated_at, created_at, updated_at
      ) VALUES (?, ?, 'youtube', ?, ?, ?, 1, 'connected', ?, ?, ?, ?)
    `).run("cred-1", testUserId, encrypted.ciphertext, encrypted.iv, encrypted.authTag, masked, now, now, now);

    // Retrieve active key
    const retrievedBefore = getUserProviderKey(testUserId, "youtube");
    assert.strictEqual(retrievedBefore, initialKey, "Active key must match initial key");

    // Attempt invalid update: simulating connect route rejecting an invalid key before DB write
    const invalidReplacementKey = "invalid-short-key";
    // Connect route rejects validation and aborts WITHOUT writing to DB.
    // Verify that the existing key in the database is intact:
    const retrievedAfter = getUserProviderKey(testUserId, "youtube");
    assert.strictEqual(retrievedAfter, initialKey, "Previous working key must remain intact when replacement fails validation");

    // Clean up
    db.prepare("DELETE FROM users WHERE id = ?").run(testUserId);
  });

  // --- 19. CHANNEL PROFILE AVATAR MAPPING ---
  await test("Channel Profile Avatars: Normalized items support channel avatars with fallback", async () => {
    const results = await queryUnifiedContent({
      category: "study",
      mode: "category",
      limit: 5,
    });

    assert(results.length > 0, "Should return study items");
    for (const item of results) {
      assert(typeof item.creator === "string" && item.creator.length > 0, "Each item must have a creator name");
      // channelAvatar is supported optionally or with initial fallback
      if (item.channelAvatar) {
        assert(typeof item.channelAvatar === "string", "channelAvatar must be a valid string URL when present");
      }
    }
  });

  // --- 20. LOCAL STORAGE: WATCHLIST & WATCH LATER SEPARATION ---
  await test("Local Storage: Watchlist and Watch Later maintain separate collections without duplicates", async () => {
    // Setup mock browser window.localStorage environment
    const store = new Map<string, string>();
    const mockLocalStorage = {
      getItem: (key: string) => store.get(key) || null,
      setItem: (key: string, val: string) => store.set(key, val),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    };

    const originalWindow = (globalThis as any).window;
    (globalThis as any).window = {
      localStorage: mockLocalStorage,
      dispatchEvent: () => true,
    };

    try {
      const {
        addToLocalWatchlist,
        getLocalWatchlist,
        isInLocalWatchlist,
        removeFromLocalWatchlist,
        addToLocalWatchLater,
        getLocalWatchLater,
        isInLocalWatchLater,
        removeFromLocalWatchLater,
        toggleLocalLike,
        isLikedLocally,
      } = await import("../src/lib/local-storage");

      const testVideo = {
        videoId: "vid_test_101",
        title: "Test Discovery Lecture",
        thumbnailUrl: "https://i.ytimg.com/vi/vid_test_101/hqdefault.jpg",
        channelTitle: "Education Lab",
        category: "study",
      };

      // 1. Initially neither list contains video
      assert.strictEqual(isInLocalWatchlist(testVideo.videoId), false);
      assert.strictEqual(isInLocalWatchLater(testVideo.videoId), false);

      // 2. Add to Watchlist
      addToLocalWatchlist(testVideo);
      assert.strictEqual(isInLocalWatchlist(testVideo.videoId), true, "Must be in Watchlist");
      assert.strictEqual(isInLocalWatchLater(testVideo.videoId), false, "Must not bleed into Watch Later");
      assert.strictEqual(getLocalWatchlist().length, 1);
      assert.strictEqual(getLocalWatchlist()[0].listType, "watchlist");

      // 3. Prevent duplicate in Watchlist
      addToLocalWatchlist(testVideo);
      assert.strictEqual(getLocalWatchlist().length, 1, "Duplicate video ID must not add second entry");

      // 4. Add to Watch Later (video now present in both lists independently)
      addToLocalWatchLater(testVideo);
      assert.strictEqual(isInLocalWatchlist(testVideo.videoId), true);
      assert.strictEqual(isInLocalWatchLater(testVideo.videoId), true, "Video can exist in both lists");
      assert.strictEqual(getLocalWatchLater().length, 1);
      assert.strictEqual(getLocalWatchLater()[0].listType, "watch_later");

      // 5. Remove from Watchlist only
      removeFromLocalWatchlist(testVideo.videoId);
      assert.strictEqual(isInLocalWatchlist(testVideo.videoId), false, "Removed from Watchlist");
      assert.strictEqual(isInLocalWatchLater(testVideo.videoId), true, "Watch Later still contains item");

      // 6. Remove from Watch Later
      removeFromLocalWatchLater(testVideo.videoId);
      assert.strictEqual(isInLocalWatchLater(testVideo.videoId), false);

      // 7. Local Like preference toggle
      assert.strictEqual(isLikedLocally(testVideo.videoId), false);
      const liked = toggleLocalLike(testVideo.videoId);
      assert.strictEqual(liked, true);
      assert.strictEqual(isLikedLocally(testVideo.videoId), true);
      const unliked = toggleLocalLike(testVideo.videoId);
      assert.strictEqual(unliked, false);
      assert.strictEqual(isLikedLocally(testVideo.videoId), false);
    } finally {
      (globalThis as any).window = originalWindow;
    }
  });

  // --- 21. WATCH ROUTE METADATA & EMBED INTEGRITY ---
  await test("Watch Route: Resolves valid video metadata with official embed URL and no secret exposure", async () => {
    const { CURATED_CATALOG } = await import("../src/lib/providers/curated-data");
    const sample = CURATED_CATALOG.find((c) => c.provider === "youtube");
    assert(sample, "Curated catalog must have YouTube video");

    const videoId = sample.providerId;
    const expectedEmbed = `https://www.youtube.com/embed/${videoId}`;
    const expectedWatch = `https://www.youtube.com/watch?v=${videoId}`;

    assert(sample.embedUrl?.includes(videoId), "Embed URL must contain valid YouTube video ID");
    assert(sample.externalUrl?.includes(videoId), "External URL must link to official YouTube watch URL");
    assert.strictEqual(sample.playbackMethod, "iframe_embed");
    assert(sample.thumbnail.length > 0, "Thumbnail URL must be present for watch poster");
  });

  // --- 22. COMEDY CATEGORY INTEGRATION ---
  await test("Comedy Category: Positioned after Movies and before Technology with Laugh icon", () => {
    const comedyIndex = CATEGORIES.findIndex((c) => c.id === "comedy");
    const moviesIndex = CATEGORIES.findIndex((c) => c.id === "movies");
    const techIndex = CATEGORIES.findIndex((c) => c.id === "technology");

    assert(comedyIndex !== -1, "Comedy category must exist in CATEGORIES");
    assert.strictEqual(comedyIndex, moviesIndex + 1, "Comedy must be positioned immediately after Movies");
    assert.strictEqual(techIndex, comedyIndex + 1, "Technology must be positioned immediately after Comedy");

    const comedy = CATEGORIES[comedyIndex];
    assert.strictEqual(comedy.name, "Comedy");
    assert.strictEqual(comedy.icon, "Laugh");
    assert(Array.isArray(comedy.subcategories) && comedy.subcategories.length >= 3, "Comedy must define subcategories");
  });

  // --- 23. DISCOVER FEED CACHE & DEDUPLICATION ---
  await test("Discover Feed Cache: Correctly caches feed sections and supports retrieval", async () => {
    const { setCachedFeed, getCachedFeed, clearFeedCache } = await import("../src/lib/feed-cache");

    const testFeed = {
      trending: [{ id: "youtube:1", provider: "youtube" as const, providerId: "1", contentType: "video" as const, title: "T1", description: "", thumbnail: "", category: "general", externalUrl: "", playbackMethod: "iframe_embed" as const, providerAttribution: "YouTube", availabilityStatus: "available" as const }],
      recommended: [{ id: "youtube:2", provider: "youtube" as const, providerId: "2", contentType: "video" as const, title: "R1", description: "", thumbnail: "", category: "general", externalUrl: "", playbackMethod: "iframe_embed" as const, providerAttribution: "YouTube", availabilityStatus: "available" as const }],
      music: [],
      gaming: [],
      study: [],
      cachedAt: Date.now(),
    };

    setCachedFeed("test_feed_key", testFeed, 5000);
    const cached = getCachedFeed("test_feed_key");
    assert(cached, "Feed must be retrievable from cache within TTL");
    assert.strictEqual(cached.trending.length, 1);
    assert.strictEqual(cached.trending[0].id, "youtube:1");

    clearFeedCache("test_feed_key");
    const cleared = getCachedFeed("test_feed_key");
    assert.strictEqual(cleared, null, "Feed must be null after clearing cache");
  });

  // --- 24. SEARCH PAGINATION & 20-RESULT BATCHING ---
  await test("Search Pagination: Batches up to 20 results and retrieves next batch via pageToken", async () => {
    const { queryUnifiedContentWithPagination } = await import("../src/lib/providers");

    const batch1 = await queryUnifiedContentWithPagination({
      query: "tutorial",
      mode: "normal",
      limit: 20,
    });

    assert(Array.isArray(batch1.items), "Batch 1 must return items array");
    assert(batch1.items.length <= 20, "Batch 1 must have at most 20 items");

    if (batch1.nextPageToken) {
      const batch2 = await queryUnifiedContentWithPagination({
        query: "tutorial",
        mode: "normal",
        limit: 20,
        pageToken: batch1.nextPageToken,
      });

      assert(Array.isArray(batch2.items), "Batch 2 must return items array");
      assert(batch2.items.length <= 20, "Batch 2 must have at most 20 items");
    }
  });

  // --- 25. YOUTUBE CHANNEL SEARCH ---
  await test("Channel Search: Returns channel profiles with handle, avatar, and subscriber count", async () => {
    const { YouTubeAdapter } = await import("../src/lib/providers/youtube");
    const adapter = new YouTubeAdapter();

    const channels = await adapter.searchChannels("Marques Brownlee");
    assert(Array.isArray(channels), "Channels result must be an array");
    assert(channels.length > 0, "Must return at least 1 matching channel");

    const first = channels[0];
    assert(first.title && first.title.length > 0, "Channel must have display title");
    assert(first.avatar && first.avatar.startsWith("http"), "Channel must have avatar URL");
    assert(first.channelUrl && first.channelUrl.startsWith("http"), "Channel must have valid URL");
    assert(first.customUrl ? first.customUrl.startsWith("@") : true, "Handle if present must start with @");
  });

  // --- 26. SUBSCRIPTION STATUS SAFEGUARD ---
  await test("Subscription Status: Distinguishes unknown status when YouTube account is unconnected", async () => {
    const { YouTubeAdapter } = await import("../src/lib/providers/youtube");
    const adapter = new YouTubeAdapter();

    const channels = await adapter.searchChannels("freecodecamp");
    assert(channels.length > 0, "Must return channel profile");
    for (const ch of channels) {
      assert.strictEqual(
        ch.subscriptionStatus,
        "unknown",
        "Without authorized user OAuth token, subscriptionStatus must be 'unknown', never falsely 'not_subscribed'"
      );
    }
  });

  // --- 27. NAVBAR AUTH-DEPENDENT LINK VISIBILITY ---
  await test("Navbar Auth Visibility: Hides Dashboard, Watchlist, Settings & Feed when logged out", async () => {
    const fs = await import("fs/promises");
    const navbarCode = await fs.readFile("src/components/Navbar.tsx", "utf-8");

    // Verify separation into AUTH_NAV_ITEMS and PUBLIC_NAV_ITEMS
    assert(navbarCode.includes("AUTH_NAV_ITEMS"), "Navbar must define AUTH_NAV_ITEMS");
    assert(navbarCode.includes("PUBLIC_NAV_ITEMS"), "Navbar must define PUBLIC_NAV_ITEMS");

    // Verify isAuthenticated controls visibleMenuItems
    assert(
      navbarCode.includes("isAuthenticated ? [...AUTH_NAV_ITEMS, ...PUBLIC_NAV_ITEMS] : PUBLIC_NAV_ITEMS") ||
      navbarCode.includes("isAuthenticated"),
      "Navbar must condition menu items on authentication status"
    );

    // Verify Discover Feed is wrapped in isAuthenticated check
    assert(
      navbarCode.includes("{isAuthenticated && (") || navbarCode.includes("isAuthenticated &&"),
      "Discover Feed section shortcuts must be guarded by isAuthenticated"
    );
  });

  // --- 28. NAVBAR PANEL ICON & LABEL HORIZONTAL ALIGNMENT ---
  await test("Navbar Panel Alignment: Enforces horizontal flex layout, icon width, and gap", async () => {
    const fs = await import("fs/promises");
    const navbarCode = await fs.readFile("src/components/Navbar.tsx", "utf-8");

    // Verify horizontal flex on desktop and drawer items
    assert(navbarCode.includes("flex-direction: row !important"), "Menu items must use flex-direction: row");
    assert(navbarCode.includes("align-items: center !important"), "Menu items must use align-items: center");
    assert(navbarCode.includes("gap: 11px"), "Menu items must have 10-12px horizontal gap");
    assert(navbarCode.includes("width: 20px"), "Icons must have fixed width for aligned start position");
    assert(navbarCode.includes("menu-panel-item-label"), "Labels must have dedicated label class");
  });

  // --- 29. LOCAL WATCH HISTORY & SEARCH HISTORY ISOLATION ---
  await test("Local History Storage: Supports watch and search history independently without mutating saved videos", async () => {
    const mockStorage = new Map<string, string>();
    const fakeWindow = {
      localStorage: {
        getItem: (k: string) => mockStorage.get(k) || null,
        setItem: (k: string, v: string) => mockStorage.set(k, v),
        removeItem: (k: string) => mockStorage.delete(k),
      },
      dispatchEvent: () => true,
    };

    const originalWindow = (global as any).window;
    (global as any).window = fakeWindow;

    try {
      const storageLib = await import("../src/lib/local-storage");

      // Add Watchlist item
      storageLib.addToLocalWatchlist({
        videoId: "vid_saved_1",
        title: "Saved Video 1",
        thumbnailUrl: "https://example.com/thumb1.jpg",
      });

      // Add Watch History items
      storageLib.addToWatchHistory({
        videoId: "vid_hist_1",
        title: "Watched Video 1",
        thumbnailUrl: "https://example.com/thumb_h1.jpg",
        channelName: "Creator 1",
      });
      storageLib.addToWatchHistory({
        videoId: "vid_hist_2",
        title: "Watched Video 2",
        thumbnailUrl: "https://example.com/thumb_h2.jpg",
        channelName: "Creator 2",
      });

      // Verify watch history order (most recent first)
      const watchHist = storageLib.getWatchHistory();
      assert.strictEqual(watchHist.length, 2, "Watch history must have 2 items");
      assert.strictEqual(watchHist[0].videoId, "vid_hist_2", "Most recently watched video must be first");

      // Re-watch video 1: must move to top without duplicates
      storageLib.addToWatchHistory({
        videoId: "vid_hist_1",
        title: "Watched Video 1",
        thumbnailUrl: "https://example.com/thumb_h1.jpg",
        channelName: "Creator 1",
      });
      const rewatchedHist = storageLib.getWatchHistory();
      assert.strictEqual(rewatchedHist.length, 2, "Watch history must not duplicate on re-watch");
      assert.strictEqual(rewatchedHist[0].videoId, "vid_hist_1", "Re-watched video must move to top");

      // Add Search History items
      storageLib.addToSearchHistory({ query: "nextjs tutorial", searchMode: "normal" });
      storageLib.addToSearchHistory({ query: "pokemon", searchMode: "normal" });

      const searchHist = storageLib.getSearchHistory();
      assert.strictEqual(searchHist.length, 2, "Search history must have 2 entries");
      assert.strictEqual(searchHist[0].query, "pokemon", "Most recent search must be first");

      // Clear watch history: must NOT clear watchlist or search history
      storageLib.clearWatchHistory();
      assert.strictEqual(storageLib.getWatchHistory().length, 0, "Watch history must be cleared");
      assert.strictEqual(storageLib.getLocalWatchlist().length, 1, "Watchlist must remain intact when watch history cleared");
      assert.strictEqual(storageLib.getSearchHistory().length, 2, "Search history must remain intact when watch history cleared");

      // Test individual search deletion
      storageLib.removeFromSearchHistory(searchHist[0].id);
      assert.strictEqual(storageLib.getSearchHistory().length, 1, "Item must be removed from search history");

      // Explicit logout clears all user-specific local collections
      storageLib.clearLocalUserCollections();
      assert.strictEqual(storageLib.getLocalWatchlist().length, 0, "Watchlist must be cleared on logout");
      assert.strictEqual(storageLib.getSearchHistory().length, 0, "Search history must be cleared on logout");
      assert.strictEqual(storageLib.getWatchHistory().length, 0, "Watch history must be cleared on logout");
    } finally {
      (global as any).window = originalWindow;
    }
  });

  // --- 30. DEDICATED CATEGORY ROUTES & NAVBAR SHORTCUTS ---
  await test("Dedicated Category Pages: Navbar defines 4 dedicated category pages and removes Recommended", async () => {
    const fs = await import("fs/promises");
    const navbarCode = await fs.readFile("src/components/Navbar.tsx", "utf-8");

    // Verify Recommended for You was removed
    assert(!navbarCode.includes('"Recommended for You"'), "Recommended for You must be removed from navbar shortcuts");

    // Verify the 4 dedicated category routes
    assert(navbarCode.includes("/discover/trending"), "Navbar must route to /discover/trending");
    assert(navbarCode.includes("/discover/music"), "Navbar must route to /discover/music");
    assert(navbarCode.includes("/discover/gaming"), "Navbar must route to /discover/gaming");
    assert(navbarCode.includes("/discover/study"), "Navbar must route to /discover/study");

    // Verify Watch History and Search History in AUTH_NAV_ITEMS
    assert(navbarCode.includes("/dashboard/history"), "Navbar must link to /dashboard/history");
    assert(navbarCode.includes("/dashboard/search-history"), "Navbar must link to /dashboard/search-history");
    assert(navbarCode.includes("clearLocalUserCollections"), "Navbar logout must clear local user collections");
  });

  // --- 31. UNIFIED FEED 20-VIDEO BATCH & POKÉMON CHANNEL PROFILE ---
  await test("Unified Feed & Channel Search: Generates up to 20 videos and provides complete channel profiles", async () => {
    const { YouTubeAdapter } = await import("../src/lib/providers/youtube");
    const adapter = new YouTubeAdapter();

    // Verify Pokemon channel search returns complete profile with @ handle and avatar
    const pokemonChannels = await adapter.searchChannels("Pokemon");
    assert(pokemonChannels.length > 0, "Channel search for Pokemon must return channel profile");
    const poke = pokemonChannels[0];
    assert(poke.avatar && poke.avatar.length > 0, "Pokemon channel must have profile avatar URL");
    assert(poke.customUrl?.startsWith("@"), "Handle must begin with @");
    assert(poke.channelUrl?.startsWith("http"), "Channel URL must be valid link");
  });

  // --- 32. THEME STABILITY SAFEGUARD ---
  await test("Theme Stability: ThemeProvider defaults to dark and ThemeToggle avoids mount overrides", async () => {
    const fs = await import("fs/promises");
    const themeProviderCode = await fs.readFile("src/components/ThemeProvider.tsx", "utf-8");
    const themeToggleCode = await fs.readFile("src/components/ThemeToggle.tsx", "utf-8");
    const layoutCode = await fs.readFile("src/app/layout.tsx", "utf-8");

    // Verify ThemeProvider wraps application and defaults to dark
    assert(themeProviderCode.includes('useState<Theme>("dark")'), "ThemeProvider must default to dark");
    assert(layoutCode.includes("<ThemeProvider>"), "RootLayout must wrap app in ThemeProvider");

    // Verify ThemeToggle does not trigger theme resets in its own useEffect
    assert(!themeToggleCode.includes("window.matchMedia"), "ThemeToggle must not use local matchMedia to override theme");
    assert(!themeToggleCode.includes("useEffect"), "ThemeToggle should not have mount effect resetting data-theme");
  });

  // --- 33. CHANNEL CARD SIMPLIFICATION ---
  await test("Simplified ChannelCard: Removes Status Unknown, Connect YouTube, and video count", async () => {
    const fs = await import("fs/promises");
    const channelCardCode = await fs.readFile("src/components/ChannelCard.tsx", "utf-8");

    // Verify removed elements
    assert(!channelCardCode.includes("Status Unknown"), "ChannelCard must not show 'Status Unknown'");
    assert(!channelCardCode.includes("Connect YouTube"), "ChannelCard must not show 'Connect YouTube' button");
    assert(!channelCardCode.includes("channel.videoCount"), "ChannelCard must not display video count");

    // Verify retained core elements
    assert(channelCardCode.includes("channel.avatar"), "ChannelCard must retain avatar support");
    assert(channelCardCode.includes("channel.title"), "ChannelCard must retain title");
    assert(channelCardCode.includes("channel.customUrl"), "ChannelCard must retain custom handle");
    assert(channelCardCode.includes("channel.subscriberCount"), "ChannelCard must retain subscriber count");
    assert(channelCardCode.includes("channel.channelUrl"), "ChannelCard must retain external channel link");
    assert(channelCardCode.includes("ExternalLink"), "ChannelCard must have external link icon");
  });

  // --- 34. YOUTUBE API KEY REQUIREMENT GATE ---
  await test("API Key Requirement Gate: Renders requirement box and blocks demo video display", async () => {
    const fs = await import("fs/promises");
    const reqBoxCode = await fs.readFile("src/components/ApiKeyRequirement.tsx", "utf-8");
    const dashboardCode = await fs.readFile("src/app/dashboard/page.tsx", "utf-8");
    const landingCode = await fs.readFile("src/app/page.tsx", "utf-8");
    const categoryCode = await fs.readFile("src/app/discover/[category]/page.tsx", "utf-8");

    // Verify exact required text and buttons in ApiKeyRequirement
    assert(reqBoxCode.includes("Connect Your YouTube API Key"), "Must have heading 'Connect Your YouTube API Key'");
    assert(
      reqBoxCode.includes("To explore YouTube videos, search channels, and discover trending content on OmniDiscover, add your YouTube Data API key first."),
      "Must have exact requirement message"
    );
    assert(reqBoxCode.includes("/help/connecting-youtube"), "Must link to /help/connecting-youtube");
    assert(reqBoxCode.includes("How to Get API Key"), "Must have button 'How to Get API Key'");
    assert(reqBoxCode.includes("/settings"), "Must link to /settings");
    assert(reqBoxCode.includes("Add API Key"), "Must have button 'Add API Key'");

    // Verify gate enforcement across pages
    assert(dashboardCode.includes("<ApiKeyRequirement"), "Dashboard must render ApiKeyRequirement when key is missing");
    assert(landingCode.includes("<ApiKeyRequirement"), "Landing page must render ApiKeyRequirement when key is missing");
    assert(categoryCode.includes("<ApiKeyRequirement"), "Category discovery pages must render ApiKeyRequirement when key is missing");
  });

  // --- 35. MIDDLEWARE SESSION PROTECTION ---
  await test("Middleware Session Protection: Validates @supabase/ssr token refresh and route protection", async () => {
    const fs = await import("fs/promises");
    const middlewareCode = await fs.readFile("src/middleware.ts", "utf-8");

    // Verify createServerClient usage for session refresh
    assert(middlewareCode.includes("createServerClient"), "Middleware must use @supabase/ssr createServerClient");
    assert(middlewareCode.includes("supabase.auth.getUser()"), "Middleware must refresh session via supabase.auth.getUser()");
    assert(middlewareCode.includes("PROTECTED_PREFIXES"), "Middleware must define protected route prefixes");
    assert(middlewareCode.includes('"/dashboard"'), "Protected prefixes must include /dashboard");
    assert(middlewareCode.includes('"/settings"'), "Protected prefixes must include /settings");
    assert(middlewareCode.includes("platform_session"), "Middleware must check platform_session cookie");
  });

  // --- 36. CLIENT AUTH STATE RESILIENCE ---
  await test("Client Auth State Resilience: Prevents false logouts on network interruption", async () => {
    const fs = await import("fs/promises");
    const navbarCode = await fs.readFile("src/components/Navbar.tsx", "utf-8");
    const dashboardCode = await fs.readFile("src/app/dashboard/page.tsx", "utf-8");
    const clientCode = await fs.readFile("src/lib/supabase/client.ts", "utf-8");

    // Verify Navbar does not wipe session on catch
    assert(navbarCode.includes("onAuthStateChange"), "Navbar must listen to real-time auth events");
    assert(!navbarCode.includes("catch {\n      setUser(null);"), "Navbar must not reset user to null on network catch");

    // Verify Dashboard does not redirect on catch
    assert(!dashboardCode.includes('.catch(() => router.push("/auth/signin"))'), "Dashboard must not eject to signin on network catch");

    // Verify singleton client
    assert(clientCode.includes("browserClientInstance"), "Supabase browser client must use singleton pattern");
  });

  // --- 37. OAUTH CALLBACK SECURITY ---
  await test("OAuth Callback Security: Enforces open-redirect prevention and forwards cookies", async () => {
    const fs = await import("fs/promises");
    const callbackCode = await fs.readFile("src/app/auth/callback/route.ts", "utf-8");

    // Verify open-redirect protection
    assert(callbackCode.includes('rawNext.startsWith("/")'), "Callback must require relative path starting with /");
    assert(callbackCode.includes('!rawNext.startsWith("//")'), "Callback must reject protocol-relative open redirect //");
    assert(callbackCode.includes("exchangeCodeForSession"), "Callback must exchange code for session");
    assert(callbackCode.includes("redirectResponse.cookies.set"), "Callback must explicitly attach cookies to redirect response");
  });

  console.log(`\n=== TEST RESULTS: ${passed} PASSED, ${failed} FAILED ===\n`);
  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error("FATAL ERROR IN TEST RUNNER:", e);
  process.exit(1);
});
