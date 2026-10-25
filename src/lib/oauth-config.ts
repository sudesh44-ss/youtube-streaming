/**
 * OmniDiscover Google & YouTube OAuth Configuration
 *
 * Provides a single, validated, authoritative configuration source for:
 * 1. Application Base URL
 * 2. YouTube OAuth Redirect URIs (Production & Local Development)
 * 3. Google OAuth Client Credentials
 *
 * Prevents Error 400: redirect_uri_mismatch by strictly isolating production
 * and development callback URIs and refusing to derive production OAuth endpoints
 * from arbitrary, user-controlled Host or Forwarded headers.
 */

export const PRODUCTION_BASE_URL = "https://tubify.sudeshcreation.shop";
export const YOUTUBE_OAUTH_CALLBACK_PATH = "/api/auth/youtube/callback";
export const CANONICAL_PRODUCTION_REDIRECT_URI = `${PRODUCTION_BASE_URL}${YOUTUBE_OAUTH_CALLBACK_PATH}`;
export const CANONICAL_LOCAL_REDIRECT_URI = `http://localhost:3000${YOUTUBE_OAUTH_CALLBACK_PATH}`;

export interface GoogleOAuthCredentials {
  clientId: string | undefined;
  clientSecret: string | undefined;
}

/**
 * Resolves the Google OAuth Client ID and Secret from environment variables.
 * Expected environment variable names:
 * - GOOGLE_CLIENT_ID (or NEXT_PUBLIC_GOOGLE_CLIENT_ID fallback)
 * - GOOGLE_CLIENT_SECRET (strictly server-side)
 */
export function getGoogleOAuthCredentials(): GoogleOAuthCredentials {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return { clientId, clientSecret };
}

/**
 * Resolves the trusted application base URL for the current runtime.
 *
 * Rules:
 * - In production (NODE_ENV === "production"):
 *   - Strictly returns HTTPS.
 *   - If NEXT_PUBLIC_APP_URL or APP_URL is provided, validates that it starts with "https://".
 *   - Defaults strictly to PRODUCTION_BASE_URL ("https://youtube-streaming-ten.vercel.app").
 *   - Never inspects arbitrary incoming request Host or X-Forwarded headers.
 *
 * - In development (NODE_ENV !== "production"):
 *   - If NEXT_PUBLIC_APP_URL or APP_URL is provided, uses its origin.
 *   - If a request is provided from a localhost / loopback address, mirrors that local origin (e.g. http://localhost:3000).
 *   - Defaults to "http://localhost:3000".
 */
export function getAppBaseUrl(
  request?: Request | { url?: string; headers?: Headers | Record<string, string | string[] | undefined> }
): string {
  const isProduction = process.env.NODE_ENV === "production";
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;

  if (isProduction) {
    if (configuredUrl) {
      try {
        const parsed = new URL(configuredUrl);
        if (parsed.protocol === "https:") {
          return parsed.origin;
        }
      } catch {
        // Fall back to canonical production URL
      }
    }
    return PRODUCTION_BASE_URL;
  }

  // Non-production / Local development:
  if (configuredUrl) {
    try {
      const parsed = new URL(configuredUrl);
      return parsed.origin;
    } catch {
      // Fall through to localhost check
    }
  }

  if (request && "url" in request && typeof request.url === "string") {
    try {
      const parsed = new URL(request.url);
      const host = parsed.hostname.toLowerCase();
      if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
        return parsed.origin;
      }
    } catch {
      // Fall through
    }
  }

  return "http://localhost:3000";
}

/**
 * Returns the exact, normalized YouTube OAuth redirect URI.
 * Guaranteed to produce identical, byte-for-byte strings in both authorization start
 * and token exchange steps.
 */
export function getYouTubeOAuthRedirectUri(
  request?: Request | { url?: string; headers?: Headers | Record<string, string | string[] | undefined> }
): string {
  const baseUrl = getAppBaseUrl(request);
  const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${cleanBase}${YOUTUBE_OAUTH_CALLBACK_PATH}`;
}

/**
 * Returns the required Google Cloud Console configuration for authorized origins and redirect URIs.
 */
export function getGoogleCloudConsoleRequirements() {
  return {
    consoleUrl: "https://console.cloud.google.com/auth/clients",
    production: {
      origin: PRODUCTION_BASE_URL,
      redirectUri: CANONICAL_PRODUCTION_REDIRECT_URI,
    },
    localDevelopment: {
      origin: "http://localhost:3000",
      redirectUri: CANONICAL_LOCAL_REDIRECT_URI,
    },
  };
}
