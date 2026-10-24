import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import crypto from "node:crypto";
import { encryptSecret } from "@/lib/crypto";
import { saveOAuthConnectionAsync } from "@/lib/data-service";

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
        const encToken = encryptSecret("mock_yt_access_token_" + Date.now());
        const now = Date.now();

        await saveOAuthConnectionAsync({
          userId: session.user.id,
          provider: "youtube",
          encryptedAccessToken: encToken.ciphertext,
          iv: encToken.iv,
          authTag: encToken.authTag,
          expiresAt: now + 3600 * 1000,
          scope: "https://www.googleapis.com/auth/youtube",
          channelTitle: "Dev YouTube User",
        });

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
