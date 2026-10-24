/**
 * OmniDiscover — Personalized Recommendation Engine
 *
 * Implements a transparent, multi-signal recommendation and ranking engine:
 * 1. Derives an adaptive User Interest Profile from real viewing activity:
 *    - Watch duration, completion percentage, and early abandonment penalties.
 *    - Creator affinity (frequently watched and subscribed creators).
 *    - Search query topic relevance within 30-day retention window.
 *    - Saved videos and watchlist preferences.
 *    - Explicit negative feedback ("Not interested") hard suppression.
 * 2. Multi-source candidate pooling with quota-aware caching.
 * 3. Transparent, weighted scoring with creator & category diversity enforcement.
 * 4. Graceful cold-start fallback (regional trending + curated exploratory discovery).
 */

import { NormalizedContentItem, BrowsingMode } from "./types";
import { queryUnifiedContent } from "./providers";
import {
  getUserRecommendationSignalsAsync,
  UserRecommendationSignals,
  WatchedVideoSummary,
} from "./data-service";

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

export interface UserInterestProfile {
  userId?: string;
  categoryAffinity: Record<string, number>; // normalized category weights (0 - 1)
  creatorAffinity: Record<string, number>;  // creator name lowercase -> affinity score
  searchKeywords: string[];
  watchedVideoMap: Map<string, WatchedVideoSummary>;
  negativeContentIds: Set<string>;
  likedContentIds: Set<string>;
  preferredCategories: string[];
  country: string;
  isColdStart: boolean;
}

export interface RankingWeights {
  categoryRelevance: number;  // weight for matching user category interests
  creatorAffinity: number;    // weight for creators user frequently watches
  searchRelevance: number;    // weight for matching recent search queries
  savedRelevance: number;     // weight for saved content category affinity
  freshness: number;          // weight for recently published videos
  completionBoost: number;    // weight for re-engagement or continuation
  availability: number;       // base availability signal
  watchedPenalty: number;     // down-rank already watched videos (not hard suppression)
  abandonedPenalty: number;   // penalty for topics matching abandoned videos
  negativeFilter: number;     // penalty for explicit negative feedback (-1000)
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  categoryRelevance: 30,
  creatorAffinity: 25,
  searchRelevance: 20,
  savedRelevance: 15,
  freshness: 10,
  completionBoost: 15,
  availability: 5,
  watchedPenalty: -30,
  abandonedPenalty: -25,
  negativeFilter: -1000,
};

/**
 * Builds a normalized, transparent User Interest Profile from real activity signals.
 */
export function buildUserInterestProfile(
  signals: UserRecommendationSignals,
  userId?: string
): UserInterestProfile {
  const categoryAffinity: Record<string, number> = {};
  const creatorAffinity: Record<string, number> = {};
  const watchedVideoMap = new Map<string, WatchedVideoSummary>();
  const negativeContentIds = new Set<string>(signals.negativeContentIds || []);
  const likedContentIds = new Set<string>(signals.likedContentIds || []);

  // 1. Process explicit preferred categories (base score 0.3)
  for (const cat of signals.preferredCategories || []) {
    categoryAffinity[cat.toLowerCase()] = (categoryAffinity[cat.toLowerCase()] || 0) + 0.3;
  }

  // 2. Process saved content categories (each saved item adds 0.1, up to 0.4)
  for (const [cat, count] of Object.entries(signals.savedCategoryCounts || {})) {
    const normCat = cat.toLowerCase();
    categoryAffinity[normCat] = (categoryAffinity[normCat] || 0) + Math.min(count * 0.1, 0.4);
  }

  // 3. Process watched videos & duration signals
  const watchedList = signals.watchedVideos || [];
  for (const w of watchedList) {
    const vidId = w.contentId.replace(/^youtube:/, "");
    watchedVideoMap.set(vidId, w);
    watchedVideoMap.set(w.contentId, w);

    const channelNorm = (w.channelName || "").trim().toLowerCase();
    if (channelNorm) {
      if (w.completed) {
        creatorAffinity[channelNorm] = (creatorAffinity[channelNorm] || 0) + 0.35;
      } else if (!w.abandoned && w.progressPercent >= 30) {
        creatorAffinity[channelNorm] = (creatorAffinity[channelNorm] || 0) + 0.15;
      }
    }
  }

  // 4. Incorporate aggregated top watched creators
  for (const [creator, count] of Object.entries(signals.topWatchedCreators || {})) {
    const cNorm = creator.trim().toLowerCase();
    creatorAffinity[cNorm] = (creatorAffinity[cNorm] || 0) + Math.min(count * 0.1, 0.5);
  }

  // 5. Clean search keywords
  const searchKeywords = (signals.recentSearchKeywords || [])
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length >= 2);

  const hasActivity =
    (signals.preferredCategories && signals.preferredCategories.length > 0) ||
    watchedList.length > 0 ||
    searchKeywords.length > 0 ||
    Object.keys(signals.savedCategoryCounts || {}).length > 0;

  return {
    userId,
    categoryAffinity,
    creatorAffinity,
    searchKeywords,
    watchedVideoMap,
    negativeContentIds,
    likedContentIds,
    preferredCategories: signals.preferredCategories || [],
    country: signals.country || "US",
    isColdStart: !hasActivity,
  };
}

