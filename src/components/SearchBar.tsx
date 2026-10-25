"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Clock, RefreshCw, ArrowUpRight, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
  getCombinedSearchSuggestions,
  SearchSuggestionItem,
} from "@/lib/search-suggestions";
import { removeFromSearchHistory, STORAGE_CHANGE_EVENT } from "@/lib/local-storage";

interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  onSearch: (query: string) => void;
  categoryName?: string;
  isCategoryMode: boolean;
  loading?: boolean;
}

export function SearchBar({
  value,
  onChange,
  onSearch,
  categoryName,
  isCategoryMode,
  loading = false,
}: SearchBarProps) {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState<SearchSuggestionItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [searchingSuggestions, setSearchingSuggestions] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load and update suggestions
  const updateSuggestions = useCallback(async (query: string) => {
    // Cancel any previous in-flight remote request to prevent stale overwrite
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 1. Fast path: load local matches immediately
    const localMatches = await getCombinedSearchSuggestions(query, { allowRemote: false });
    setSuggestions(localMatches);
    setActiveIndex(-1);

    // 2. If query >= 2 chars, fetch remote suggestions with slight debounce
    if (query.trim().length >= 2) {
      setSearchingSuggestions(true);
      try {
        const combined = await getCombinedSearchSuggestions(query, {
          allowRemote: true,
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setSuggestions(combined);
        }
      } catch {
        // Aborted or offline
      } finally {
        if (!controller.signal.aborted) {
          setSearchingSuggestions(false);
        }
      }
    } else {
      setSearchingSuggestions(false);
    }
  }, []);

  // Update suggestions as value changes
  useEffect(() => {
    const timer = setTimeout(() => {
      updateSuggestions(value);
    }, 120);

    return () => clearTimeout(timer);
  }, [value, updateSuggestions]);

  // Listen to local storage changes to update suggestions live
  useEffect(() => {
    const handleStorageChange = () => {
      updateSuggestions(value);
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
  }, [value, updateSuggestions]);

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    onChange("");
    onSearch("");
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleSelectQuery = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    onChange(trimmed);
    onSearch(trimmed);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleSubmit = () => {
    if (loading) return;
    if (activeIndex >= 0 && activeIndex < suggestions.length) {
      handleSelectQuery(suggestions[activeIndex].query);
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) return;
    setIsOpen(false);
    setActiveIndex(-1);
    onSearch(trimmed);
  };

  const handleRemoveHistoryItem = (e: React.MouseEvent, item: SearchSuggestionItem) => {
    e.stopPropagation();
    e.preventDefault();
    if (item.historyId) {
      removeFromSearchHistory(item.historyId);
    } else {
      removeFromSearchHistory(item.query);
    }
    setSuggestions((prev) => prev.filter((s) => s.query !== item.query));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setActiveIndex((prev) => (prev + 1 < suggestions.length ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setActiveIndex((prev) => (prev - 1 >= 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const placeholder =
    isCategoryMode && categoryName
      ? `Search within ${categoryName}...`
      : t("nav.searchPlaceholder") || "Search videos, channels, and playlists...";

  return (
    <div
      ref={containerRef}
      className="search-bar-wrapper"
      style={{ position: "relative", width: "100%", marginBottom: "1.5rem" }}
    >
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="search-suggestions-dropdown"
        className="search-input-shell"
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-lg)",
          padding: "0.5rem 1rem",
          gap: "0.75rem",
          boxShadow: "var(--shadow-sm)",
          transition: "var(--transition)",
        }}
      >
        <Search size={18} style={{ color: "var(--text-dim)", flexShrink: 0 }} />

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          style={{
            width: "100%",
            minWidth: 0,
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "var(--text-main)",
            fontSize: "0.9375rem",
          }}
        />

        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="btn btn-outline btn-sm clear-btn"
            style={{ padding: "0.2rem", borderRadius: "50%", border: "none" }}
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !value.trim()}
          className="btn btn-primary btn-sm search-submit-btn"
          style={{
            minWidth: "85px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.35rem",
          }}
        >
          {loading ? (
            <>
              <RefreshCw size={13} className="spin" />
              <span>Searching</span>
            </>
          ) : (
            <span>Search</span>
          )}
        </button>
      </div>

      {/* Production-Ready Search Suggestions Dropdown */}
      {isOpen && (
        <div
          id="search-suggestions-dropdown"
          role="listbox"
          className="search-suggestions-dropdown"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "0.375rem",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-md)",
            zIndex: 40,
            maxHeight: "320px",
            overflowY: "auto",
          }}
        >
          {/* Header indicator */}
          <div
            style={{
              padding: "0.5rem 0.875rem",
              fontSize: "0.6875rem",
              color: "var(--text-dim)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              borderBottom: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>{!value.trim() ? "Recent Searches" : "Search Suggestions"}</span>
            {searchingSuggestions && (
              <span style={{ fontSize: "0.625rem", color: "var(--primary)" }}>Updating...</span>
            )}
          </div>

          {/* List of suggestions */}
          {suggestions.length > 0 ? (
            suggestions.map((item, idx) => {
              const isSelected = idx === activeIndex;
              const isHistory = item.source === "history";

              return (
                <div
                  key={`${item.source}:${item.query}:${idx}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectQuery(item.query)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.875rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                    backgroundColor: isSelected ? "var(--bg-surface-elevated)" : "transparent",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
                    cursor: "pointer",
                    transition: "background-color 0.1s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.625rem",
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    {isHistory ? (
                      <Clock size={15} style={{ color: "var(--primary)", flexShrink: 0 }} />
                    ) : (
                      <Search size={15} style={{ color: "var(--text-dim)", flexShrink: 0 }} />
                    )}

                    <span
                      style={{
                        fontSize: "0.875rem",
                        color: isSelected ? "var(--primary)" : "var(--text-main)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontWeight: isHistory ? 500 : 400,
                      }}
                    >
                      {item.query}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0 }}>
                    {isHistory ? (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveHistoryItem(e, item)}
                        title="Remove from search history"
                        aria-label={`Remove ${item.query} from history`}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-dim)",
                          cursor: "pointer",
                          padding: "2px 4px",
                          borderRadius: "4px",
                          display: "flex",
                          alignItems: "center",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#f43f5e")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
                      >
                        <X size={13} />
                      </button>
                    ) : (
                      <ArrowUpRight size={13} style={{ color: "var(--text-dim)", opacity: 0.7 }} />
                    )}
                  </div>
                </div>
              );
            })
          ) : value.trim() ? (
            <div
              style={{
                padding: "1.25rem 1rem",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "0.8125rem",
              }}
            >
              No suggestions found. Press <strong>Enter</strong> to search YouTube.
            </div>
          ) : (
            <div
              style={{
                padding: "1.25rem 1rem",
                textAlign: "center",
                color: "var(--text-dim)",
                fontSize: "0.8125rem",
              }}
            >
              No recent searches recorded on this device.
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .search-input-shell:focus-within {
          border-color: var(--primary) !important;
          box-shadow: 0 0 0 2px var(--primary-glow) !important;
        }
      `}</style>
    </div>
  );
}
