import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserProviderKey } from "@/lib/providers";
import { YouTubeAdapter } from "@/lib/providers/youtube";
import { NormalizedContentItem } from "@/lib/types";

export const dynamic = "force-dynamic";

// Category result cache to avoid redundant API quota consumption
interface CategoryCacheEntry {
  items: NormalizedContentItem[];
  nextPageToken?: string;
  cachedAt: number;
}

const categoryCache = new Map<string, CategoryCacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const userId = session?.user?.id;
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "trending";
    const pageToken = searchParams.get("pageToken") || undefined;
    const forceRefresh = searchParams.get("refresh") === "true";

    const apiKey = getUserProviderKey(userId, "youtube") || undefined;

    // Strict requirement: If no valid YouTube API key is saved, do not display videos
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        requiresApiKey: true,
        items: [],
        message: "Add your YouTube API key in Settings to discover videos.",
      });
    }

    const cacheKey = `${category}_${pageToken || "first"}_${userId || "public"}`;

    if (!forceRefresh) {
      const cached = categoryCache.get(cacheKey);
      if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        return NextResponse.json({
          success: true,
          fromCache: true,
          requiresApiKey: false,
          items: cached.items,
          nextPageToken: cached.nextPageToken,
        });
      }
    }

    const ytAdapter = new YouTubeAdapter();
    let rawItems: NormalizedContentItem[] = [];
    let nextPageToken: string | undefined = undefined;

    // Strict Category Isolation:
    // Only fetch content genuinely matching the specific requested category
    switch (category) {
      case "trending": {
        rawItems = await ytAdapter.getTrending("US", 20, apiKey);
        break;
      }
      case "music": {
        const res = await ytAdapter.searchWithPagination(
          {
            query: "official music video live performance concert album song",
            category: "music",
            mode: "category",
            limit: 20,
            pageToken,
          },
          apiKey
        );
        rawItems = res.items;
        nextPageToken = res.nextPageToken;
        break;
      }
      case "gaming": {
        const res = await ytAdapter.searchWithPagination(
          {
            query: "gameplay highlights walkthrough esports gaming stream",
            category: "gaming",
            mode: "category",
            limit: 20,
            pageToken,
          },
          apiKey
        );
        rawItems = res.items;
        nextPageToken = res.nextPageToken;
        break;
      }
      case "study": {
        const res = await ytAdapter.searchWithPagination(
          {
            query: "educational lecture course documentary tutorial learning",
            category: "study",
            mode: "category",
            limit: 20,
            pageToken,
          },
          apiKey
        );
        rawItems = res.items;
        nextPageToken = res.nextPageToken;
        break;
      }
      default: {
        return NextResponse.json({ error: "Invalid category requested." }, { status: 400 });
      }
    }

    // Deduplicate by YouTube video ID
    const seenIds = new Set<string>();
    const deduped: NormalizedContentItem[] = [];
    for (const item of rawItems) {
      const uniqueKey = item.providerId || item.id;
      if (uniqueKey && !seenIds.has(uniqueKey)) {
        seenIds.add(uniqueKey);
        deduped.push(item);
      }
    }

    const items = deduped.slice(0, 20);

    // Save to cache
    categoryCache.set(cacheKey, {
      items,
      nextPageToken,
      cachedAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      fromCache: false,
      requiresApiKey: false,
      category,
      items,
      nextPageToken,
    });
  } catch (err) {
    console.error("Category Feed API error:", err);
    return NextResponse.json({ error: "Failed to load category videos." }, { status: 500 });
  }
}