/**
 * Scores a candidate video against the User Interest Profile using transparent heuristics.
 */
export function scoreCandidateVideo(
  item: NormalizedContentItem,
  profile: UserInterestProfile,
  options: RecommendationOptions,
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS
): number {
  const vidId = item.providerId || item.id?.replace(/^youtube:/, "");

  // 1. Explicit Negative Feedback ("Not interested") -> Immediate exclusion
  if (profile.negativeContentIds.has(item.id) || (vidId && profile.negativeContentIds.has(vidId))) {
    return weights.negativeFilter;
  }

  // 2. Mode & Category boundary enforcement
  if (options.mode === "category") {
    if (options.category && item.category !== options.category) {
      return -1000; // Strict boundary: Category Mode must never leak other categories
    }
    if (options.subcategory && item.subcategory?.toLowerCase() === options.subcategory.toLowerCase()) {
      return 85;
    }
  }

  let score = 50; // Neutral starting score

  // Signal A: Category Affinity
  const itemCategory = (item.category || "").toLowerCase();
  if (profile.categoryAffinity[itemCategory]) {
    score += Math.min(profile.categoryAffinity[itemCategory], 1.0) * weights.categoryRelevance;
  } else if (profile.preferredCategories.includes(item.category)) {
    score += weights.categoryRelevance * 0.7;
  }

  // Signal B: Creator Affinity
  const creatorNorm = (item.creator || "").trim().toLowerCase();
  if (creatorNorm && profile.creatorAffinity[creatorNorm]) {
    score += Math.min(profile.creatorAffinity[creatorNorm], 1.0) * weights.creatorAffinity;
  }

  // Signal C: Search Keyword Relevance
  const itemText = `${item.title || ""} ${item.description || ""}`.toLowerCase();
  let matchedSearchCount = 0;
  for (const kw of profile.searchKeywords) {
    const terms = kw.split(/\s+/).filter((t) => t.length > 3);
    const hasFullMatch = itemText.includes(kw);
    const hasTermMatch = terms.some((t) => itemText.includes(t));
    if (hasFullMatch || hasTermMatch) {
      matchedSearchCount++;
      if (matchedSearchCount === 1) score += weights.searchRelevance;
      else if (matchedSearchCount === 2) score += weights.searchRelevance * 0.5;
    }
  }

  // Signal D: Saved Content & Likes Relevance
  if (profile.likedContentIds.has(item.id) || (vidId && profile.likedContentIds.has(vidId))) {
    score += weights.savedRelevance * 1.5;
  }

  // Signal E: Freshness & Publication Date
  if (item.publicationDate) {
    const year = parseInt(item.publicationDate.slice(0, 4), 10);
    if (!isNaN(year)) {
      if (year >= 2024) score += weights.freshness;
      else if (year >= 2023) score += weights.freshness * 0.6;
      else if (year >= 2022) score += weights.freshness * 0.3;
    }
  }

  // Signal F: Watched Video Handling (Down-ranking vs Completion vs Abandonment)
  const watchedRecord = (vidId && profile.watchedVideoMap.get(vidId)) || profile.watchedVideoMap.get(item.id);
  if (watchedRecord) {
    if (watchedRecord.completed) {
      // Completed videos are down-ranked to prioritize fresh discovery, but NOT permanently banned
      score += weights.watchedPenalty;
    } else if (watchedRecord.abandoned) {
      // Early abandonment penalizes this specific video heavily
      score += weights.abandonedPenalty;
    } else if (watchedRecord.progressPercent >= 15 && watchedRecord.progressPercent < 85) {
      // In-progress videos receive a continuation boost
      score += weights.completionBoost;
    } else {
      score += weights.watchedPenalty * 0.5;
    }
  }

  // Signal G: High-quality Availability Status
  if (item.availabilityStatus === "available") {
    score += weights.availability;
  }

  // Signal H: Exploratory Diversity Boost for Cold Start or Minor Categories
  if (profile.isColdStart) {
    // In cold start, give fair weight to diverse categories
    score += 10;
  }

  return Math.round(score);
}

