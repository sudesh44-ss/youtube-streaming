import crypto from "node:crypto";
import { getDb } from "./db";
import {
  createSession,
  setSessionCookie,
  logSecurityEvent,
  hashPassword,
  TERMS_VERSION,
  PRIVACY_VERSION,
} from "./auth";

/**
 * Default development credentials for local testing only.
 * These are never used or allowed in production.
 */
export const DEV_ADMIN_DEFAULT_EMAIL = "admin@example.com";
export const DEV_ADMIN_DEFAULT_PASSWORD = "ChangeThisAdminPassword123!";

/**
 * Returns true strictly when the server environment is not production.
 */
export function isDevEnvironment(): boolean {
  return process.env.NODE_ENV !== "production";
}

/**
 * Returns configured dev admin credentials.
 * Can be overridden via DEV_ADMIN_EMAIL and DEV_ADMIN_PASSWORD in .env.local.
 */
export function getDevAdminCredentials() {
  const envEmail = process.env.DEV_ADMIN_EMAIL?.trim().toLowerCase();
  const envPassword = process.env.DEV_ADMIN_PASSWORD?.trim();

  const email = (envEmail && envEmail.length > 0) ? envEmail : DEV_ADMIN_DEFAULT_EMAIL;
  // If DEV_ADMIN_PASSWORD is not configured or left as the placeholder, safely default to DEV_ADMIN_DEFAULT_PASSWORD
  const password = (!envPassword || envPassword.length === 0 || envPassword === "your_local_testing_password_here")
    ? DEV_ADMIN_DEFAULT_PASSWORD
    : envPassword;

  return { email, password };
}

/**
 * Checks if the email matches the configured dev admin testing account.
 */
export function isDevAdminAttempt(email: string): boolean {
  if (!isDevEnvironment()) return false;
  const config = getDevAdminCredentials();
  return email.trim().toLowerCase() === config.email;
}

/**
 * Validates dev admin credentials against configurable dev testing credentials.
 * Only succeeds if isDevEnvironment() is true.
 */
export function verifyDevAdminCredentials(email: string, password: string): boolean {
  if (!isDevEnvironment()) {
    return false;
  }

  if (!email || !password) {
    return false;
  }

  const config = getDevAdminCredentials();
  const normalizedEmail = email.trim().toLowerCase();

  if (normalizedEmail !== config.email) {
    return false;
  }

  const bufA = Buffer.from(password);
  const bufB = Buffer.from(config.password);

  const exactMatch = bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
  if (exactMatch) {
    return true;
  }

  // Handle accidental trailing or leading whitespace in user input
  const bufTrimmed = Buffer.from(password.trim());
  return bufTrimmed.length === bufB.length && crypto.timingSafeEqual(bufTrimmed, bufB);
}

/**
 * Ensures the dev admin account exists in SQLite users and user_preferences tables.
 * This guarantees foreign key consistency, session creation, and valid profile lookups.
 */
export function ensureDevAdminUser(): {
  id: string;
  email: string;
  name: string;
  email_verified: number;
  created_at: number;
} {
  const db = getDb();
  const config = getDevAdminCredentials();
  const now = Date.now();

  let user = db.prepare("SELECT * FROM users WHERE email = ?").get(config.email) as any;

  if (!user) {
    const devUserId = "dev-admin-" + crypto.createHash("sha256").update(config.email).digest("hex").slice(0, 12);
    const { hash, salt } = hashPassword(config.password);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, salt, name, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).run(devUserId, config.email, hash, salt, "Development Administrator", now, now);

    db.prepare(`
      INSERT OR IGNORE INTO user_preferences (user_id, display_name, default_mode, preferred_categories, preferred_languages, theme, updated_at)
      VALUES (?, 'Development Administrator', 'normal', '["study","technology"]', '["en"]', 'system', ?)
    `).run(devUserId, now);

    db.prepare(`
      INSERT OR IGNORE INTO legal_acceptance (id, user_id, terms_version, privacy_version, accepted_at, user_agent)
      VALUES (?, ?, ?, ?, ?, 'LocalDevEnvironment')
    `).run("legal-" + devUserId, devUserId, TERMS_VERSION, PRIVACY_VERSION, now);

    user = db.prepare("SELECT * FROM users WHERE email = ?").get(config.email) as any;
  } else {
    // If the dev admin user already exists, ensure the password hash matches the configured password
    const { hash, salt } = hashPassword(config.password);
    db.prepare(`
      UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?
    `).run(hash, salt, now, user.id);

    // Ensure preferences and legal acceptance exist
    db.prepare(`
      INSERT OR IGNORE INTO user_preferences (user_id, display_name, default_mode, preferred_categories, preferred_languages, theme, updated_at)
      VALUES (?, 'Development Administrator', 'normal', '["study","technology"]', '["en"]', 'system', ?)
    `).run(user.id, now);

    db.prepare(`
      INSERT OR IGNORE INTO legal_acceptance (id, user_id, terms_version, privacy_version, accepted_at, user_agent)
      VALUES (?, ?, ?, ?, ?, 'LocalDevEnvironment')
    `).run("legal-" + user.id, user.id, TERMS_VERSION, PRIVACY_VERSION, now);
  }

  return user;
}

/**
 * Creates a raw session token and stores it in SQLite sessions table for the dev admin user.
 */
export function createDevAdminSession(options?: { userAgent?: string; ipAddress?: string }): {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    createdAt: number;
  };
  rawToken: string;
} {
  const user = ensureDevAdminUser();
  const rawToken = createSession(user.id, options?.userAgent, options?.ipAddress);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: Boolean(user.email_verified),
      createdAt: user.created_at,
    },
    rawToken,
  };
}

/**
 * Handles the complete dev admin login cycle: validates environment, ensures user,
 * generates session, sets HTTP-only session cookie, and records security audit log.
 */
export async function handleDevAdminLogin(options: { userAgent?: string; ip?: string }) {
  if (!isDevEnvironment()) {
    throw new Error("Dev admin login is not available in production.");
  }

  const { user, rawToken } = createDevAdminSession({
    userAgent: options.userAgent,
    ipAddress: options.ip,
  });

  await setSessionCookie(rawToken);

  logSecurityEvent(
    user.id,
    "DEV_ADMIN_LOGIN_SUCCESS",
    "Authenticated via local development testing path",
    options.ip,
    options.userAgent
  );

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      isDevAdmin: true,
    },
  };
}

/**
 * Utility to completely clean up dev admin user and associated records from database.
 */
export function cleanupDevAdmin() {
  const db = getDb();
  const config = getDevAdminCredentials();
  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(config.email) as any;
  if (user) {
    db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
  }
}
