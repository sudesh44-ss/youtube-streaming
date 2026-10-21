import { IProviderAdapter, ProviderValidationResult } from "./types";
import { NormalizedContentItem, SearchFilters } from "../types";
import { CURATED_CATALOG } from "./curated-data";

export class SpotifyAdapter implements IProviderAdapter {
  id = "spotify" as const;
  name = "Spotify Music Metadata";
  attribution = "Spotify AB";

  async validateCredentials(token: string): Promise<ProviderValidationResult> {
    if (!token || token.trim().length < 25) {
      return {
        isValid: false,
        status: "invalid_credentials",
        errorMessage: "A valid Spotify Client Access Token or OAuth Bearer Token is required.",
      };
    }

    try {
      const res = await fetch("https://api.spotify.com/v1/browse/new-releases?limit=1", {
        headers: {
          "Authorization": `Bearer ${token.trim()}`,
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        if (res.status === 401) {
          return {
            isValid: false,
            status: "invalid_credentials",
            errorMessage: "Spotify access token has expired or is invalid.",
          };
        }
        if (res.status === 429) {
          return {
            isValid: false,
            status: "quota_exceeded",
            errorMessage: "Spotify API rate limit reached.",
          };
        }
        return {
          isValid: false,
          status: "unavailable",
          errorMessage: "Spotify service returned an error.",
        };
      }

      return {
        isValid: true,
        status: "connected",
        metadata: {
          validatedAt: Date.now(),
        },
      };
    } catch (err: any) {
      return {
        isValid: false,
        status: "unavailable",
        errorMessage: err.name === "TimeoutError" ? "Connection to Spotify servers timed out." : "Network connection error.",
      };
    }
  }

  async search(filters: SearchFilters, apiKey?: string): Promise<NormalizedContentItem[]> {
    // Spotify playback is restricted by terms; we provide metadata, preview links, or fallback to curated music videos and lofi streams
    return CURATED_CATALOG.filter((item) => {
      if (item.category !== "music") return false;
      if (filters.subcategory && item.subcategory?.toLowerCase() !== filters.subcategory.toLowerCase()) return false;
      if (filters.query) {
        const q = filters.query.toLowerCase();
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
    return this.search({ category: "music", mode: "category", limit: 8 }, apiKey);
  }

  async getDetails(contentId: string, apiKey?: string): Promise<NormalizedContentItem | null> {
    return CURATED_CATALOG.find((i) => i.id === contentId || i.providerId === contentId) || null;
  }
}
