import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { queryUnifiedContentWithPagination } from "@/lib/providers";
import { getUserProviderKeyAsync, recordSearchHistory, getOAuthConnectionAsync } from "@/lib/data-service";
import { YouTubeAdapter } from "@/lib/providers/youtube";
import { BrowsingMode, YouTubeChannelItem } from "@/lib/types";
import { checkRateLimit, getClientIp, rateLimitExceededResponse, RATE_LIMIT_POLICIES } from "@/lib/rate-limit";
import { ServerTimer } from "@/lib/timing";
import { appCache, buildSearchCacheKey, CACHE_TTLS } from "@/lib/cache-service";

export async function GET(req: NextRequest) {
  const timer = new ServerTimer();
  try {
    const ip = getClientIp(req);

    timer.start("auth");
    const session = await getCurrentSession();
    timer.end("auth");

    const identifier = session ? `user:${session.user.id}` : `ip:${ip}`;
    timer.start("rate_limit");
    const rateCheck = await checkRateLimit(identifier, RATE_LIMIT_POLICIES.SEARCH);
    timer.end("rate_limit");

    if (!rateCheck.success) {
      return rateLimitExceededResponse(rateCheck);
    }

    const { searchParams } = new URL(req.url);

    const query = searchParams.get("q") || "";
    const category = searchParams.get("category") || undefined;
    const subcategory = searchParams.get("subcategory") || undefined;
    const mode = (searchParams.get("mode") as BrowsingMode) || "normal";
    const videoType = (searchParams.get("videoType") as "all" | "shorts" | "videos") || "all";
    const sortBy = (searchParams.get("sortBy") as any) || "relevance";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 20);
    const pageToken = searchParams.get("pageToken") || undefined;
    const country = (searchParams.get("country") || session?.preferences?.country || undefined)?.toUpperCase();

    timer.start("key_lookup");
    const apiKey = (await getUserProviderKeyAsync(session?.user?.id, "youtube")) || undefined;
    timer.end("key_lookup");

    // Strict Requirement: Search MUST remain blank until a valid YouTube API key is saved.
    if (!apiKey) {
      const res = NextResponse.json({
        success: true,
        requiresApiKey: true,
        query,
        category,
        mode,
        videoType,
        count: 0,
        items: [],
        nextPageToken: undefined,
        channels: [],
        message: "Connect your YouTube API key in Settings to search videos and channels.",
      });
      res.headers.set("Server-Timing", timer.toHeader());
      return res;
    }

    // Save search history in background if query is provided and user is authenticated
    if (session && query.trim().length > 1 && !pageToken) {
      recordSearchHistory(session.user.id, query.trim(), category || null, mode).catch(() => {});
    }

    // Check search cache for public non-paginated or repeat queries
    const cacheKey = buildSearchCacheKey({
      query,
      category,
      subcategory,
      videoType,
      sortBy,
      country,
      pageToken,
    });

    const cached = appCache.get<{ items: any[]; nextPageToken?: string; channels: YouTubeChannelItem[] }>(cacheKey);
    if (cached) {
      const res = NextResponse.json({
        success: true,
        fromCache: true,
        query,
        category,
        mode,
        videoType,
        count: cached.items.length,
        items: cached.items,
        nextPageToken: cached.nextPageToken,
        channels: cached.channels,
      });
      timer.end("cache", "HIT");
      res.headers.set("Server-Timing", timer.toHeader());
      res.headers.set("X-Cache", "HIT");
      return res;
    }

    // Retrieve user's decrypted YouTube OAuth access token if available
    let userAccessToken: string | undefined = undefined;
    if (session?.user?.id) {
      try {
        const conn = await getOAuthConnectionAsync(session.user.id, "youtube");
        if (conn?.accessToken) {
          userAccessToken = conn.accessToken;
        }
      } catch {
        // fail-safe: unauthorized / unconnected
      }
    }

    timer.start("upstream_search");
    const ytAdapter = new YouTubeAdapter();
    const shouldSearchChannels = query.trim().length > 0 && !pageToken;

    // Run unified video search and channel search CONCURRENTLY (prevents sequential waterfall)
    const [videoSearchResult, channels] = await Promise.all([
      queryUnifiedContentWithPagination(
        {
          query,
          category,
          subcategory,
          mode,
          videoType,
          sortBy,
          limit,
          pageToken,
          regionCode: country,
        },
        session?.user?.id
      ),
      shouldSearchChannels
        ? ytAdapter.searchChannels(query.trim(), apiKey, userAccessToken).catch((err) => {
            console.warn("Channel search non-fatal error:", err);
            return [] as YouTubeChannelItem[];
          })
        : Promise.resolve([] as YouTubeChannelItem[]),
    ]);
    timer.end("upstream_search");

    const { items, nextPageToken } = videoSearchResult;

    // Store in cache if results returned (5 min TTL)
    if (items.length > 0 || channels.length > 0) {
      appCache.set(cacheKey, { items, nextPageToken, channels }, CACHE_TTLS.SEARCH_RESULTS);
    }

    const res = NextResponse.json({
      success: true,
      fromCache: false,
      query,
      category,
      mode,
      videoType,
      count: items.length,
      items,
      nextPageToken,
      channels,
    });
    res.headers.set("Server-Timing", timer.toHeader());
    res.headers.set("X-Cache", "MISS");
    return res;
  } catch (err) {
    console.error("Search API error:", err);
    return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 });
  }
}
