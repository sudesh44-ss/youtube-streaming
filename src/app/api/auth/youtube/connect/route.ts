import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import crypto from "node:crypto";
import { encryptSecret } from "@/lib/crypto";
import { saveOAuthConnectionAsync } from "@/lib/data-service";
import { getGoogleOAuthCredentials, getYouTubeOAuthRedirectUri, getAppBaseUrl } from "@/lib/oauth-config";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  const requestUrl = new URL(request.url);
  const appBaseUrl = getAppBaseUrl(request);

  if (!session?.user) {
    const signinUrl = new URL("/auth/signin", appBaseUrl);
    signinUrl.searchParams.set("redirect", "/settings");
    return NextResponse.redirect(signinUrl);
  }

  const { clientId } = getGoogleOAuthCredentials();
  const redirectUri = getYouTubeOAuthRedirectUri(request);
  const state = crypto.randomBytes(24).toString("hex");

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

        return NextResponse.redirect(new URL("/settings?connected=youtube", appBaseUrl));
      }
    }

    // Direct user with clear instructions
    const settingsUrl = new URL("/settings", appBaseUrl);
    settingsUrl.searchParams.set(
      "error",
      "Google OAuth credentials (GOOGLE_CLIENT_ID) not yet configured. Please configure them in environment variables."
    );
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

  // Set CSRF state cookie
  const response = NextResponse.redirect(googleAuthUrl.toString());
  response.cookies.set("youtube_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return response;
}
