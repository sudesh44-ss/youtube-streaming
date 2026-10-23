import { NormalizedContentItem } from "./types";

export interface DiscoverFeedData {
  trending: NormalizedContentItem[];
  recommended: NormalizedContentItem[];
  music: NormalizedContentItem[];
  gaming: NormalizedContentItem[];
  study: NormalizedContentItem[];
  cachedAt: number;
}

// In-memory cache with configurable TTL (default: 10 minutes = 600,000 ms)
const DEFAULT_TTL_MS = 10 * 60 * 1000;
const feedCache = new Map<string, { data: DiscoverFeedData; expiresAt: number }>();

export function getCachedFeed(key: string): DiscoverFeedData | null {
  const entry = feedCache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    feedCache.delete(key);
    return null;
  }

  return entry.data;
}

export function setCachedFeed(key: string, data: DiscoverFeedData, ttlMs = DEFAULT_TTL_MS): void {
  feedCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

export function clearFeedCache(key?: string): void {
  if (key) {
    feedCache.delete(key);
  } else {
    feedCache.clear();
  }
}
