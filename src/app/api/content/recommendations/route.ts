import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getRecommendedContent } from "@/lib/recommendations";
import { getUserProviderKeyAsync } from "@/lib/data-service";
import { BrowsingMode } from "@/lib/types";
import { ServerTimer } from "@/lib/timing";
import { appCache, buildRecCacheKey, CACHE_TTLS } from "@/lib/cache-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const timer = new ServerTimer();
  try {
    timer.start("auth");
    const session = await getCurrentSession();
    timer.end("auth");

    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category") || undefined;
    const subcategory = searchParams.get("subcategory") || undefined;
    const mode = (searchParams.get("mode") as BrowsingMode) || (category ? "category" : "normal");
    const videoType = (searchParams.get("videoType") as "all" | "shorts" | "videos") || "all";
    const limit = parseInt(searchParams.get("limit") || "16", 10);
    const country = (searchParams.get("country") || session?.preferences?.country || undefined)?.toUpperCase();

    timer.start("key_lookup");
    const apiKey = (await getUserProviderKeyAsync(session?.user?.id, "youtube")) || undefined;
    timer.end("key_lookup");

    if (!apiKey) {
      const res = NextResponse.json({
        success: true,
        requiresApiKey: true,
        mode,
        category,
        videoType,
        country,
        count: 0,
        items: [],
        message: "Connect your YouTube API key in Settings to view recommendations.",
      });
      res.headers.set("Server-Timing", timer.toHeader());
      return res;
    }

    // Cache key incorporates all personalization and filtering dimensions
    const cacheKey = buildRecCacheKey({
      category,
      subcategory,
      mode,
      videoType,
      country,
      limit,
    });

    // Check warm recommendations cache
    const cachedItems = appCache.get<any[]>(cacheKey);
    if (cachedItems) {
      const res = NextResponse.json({
        success: true,
        fromCache: true,
        mode,
        category,
        videoType,
        country,
        count: cachedItems.length,
        items: cachedItems,
      });
      res.headers.set("Server-Timing", timer.toHeader());
      res.headers.set("X-Cache", "HIT");
      return res;
    }

    timer.start("rec_engine");
    // Single-flight stampede protection
    const items = await appCache.dedupe(cacheKey, async () => {
      return getRecommendedContent({
        userId: session?.user?.id,
        category,
        subcategory,
        mode,
        videoType,
        regionCode: country,
        limit,
      });
    });
    timer.end("rec_engine");

    if (items.length > 0) {
      appCache.set(cacheKey, items, CACHE_TTLS.RECOMMENDATIONS);
    }

    const res = NextResponse.json({
      success: true,
      fromCache: false,
      mode,
      category,
      videoType,
      country,
      count: items.length,
      items,
    });
    res.headers.set("Server-Timing", timer.toHeader());
    res.headers.set("X-Cache", "MISS");
    return res;
  } catch (err) {
    console.error("Recommendations API error:", err);
    return NextResponse.json({ error: "Failed to generate recommendations." }, { status: 500 });
  }
}
