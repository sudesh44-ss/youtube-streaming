import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { hashToken } from "./crypto";
import { UserSession, BrowsingMode } from "./types";
import { isSupabaseServerConfigured, createServerSupabaseClient } from "./supabase/server";

const SESSION_COOKIE = "platform_session";
const SESSION_TTL_DAYS = 30;

export const TERMS_VERSION = "2026.1";
export const PRIVACY_VERSION = "2026.1";

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const userSalt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, userSalt, 100000, 64, "sha512").toString("hex");
  return { hash, salt: userSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const result = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(result, "hex"));
}

export function validatePasswordStrength(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long." };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, message: "Password must include at least one letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must include at least one number." };
  }
  return { valid: true };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function createSession(userId: string, userAgent?: string, ipAddress?: string): string {
  const db = getDb();
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const sessionId = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

  db.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, user_agent, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(sessionId, userId, tokenHash, expiresAt, now, userAgent || null, ipAddress || null);

  return rawToken;
}

export async function setSessionCookie(rawToken: string) {
  try {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    });
  } catch (err: any) {
    if (err?.message?.includes("outside a request scope") || err?.digest?.includes("DYNAMIC_SERVER_USAGE")) {
      return;
    }
    throw err;
  }
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    const db = getDb();
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
  }
  cookieStore.delete(SESSION_COOKIE);

  if (isSupabaseServerConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // Graceful logout
    }
  }
}

export async function getCurrentSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE)?.value;

  if (!rawToken) {
    // If no SQLite session cookie is present, bridge to Supabase Auth if configured
    if (isSupabaseServerConfigured()) {
      try {
        const supabase = await createServerSupabaseClient();
        const { data: { user: sbUser }, error: sbErr } = await supabase.auth.getUser();
        if (sbUser && !sbErr) {
          const { data: prefData } = await supabase
            .from("user_preferences")
            .select("*")
            .eq("user_id", sbUser.id)
            .maybeSingle();

          return {
            user: {
              id: sbUser.id,
              email: sbUser.email || "",
              name: (sbUser.user_metadata?.name || sbUser.user_metadata?.full_name || sbUser.email?.split("@")[0] || "User"),
              emailVerified: Boolean(sbUser.email_confirmed_at),
              createdAt: new Date(sbUser.created_at).getTime(),
            },
            preferences: {
              defaultMode: (prefData?.default_mode as BrowsingMode) || "normal",
              preferredCategories: prefData?.preferred_categories || ["technology", "music"],
              preferredLanguages: prefData?.preferred_languages || ["en"],
              theme: prefData?.theme || "system",
              layoutDensity: prefData?.layout_density || "comfortable",
              reducedMotion: Boolean(prefData?.reduced_motion),
              highContrast: Boolean(prefData?.high_contrast),
              fontScale: prefData?.font_scale || "medium",
              emailAlerts: prefData?.email_alerts !== false,
              securityAlerts: prefData?.security_alerts !== false,
              inAppNotifications: prefData?.in_app_notifications !== false,
            },
          };
        }
      } catch {
        // Fall through to null session
      }
    }
    return null;
  }

  try {
    const tokenHash = hashToken(rawToken);
    const db = getDb();
    const now = Date.now();

    const sessionRow = db.prepare(`
      SELECT s.id as session_id, s.expires_at, u.id as user_id, u.email, u.name, u.email_verified, u.created_at
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.token_hash = ? AND s.expires_at > ?
    `).get(tokenHash, now) as any;

    if (!sessionRow) {
      return null;
    }

    // Fetch user preferences
    const prefRow = db.prepare(`
      SELECT * FROM user_preferences WHERE user_id = ?
    `).get(sessionRow.user_id) as any;

    let preferredCategories: string[] = [];
    let preferredLanguages: string[] = ["en"];

    if (prefRow?.preferred_categories) {
      try {
        preferredCategories = JSON.parse(prefRow.preferred_categories);
      } catch {
        preferredCategories = [];
      }
    }

    if (prefRow?.preferred_languages) {
      try {
        preferredLanguages = JSON.parse(prefRow.preferred_languages);
      } catch {
        preferredLanguages = ["en"];
      }
    }

    return {
      user: {
        id: sessionRow.user_id,
        email: sessionRow.email,
        name: sessionRow.name,
        emailVerified: Boolean(sessionRow.email_verified),
        createdAt: sessionRow.created_at,
      },
      preferences: {
        defaultMode: (prefRow?.default_mode as BrowsingMode) || "normal",
        preferredCategories,
        preferredLanguages,
        theme: prefRow?.theme || "system",
        layoutDensity: prefRow?.layout_density || "comfortable",
        reducedMotion: Boolean(prefRow?.reduced_motion),
        highContrast: Boolean(prefRow?.high_contrast),
        fontScale: prefRow?.font_scale || "medium",
        emailAlerts: prefRow?.email_alerts !== 0,
        securityAlerts: prefRow?.security_alerts !== 0,
        inAppNotifications: prefRow?.in_app_notifications !== 0,
      },
    };
  } catch (err) {
    console.error("Error in getCurrentSession:", err);
    return null;
  }
}

export function logSecurityEvent(userId: string | null, eventType: string, details?: string, ip?: string, ua?: string) {
  try {
    const db = getDb();
    const logId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO security_logs (id, user_id, event_type, details, ip_address, user_agent, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(logId, userId, eventType, details || null, ip || null, ua || null, Date.now());
  } catch (e) {
    console.error("Failed to log security event:", e);
  }
}
