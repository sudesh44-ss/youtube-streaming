/**
 * OmniDiscover Google Account Details Helper
 *
 * Securely retrieves and manages authenticated Google Account information
 * (e.g. email, email_verified) associated with YouTube OAuth tokens.
 *
 * Implements Google OpenID Connect UserInfo retrieval with in-memory caching
 * to minimize round-trip latency to Google servers while ensuring access tokens,
 * refresh tokens, and encryption keys are strictly preserved on the server.
 */

interface CachedGoogleAccount {
  email: string | null;
  emailVerified: boolean;
  expiresAt: number;
}

// In-memory cache for Google account details keyed by user ID (5 minute TTL)
const accountCache = new Map<string, CachedGoogleAccount>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Extracts email and email verification status from an OpenID Connect id_token JWT.
 */
export function extractEmailFromIdToken(idToken: string): { email: string | null; emailVerified: boolean } | null {
  try {
    if (!idToken || typeof idToken !== "string") return null;
    const parts = idToken.split(".");
    if (parts.length < 2) return null;

    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson);

    if (typeof payload.email === "string" && payload.email.trim().length > 0) {
      return {
        email: payload.email.trim(),
        emailVerified: Boolean(payload.email_verified),
      };
    }
  } catch {
    // Non-fatal id_token parse error
  }
  return null;
}

/**
 * Retrieves the Google account email and verification status for a user.
 * First checks the server memory cache. If not cached, queries the Google
 * OAuth2 UserInfo endpoint using the provided access token.
 */
export async function getGoogleAccountDetails(
  userId: string,
  accessToken?: string | null
): Promise<{ email: string | null; emailVerified: boolean } | null> {
  const now = Date.now();
  const cached = accountCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return {
      email: cached.email,
      emailVerified: cached.emailVerified,
    };
  }

  if (!accessToken) {
    return null;
  }

  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[GoogleAccount] Userinfo fetch returned HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    const email = typeof data.email === "string" && data.email.trim().length > 0 ? data.email.trim() : null;
    const emailVerified = Boolean(data.email_verified);

    accountCache.set(userId, {
      email,
      emailVerified,
      expiresAt: now + CACHE_TTL_MS,
    });

    return { email, emailVerified };
  } catch (err: any) {
    console.warn("[GoogleAccount] Failed to fetch Google userinfo:", err?.message || err);
    return null;
  }
}

/**
 * Sets or pre-populates the cache with verified Google account details.
 * Useful when details are obtained during the OAuth code exchange callback.
 */
export function cacheGoogleAccount(
  userId: string,
  email: string | null,
  emailVerified: boolean = false
): void {
  accountCache.set(userId, {
    email,
    emailVerified,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

/**
 * Invalidates the cached account details for a given user (e.g. on disconnect).
 */
export function invalidateGoogleAccountCache(userId: string): void {
  accountCache.delete(userId);
}
