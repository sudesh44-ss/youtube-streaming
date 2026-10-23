import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserProviderKey } from "@/lib/providers";
import { YouTubeAdapter } from "@/lib/providers/youtube";
import { getRecommendedContent } from "@/lib/recommendations";
import { getCachedFeed, setCachedFeed, DiscoverFeedData } from "@/lib/feed-cache";
import { NormalizedContentItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const userId = session?.user?.id;
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("refresh") === "true";
    const batch = parseInt(searchParams.get("batch") || "1", 10);

    // Subsequent recommendation batches (incremental loading)
    if (batch > 1) {
      const additional = await getRecommendedContent({
        userId,
        mode: "normal",
        limit: 12,
      }).catch(() => []);

      return NextResponse.json({
        success: true,
        batch,
        hasMore: true,
        items: additional.slice(0, 6),
      });
    }

    const cacheKey = `feed_${userId || "public"}`;
    if (!forceRefresh) {
      const cached = getCachedFeed(cacheKey);
      if (cached) {
        return NextResponse.json({
          success: true,
          fromCache: true,
          ...cached,
        });
      }
    }

    const apiKey = getUserProviderKey(userId, "youtube") || undefined;
    const ytAdapter = new YouTubeAdapter();

    // 1. Concurrently fetch all 5 sections
    const [rawTrending, rawRecommended, rawMusic, rawGaming, rawStudy] = await Promise.all([
      ytAdapter.getTrending("US", 8, apiKey).catch(() => []),
      getRecommendedContent({ userId, mode: "normal", limit: 8 }).catch(() => []),
      ytAdapter
        .search(
          { query: "official music video live performance concert", category: "music", mode: "normal", limit: 8 },
          apiKey
        )
        .catch(() => []),
      ytAdapter
        .search(
          { query: "gameplay highlights walkthrough esports", category: "gaming", mode: "normal", limit: 8 },
          apiKey
        )
        .catch(() => []),
      ytAdapter
        .search(
          { query: "educational lecture course tutorial", category: "study", mode: "normal", limit: 8 },
          apiKey
        )
        .catch(() => []),
    ]);

    // 2. Deduplicate across sections while ensuring each section remains populated
    const seenIds = new Set<string>();

    const dedupeSection = (items: NormalizedContentItem[], minItems = 4): NormalizedContentItem[] => {
      const result: NormalizedContentItem[] = [];
      for (const item of items) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          result.push(item);
        }
      }
      // If deduplication removed too many, allow relevant items to stay so section isn't starved
      if (result.length < minItems) {
        for (const item of items) {
          if (!result.some((r) => r.id === item.id)) {
            result.push(item);
          }
          if (result.length >= minItems) break;
        }
      }
      return result;
    };

    const trending = dedupeSection(rawTrending, 4);
    const recommended = dedupeSection(rawRecommended, 4);
    const music = dedupeSection(rawMusic, 4);
    const gaming = dedupeSection(rawGaming, 4);
    const study = dedupeSection(rawStudy, 4);

    const feedData: DiscoverFeedData = {
      trending,
      recommended,
      music,
      gaming,
      study,
      cachedAt: Date.now(),
    };

    // Store in 10-minute cache
    setCachedFeed(cacheKey, feedData);

    return NextResponse.json({
      success: true,
      fromCache: false,
      ...feedData,
    });
  } catch (err) {
    console.error("Discover Feed API error:", err);
    return NextResponse.json({ error: "Failed to load dynamic discovery feed." }, { status: 500 });
  }
}
