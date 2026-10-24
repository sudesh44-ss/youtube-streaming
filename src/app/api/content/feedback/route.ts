import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { recordContentFeedbackAsync } from "@/lib/data-service";
import { appCache } from "@/lib/cache-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { contentId, feedbackType } = body;

    if (!contentId || typeof contentId !== "string") {
      return NextResponse.json({ error: "contentId is required." }, { status: 400 });
    }

    if (!["not_interested", "like", "dislike"].includes(feedbackType)) {
      return NextResponse.json(
        { error: "Invalid feedbackType. Must be 'not_interested', 'like', or 'dislike'." },
        { status: 400 }
      );
    }

    await recordContentFeedbackAsync(session.user.id, contentId, feedbackType);

    // Evict any cached feed for this user to immediately adapt to feedback
    const userCachePrefix = `feed_${session.user.id}_`;
    for (const key of appCache.keys()) {
      if (key.startsWith(userCachePrefix) || key.includes(session.user.id)) {
        appCache.delete(key);
      }
    }

    return NextResponse.json({
      success: true,
      contentId,
      feedbackType,
      message: feedbackType === "not_interested"
        ? "Video marked as not interested. Feed will adapt."
        : "Feedback recorded.",
    });
  } catch (err: any) {
    console.error("Content feedback error:", err);
    return NextResponse.json({ error: err?.message || "Failed to record feedback." }, { status: 500 });
  }
}
