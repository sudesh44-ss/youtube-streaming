"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Clock, RefreshCw } from "lucide-react";

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
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/content/history")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.history)) {
          setHistory(data.history.map((h: any) => h.query));
        }
      })
      .catch(() => {});
  }, []);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClear = () => {
    onChange("");
    onSearch("");
  };

  const handleSubmit = () => {
    if (loading) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    setShowHistory(false);
    onSearch(trimmed);
  };

  const handleSelectHistory = (query: string) => {
    const trimmed = query.trim();
    onChange(trimmed);
    onSearch(trimmed);
    setShowHistory(false);
  };

  const placeholder = isCategoryMode && categoryName
    ? `Search within ${categoryName}...`
    : "Search educational courses, music, movies, gaming, technology...";

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", marginBottom: "1.5rem" }}>
      <div
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
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setShowHistory(true);
          }}
          onFocus={() => setShowHistory(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          style={{
            width: "100%",
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
            className="btn btn-outline btn-sm"
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
          className="btn btn-primary btn-sm"
          style={{ minWidth: "85px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.35rem" }}
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

      {/* Recent Searches Autocomplete Dropdown */}
      {showHistory && history.length > 0 && !value && (
        <div
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
            zIndex: 30,
            maxHeight: "220px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              padding: "0.5rem 0.875rem",
              fontSize: "0.75rem",
              color: "var(--text-dim)",
              fontWeight: 600,
              textTransform: "uppercase",
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            Recent Searches
          </div>
          {history.slice(0, 6).map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectHistory(item)}
              style={{
                width: "100%",
                padding: "0.625rem 0.875rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "transparent",
                border: "none",
                color: "var(--text-main)",
                fontSize: "0.875rem",
                textAlign: "left",
                cursor: "pointer",
                borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-surface-elevated)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <Clock size={14} style={{ color: "var(--text-dim)" }} />
              <span>{item}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
