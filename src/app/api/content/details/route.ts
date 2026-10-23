import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserProviderKeyAsync } from "@/lib/data-service";
import { CURATED_CATALOG } from "@/lib/providers/curated-data";

export interface VideoDetailResponse {
  id: string;
  provider: "youtube";
  providerId: string;
  title: string;
  description: string;
  thumbnail: string;
  creator: string;
  channelId?: string;
  channelAvatar?: string;
  subscriberCount?: string;
  category: string;
  publicationDate?: string;
  views?: string;
  likes?: string;
  duration?: string;
  embedUrl: string;
  externalUrl: string;
  playbackMethod: "iframe_embed";
}

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
    const videoId = searchParams.get("id")?.trim() || "";
    const titleHint = searchParams.get("title")?.trim() || "";

    if (!videoId) {
      return NextResponse.json({ error: "Missing required video id" }, { status: 400 });
    }

    // 1. Check curated catalog first
    const curated = CURATED_CATALOG.find(
      (c) => c.providerId === videoId || c.id === `youtube:${videoId}`
    );

    if (curated) {
      const responseItem: VideoDetailResponse = {
        id: curated.id,
        provider: "youtube",
        providerId: curated.providerId,
        title: curated.title,
        description: curated.description || "Curated educational and discovery video on OmniDiscover.",
        thumbnail: curated.thumbnail,
        creator: curated.creator || "YouTube Creator",
        channelAvatar: curated.channelAvatar,
        category: curated.category || "general",
        publicationDate: curated.publicationDate,
        views: curated.views || "1.2M views",
        duration: curated.duration,
        embedUrl: curated.embedUrl || `https://www.youtube.com/embed/${videoId}`,
        externalUrl: curated.externalUrl || `https://www.youtube.com/watch?v=${videoId}`,
        playbackMethod: "iframe_embed",
      };
      return NextResponse.json({ success: true, item: responseItem });
    }

    // 2. Fetch live metadata from YouTube Data API v3 if API key is available
    const session = await getCurrentSession();
    const apiKey = await getUserProviderKeyAsync(session?.user?.id, "youtube");

    if (apiKey && apiKey.trim().length > 20) {
      try {
        const videoApiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(apiKey.trim())}`;
        const videoRes = await fetch(videoApiUrl, { signal: AbortSignal.timeout(5000) });

        if (videoRes.ok) {
          const videoData = await videoRes.json();
          const vItem = videoData.items?.[0];

          if (vItem) {
            const snippet = vItem.snippet || {};
            const stats = vItem.statistics || {};
            const channelId = snippet.channelId;

            let channelAvatar: string | undefined = undefined;
            let subscriberCount: string | undefined = undefined;

            // Optional channel details lookup
            if (channelId) {
              try {
                const chUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(apiKey.trim())}`;
                const chRes = await fetch(chUrl, { signal: AbortSignal.timeout(3000) });
                if (chRes.ok) {
                  const chData = await chRes.json();
                  const chItem = chData.items?.[0];
                  if (chItem) {
                    channelAvatar =
                      chItem.snippet?.thumbnails?.default?.url || chItem.snippet?.thumbnails?.medium?.url;
                    if (chItem.statistics?.subscriberCount) {
                      subscriberCount = `${formatCount(chItem.statistics.subscriberCount)} subscribers`;
                    }
                  }
                }
              } catch {
                // Channel lookup is non-blocking
              }
            }

            const responseItem: VideoDetailResponse = {
              id: `youtube:${videoId}`,
              provider: "youtube",
              providerId: videoId,
              title: snippet.title || titleHint || "YouTube Video",
              description: snippet.description || "",
              thumbnail:
                snippet.thumbnails?.maxres?.url ||
                snippet.thumbnails?.high?.url ||
                snippet.thumbnails?.medium?.url ||
                `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              creator: snippet.channelTitle || "YouTube Creator",
              channelId,
              channelAvatar,
              subscriberCount,
              category: "general",
              publicationDate: snippet.publishedAt ? snippet.publishedAt.split("T")[0] : undefined,
              views: stats.viewCount ? `${formatCount(stats.viewCount)} views` : undefined,
              likes: stats.likeCount ? formatCount(stats.likeCount) : undefined,
              embedUrl: `https://www.youtube.com/embed/${videoId}`,
              externalUrl: `https://www.youtube.com/watch?v=${videoId}`,
              playbackMethod: "iframe_embed",
            };

            return NextResponse.json({ success: true, item: responseItem });
          }
        }
      } catch (err) {
        console.warn("YouTube live details fetch failed, falling back to safe defaults:", err);
      }
    }

    // 3. Fallback item representation (guarantees watch page always loads)
    const fallbackItem: VideoDetailResponse = {
      id: `youtube:${videoId}`,
      provider: "youtube",
      providerId: videoId,
      title: titleHint || "YouTube Video",
      description: "Watch and discover content on OmniDiscover. Player controls and metadata provided via YouTube embed.",
      thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      creator: "YouTube Creator",
      category: "general",
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      externalUrl: `https://www.youtube.com/watch?v=${videoId}`,
      playbackMethod: "iframe_embed",
    };

    return NextResponse.json({ success: true, item: fallbackItem });
  } catch (err) {
    console.error("Error in /api/content/details:", err);
    return NextResponse.json({ error: "Failed to resolve video details." }, { status: 500 });
  }
}
