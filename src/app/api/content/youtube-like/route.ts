import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videoId, rating = "like" } = body;

    if (!videoId || typeof videoId !== "string") {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json({
        success: true,
        localOnly: true,
        youtubeAction: "unconnected",
        message: rating === "like"
          ? "Saved to your Liked videos (Local preference)"
          : "Removed from Liked videos",
      });
    }

    const db = getDb();
    const row = db
      .prepare(
        "SELECT encrypted_access_token, iv, auth_tag, expires_at FROM oauth_connections WHERE user_id = ? AND provider = 'youtube'"
      )
      .get(session.user.id) as
      | {
          encrypted_access_token: string;
          iv: string;
          auth_tag: string;
          expires_at?: number;
        }
      | undefined;

    if (!row) {
      return NextResponse.json({
        success: true,
        localOnly: true,
        youtubeAction: "unconnected",
        message: rating === "like"
          ? "Liked locally! Connect your YouTube account in Settings to like on YouTube."
          : "Removed from Liked videos",
      });
    }

    // Decrypt access token
    let accessToken: string;
    try {
      accessToken = decryptSecret(row.encrypted_access_token, row.iv, row.auth_tag);
    } catch (e) {
      console.error("Token decryption failed:", e);
      return NextResponse.json({
        success: true,
        localOnly: true,
        youtubeAction: "error",
        message: "YouTube authorization token could not be decrypted. Saved locally.",
      });
    }

    // Call official YouTube Data API v3 videos/rate
    const ytUrl = `https://www.googleapis.com/youtube/v3/videos/rate?id=${encodeURIComponent(
      videoId
    )}&rating=${encodeURIComponent(rating)}`;

    const ytRes = await fetch(ytUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Length": "0",
      },
    });

    if (ytRes.status === 204 || ytRes.ok) {
      return NextResponse.json({
        success: true,
        localOnly: false,
        youtubeAction: "confirmed",
        message: rating === "like"
          ? "Liked on YouTube & saved locally!"
          : "Unliked on YouTube & removed locally",
      });
    }

    if (ytRes.status === 401 || ytRes.status === 403) {
      console.warn("YouTube rate API unauthorized:", ytRes.status);
      return NextResponse.json({
        success: true,
        localOnly: true,
        youtubeAction: "error",
        message: "YouTube session expired. Saved locally. Reconnect YouTube in Settings.",
      });
    }

    return NextResponse.json({
      success: true,
      localOnly: true,
      youtubeAction: "error",
      message: "Could not reach YouTube rating service. Saved locally.",
    });
  } catch (err) {
    console.error("Error in youtube-like endpoint:", err);
    return NextResponse.json({
      success: true,
      localOnly: true,
      youtubeAction: "error",
      message: "Action completed locally.",
    });
  }
}
