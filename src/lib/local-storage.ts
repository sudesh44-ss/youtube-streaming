/**
 * Safe client-side storage abstraction for Watchlist, Watch Later, and Local Preferences.
 * Does not store API keys, passwords, session tokens, or sensitive credentials.
 */

export interface SavedMediaItem {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelId?: string;
  channelTitle?: string;
  category?: string;
  duration?: string;
  views?: string;
  addedAt: number;
  listType: "watchlist" | "watch_later";
}

export interface WatchHistoryItem {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelName?: string;
  channelId?: string;
  duration?: string;
  lastWatched: number;
  playbackPosition?: number;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  searchMode?: string;
  searchTab?: "videos" | "channels";
  category?: string;
  videoType?: string;
}

const STORAGE_KEYS = {
  WATCHLIST: "omnidiscover_watchlist",
  WATCH_LATER: "omnidiscover_watch_later",
  LIKES: "omnidiscover_likes",
  WATCH_HISTORY: "omnidiscover_watch_history_v1",
  SEARCH_HISTORY: "omnidiscover_search_history_v1",
} as const;

export const STORAGE_CHANGE_EVENT = "omnidiscover_storage_change";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeGetItems(key: string): SavedMediaItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SavedMediaItem =>
        Boolean(item && typeof item === "object" && typeof item.videoId === "string" && typeof item.title === "string")
    );
  } catch (err) {
    console.warn(`Failed to read ${key} from localStorage:`, err);
    return [];
  }
}

function safeSetItems(key: string, items: SavedMediaItem[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key } }));
  } catch (err) {
    console.warn(`Failed to write ${key} to localStorage:`, err);
  }
}

/**
 * Watchlist operations
 */
export function getLocalWatchlist(): SavedMediaItem[] {
  return safeGetItems(STORAGE_KEYS.WATCHLIST);
}

export function isInLocalWatchlist(videoId: string): boolean {
  if (!videoId) return false;
  const list = getLocalWatchlist();
  return list.some((item) => item.videoId === videoId);
}

export function addToLocalWatchlist(item: Omit<SavedMediaItem, "addedAt" | "listType">): SavedMediaItem {
  const list = getLocalWatchlist();
  const existing = list.find((i) => i.videoId === item.videoId);
  if (existing) return existing;

  const newItem: SavedMediaItem = {
    ...item,
    addedAt: Date.now(),
    listType: "watchlist",
  };

  const updated = [newItem, ...list];
  safeSetItems(STORAGE_KEYS.WATCHLIST, updated);
  return newItem;
}

export function removeFromLocalWatchlist(videoId: string): void {
  const list = getLocalWatchlist();
  const updated = list.filter((i) => i.videoId !== videoId);
  safeSetItems(STORAGE_KEYS.WATCHLIST, updated);
}

export function toggleLocalWatchlist(item: Omit<SavedMediaItem, "addedAt" | "listType">): boolean {
  if (isInLocalWatchlist(item.videoId)) {
    removeFromLocalWatchlist(item.videoId);
    return false;
  } else {
    addToLocalWatchlist(item);
    return true;
  }
}

/**
 * Watch Later operations
 */
export function getLocalWatchLater(): SavedMediaItem[] {
  return safeGetItems(STORAGE_KEYS.WATCH_LATER);
}

export function isInLocalWatchLater(videoId: string): boolean {
  if (!videoId) return false;
  const list = getLocalWatchLater();
  return list.some((item) => item.videoId === videoId);
}

export function addToLocalWatchLater(item: Omit<SavedMediaItem, "addedAt" | "listType">): SavedMediaItem {
  const list = getLocalWatchLater();
  const existing = list.find((i) => i.videoId === item.videoId);
  if (existing) return existing;

  const newItem: SavedMediaItem = {
    ...item,
    addedAt: Date.now(),
    listType: "watch_later",
  };

  const updated = [newItem, ...list];
  safeSetItems(STORAGE_KEYS.WATCH_LATER, updated);
  return newItem;
}

export function removeFromLocalWatchLater(videoId: string): void {
  const list = getLocalWatchLater();
  const updated = list.filter((i) => i.videoId !== videoId);
  safeSetItems(STORAGE_KEYS.WATCH_LATER, updated);
}

export function toggleLocalWatchLater(item: Omit<SavedMediaItem, "addedAt" | "listType">): boolean {
  if (isInLocalWatchLater(item.videoId)) {
    removeFromLocalWatchLater(item.videoId);
    return false;
  } else {
    addToLocalWatchLater(item);
    return true;
  }
}

/**
 * Local Like preference operations (local-only, not claiming YouTube OAuth likes)
 */
export function getLocalLikes(): Record<string, boolean> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.LIKES);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export function isLikedLocally(videoId: string): boolean {
  if (!videoId) return false;
  const likes = getLocalLikes();
  return Boolean(likes[videoId]);
}

