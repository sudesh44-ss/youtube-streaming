import { NormalizedContentItem, SearchFilters } from "../types";

export interface ProviderValidationResult {
  isValid: boolean;
  status: "connected" | "invalid_credentials" | "quota_exceeded" | "unavailable";
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface IProviderAdapter {
  id: "youtube" | "tmdb" | "spotify";
  name: string;
  attribution: string;
  validateCredentials(apiKey: string): Promise<ProviderValidationResult>;
  search(filters: SearchFilters, apiKey?: string): Promise<NormalizedContentItem[]>;
  getRecommendations(category?: string, apiKey?: string): Promise<NormalizedContentItem[]>;
  getDetails(contentId: string, apiKey?: string): Promise<NormalizedContentItem | null>;
}
