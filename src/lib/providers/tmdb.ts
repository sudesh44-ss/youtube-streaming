import { IProviderAdapter, ProviderValidationResult } from "./types";
import { NormalizedContentItem, SearchFilters } from "../types";
import { CURATED_CATALOG } from "./curated-data";

export class TMDBAdapter implements IProviderAdapter {
  id = "tmdb" as const;
  name = "The Movie Database (TMDB)";
  attribution = "This product uses the TMDB API but is not endorsed or certified by TMDB.";

  async validateCredentials(apiKey: string): Promise<ProviderValidationResult> {
    if (!apiKey || apiKey.trim().length < 20) {
      return {
        isValid: false,
        status: "invalid_credentials",
        errorMessage: "API key is too short or invalid. A valid TMDB v3 API Key is required.",
      };
    }

    try {
      const url = `https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(apiKey.trim())}`;
      const res = await fetch(url, {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(6000),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          return {
            isValid: false,
            status: "invalid_credentials",
            errorMessage: data.status_message || "Invalid TMDB API key provided.",
          };
        }
        if (res.status === 429) {
          return {
            isValid: false,
            status: "quota_exceeded",
            errorMessage: "TMDB API rate limit exceeded.",
          };
        }
        return {
          isValid: false,
          status: "unavailable",
          errorMessage: data.status_message || "TMDB service error",
        };
      }

      return {
        isValid: true,
        status: "connected",
        metadata: {
          imagesBaseUrl: data.images?.secure_base_url,
          validatedAt: Date.now(),
        },
      };
    } catch (err: any) {
      return {
        isValid: false,
        status: "unavailable",
        errorMessage: err.name === "TimeoutError" ? "Connection to TMDB servers timed out." : "Network connection failed.",
      };
    }
  }

  async search(filters: SearchFilters, apiKey?: string): Promise<NormalizedContentItem[]> {
    if (filters.videoType === "shorts") {
      return []; // TMDB catalog does not supply YouTube Shorts
    }

    const query = filters.query?.trim() || "";

    if (apiKey && apiKey.trim().length > 20) {
      try {
        const endpoint = query
          ? `https://api.themoviedb.org/3/search/movie?api_key=${encodeURIComponent(apiKey.trim())}&query=${encodeURIComponent(query)}&page=1`
          : `https://api.themoviedb.org/3/discover/movie?api_key=${encodeURIComponent(apiKey.trim())}&sort_by=popularity.desc&page=1`;

        const res = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.results)) {
            return data.results.slice(0, filters.limit || 12).map((item: any) => ({
              id: `tmdb:${item.id}`,
              provider: "tmdb" as const,
              providerId: String(item.id),
              contentType: "movie" as const,
              title: item.title || item.original_title,
              description: item.overview || "No overview available.",
              thumbnail: item.poster_path
                ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
                : "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
              category: "movies",
              publicationDate: item.release_date,
              creator: `Rating: ${item.vote_average}/10 (${item.vote_count} votes)`,
              externalUrl: `https://www.themoviedb.org/movie/${item.id}`,
              playbackMethod: "external_link" as const,
              providerAttribution: "TMDB",
              availabilityStatus: "preview_only" as const,
            }));
          }
        }
      } catch (e) {
        console.warn("Live TMDB API fetch failed, falling back to curated verified dataset", e);
      }
    }

    return CURATED_CATALOG.filter((item) => {
      if (item.provider !== "tmdb") return false;
      if (filters.category && item.category !== filters.category) return false;
      if (query) {
        const q = query.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          (item.creator && item.creator.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }

  async getRecommendations(category?: string, apiKey?: string): Promise<NormalizedContentItem[]> {
    return this.search({ category: "movies", mode: "category", limit: 8 }, apiKey);
  }

  async getDetails(contentId: string, apiKey?: string): Promise<NormalizedContentItem | null> {
    const existing = CURATED_CATALOG.find((i) => i.providerId === contentId || i.id === `tmdb:${contentId}`);
    if (existing) return existing;

    if (apiKey) {
      try {
        const url = `https://api.themoviedb.org/3/movie/${encodeURIComponent(contentId)}?api_key=${encodeURIComponent(apiKey.trim())}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const item = await res.json();
          return {
            id: `tmdb:${item.id}`,
            provider: "tmdb",
            providerId: String(item.id),
            contentType: "movie",
            title: item.title,
            description: item.overview,
            thumbnail: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : "",
            category: "movies",
            publicationDate: item.release_date,
            creator: item.tagline || `Runtime: ${item.runtime} mins`,
            externalUrl: `https://www.themoviedb.org/movie/${item.id}`,
            playbackMethod: "external_link",
            providerAttribution: "TMDB",
            availabilityStatus: "preview_only",
          };
        }
      } catch (e) {
        console.error("TMDB getDetails error:", e);
      }
    }

    return null;
  }
}