export function toggleLocalLike(videoId: string): boolean {
  if (!isBrowser() || !videoId) return false;
  const likes = getLocalLikes();
  const next = !likes[videoId];
  if (next) {
    likes[videoId] = true;
  } else {
    delete likes[videoId];
  }
  try {
    window.localStorage.setItem(STORAGE_KEYS.LIKES, JSON.stringify(likes));
    window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key: STORAGE_KEYS.LIKES } }));
  } catch (err) {
    console.warn("Failed to save like state to localStorage:", err);
  }
  return next;
}

/**
 * Watch History operations (stored in omnidiscover_watch_history_v1)
 */
export function getWatchHistory(): WatchHistoryItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is WatchHistoryItem =>
        Boolean(item && typeof item === "object" && typeof item.videoId === "string" && typeof item.title === "string")
    );
  } catch (err) {
    console.warn("Failed to read watch history from localStorage:", err);
    return [];
  }
}

export function addToWatchHistory(
  item: Omit<WatchHistoryItem, "lastWatched"> & { lastWatched?: number }
): void {
  if (!isBrowser() || !item.videoId) return;
  try {
    const history = getWatchHistory();
    // Remove if already exists so we can move it to the top with updated timestamp
    const filtered = history.filter((h) => h.videoId !== item.videoId);
    const updatedItem: WatchHistoryItem = {
      ...item,
      lastWatched: item.lastWatched || Date.now(),
    };
    const updated = [updatedItem, ...filtered].slice(0, 100); // sensible max limit
    window.localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key: STORAGE_KEYS.WATCH_HISTORY } })
    );
  } catch (err) {
    console.warn("Failed to save watch history to localStorage:", err);
  }
}

export function removeFromWatchHistory(videoId: string): void {
  if (!isBrowser() || !videoId) return;
  try {
    const history = getWatchHistory();
    const updated = history.filter((h) => h.videoId !== videoId);
    window.localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key: STORAGE_KEYS.WATCH_HISTORY } })
    );
  } catch (err) {
    console.warn("Failed to remove item from watch history:", err);
  }
}

export function clearWatchHistory(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEYS.WATCH_HISTORY);
    window.dispatchEvent(
      new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key: STORAGE_KEYS.WATCH_HISTORY } })
    );
  } catch (err) {
    console.warn("Failed to clear watch history:", err);
  }
}

/**
 * Search History operations (stored in omnidiscover_search_history_v1)
 */
export function getSearchHistory(): SearchHistoryItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is SearchHistoryItem =>
        Boolean(item && typeof item === "object" && typeof item.query === "string" && item.query.trim().length > 0)
    );
  } catch (err) {
    console.warn("Failed to read search history from localStorage:", err);
    return [];
  }
}

export function addToSearchHistory(
  entry: { query: string; searchMode?: string; searchTab?: "videos" | "channels"; category?: string; videoType?: string }
): void {
  const trimmed = entry.query.trim();
  if (!isBrowser() || !trimmed) return;
  try {
    const history = getSearchHistory();
    // Normalize and remove duplicate consecutive/identical query for same searchTab
    const filtered = history.filter(
      (h) => !(h.query.toLowerCase() === trimmed.toLowerCase() && h.searchTab === (entry.searchTab || "videos"))
    );
    const newEntry: SearchHistoryItem = {
      id: "sh_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      query: trimmed,
      timestamp: Date.now(),
      searchMode: entry.searchMode || "normal",
      searchTab: entry.searchTab || "videos",
      category: entry.category,
      videoType: entry.videoType,
    };
    const updated = [newEntry, ...filtered].slice(0, 50); // cap at 50 searches
    window.localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key: STORAGE_KEYS.SEARCH_HISTORY } })
    );
  } catch (err) {
    console.warn("Failed to save search history to localStorage:", err);
  }
}

export function removeFromSearchHistory(idOrQuery: string): void {
  if (!isBrowser() || !idOrQuery) return;
  try {
    const history = getSearchHistory();
    const updated = history.filter((h) => h.id !== idOrQuery && h.query !== idOrQuery);
    window.localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key: STORAGE_KEYS.SEARCH_HISTORY } })
    );
  } catch (err) {
    console.warn("Failed to remove item from search history:", err);
  }
}

export function clearSearchHistory(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
    window.dispatchEvent(
      new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key: STORAGE_KEYS.SEARCH_HISTORY } })
    );
  } catch (err) {
    console.warn("Failed to clear search history:", err);
  }
}

/**
 * Clear all user-specific local storage collections upon explicit logout.
 * Keeps global settings, API-key configurations, and theme intact.
 */
export function clearLocalUserCollections(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEYS.WATCHLIST);
    window.localStorage.removeItem(STORAGE_KEYS.WATCH_LATER);
    window.localStorage.removeItem(STORAGE_KEYS.LIKES);
    window.localStorage.removeItem(STORAGE_KEYS.WATCH_HISTORY);
    window.localStorage.removeItem(STORAGE_KEYS.SEARCH_HISTORY);
    window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT, { detail: { key: "ALL_LOGOUT" } }));
  } catch (err) {
    console.warn("Failed to clear local collections on logout:", err);
  }
}
