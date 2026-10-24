import { NormalizedContentItem, BrowsingMode } from "./types";
import { queryUnifiedContent } from "./providers";
import { getUserRecommendationSignalsAsync } from "./data-service";

export interface RecommendationOptions {
  userId?: string;
  category?: string;
  subcategory?: string;
  mode: BrowsingMode;
  videoType?: "all" | "shorts" | "videos";
  regionCode?: string;
  language?: string;
  limit?: number;
}

export async function getRecommendedContent(options: RecommendationOptions): Promise<NormalizedContentItem[]> {
  const { userId, category, subcategory, mode, videoType, regionCode, language, limit = 16 } = options;

  // 1. Fetch raw items from providers with region context
  const items = await queryUnifiedContent(
    {
      category,
      subcategory,
      mode,
      videoType,
      regionCode,
      language,
      limit: 40,
    },
    userId
  );

  // 2. Load user preferences & history signals if user is authenticated
  let preferredCategories: string[] = [];
  let savedCategoryCounts: Record<string, number> = {};
  let recentSearchKeywords: string[] = [];

  if (userId) {
    try {
      const signals = await getUserRecommendationSignalsAsync(userId);
      preferredCategories = signals.preferredCategories;
      savedCategoryCounts = signals.savedCategoryCounts;
      recentSearchKeywords = signals.recentSearchKeywords;
    } catch (e) {
      console.warn("Failed to load user recommendation signals:", e);
    }
  }

  // 3. Rule-based Scoring Engine
  const scoredItems = items.map((item) => {
    let score = 50; // base score

    // Signal A: Mode & Category Condition
    if (mode === "category") {
      if (category && item.category !== category) {
        return { item, score: -1000 }; // strict exclusion
      }
      if (subcategory && item.subcategory?.toLowerCase() === subcategory.toLowerCase()) {
        score += 35;
      }
    } else {
      // Normal Mode: boost categories that match user's explicit interests
      if (preferredCategories.includes(item.category)) {
        score += 25;
      }
      // Boost categories from saved content history
      if (savedCategoryCounts[item.category]) {
        score += Math.min(savedCategoryCounts[item.category] * 5, 20);
      }
    }

    // Signal B: Recency signal
    if (item.publicationDate) {
      const year = parseInt(item.publicationDate.slice(0, 4), 10);
      if (!isNaN(year)) {
        if (year >= 2024) score += 15;
        else if (year >= 2023) score += 10;
        else if (year >= 2022) score += 5;
      }
    }

    // Signal C: Keyword match with recent searches
    for (const kw of recentSearchKeywords) {
      if (item.title.toLowerCase().includes(kw) || item.description.toLowerCase().includes(kw)) {
        score += 15;
        break;
      }
    }

    // Signal D: Availability status
    if (item.availabilityStatus === "available") {
      score += 10;
    }

    return { item: { ...item, score }, score };
  });

  // Filter out excluded items and sort descending by score
  return scoredItems
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);
}
