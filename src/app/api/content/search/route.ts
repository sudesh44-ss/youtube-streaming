import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { queryUnifiedContentWithPagination } from "@/lib/providers";
import { getUserProviderKeyAsync, recordSearchHistory } from "@/lib/data-service";
import { YouTubeAdapter } from "@/lib/providers/youtube";
import { getDb } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { BrowsingMode, YouTubeChannelItem } from "@/lib/types";
import { checkRateLimit, getClientIp, rateLimitExceededResponse, RATE_LIMIT_POLICIES } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const session = await getCurrentSession();
    const identifier = session ? `user:${session.user.id}` : `ip:${ip}`;
    const rateCheck = await checkRateLimit(identifier, RATE_LIMIT_POLICIES.SEARCH);
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

    const apiKey = (await getUserProviderKeyAsync(session?.user?.id, "youtube")) || undefined;

    // Strict Requirement: Search MUST remain blank until a valid YouTube API key is saved.
    // Do not return placeholder videos, demo cards, or mock channels when no key exists.
    if (!apiKey) {
      return NextResponse.json({
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
    }

    // Save search history if query is provided and user is authenticated
    if (session && query.trim().length > 1 && !pageToken) {
      recordSearchHistory(session.user.id, query.trim(), category || null, mode).catch(() => {});
    }

    // Retrieve user's decrypted YouTube OAuth access token if available
    let userAccessToken: string | undefined = undefined;
    if (session?.user?.id) {
      try {
        const db = getDb();
        const row = db
          .prepare(
            "SELECT encrypted_access_token, iv, auth_tag FROM oauth_connections WHERE user_id = ? AND provider = 'youtube'"
          )
          .get(session.user.id) as { encrypted_access_token: string; iv: string; auth_tag: string } | undefined;
        if (row) {
          userAccessToken = decryptSecret(row.encrypted_access_token, row.iv, row.auth_tag);
        }
      } catch {
        // fail-safe: unauthorized / unconnected
      }
    }

    // Run unified video search
    const { items, nextPageToken } = await queryUnifiedContentWithPagination(
      {
        query,
        category,
        subcategory,
        mode,
        videoType,
        sortBy,
        limit,
        pageToken,
      },
      session?.user?.id
    );

    // If this is an initial search query (no pageToken), concurrently search for matching YouTube channels
    let channels: YouTubeChannelItem[] = [];
    if (query.trim().length > 0 && !pageToken) {
      try {
        const ytAdapter = new YouTubeAdapter();
        channels = await ytAdapter.searchChannels(query.trim(), apiKey, userAccessToken);
      } catch (err) {
        console.warn("Channel search encountered non-fatal error:", err);
      }
    }

    return NextResponse.json({
      success: true,
      query,
      category,
      mode,
      videoType,
      count: items.length,
      items,
      nextPageToken,
      channels,
    });
  } catch (err) {
    console.error("Search API error:", err);
    return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 });
  }
}
