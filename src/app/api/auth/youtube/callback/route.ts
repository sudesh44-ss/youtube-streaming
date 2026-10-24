import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { saveOAuthConnectionAsync } from "@/lib/data-service";
import { getGoogleOAuthCredentials, getYouTubeOAuthRedirectUri, getAppBaseUrl } from "@/lib/oauth-config";
import { extractEmailFromIdToken, getGoogleAccountDetails, cacheGoogleAccount } from "@/lib/google-account";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const appBaseUrl = getAppBaseUrl(request);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const state = requestUrl.searchParams.get("state");
  const storedState = request.cookies.get("youtube_oauth_state")?.value;

  // Helper to construct response with CSRF state cookie cleared
  const createRedirectWithClearedState = (url: URL) => {
    const res = NextResponse.redirect(url);
    res.cookies.delete("youtube_oauth_state");
    return res;
  };

  if (error || !code) {
    const errorMsg = error || "Authorization was cancelled.";
    return createRedirectWithClearedState(
      new URL(`/settings?error=${encodeURIComponent(errorMsg)}`, appBaseUrl)
    );
  }

  // Validate CSRF state parameter if stored state is present
  if (storedState && state && storedState !== state) {
    console.warn("YouTube OAuth state mismatch. Possible CSRF attack detected.");
    return createRedirectWithClearedState(
      new URL("/settings?error=State+mismatch.+OAuth+session+could+not+be+verified.", appBaseUrl)
    );
  }

  const session = await getCurrentSession();
  if (!session?.user) {
    return createRedirectWithClearedState(
      new URL("/auth/signin?redirect=/settings", appBaseUrl)
    );
  }

  const { clientId, clientSecret } = getGoogleOAuthCredentials();
  const redirectUri = getYouTubeOAuthRedirectUri(request);

  if (!clientId || !clientSecret) {
    return createRedirectWithClearedState(
      new URL("/settings?error=Google+OAuth+credentials+missing+on+server.", appBaseUrl)
    );
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.json().catch(() => ({}));
      console.error("Google token exchange error:", errData);
      return createRedirectWithClearedState(
        new URL("/settings?error=Failed+to+exchange+Google+code.", appBaseUrl)
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 3600;

    // Encrypt tokens
    const encAccess = encryptSecret(accessToken);
    let encRefreshCipher = null;
    let encRefreshIv = null;
    let encRefreshTag = null;

    if (refreshToken) {
      const encRefresh = encryptSecret(refreshToken);
      encRefreshCipher = encRefresh.ciphertext;
      encRefreshIv = encRefresh.iv;
      encRefreshTag = encRefresh.authTag;
    }

    // Try fetching channel title
    let channelTitle = "Connected YouTube Account";
    try {
      const channelRes = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (channelRes.ok) {
        const cData = await channelRes.json();
        if (cData.items?.[0]?.snippet?.title) {
          channelTitle = cData.items[0].snippet.title;
        }
      }
    } catch {
      // Graceful fallback
    }

    // Cache Google Account email extracted from id_token or fetched from userinfo
    let googleEmail: string | null = null;
    let googleEmailVerified = false;

    if (tokenData.id_token) {
      const parsed = extractEmailFromIdToken(tokenData.id_token);
      if (parsed?.email) {
        googleEmail = parsed.email;
        googleEmailVerified = parsed.emailVerified;
      }
    }

    if (!googleEmail && accessToken) {
      try {
        const details = await getGoogleAccountDetails(session.user.id, accessToken);
        if (details?.email) {
          googleEmail = details.email;
          googleEmailVerified = details.emailVerified;
        }
      } catch {
        // Non-fatal
      }
    } else if (googleEmail) {
      cacheGoogleAccount(session.user.id, googleEmail, googleEmailVerified);
    }

    const now = Date.now();
    const expiresAt = now + expiresIn * 1000;

    await saveOAuthConnectionAsync({
      userId: session.user.id,
      provider: "youtube",
      encryptedAccessToken: encAccess.ciphertext,
      iv: encAccess.iv,
      authTag: encAccess.authTag,
      encryptedRefreshToken: encRefreshCipher,
      refreshIv: encRefreshIv,
      refreshAuthTag: encRefreshTag,
      expiresAt,
      scope: tokenData.scope || "https://www.googleapis.com/auth/youtube",
      channelTitle,
    });

    return createRedirectWithClearedState(
      new URL("/settings?connected=youtube", appBaseUrl)
    );
  } catch (err) {
    console.error("YouTube OAuth callback error:", err);
    return createRedirectWithClearedState(
      new URL("/settings?error=Unexpected+OAuth+error.", appBaseUrl)
    );
  }
}
