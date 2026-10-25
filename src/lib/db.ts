import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

let dbInstance: DatabaseSync | null = null;

export function isServerlessEnvironment(): boolean {
  return Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT ||
    (typeof process.cwd === "function" && process.cwd().startsWith("/var/task"))
  );
}

let testDbInstance: DatabaseSync | null = null;
export function getDb(): DatabaseSync {
  // In platform test mode, use an in‑memory SQLite DB to avoid filesystem write‑permissions issues.
  if (process.env.IS_PLATFORM_TEST === "true") {
    if (testDbInstance) return testDbInstance;
    const testDb = new DatabaseSync(":memory:");
    try {
      testDb.exec("PRAGMA foreign_keys = ON;");
      initSchema(testDb);
    } catch (e) {
      console.warn("Failed to initialise in‑memory test DB:", e);
    }
    testDbInstance = testDb;
    return testDbInstance;
  }

  if (dbInstance) return dbInstance;

  // In platform test mode, use an in‑memory SQLite DB to avoid filesystem write‑permissions issues.
  if (process.env.IS_PLATFORM_TEST === "true") {
    const testDb = new DatabaseSync(":memory:");
    try {
      testDb.exec("PRAGMA foreign_keys = ON;");
      initSchema(testDb);
    } catch (e) {
      console.warn("Failed to initialise in‑memory test DB:", e);
    }
    return testDb;
  }

  if (dbInstance) return dbInstance;

  const serverless = isServerlessEnvironment();
  let db: DatabaseSync;

  if (serverless) {
    // In Vercel serverless / AWS Lambda, /var/task is an immutable bundle root.
    // Never attempt to create or access process.cwd()/data.
    try {
      const dataDir = path.join(os.tmpdir(), "platform-data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      db = new DatabaseSync(path.join(dataDir, "platform.db"));
    } catch {
      // Ephemeral in-memory fallback if /tmp is constrained
      db = new DatabaseSync(":memory:");
    }
  } else {
    // Local development and test runners
    let testDb: DatabaseSync | null = null;
    try {
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const dbPath = path.join(dataDir, "platform.db");
      testDb = new DatabaseSync(dbPath);
      // Verify SQLite write and locking capability on this filesystem
      testDb.exec("CREATE TABLE IF NOT EXISTS _sqlite_write_test (id INTEGER PRIMARY KEY);");
      db = testDb;
    } catch {
      if (testDb) {
        try {
          testDb.close();
        } catch {
          // Ignore close error
        }
      }
      // If the current drive/filesystem doesn't permit SQLite locking (e.g. read-only, network/subst drive),
      // fall back to os.tmpdir() or in-memory.
      try {
        const fallbackDir = path.join(os.tmpdir(), "platform-data");
        if (!fs.existsSync(fallbackDir)) {
          fs.mkdirSync(fallbackDir, { recursive: true });
        }
        db = new DatabaseSync(path.join(fallbackDir, "platform.db"));
      } catch {
        db = new DatabaseSync(":memory:");
      }
    }
  }

  try {
    // Enable foreign keys
    db.exec("PRAGMA foreign_keys = ON;");
    initSchema(db);
    try {
      db.exec("ALTER TABLE user_preferences ADD COLUMN country TEXT DEFAULT 'US';");
    } catch {
      // Column may already exist
    }
  } catch (err) {
    console.warn("SQLite schema initialization warning:", err);
  }

  dbInstance = db;
  return dbInstance;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      name TEXT NOT NULL,
      email_verified INTEGER DEFAULT 0,
      verification_token TEXT,
      reset_token TEXT,
      reset_token_expires INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

    -- Terms and Privacy Acceptance
    CREATE TABLE IF NOT EXISTS legal_acceptance (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      terms_version TEXT NOT NULL,
      privacy_version TEXT NOT NULL,
      accepted_at INTEGER NOT NULL,
      user_agent TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_legal_acceptance_user ON legal_acceptance(user_id);

    -- User Sessions
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      user_agent TEXT,
      ip_address TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    -- User Profiles & Preferences
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      display_name TEXT,
      avatar_url TEXT,
      default_mode TEXT DEFAULT 'normal', -- 'normal' or 'category'
      preferred_categories TEXT DEFAULT '[]', -- JSON array
      preferred_languages TEXT DEFAULT '["en"]', -- JSON array
      country TEXT DEFAULT 'US',
      theme TEXT DEFAULT 'system', -- 'dark', 'light', 'system'
      layout_density TEXT DEFAULT 'comfortable', -- 'comfortable' or 'compact'
      reduced_motion INTEGER DEFAULT 0,
      high_contrast INTEGER DEFAULT 0,
      font_scale TEXT DEFAULT 'medium',
      email_alerts INTEGER DEFAULT 1,
      security_alerts INTEGER DEFAULT 1,
      in_app_notifications INTEGER DEFAULT 1,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Encrypted Provider Credentials
    CREATE TABLE IF NOT EXISTS provider_credentials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider_id TEXT NOT NULL, -- 'youtube', 'tmdb', 'spotify'
      encrypted_secret TEXT NOT NULL,
      iv TEXT NOT NULL,
      auth_tag TEXT NOT NULL,
      key_version INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'disconnected', -- 'connected', 'invalid', 'quota_exceeded', 'disconnected'
      masked_key TEXT NOT NULL,
      last_validated_at INTEGER,
      last_error TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(user_id, provider_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_provider_creds_user ON provider_credentials(user_id);

    -- Saved Content / Watchlist
    CREATE TABLE IF NOT EXISTS saved_content (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      content_id TEXT NOT NULL,
      content_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      thumbnail_url TEXT,
      category TEXT NOT NULL,
      external_url TEXT,
      metadata TEXT, -- JSON payload with creator, releaseDate, etc.
      saved_at INTEGER NOT NULL,
      UNIQUE(user_id, provider, content_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_saved_content_user ON saved_content(user_id);
    CREATE INDEX IF NOT EXISTS idx_saved_content_category ON saved_content(user_id, category);

    -- Search History
    CREATE TABLE IF NOT EXISTS search_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      query TEXT NOT NULL,
      category TEXT,
      mode TEXT NOT NULL DEFAULT 'normal',
      searched_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(user_id, query);

    -- Watch History & Playback Progress (Continue Watching)
    CREATE TABLE IF NOT EXISTS watch_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      content_id TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'youtube',
      title TEXT NOT NULL,
      channel_name TEXT,
      thumbnail_url TEXT,
      duration_seconds INTEGER DEFAULT 0,
      progress_seconds INTEGER NOT NULL DEFAULT 0,
      progress_percent INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      UNIQUE(user_id, provider, content_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_watch_history_user ON watch_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_watch_history_updated ON watch_history(user_id, updated_at DESC);

    -- Security Audit Log
    CREATE TABLE IF NOT EXISTS security_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      event_type TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id);

    -- OAuth Connections (Encrypted tokens for connected accounts such as YouTube)
    CREATE TABLE IF NOT EXISTS oauth_connections (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      provider TEXT NOT NULL, -- e.g. 'youtube', 'google'
      encrypted_access_token TEXT NOT NULL,
      iv TEXT NOT NULL,
      auth_tag TEXT NOT NULL,
      encrypted_refresh_token TEXT,
      refresh_iv TEXT,
      refresh_auth_tag TEXT,
      expires_at INTEGER,
      scope TEXT,
      channel_id TEXT,
      channel_title TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(user_id, provider),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_oauth_connections_user ON oauth_connections(user_id);

    -- Content Feedback (Explicit user feedback: not_interested, like, dislike)
    CREATE TABLE IF NOT EXISTS content_feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      content_id TEXT NOT NULL,
      feedback_type TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE(user_id, content_id, feedback_type),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_content_feedback_user ON content_feedback(user_id);
    CREATE INDEX IF NOT EXISTS idx_content_feedback_user_type ON content_feedback(user_id, feedback_type);

    -- Persistent Learned Recommendation Profiles
    CREATE TABLE IF NOT EXISTS user_recommendation_profiles (
      user_id TEXT PRIMARY KEY,
      category_affinities TEXT NOT NULL DEFAULT '{}', -- JSON object
      creator_affinities TEXT NOT NULL DEFAULT '{}',  -- JSON object
      search_topics TEXT NOT NULL DEFAULT '[]',       -- JSON array
      negative_content_ids TEXT NOT NULL DEFAULT '[]',-- JSON array
      liked_content_ids TEXT NOT NULL DEFAULT '[]',   -- JSON array
      total_completed_watches INTEGER NOT NULL DEFAULT 0,
      total_watch_seconds INTEGER NOT NULL DEFAULT 0,
      profile_version INTEGER NOT NULL DEFAULT 1,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_rec_profiles_user ON user_recommendation_profiles(user_id);
  `);
}
