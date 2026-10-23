import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserProviderKey } from "@/lib/providers";
import { YouTubeAdapter } from "@/lib/providers/youtube";
import { getRecommendedContent } from "@/lib/recommendations";
import { getCachedFeed, setCachedFeed, DiscoverFeedData } from "@/lib/feed-cache";
import { NormalizedContentItem } from "@/lib/types";

export const dynamic = "force-dynamic";

// Controlled shuffle algorithm (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    const userId = session?.user?.id;
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("refresh") === "true";
    const batch = parseInt(searchParams.get("batch") || "1", 10);

    const apiKey = getUserProviderKey(userId, "youtube") || undefined;

    // Strict Requirement: Feed MUST remain blank until a valid YouTube API key is saved.
    // Do not return placeholder videos, demo cards, or hardcoded recommendations when no key exists.
    if (!apiKey) {
      return NextResponse.json({
        success: true,
        requiresApiKey: true,
        items: [],
        trending: [],
        recommended: [],
        music: [],
        gaming: [],
        study: [],
        message: "Add your YouTube API key in Settings to discover videos.",
      });
    }

    const cacheKey = `feed_${userId || "public"}`;

    // Return cached feed if available and not forcing refresh
    if (!forceRefresh) {
      const cached = getCachedFeed(cacheKey);
      if (cached && Array.isArray(cached.items) && cached.items.length > 0) {
        return NextResponse.json({
          success: true,
          fromCache: true,
          requiresApiKey: false,
          ...cached,
        });
      }
    }

    const ytAdapter = new YouTubeAdapter();

    // Subsequent batch incremental loading
    if (batch > 1) {
      const additional = await getRecommendedContent({
        userId,
        mode: "normal",
        limit: 20,
      }).catch(() => []);

      return NextResponse.json({
        success: true,
        batch,
        hasMore: true,
        requiresApiKey: false,
        items: additional.slice(0, 20),
      });
    }

    // Concurrently fetch diverse candidate videos from multiple discovery signals & categories
    const [rawTrending, rawTech, rawStudy, rawMusic, rawGaming, rawComedy, rawRecommended] = await Promise.all([
      ytAdapter.getTrending("US", 10, apiKey).catch(() => []),
      ytAdapter.search({ query: "technology science innovation coding", category: "technology", mode: "normal", limit: 6 }, apiKey).catch(() => []),
      ytAdapter.search({ query: "educational lecture course tutorial", category: "study", mode: "normal", limit: 6 }, apiKey).catch(() => []),
      ytAdapter.search({ query: "official music video live performance concert", category: "music", mode: "normal", limit: 6 }, apiKey).catch(() => []),
      ytAdapter.search({ query: "gameplay highlights walkthrough esports", category: "gaming", mode: "normal", limit: 6 }, apiKey).catch(() => []),
      ytAdapter.search({ query: "comedy sketch standup funny show", category: "comedy", mode: "normal", limit: 6 }, apiKey).catch(() => []),
      getRecommendedContent({ userId, mode: "normal", limit: 10 }).catch(() => []),
    ]);

    // Pool all candidates and deduplicate by YouTube video ID
    const candidatePool: NormalizedContentItem[] = [];
    const seenIds = new Set<string>();

    const addCandidates = (list: NormalizedContentItem[]) => {
      for (const item of list) {
        const uniqueKey = item.providerId || item.id;
        if (uniqueKey && !seenIds.has(uniqueKey)) {
          seenIds.add(uniqueKey);
          candidatePool.push(item);
        }
      }
    };

    addCandidates(rawTrending);
    addCandidates(rawTech);
    addCandidates(rawStudy);
    addCandidates(rawMusic);
    addCandidates(rawGaming);
    addCandidates(rawComedy);
    addCandidates(rawRecommended);

    // Shuffle candidate pool to ensure diverse, mixed discovery
    const shuffled = shuffleArray(candidatePool);

    // Strictly select up to 20 unique items for the unified feed batch
    const unified20 = shuffled.slice(0, 20);

    // Populate category slices for backward compatibility
    const trending = unified20.slice(0, 6);
    const recommended = unified20.slice(6, 12);
    const music = unified20.filter((i) => i.category === "music").slice(0, 6);
    const gaming = unified20.filter((i) => i.category === "gaming").slice(0, 6);
    const study = unified20.filter((i) => i.category === "study").slice(0, 6);

    const feedData: DiscoverFeedData = {
      trending,
      recommended,
      music,
      gaming,
      study,
      items: unified20,
      cachedAt: Date.now(),
    };

    // Cache the unified feed
    setCachedFeed(cacheKey, feedData);

    return NextResponse.json({
      success: true,
      fromCache: false,
      requiresApiKey: false,
      items: unified20,
      ...feedData,
    });
  } catch (err) {
    console.error("Unified Discover Feed API error:", err);
    return NextResponse.json({ error: "Failed to load dynamic discovery feed." }, { status: 500 });
  }
}
