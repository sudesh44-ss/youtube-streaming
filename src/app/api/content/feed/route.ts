import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserProviderKeyAsync, getUserRecommendationSignalsAsync, UserRecommendationSignals } from "@/lib/data-service";
import { YouTubeAdapter } from "@/lib/providers/youtube";
import { getRecommendedContent, buildUserInterestProfile, rankCandidateVideos } from "@/lib/recommendations";
import { getCachedFeed, setCachedFeed, DiscoverFeedData } from "@/lib/feed-cache";
import { NormalizedContentItem } from "@/lib/types";
import { ServerTimer } from "@/lib/timing";
import { appCache, CACHE_TTLS } from "@/lib/cache-service";

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
  const timer = new ServerTimer();
  try {
    timer.start("auth");
    const session = await getCurrentSession();
    timer.end("auth");

    const userId = session?.user?.id;
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("refresh") === "true";
    const batch = parseInt(searchParams.get("batch") || "1", 10);
    const country = (searchParams.get("country") || session?.preferences?.country || "US").toUpperCase();

    timer.start("key_lookup");
    const apiKey = (await getUserProviderKeyAsync(userId, "youtube")) || undefined;
    timer.end("key_lookup");

    // Strict Requirement: Feed MUST remain blank until a valid YouTube API key is saved.
    if (!apiKey) {
      const res = NextResponse.json({
        success: true,
        requiresApiKey: true,
        country,
        items: [],
        trending: [],
        recommended: [],
        music: [],
        gaming: [],
        study: [],
        message: "Add your YouTube API key in Settings to discover videos.",
      });
      res.headers.set("Server-Timing", timer.toHeader());
      return res;
    }

    const cacheKey = `feed_${userId || "public"}_${country}_b${batch}`;

    // Return cached feed if available and not forcing refresh
    if (!forceRefresh) {
      const cached = getCachedFeed(cacheKey);
      if (cached && Array.isArray(cached.items) && cached.items.length > 0) {
        const res = NextResponse.json({
          success: true,
          fromCache: true,
          requiresApiKey: false,
          country,
          ...cached,
        });
        timer.end("cache", "HIT");
        res.headers.set("Server-Timing", timer.toHeader());
        res.headers.set("X-Cache", "HIT");
        return res;
      }
    }

    const ytAdapter = new YouTubeAdapter();

    // Subsequent batch incremental loading
    if (batch > 1) {
      timer.start("batch_fetch");
      const additional = await getRecommendedContent({
        userId,
        mode: "normal",
        regionCode: country,
        limit: 20,
      }).catch(() => []);
      timer.end("batch_fetch");

      const res = NextResponse.json({
        success: true,
        batch,
        hasMore: true,
        requiresApiKey: false,
        country,
        items: additional.slice(0, 20),
      });
      res.headers.set("Server-Timing", timer.toHeader());
      return res;
    }

    timer.start("upstream_candidates");
    // Single-flight deduplication on feed generation
    const feedData = await appCache.dedupe(cacheKey, async () => {
      // Fetch diverse candidate videos from shared regional seeds & personalized recommendations
      const [rawTrending, rawTech, rawStudy, rawMusic, rawGaming, rawComedy, rawRecommended] = await Promise.all([
        appCache.getOrSet(`seed:trending:${country}`, CACHE_TTLS.FEED_TRENDING, () =>
          ytAdapter.getTrending(country, 10, apiKey).catch(() => [])
        ).then((r) => r.data),
        appCache.getOrSet(`seed:tech:${country}`, CACHE_TTLS.FEED_TRENDING, () =>
          ytAdapter.search({ query: "technology science innovation coding", category: "technology", mode: "normal", limit: 6, regionCode: country }, apiKey).catch(() => [])
        ).then((r) => r.data),
        appCache.getOrSet(`seed:study:${country}`, CACHE_TTLS.FEED_TRENDING, () =>
          ytAdapter.search({ query: "educational lecture course tutorial", category: "study", mode: "normal", limit: 6, regionCode: country }, apiKey).catch(() => [])
        ).then((r) => r.data),
        appCache.getOrSet(`seed:music:${country}`, CACHE_TTLS.FEED_TRENDING, () =>
          ytAdapter.search({ query: "official music video live performance concert", category: "music", mode: "normal", limit: 6, regionCode: country }, apiKey).catch(() => [])
        ).then((r) => r.data),
        appCache.getOrSet(`seed:gaming:${country}`, CACHE_TTLS.FEED_TRENDING, () =>
          ytAdapter.search({ query: "gameplay highlights walkthrough esports", category: "gaming", mode: "normal", limit: 6, regionCode: country }, apiKey).catch(() => [])
        ).then((r) => r.data),
        appCache.getOrSet(`seed:comedy:${country}`, CACHE_TTLS.FEED_TRENDING, () =>
          ytAdapter.search({ query: "comedy sketch standup funny show", category: "comedy", mode: "normal", limit: 6, regionCode: country }, apiKey).catch(() => [])
        ).then((r) => r.data),
        getRecommendedContent({ userId, mode: "normal", regionCode: country, limit: 10 }).catch(() => []),
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

      // Retrieve real user activity signals and construct interest profile
      let signals: UserRecommendationSignals = {
        preferredCategories: [],
        savedCategoryCounts: {},
        recentSearchKeywords: [],
        country,
      };

      if (userId) {
        try {
          signals = await getUserRecommendationSignalsAsync(userId);
        } catch (err) {
          console.warn("Failed to retrieve user recommendation signals for feed:", err);
        }
      }

      const profile = buildUserInterestProfile(signals, userId);

      // Rank candidate pool using the multi-signal personalized ranking engine
      const ranked = rankCandidateVideos(candidatePool, profile, {
        userId,
        mode: "normal",
        regionCode: country,
        limit: 20,
      });

      // Strictly select up to 20 unique personalized items for the unified feed batch
      const unified20 = ranked.length > 0 ? ranked.slice(0, 20) : shuffleArray(candidatePool).slice(0, 20);

      // Populate category slices for backward compatibility
      const trending = unified20.slice(0, 6);
      const recommended = unified20.slice(6, 12);
      const music = unified20.filter((i) => i.category === "music").slice(0, 6);
      const gaming = unified20.filter((i) => i.category === "gaming").slice(0, 6);
      const study = unified20.filter((i) => i.category === "study").slice(0, 6);

      const assembled: DiscoverFeedData = {
        trending,
        recommended,
        music,
        gaming,
        study,
        items: unified20,
        cachedAt: Date.now(),
      };

      setCachedFeed(cacheKey, assembled, CACHE_TTLS.FEED_TRENDING);
      return assembled;
    });
    timer.end("upstream_candidates");

    const res = NextResponse.json({
      success: true,
      fromCache: false,
      requiresApiKey: false,
      country,
      items: feedData.items || [],
      ...feedData,
    });
    res.headers.set("Server-Timing", timer.toHeader());
    res.headers.set("X-Cache", "MISS");
    return res;
  } catch (err) {
    console.error("Unified Discover Feed API error:", err);
    return NextResponse.json({ error: "Failed to load dynamic discovery feed." }, { status: 500 });
  }
}
