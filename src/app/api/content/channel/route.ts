import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserProviderKeyAsync, getOAuthConnectionAsync } from "@/lib/data-service";
import { appCache, CACHE_TTLS } from "@/lib/cache-service";
import { NormalizedContentItem } from "@/lib/types";
import { parseIsoDuration, formatViewCount } from "@/lib/format-utils";

export const dynamic = "force-dynamic";

function formatCount(countStr?: string): string | undefined {
  if (!countStr) return undefined;
  const num = parseInt(countStr, 10);
  if (isNaN(num)) return countStr;
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toLocaleString();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get("id")?.trim() || "";
    const pageToken = searchParams.get("pageToken")?.trim() || "";
    const tab = (searchParams.get("tab")?.trim().toLowerCase() as "all" | "videos" | "shorts") || "all";

    if (!channelId) {
      return NextResponse.json({ error: "channelId is required" }, { status: 400 });
    }

    const session = await getCurrentSession();
    const apiKey = await getUserProviderKeyAsync(session?.user?.id, "youtube");

    if (!apiKey || apiKey.trim().length < 20) {
      return NextResponse.json(
        { error: "A valid YouTube Data API key is required to view channel profiles." },
        { status: 400 }
      );
    }

    // 1. Fetch channel metadata (or get from cache)
    const cacheKey = `channel:meta:${channelId}`;
    let channelMeta = appCache.get<any>(cacheKey);

    if (!channelMeta) {
      const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics,brandingSettings&id=${encodeURIComponent(
        channelId
      )}&key=${encodeURIComponent(apiKey.trim())}`;

      const res = await fetch(channelUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) {
        return NextResponse.json(
          { error: "Failed to fetch channel from YouTube API." },
          { status: res.status }
        );
      }

      const data = await res.json();
      const chItem = data.items?.[0];
      if (!chItem) {
        return NextResponse.json({ error: "Channel not found." }, { status: 404 });
      }

      const snippet = chItem.snippet || {};
      const stats = chItem.statistics || {};
      const branding = chItem.brandingSettings || {};
      const contentDetails = chItem.contentDetails || {};

      channelMeta = {
        id: channelId,
        title: snippet.title || "YouTube Creator",
        description: snippet.description || "",
        customUrl: snippet.customUrl,
        avatar:
          snippet.thumbnails?.high?.url ||
          snippet.thumbnails?.medium?.url ||
          snippet.thumbnails?.default?.url ||
          "",
        banner:
          branding.image?.bannerExternalUrl ||
          branding.image?.bannerMobileHdImageUrl ||
          branding.image?.bannerImageUrl ||
          null,
        subscriberCount: stats.subscriberCount ? `${formatCount(stats.subscriberCount)} subscribers` : undefined,
        subscriberCountRaw: stats.subscriberCount ? parseInt(stats.subscriberCount, 10) : undefined,
        videoCount: stats.videoCount ? formatCount(stats.videoCount) : undefined,
        viewCount: stats.viewCount ? `${formatCount(stats.viewCount)} views` : undefined,
        uploadsPlaylistId: contentDetails.relatedPlaylists?.uploads || null,
      };

      appCache.set(cacheKey, channelMeta, CACHE_TTLS.CHANNEL_METADATA);
    }

    // 2. Check real subscription status if user has connected YouTube OAuth
    let isSubscribed = false;
    let subscriptionId: string | undefined = undefined;

    if (session?.user?.id) {
      try {
        const conn = await getOAuthConnectionAsync(session.user.id, "youtube");
        if (conn?.accessToken) {
          const subUrl = `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&forChannelId=${encodeURIComponent(
            channelId
          )}`;
          const subRes = await fetch(subUrl, {
            headers: { Authorization: `Bearer ${conn.accessToken}` },
            signal: AbortSignal.timeout(3000),
          });
          if (subRes.ok) {
            const subData = await subRes.json();
            if (Array.isArray(subData.items) && subData.items.length > 0) {
              isSubscribed = true;
              subscriptionId = subData.items[0].id;
            }
          }
        }
      } catch {
        // Non-blocking subscription check
      }
    }

    // Helper to batch-enrich video items with duration, view count, and Shorts classification
    async function enrichVideoDetails(videoIds: string[], key: string) {
      const detailsMap = new Map<string, { duration?: string; views?: string; isShort: boolean }>();
      if (!videoIds.length) return detailsMap;
      try {
        const vUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${encodeURIComponent(
          videoIds.join(",")
        )}&key=${encodeURIComponent(key)}`;
        const vRes = await fetch(vUrl, { signal: AbortSignal.timeout(5000) });
        if (vRes.ok) {
          const vData = await vRes.json();
          if (Array.isArray(vData.items)) {
            for (const vIt of vData.items) {
              const durIso = vIt.contentDetails?.duration;
              const { formatted, totalSeconds } = parseIsoDuration(durIso);
              const views = formatViewCount(vIt.statistics?.viewCount);
              const titleText = `${vIt.snippet?.title || ""} ${vIt.snippet?.description || ""}`.toLowerCase();
              const isShort =
                (totalSeconds > 0 && totalSeconds <= 60) ||
                titleText.includes("#shorts") ||
                titleText.includes("#short");
              detailsMap.set(vIt.id, {
                duration: formatted || undefined,
                views: views || undefined,
                isShort,
              });
            }
          }
        }
      } catch {
        // Non-blocking enrichment
      }
      return detailsMap;
    }

    // 3. Fetch channel uploads paginated strictly at 10 videos per request
    let uploads: NormalizedContentItem[] = [];
    let nextPageToken: string | undefined = undefined;

    if (channelMeta.uploadsPlaylistId) {
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(
        channelMeta.uploadsPlaylistId
      )}&maxResults=10${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}&key=${encodeURIComponent(
        apiKey.trim()
      )}`;

      const pRes = await fetch(playlistUrl, { signal: AbortSignal.timeout(6000) });
      if (pRes.ok) {
        const pData = await pRes.json();
        nextPageToken = pData.nextPageToken;

        if (Array.isArray(pData.items)) {
          const validItems = pData.items.filter(
            (item: any) => item.snippet?.title !== "Private video" && item.snippet?.title !== "Deleted video"
          );
          const videoIds = validItems
            .map((item: any) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId)
            .filter(Boolean);

          const detailsMap = await enrichVideoDetails(videoIds, apiKey.trim());

          uploads = validItems.map((item: any) => {
            const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
            const detail = detailsMap.get(videoId);
            const titleText = `${item.snippet?.title || ""} ${item.snippet?.description || ""}`.toLowerCase();
            const isShort = detail ? detail.isShort : titleText.includes("#shorts") || titleText.includes("#short");

            return {
              id: `youtube:${videoId}`,
              provider: "youtube" as const,
              providerId: videoId,
              contentType: "video" as const,
              title: item.snippet?.title || "Video",
              description: item.snippet?.description || "",
              thumbnail:
                item.snippet?.thumbnails?.high?.url ||
                item.snippet?.thumbnails?.medium?.url ||
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              category: "general",
              publicationDate: item.snippet?.publishedAt,
              creator: channelMeta.title,
              channelId: channelId,
              channelAvatar: channelMeta.avatar,
              duration: detail?.duration,
              views: detail?.views,
              isShort,
              externalUrl: `https://www.youtube.com/watch?v=${videoId}`,
              playbackMethod: "iframe_embed" as const,
              embedUrl: `https://www.youtube.com/embed/${videoId}`,
              providerAttribution: "YouTube",
              availabilityStatus: "available" as const,
            };
          });
        }
      }
    } else {
      // Fallback search by channelId if uploads playlist ID unavailable
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(
        channelId
      )}&order=date&type=video&maxResults=10${
        pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""
      }&key=${encodeURIComponent(apiKey.trim())}`;

      const sRes = await fetch(searchUrl, { signal: AbortSignal.timeout(6000) });
      if (sRes.ok) {
        const sData = await sRes.json();
        nextPageToken = sData.nextPageToken;
        if (Array.isArray(sData.items)) {
          const videoIds = sData.items.map((it: any) => it.id?.videoId).filter(Boolean);
          const detailsMap = await enrichVideoDetails(videoIds, apiKey.trim());

          uploads = sData.items.map((item: any) => {
            const videoId = item.id?.videoId;
            const detail = detailsMap.get(videoId);
            const titleText = `${item.snippet?.title || ""} ${item.snippet?.description || ""}`.toLowerCase();
            const isShort = detail ? detail.isShort : titleText.includes("#shorts") || titleText.includes("#short");

            return {
              id: `youtube:${videoId}`,
              provider: "youtube" as const,
              providerId: videoId,
              contentType: "video" as const,
              title: item.snippet?.title || "Video",
              description: item.snippet?.description || "",
              thumbnail:
                item.snippet?.thumbnails?.high?.url ||
                item.snippet?.thumbnails?.medium?.url ||
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              category: "general",
              publicationDate: item.snippet?.publishedAt,
              creator: channelMeta.title,
              channelId: channelId,
              channelAvatar: channelMeta.avatar,
              duration: detail?.duration,
              views: detail?.views,
              isShort,
              externalUrl: `https://www.youtube.com/watch?v=${videoId}`,
              playbackMethod: "iframe_embed" as const,
              embedUrl: `https://www.youtube.com/embed/${videoId}`,
              providerAttribution: "YouTube",
              availabilityStatus: "available" as const,
            };
          });
        }
      }
    }

    // Filter by tab if requested
    if (tab === "shorts") {
      uploads = uploads.filter((item) => item.isShort);
    } else if (tab === "videos") {
      uploads = uploads.filter((item) => !item.isShort);
    }

    return NextResponse.json({
      success: true,
      channel: {
        ...channelMeta,
        isSubscribed,
        subscriptionId,
      },
      uploads,
      nextPageToken,
    });
  } catch (err: any) {
    console.error("Channel API error:", err);
    return NextResponse.json({ error: "Failed to resolve channel details." }, { status: 500 });
  }
}
