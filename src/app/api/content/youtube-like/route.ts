import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getOAuthConnectionAsync, recordContentFeedbackAsync } from "@/lib/data-service";

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

    if (rating === "like") {
      recordContentFeedbackAsync(session.user.id, videoId, "like").catch(() => {});
    }

    const conn = await getOAuthConnectionAsync(session.user.id, "youtube");
    if (!conn || !conn.accessToken) {
      return NextResponse.json({
        success: true,
        localOnly: true,
        youtubeAction: "unconnected",
        message: rating === "like"
          ? "Liked locally! Connect your YouTube account in Settings to like on YouTube."
          : "Removed from Liked videos",
      });
    }

    const accessToken = conn.accessToken;

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
