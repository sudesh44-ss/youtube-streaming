import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  const requestUrl = new URL(request.url);

  if (!session?.user) {
    const signinUrl = new URL("/auth/signin", requestUrl.origin);
    signinUrl.searchParams.set("redirect", "/settings");
    return NextResponse.redirect(signinUrl);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = `${requestUrl.origin}/api/auth/youtube/callback`;
  const state = crypto.randomBytes(16).toString("hex");

  // If live Google credentials are not set in environment
  if (!clientId) {
    if (process.env.NODE_ENV !== "production") {
      // In local dev without Google credentials, support mock connect for testing
      const isMock = requestUrl.searchParams.get("mock") === "true";
      if (isMock) {
        const db = getDb();
        const encToken = encryptSecret("mock_yt_access_token_" + Date.now());
        const id = crypto.randomUUID();
        const now = Date.now();

        db.prepare(`
          INSERT INTO oauth_connections (
            id, user_id, provider, encrypted_access_token, iv, auth_tag,
            expires_at, scope, channel_title, created_at, updated_at
          ) VALUES (?, ?, 'youtube', ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(user_id, provider) DO UPDATE SET
            encrypted_access_token = excluded.encrypted_access_token,
            iv = excluded.iv,
            auth_tag = excluded.auth_tag,
            expires_at = excluded.expires_at,
            channel_title = excluded.channel_title,
            updated_at = excluded.updated_at
        `).run(
          id,
          session.user.id,
          encToken.ciphertext,
          encToken.iv,
          encToken.authTag,
          now + 3600 * 1000,
          "https://www.googleapis.com/auth/youtube",
          "Dev YouTube User",
          now,
          now
        );

        return NextResponse.redirect(new URL("/settings?connected=youtube", requestUrl.origin));
      }
    }

    // Direct user with clear instructions
    const settingsUrl = new URL("/settings", requestUrl.origin);
    settingsUrl.searchParams.set("error", "Google OAuth credentials (GOOGLE_CLIENT_ID) not yet configured in .env.local.");
    return NextResponse.redirect(settingsUrl);
  }

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set(
    "scope",
    "openid email profile https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.force-ssl"
  );
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "consent");
  googleAuthUrl.searchParams.set("state", state);

  return NextResponse.redirect(googleAuthUrl.toString());
}
