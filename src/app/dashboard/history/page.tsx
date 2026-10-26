"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getWatchHistory,
  removeFromWatchHistory,
  clearWatchHistory,
  WatchHistoryItem,
  STORAGE_CHANGE_EVENT,
} from "@/lib/local-storage";
import { Clock, Trash2, ArrowLeft, Play, AlertTriangle } from "lucide-react";

export default function WatchHistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const loadHistory = () => {
    setHistory(getWatchHistory());
  };

  useEffect(() => {
    setMounted(true);
    setCurrentTime(Date.now());
    loadHistory();

    const handleStorageChange = (e: any) => {
      if (
        !e.detail?.key ||
        e.detail.key === "omnidiscover_watch_history_v1" ||
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

  const handleRemove = (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    removeFromWatchHistory(videoId);
    setHistory((prev) => prev.filter((item) => item.videoId !== videoId));
  };

  const handleConfirmClearAll = () => {
    clearWatchHistory();
    setHistory([]);
    setShowClearModal(false);
  };

  const formatWatchedTime = (timestamp: number) => {
    try {
      const baseTime = currentTime || timestamp;
      const diffSec = Math.floor((baseTime - timestamp) / 1000);
      if (diffSec < 60) return "Just now";
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const diffDays = Math.floor(diffHrs / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return new Date(timestamp).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Recently";
    }
  };

  return (
    <div className="container" style={{ padding: "2.5rem 1.25rem 5rem" }}>
      {/* Top Navigation Row */}
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
              <Clock size={28} style={{ color: "var(--primary)" }} />
              <span>Watch History</span>
            </h1>
            <p style={{ color: "var(--text-muted)", marginTop: "0.375rem", fontSize: "0.9375rem" }}>
              Videos you have watched through Tubify on this device.
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
              <span>Clear Watch History</span>
            </button>
          )}
        </div>
      </div>

      {/* History Grid */}
      {mounted && history.length > 0 ? (
        <div className="history-grid">
          {history.map((item) => (
            <div
              key={item.videoId}
              onClick={() => router.push(`/watch/${encodeURIComponent(item.videoId)}`)}
              className="card card-hover history-card"
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "0.75rem",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                position: "relative",
                gap: "0.75rem",
              }}
            >
              {/* Thumbnail Container */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  paddingTop: "56.25%",
                  borderRadius: "var(--radius-sm)",
                  overflow: "hidden",
                  backgroundColor: "var(--bg-surface-elevated)",
                }}
              >
                {item.thumbnailUrl && (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    loading="lazy"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                )}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0,0,0,0.25)",
                    opacity: 0,
                    transition: "opacity 0.2s ease",
                  }}
                  className="play-overlay"
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      backgroundColor: "rgba(56, 189, 248, 0.9)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                    }}
                  >
                    <Play size={20} fill="#fff" />
                  </div>
                </div>

                {item.duration && (
                  <span
                    style={{
                      position: "absolute",
                      bottom: "6px",
                      right: "6px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      backgroundColor: "rgba(0,0,0,0.8)",
                      color: "#fff",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    {item.duration}
                  </span>
                )}
              </div>

              {/* Video Info */}
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                <h3
                  title={item.title}
                  style={{
                    fontSize: "0.9375rem",
                    fontWeight: 600,
                    color: "var(--text-main)",
                    margin: "0 0 0.35rem",
                    lineHeight: 1.35,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {item.title}
                </h3>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "auto",
                    paddingTop: "0.35rem",
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                  }}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
                    {item.channelName || "YouTube Creator"}
                  </span>
                  <span>{formatWatchedTime(item.lastWatched)}</span>
                </div>
              </div>

              {/* Delete Item Button */}
              <button
                type="button"
                onClick={(e) => handleRemove(e, item.videoId)}
                title="Remove from Watch History"
                className="btn btn-outline btn-sm delete-btn"
                style={{
                  position: "absolute",
                  top: "0.5rem",
                  right: "0.5rem",
                  width: "28px",
                  height: "28px",
                  padding: 0,
                  borderRadius: "50%",
                  backgroundColor: "rgba(9, 13, 22, 0.8)",
                  borderColor: "rgba(255,255,255,0.2)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 2,
                }}
              >
                <Trash2 size={13} />
              </button>
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
              No Watch History Yet
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", margin: 0, lineHeight: 1.5 }}>
              Videos you watch on Tubify will appear here so you can easily revisit them anytime.
            </p>
          </div>
          <Link href="/dashboard" className="btn btn-primary" style={{ padding: "0.625rem 1.5rem" }}>
            Explore Videos
          </Link>
        </div>
      ) : null}

      {/* Confirmation Modal for Clear All */}
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
                Clear Watch History?
              </h3>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", lineHeight: 1.5, margin: "0 0 1.5rem" }}>
              Are you sure you want to clear your entire watch history? This will only remove watched video records from this browser and will not affect your Watchlist or Watch Later.
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

      <style jsx>{`
        .history-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem 1.25rem;
          width: 100%;
        }

        .history-card:hover .play-overlay {
          opacity: 1 !important;
        }

        @media (min-width: 1024px) {
          .history-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .history-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1.25rem 1rem !important;
          }
        }
        @media (max-width: 639px) {
          .history-grid {
            grid-template-columns: 1fr !important;
            gap: 1.25rem !important;
          }
        }
      `}</style>
    </div>
  );
}
