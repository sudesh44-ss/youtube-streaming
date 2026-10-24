import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { saveOAuthConnectionAsync } from "@/lib/data-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");

  if (error || !code) {
    const errorMsg = error || "Authorization was cancelled.";
    return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(errorMsg)}`, requestUrl.origin));
  }

  const session = await getCurrentSession();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/auth/signin?redirect=/settings", requestUrl.origin));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${requestUrl.origin}/api/auth/youtube/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/settings?error=Google+OAuth+credentials+missing+on+server.", requestUrl.origin)
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
      return NextResponse.redirect(new URL("/settings?error=Failed+to+exchange+Google+code.", requestUrl.origin));
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

    return NextResponse.redirect(new URL("/settings?connected=youtube", requestUrl.origin));
  } catch (err) {
    console.error("YouTube OAuth callback error:", err);
    return NextResponse.redirect(new URL("/settings?error=Unexpected+OAuth+error.", requestUrl.origin));
  }
}
