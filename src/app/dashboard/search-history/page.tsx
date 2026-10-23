"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getSearchHistory,
  removeFromSearchHistory,
  clearSearchHistory,
  SearchHistoryItem,
  STORAGE_CHANGE_EVENT,
} from "@/lib/local-storage";
import { Search, Trash2, ArrowLeft, ArrowUpRight, AlertTriangle, Clock } from "lucide-react";

export default function SearchHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  const loadHistory = () => {
    setHistory(getSearchHistory());
  };

  useEffect(() => {
    setMounted(true);
    loadHistory();

    const handleStorageChange = (e: any) => {
      if (
        !e.detail?.key ||
        e.detail.key === "omnidiscover_search_history_v1" ||
        e.detail.key === "ALL_LOGOUT"
      ) {
        loadHistory();
      }
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeFromSearchHistory(id);
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleConfirmClearAll = () => {
    clearSearchHistory();
    setHistory([]);
    setShowClearModal(false);
  };

  const handleExecuteSearch = (item: SearchHistoryItem) => {
    const params = new URLSearchParams();
    params.set("q", item.query);
    if (item.category) params.set("category", item.category);
    if (item.searchMode) params.set("mode", item.searchMode);
    router.push(`/dashboard?${params.toString()}`);
  };

  const formatTimestamp = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Recent";
    }
  };

  return (
    <div className="container" style={{ padding: "2.5rem 1.25rem 5rem" }}>
      {/* Top Header */}
      <div style={{ marginBottom: "2rem" }}>
        <Link
          href="/dashboard"
          className="btn btn-outline btn-sm"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", marginBottom: "1rem" }}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                color: "var(--text-main)",
                letterSpacing: "-0.02em",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: "0.625rem",
              }}
            >
              <Search size={28} style={{ color: "var(--primary)" }} />
              <span>Search History</span>
            </h1>
            <p style={{ color: "var(--text-muted)", marginTop: "0.375rem", fontSize: "0.9375rem" }}>
              Searches you have submitted in OmniDiscover on this device.
            </p>
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              className="btn btn-outline btn-sm"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                color: "#ef4444",
                borderColor: "rgba(239, 68, 68, 0.3)",
              }}
            >
              <Trash2 size={14} />
              <span>Clear Search History</span>
            </button>
          )}
        </div>
      </div>

      {/* History List */}
      {mounted && history.length > 0 ? (
        <div style={{ maxWidth: "780px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {history.map((item) => (
            <div
              key={item.id}
              onClick={() => handleExecuteSearch(item)}
              className="card card-hover"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.875rem 1.25rem",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "var(--bg-surface-elevated)",
                    color: "var(--primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Search size={16} />
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: "1rem",
                        fontWeight: 600,
                        color: "var(--text-main)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.query}
                    </span>
                    {item.searchTab === "channels" && (
                      <span className="badge badge-cyan" style={{ fontSize: "0.6875rem" }}>
                        Channels
                      </span>
                    )}
                    {item.category && (
                      <span className="badge badge-amber" style={{ fontSize: "0.6875rem", textTransform: "capitalize" }}>
                        {item.category}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "0.2rem" }}>
                    {formatTimestamp(item.timestamp)}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={(e) => handleRemove(e, item.id)}
                  title="Remove search entry"
                  className="btn btn-outline btn-sm"
                  style={{
                    width: "32px",
                    height: "32px",
                    padding: 0,
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-muted)",
                  }}
                >
                  <Trash2 size={14} />
                </button>
                <div
                  style={{
                    color: "var(--text-muted)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ArrowUpRight size={18} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : mounted ? (
        /* Empty State */
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            maxWidth: "520px",
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.25rem",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              backgroundColor: "var(--bg-surface-elevated)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-dim)",
            }}
          >
            <Clock size={30} />
          </div>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
              No Search History Yet
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", margin: 0, lineHeight: 1.5 }}>
              Searches you submit will be saved locally so you can quickly repeat them later.
            </p>
          </div>
          <Link href="/dashboard" className="btn btn-primary" style={{ padding: "0.625rem 1.5rem" }}>
            Start Searching
          </Link>
        </div>
      ) : null}

      {/* Confirmation Modal */}
      {showClearModal && (
        <div className="modal-overlay" onClick={() => setShowClearModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "440px", padding: "1.75rem" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>
                Clear Search History?
              </h3>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", lineHeight: 1.5, margin: "0 0 1.5rem" }}>
              Are you sure you want to clear your entire search history? This will only remove saved search queries from this device and will not affect your Watchlist, Watch Later, or Watch History.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="btn btn-outline btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="btn btn-danger btn-sm"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
