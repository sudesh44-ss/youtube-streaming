/**
 * OmniDiscover — Search Suggestions Provider
 *
 * Implements a prioritized, deduplicated search suggestion engine:
 * 1. Matching recent searches stored locally (SearchHistoryItem)
 * 2. Matching queries from the local-only search cache
 * 3. Optional remote autocomplete suggestions (debounced and cached)
 *
 * Provides instant keystroke filtering without invoking YouTube Data API search.list.
 */

import { getSearchHistory, SearchHistoryItem } from "./local-storage";
import { getCachedSearchQueries } from "./search-cache";

export interface SearchSuggestionItem {
  query: string;
  source: "history" | "cache" | "remote";
  historyId?: string;
  isExactPrefix?: boolean;
}

// Client-side cache for remote suggestion responses to avoid repeated fetches
const clientSuggestionCache = new Map<string, string[]>();

/**
 * Fetch and rank suggestions for a user query.
 * Fast path: immediately resolves local history and cache matches without network latency.
 */
export async function getCombinedSearchSuggestions(
  input: string,
  options: { allowRemote?: boolean; signal?: AbortSignal } = {}
): Promise<SearchSuggestionItem[]> {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  const results: SearchSuggestionItem[] = [];
  const seenQueries = new Set<string>();

  // 1. Local Search History (Highest Priority)
  const localHistory: SearchHistoryItem[] = getSearchHistory();

  if (!lower) {
    // If input is empty, return the most recent searches (up to 8)
    for (const h of localHistory.slice(0, 8)) {
      const qLower = h.query.toLowerCase();
      if (!seenQueries.has(qLower)) {
        seenQueries.add(qLower);
        results.push({
          query: h.query,
          source: "history",
          historyId: h.id,
        });
      }
    }
    return results;
  }

  // Filter history: first matching prefix, then substring
  const historyPrefix: SearchSuggestionItem[] = [];
  const historySubstring: SearchSuggestionItem[] = [];

  for (const h of localHistory) {
    const qLower = h.query.toLowerCase();
    if (seenQueries.has(qLower)) continue;

    if (qLower.startsWith(lower)) {
      seenQueries.add(qLower);
      historyPrefix.push({
        query: h.query,
        source: "history",
        historyId: h.id,
        isExactPrefix: true,
      });
    } else if (qLower.includes(lower)) {
      seenQueries.add(qLower);
      historySubstring.push({
        query: h.query,
        source: "history",
        historyId: h.id,
        isExactPrefix: false,
      });
    }
  }

  results.push(...historyPrefix, ...historySubstring);

  // 2. Local Policy-Compliant Search Cache Queries
  try {
    const cachedQueries = await getCachedSearchQueries();
    for (const cq of cachedQueries) {
      const qLower = cq.toLowerCase();
      if (seenQueries.has(qLower)) continue;

      if (qLower.startsWith(lower) || qLower.includes(lower)) {
        seenQueries.add(qLower);
        results.push({
          query: cq,
          source: "cache",
          isExactPrefix: qLower.startsWith(lower),
        });
      }
    }
  } catch {
    // Non-blocking
  }

  // 3. Optional Remote Autocomplete Suggestions (Only if requested and query length >= 2)
  if (options.allowRemote !== false && lower.length >= 2) {
    // Check client in-memory cache first
    const cachedRemote = clientSuggestionCache.get(lower);
    let remoteSuggestions: string[] = cachedRemote || [];

    if (!cachedRemote) {
      try {
        const res = await fetch(`/api/content/suggestions?q=${encodeURIComponent(trimmed)}`, {
          signal: options.signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.suggestions)) {
            remoteSuggestions = data.suggestions;
            clientSuggestionCache.set(lower, remoteSuggestions);
          }
        }
      } catch {
        // Aborted or offline: keep local suggestions
      }
    }

    for (const rs of remoteSuggestions) {
      const qLower = rs.toLowerCase();
      if (!seenQueries.has(qLower)) {
        seenQueries.add(qLower);
        results.push({
          query: rs,
          source: "remote",
          isExactPrefix: qLower.startsWith(lower),
        });
      }
    }
  }

  // Cap total suggestions at 10 items for a clean, non-overflowing dropdown
  return results.slice(0, 10);
}
