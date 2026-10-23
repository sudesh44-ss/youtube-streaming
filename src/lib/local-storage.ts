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

const STORAGE_KEYS = {
  WATCHLIST: "omnidiscover_watchlist",
  WATCH_LATER: "omnidiscover_watch_later",
  LIKES: "omnidiscover_likes",
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
