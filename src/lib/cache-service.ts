/**
 * OmniDiscover Unified Performance Cache Service
 * 
 * Provides high-speed in-memory caching with TTL expiration,
 * single-flight in-flight request deduplication (stampede prevention),
 * and parameterized cache key isolation for public discovery data.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  tags?: string[];
}

export const CACHE_TTLS = {
  SEARCH_RESULTS: 5 * 60 * 1000,      // 5 minutes
  RECOMMENDATIONS: 10 * 60 * 1000,    // 10 minutes
  FEED_TRENDING: 15 * 60 * 1000,      // 15 minutes
  CHANNEL_METADATA: 24 * 60 * 60 * 1000, // 24 hours
  PROVIDER_STATUS: 30 * 1000,         // 30 seconds
} as const;

class MemoryCacheService {
  private store = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, Promise<any>>();
  private maxEntries = 1000;

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number, tags?: string[]): void {
    // Evict oldest if reaching capacity
    if (this.store.size >= this.maxEntries) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      tags,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  invalidateTag(tag: string): void {
    for (const [key, entry] of this.store.entries()) {
      if (entry.tags && entry.tags.includes(tag)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
    this.inFlight.clear();
  }

  /**
   * Single-flight execution: ensures identical concurrent asynchronous requests
   * share a single in-flight promise instead of stampeding the upstream API.
   */
  async dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const existing = this.inFlight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const promise = (async () => {
      try {
        return await fetcher();
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Helper that checks cache first; on miss, invokes fetcher with deduplication,
   * stores result in cache, and returns it.
   */
  async getOrSet<T>(
    key: string,
    ttlMs: number,
    fetcher: () => Promise<T>,
    tags?: string[]
  ): Promise<{ data: T; fromCache: boolean }> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return { data: cached, fromCache: true };
    }

    const fresh = await this.dedupe(key, fetcher);
    if (fresh !== undefined && fresh !== null) {
      this.set(key, fresh, ttlMs, tags);
    }
    return { data: fresh, fromCache: false };
  }
}

// Global singleton instance
export const appCache = new MemoryCacheService();

/**
 * Builds safe, normalized cache keys for search queries.
 */
export function buildSearchCacheKey(params: {
  query: string;
  category?: string;
  subcategory?: string;
  videoType?: string;
  sortBy?: string;
  country?: string;
  pageToken?: string;
}): string {
  const q = (params.query || "").trim().toLowerCase();
  const cat = params.category || "all";
  const subcat = params.subcategory || "none";
  const vt = params.videoType || "all";
  const sort = params.sortBy || "relevance";
  const c = params.country || "US";
  const page = params.pageToken || "p1";
  return `search:${c}:${cat}:${subcat}:${vt}:${sort}:${page}:${encodeURIComponent(q)}`;
}

/**
 * Builds safe, normalized cache keys for category recommendations.
 */
export function buildRecCacheKey(params: {
  category?: string;
  subcategory?: string;
  mode?: string;
  videoType?: string;
  country?: string;
  limit?: number;
}): string {
  const cat = params.category || "general";
  const subcat = params.subcategory || "none";
  const mode = params.mode || "normal";
  const vt = params.videoType || "all";
  const c = params.country || "US";
  const lim = params.limit || 16;
  return `rec:${c}:${mode}:${cat}:${subcat}:${vt}:${lim}`;
}

/**
 * Builds safe, normalized cache keys for public/regional trending feeds.
 */
export function buildFeedCacheKey(country: string, batch = 1): string {
  return `feed:public:${(country || "US").toUpperCase()}:b${batch}`;
}
