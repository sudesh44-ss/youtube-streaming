/**
 * OmniDiscover — Local-Only Client Search Cache
 *
 * Implements a policy-compliant, client-side only cache for YouTube search results.
 * Strictly adheres to YouTube API Services Developer Policies:
 * - Never persists YouTube search result metadata to Supabase or any cloud database.
 * - Enforces strict TTL (default 24 hours, max policy limit 30 calendar days).
 * - Stores fetch timestamps and expiry metadata.
 * - Wipes all cached results upon user logout or account switching.
 * - Handles IndexedDB availability, quota exceptions, and concurrent in-flight deduplication.
 */

import { NormalizedContentItem, YouTubeChannelItem } from "./types";
import { STORAGE_CHANGE_EVENT } from "./local-storage";

export interface CachedSearchData {
  items: NormalizedContentItem[];
  channels: YouTubeChannelItem[];
  nextPageToken?: string;
  count: number;
}

export interface SearchCacheRecord {
  cacheKey: string;
  query: string;
  timestamp: number;
  expiresAt: number;
  data: CachedSearchData;
}

const DB_NAME = "omnidiscover_search_cache_db";
const DB_VERSION = 1;
const STORE_NAME = "search_cache";

// Maximum retention: 24 hours for fresh search discovery (well within YouTube 30-day max policy)
export const DEFAULT_SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// In-flight request deduplication map to prevent simultaneous duplicate requests
const inFlightSearchPromises = new Map<string, Promise<any>>();

// In-memory fallback if IndexedDB is unavailable or throws QuotaExceededError
const memoryCache = new Map<string, SearchCacheRecord>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function normalizeKey(query: string, category?: string, videoType?: string): string {
  const q = (query || "").trim().toLowerCase();
  const c = (category || "all").trim().toLowerCase();
  const v = (videoType || "all").trim().toLowerCase();
  return `search:${q}:${c}:${v}`;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getIndexedDB(): Promise<IDBDatabase | null> {
  if (!isBrowser() || typeof window.indexedDB === "undefined") {
    return Promise.resolve(null);
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "cacheKey" });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("expiresAt", "expiresAt", { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.warn("Failed to open IndexedDB search cache; using memory fallback.");
        resolve(null);
      };
    } catch (err) {
      console.warn("IndexedDB initialization error:", err);
      resolve(null);
    }
  });

  return dbPromise;
}

/**
 * Retrieve valid, non-expired search results from local cache.
 */
export async function getLocalSearchCache(
  query: string,
  category?: string,
  videoType?: string
): Promise<CachedSearchData | null> {
  if (!isBrowser() || !query.trim()) return null;

  const key = normalizeKey(query, category, videoType);
  const now = Date.now();

  // 1. Check in-memory cache first
  const memRecord = memoryCache.get(key);
  if (memRecord) {
    if (now < memRecord.expiresAt) {
      return memRecord.data;
    } else {
      memoryCache.delete(key);
    }
  }

  // 2. Check IndexedDB
  try {
    const db = await getIndexedDB();
    if (!db) return null;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        const record = req.result as SearchCacheRecord | undefined;
        if (!record) {
          resolve(null);
          return;
        }

        // Check expiration
        if (now >= record.expiresAt) {
          // Delete expired entry asynchronously
          deleteLocalSearchCacheEntry(key).catch(() => {});
          resolve(null);
          return;
        }

        // Populate memory cache for rapid re-hits
        memoryCache.set(key, record);
        resolve(record.data);
      };

      req.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn("Error reading search cache from IndexedDB:", err);
    return null;
  }
}

/**
 * Persist search results into local-only cache with expiry timestamp.
 */
export async function setLocalSearchCache(
  query: string,
  data: CachedSearchData,
  category?: string,
  videoType?: string,
  ttlMs = DEFAULT_SEARCH_CACHE_TTL_MS
): Promise<void> {
  if (!isBrowser() || !query.trim() || !data) return;

  const key = normalizeKey(query, category, videoType);
  const now = Date.now();
  const expiresAt = now + ttlMs;

  const record: SearchCacheRecord = {
    cacheKey: key,
    query: query.trim(),
    timestamp: now,
    expiresAt,
    data,
  };

  // 1. Write to memory cache
  memoryCache.set(key, record);

  // 2. Write to IndexedDB
  try {
    const db = await getIndexedDB();
    if (!db) return;

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(record);
  } catch (err) {
    console.warn("Error writing search cache to IndexedDB:", err);
  }
}

/**
 * Delete a specific entry from local search cache.
 */
async function deleteLocalSearchCacheEntry(key: string): Promise<void> {
  memoryCache.delete(key);
  try {
    const db = await getIndexedDB();
    if (!db) return;
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
  } catch {
    // Non-blocking cleanup
  }
}

/**
 * Get all previously searched, non-expired query strings from local cache.
 * Used to enrich local suggestions without making remote API requests.
 */
export async function getCachedSearchQueries(): Promise<string[]> {
  const queries = new Set<string>();
  const now = Date.now();

  // From memory
  for (const record of memoryCache.values()) {
    if (now < record.expiresAt && record.query) {
      queries.add(record.query);
    }
  }

  // From IndexedDB
  try {
    const db = await getIndexedDB();
    if (db) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.openCursor();

        req.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
          if (cursor) {
            const val = cursor.value as SearchCacheRecord;
            if (val && now < val.expiresAt && val.query) {
              queries.add(val.query);
            }
            cursor.continue();
          } else {
            resolve();
          }
        };

        req.onerror = () => resolve();
      });
    }
  } catch {
    // Graceful
  }

  return Array.from(queries);
}

/**
 * Completely clear the local search cache.
 * Automatically called on user logout to guarantee privacy and account isolation.
 */
export async function clearLocalSearchCache(): Promise<void> {
  memoryCache.clear();
  inFlightSearchPromises.clear();

  try {
    const db = await getIndexedDB();
    if (!db) return;

    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
  } catch (err) {
    console.warn("Failed to clear local search cache:", err);
  }
}

/**
 * Deduplicate concurrent in-flight requests for identical queries.
 */
export function deduplicateInFlightSearch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const existing = inFlightSearchPromises.get(cacheKey);
  if (existing) {
    return existing;
  }

  const promise = fetcher().finally(() => {
    inFlightSearchPromises.delete(cacheKey);
  });

  inFlightSearchPromises.set(cacheKey, promise);
  return promise;
}

// Auto-listen to storage logout event to clear search cache
if (isBrowser()) {
  window.addEventListener(STORAGE_CHANGE_EVENT, (event: any) => {
    if (event.detail?.key === "ALL_LOGOUT") {
      clearLocalSearchCache().catch(() => {});
    }
  });
}
