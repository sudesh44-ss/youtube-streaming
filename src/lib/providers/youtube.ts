import { IProviderAdapter, ProviderValidationResult } from "./types";
import { NormalizedContentItem, SearchFilters } from "../types";
import { CURATED_CATALOG } from "./curated-data";

export class YouTubeAdapter implements IProviderAdapter {
  id = "youtube" as const;
  name = "YouTube Data API v3";
  attribution = "YouTube / Google LLC";

  async validateCredentials(apiKey: string): Promise<ProviderValidationResult> {
    if (!apiKey || apiKey.trim().length < 20) {
      return {
        isValid: false,
        status: "invalid_credentials",
        errorMessage: "API key is too short or improperly formatted. A YouTube Data API v3 key is required.",
      };
    }

    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&maxResults=1&key=${encodeURIComponent(apiKey.trim())}`;
      const res = await fetch(url, {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(6000),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorReason = data?.error?.errors?.[0]?.reason || "";
        const errorMsg = data?.error?.message || "YouTube API error";

        if (errorReason === "quotaExceeded" || res.status === 429) {
          return {
            isValid: false,
            status: "quota_exceeded",
            errorMessage: "YouTube API quota has been exceeded for this project key.",
          };
        }

        return {
          isValid: false,
          status: "invalid_credentials",
          errorMessage: errorMsg,
        };
      }

      return {
        isValid: true,
        status: "connected",
        metadata: {
          etag: data.etag,
          validatedAt: Date.now(),
        },
      };
    } catch (err: any) {
      return {
        isValid: false,
        status: "unavailable",
        errorMessage: err.name === "TimeoutError" ? "Validation timed out connecting to Google servers." : "Network connection failed.",
      };
    }
  }

  async search(filters: SearchFilters, apiKey?: string): Promise<NormalizedContentItem[]> {
    const query = filters.query?.trim() || "";
    const category = filters.category;

    if (apiKey && apiKey.trim().length > 20) {
      try {
        let searchQuery = query;
        if (!searchQuery && category) {
          searchQuery = category === "study" ? "education lecture tutorial" : category;
        }

        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${filters.limit || 15}&type=video&q=${encodeURIComponent(searchQuery)}&key=${encodeURIComponent(apiKey.trim())}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.items)) {
            return data.items.map((item: any) => ({
              id: `youtube:${item.id.videoId}`,
              provider: "youtube" as const,
              providerId: item.id.videoId,
              contentType: "video" as const,
              title: item.snippet.title,
              description: item.snippet.description,
              thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || "",
              category: category || "general",
              publicationDate: item.snippet.publishedAt,
              creator: item.snippet.channelTitle,
              externalUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
              playbackMethod: "iframe_embed" as const,
              embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
              providerAttribution: "YouTube",
              availabilityStatus: "available" as const,
            }));
          }
        }
      } catch (e) {
        console.warn("Live YouTube API fetch failed, falling back to curated verified dataset", e);
      }
    }

    // Fallback to curated catalog
    return CURATED_CATALOG.filter((item) => {
      if (item.provider !== "youtube") return false;
      if (category && item.category !== category) return false;
      if (filters.subcategory && item.subcategory?.toLowerCase() !== filters.subcategory.toLowerCase()) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          (item.creator && item.creator.toLowerCase().includes(q)) ||
          (item.subcategory && item.subcategory.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }

  async getRecommendations(category?: string, apiKey?: string): Promise<NormalizedContentItem[]> {
    return this.search({ category, mode: category ? "category" : "normal", limit: 12 }, apiKey);
  }

  async getDetails(contentId: string, apiKey?: string): Promise<NormalizedContentItem | null> {
    const existing = CURATED_CATALOG.find((i) => i.providerId === contentId || i.id === `youtube:${contentId}`);
    if (existing) return existing;

    if (apiKey) {
      try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${encodeURIComponent(contentId)}&key=${encodeURIComponent(apiKey.trim())}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          const item = data.items?.[0];
          if (item) {
            return {
              id: `youtube:${item.id}`,
              provider: "youtube",
              providerId: item.id,
              contentType: "video",
              title: item.snippet.title,
              description: item.snippet.description,
              thumbnail: item.snippet.thumbnails?.high?.url || "",
              category: "general",
              publicationDate: item.snippet.publishedAt,
              creator: item.snippet.channelTitle,
              externalUrl: `https://www.youtube.com/watch?v=${item.id}`,
              playbackMethod: "iframe_embed",
              embedUrl: `https://www.youtube.com/embed/${item.id}`,
              providerAttribution: "YouTube",
              availabilityStatus: "available",
            };
          }
        }
      } catch (e) {
        console.error("YouTube getDetails failed:", e);
      }
    }

    return null;
  }
}