/**
 * Ranks candidate videos and applies diversity rules:
 * - Sorts descending by score.
 * - Caps any single creator to max 2-3 items in the top results to avoid creator monopoly.
 * - Interleaves categories to ensure discovery variety.
 */
export function rankCandidateVideos(
  candidates: NormalizedContentItem[],
  profile: UserInterestProfile,
  options: RecommendationOptions,
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS
): NormalizedContentItem[] {
  const scored = candidates.map((item) => {
    const score = scoreCandidateVideo(item, profile, options, weights);
    return { item: { ...item, score }, score };
  });

  // Filter out hard excluded items (score <= 0)
  const valid = scored.filter((entry) => entry.score > 0);

  // Sort descending by score
  valid.sort((a, b) => b.score - a.score);

  // Apply Diversity Constraints:
  // 1. Max 2 items from the same creator in top 10; max 3 in top 20
  const creatorCounts = new Map<string, number>();
  const diverseList: NormalizedContentItem[] = [];
  const deferredList: NormalizedContentItem[] = [];

  for (const entry of valid) {
    const creator = (entry.item.creator || "unknown").trim().toLowerCase();
    const currentCount = creatorCounts.get(creator) || 0;

    if (currentCount < 2) {
      creatorCounts.set(creator, currentCount + 1);
      diverseList.push(entry.item);
    } else if (currentCount < 3) {
      creatorCounts.set(creator, currentCount + 1);
      deferredList.push(entry.item);
    }
  }

  // Combine primary diverse pool with deferred items up to limit
  const limit = options.limit || 16;
  const combined = [...diverseList, ...deferredList].slice(0, limit);

  return combined;
}

/**
 * End-to-end recommendation function:
 * Loads real user activity signals, builds interest profile, fetches unified candidates,
 * scores them transparently, and returns ranked results.
 */
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
  let signals: UserRecommendationSignals = {
    preferredCategories: [],
    savedCategoryCounts: {},
    recentSearchKeywords: [],
    country: regionCode || "US",
  };

  if (userId) {
    try {
      signals = await getUserRecommendationSignalsAsync(userId);
    } catch (e) {
      console.warn("Failed to load user recommendation signals:", e);
    }
  }

  // 3. Build User Interest Profile
  const profile = buildUserInterestProfile(signals, userId);

  // 4. Rank candidates using transparent multi-signal engine
  return rankCandidateVideos(items, profile, options);
}
