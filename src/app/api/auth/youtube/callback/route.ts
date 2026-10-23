import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import crypto from "node:crypto";

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

    const db = getDb();
    const now = Date.now();
    const expiresAt = now + expiresIn * 1000;
    const connId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO oauth_connections (
        id, user_id, provider, encrypted_access_token, iv, auth_tag,
        encrypted_refresh_token, refresh_iv, refresh_auth_tag,
        expires_at, scope, channel_title, created_at, updated_at
      ) VALUES (?, ?, 'youtube', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, provider) DO UPDATE SET
        encrypted_access_token = excluded.encrypted_access_token,
        iv = excluded.iv,
        auth_tag = excluded.auth_tag,
        encrypted_refresh_token = COALESCE(excluded.encrypted_refresh_token, oauth_connections.encrypted_refresh_token),
        refresh_iv = COALESCE(excluded.refresh_iv, oauth_connections.refresh_iv),
        refresh_auth_tag = COALESCE(excluded.refresh_auth_tag, oauth_connections.refresh_auth_tag),
        expires_at = excluded.expires_at,
        channel_title = excluded.channel_title,
        updated_at = excluded.updated_at
    `).run(
      connId,
      session.user.id,
      encAccess.ciphertext,
      encAccess.iv,
      encAccess.authTag,
      encRefreshCipher,
      encRefreshIv,
      encRefreshTag,
      expiresAt,
      tokenData.scope || "youtube",
      channelTitle,
      now,
      now
    );

    return NextResponse.redirect(new URL("/settings?connected=youtube", requestUrl.origin));
  } catch (err) {
    console.error("YouTube OAuth callback error:", err);
    return NextResponse.redirect(new URL("/settings?error=Unexpected+OAuth+error.", requestUrl.origin));
  }
}
