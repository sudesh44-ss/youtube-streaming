"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { NormalizedContentItem } from "@/lib/types";
import { Bookmark, Clock, Check, MoreVertical } from "lucide-react";
import {
  isInLocalWatchlist,
  isInLocalWatchLater,
  toggleLocalWatchlist,
  toggleLocalWatchLater,
  STORAGE_CHANGE_EVENT,
} from "@/lib/local-storage";
import { formatUploadAge, formatViewCount } from "@/lib/format-utils";

interface ContentCardProps {
  item: NormalizedContentItem;
  onSelect?: (item: NormalizedContentItem) => void;
  onToggleSave?: (item: NormalizedContentItem) => void;
  showProgress?: boolean;
}

export function ContentCard({ item, onSelect, onToggleSave, showProgress }: ContentCardProps) {
  const router = useRouter();
  const [inWatchlist, setInWatchlist] = useState(Boolean(item.saved));
  const [inWatchLater, setInWatchLater] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync local storage state
  useEffect(() => {
    const videoId = item.providerId;
    if (videoId) {
      setInWatchlist(isInLocalWatchlist(videoId) || Boolean(item.saved));
      setInWatchLater(isInLocalWatchLater(videoId));
    }

    const handleStorageChange = () => {
      if (videoId) {
        setInWatchlist(isInLocalWatchlist(videoId));
        setInWatchLater(isInLocalWatchLater(videoId));
      }
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
  }, [item.providerId, item.saved]);

  // Click-outside and Escape key handling for dropdown menu
  useEffect(() => {
    if (!showMenu) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowMenu(false);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [showMenu]);

  // Navigate to dedicated internal watch page on video click
  const handleCardClick = () => {
    if (item.provider === "youtube" && item.providerId) {
      const params = new URLSearchParams();
      if (item.title) params.set("title", item.title);
      const q = params.toString();
      router.push(`/watch/${encodeURIComponent(item.providerId)}${q ? `?${q}` : ""}`);
      return;
    }
    if (onSelect) onSelect(item);
  };

  const handleToggleWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    const videoId = item.providerId;
    if (!videoId) return;

    const next = toggleLocalWatchlist({
      videoId,
      title: item.title,
      thumbnailUrl: item.thumbnail,
      channelId: undefined,
      channelTitle: item.creator,
      category: item.category,
      duration: item.duration,
      views: item.views,
    });
    setInWatchlist(next);

    // Also inform optional parent callback
    if (onToggleSave) onToggleSave({ ...item, saved: next });

    // Optional backend sync for authenticated sessions (fail-safe)
    if (next) {
      fetch("/api/content/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: item.provider,
          contentId: item.providerId,
          contentType: item.contentType,
          title: item.title,
          description: item.description,
          thumbnail: item.thumbnail,
          category: item.category,
          externalUrl: item.externalUrl,
        }),
      }).catch(() => {});
    } else {
      fetch(`/api/content/saved?provider=${item.provider}&contentId=${item.providerId}`, {
        method: "DELETE",
      }).catch(() => {});
    }

    setShowMenu(false);
  };

  const handleToggleWatchLater = (e: React.MouseEvent) => {
    e.stopPropagation();
    const videoId = item.providerId;
    if (!videoId) return;

    const next = toggleLocalWatchLater({
      videoId,
      title: item.title,
      thumbnailUrl: item.thumbnail,
      channelId: undefined,
      channelTitle: item.creator,
      category: item.category,
      duration: item.duration,
      views: item.views,
    });
    setInWatchLater(next);
    setShowMenu(false);
  };

  const getDisplayTime = () => {
    if (!item.publicationDate) return "Recently added";
    if (item.publicationDate.includes("T")) {
      return item.publicationDate.split("T")[0];
    }
    return item.publicationDate;
  };

  const durationText = item.duration || (item.category === "music" ? "4:12" : "15:20");
  const viewsText = item.views || "1.8M views";
  const channelInitial = (item.creator || "O").charAt(0).toUpperCase();
  const isSavedAny = inWatchlist || inWatchLater;
  const formattedViews = formatViewCount(item.views);
  const uploadAge = formatUploadAge(item.publicationDate);

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="streaming-video-card"
      style={{
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        position: "relative",
        borderRadius: "10px",
        outline: "none",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
      }}
    >
      {/* 16:9 Landscape Thumbnail Container */}
      <div
        className="thumbnail-wrap"
        style={{
          position: "relative",
          width: "100%",
          paddingTop: "56.25%", // 16:9 ratio
          backgroundColor: "var(--bg-subtle)",
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
        }}
      >
        <img
          src={item.thumbnail}
          alt={item.title}
          loading="lazy"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80";
          }}
        />

        {/* Duration Badge */}
        {durationText && (
          <div
            style={{
              position: "absolute",
              bottom: showProgress || item.progressPercent ? "10px" : "8px",
              right: "8px",
              padding: "0.2rem 0.45rem",
              borderRadius: "4px",
              backgroundColor: "rgba(0, 0, 0, 0.82)",
              color: "#fff",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.02em",
              pointerEvents: "none",
            }}
          >
            {durationText}
          </div>
        )}

        {/* Shorts Indicator */}
        {item.isShort && (
          <div
            style={{
              position: "absolute",
              top: "6px",
              left: "6px",
              padding: "0.15rem 0.45rem",
              borderRadius: "4px",
              backgroundColor: "rgba(220, 38, 38, 0.92)",
              color: "#fff",
              fontSize: "0.6875rem",
              fontWeight: 700,
              letterSpacing: "0.03em",
              pointerEvents: "none",
            }}
          >
            Shorts
          </div>
        )}

        {/* Viewing Progress Bar */}
        {(showProgress || (item.progressPercent !== undefined && item.progressPercent > 0)) && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "4px",
              backgroundColor: "rgba(255, 255, 255, 0.25)",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, Math.max(5, item.progressPercent || 35))}%`,
                backgroundColor: "#ef4444",
                borderRadius: "0 2px 2px 0",
              }}
            />
          </div>
        )}
      </div>

      {/* Card Info Container */}
      <div
        style={{
          paddingTop: "0.75rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.35rem",
        }}
      >
        {/* Row 1: Video Title + Action Menu */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "0.5rem",
          }}
        >
          <h3
            title={item.title}
            style={{
              fontSize: "0.9375rem",
              fontWeight: 600,
              lineHeight: 1.35,
              color: "var(--text-main)",
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
              flex: 1,
            }}
          >
            {item.title}
          </h3>

          {/* Action Menu Trigger Button */}
          <div ref={menuRef} style={{ position: "relative", flexShrink: 0 }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              aria-label="Video actions"
              className="btn btn-outline btn-sm"
              style={{
                padding: "0.25rem",
                border: "none",
                background: "transparent",
                color: isSavedAny ? "var(--primary)" : "var(--text-dim)",
                borderRadius: "4px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isSavedAny ? <Check size={16} /> : <MoreVertical size={16} />}
            </button>

            {/* Contextual Action Menu: Watchlist & Watch Later */}
            {showMenu && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  zIndex: 40,
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
                  padding: "0.375rem",
                  minWidth: "165px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                }}
              >
                <button
                  type="button"
                  onClick={handleToggleWatchlist}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.45rem 0.5rem",
                    fontSize: "0.75rem",
                    backgroundColor: "transparent",
                    border: "none",
                    color: inWatchlist ? "var(--primary)" : "var(--text-main)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    fontWeight: inWatchlist ? 600 : 500,
                  }}
                >
                  {inWatchlist ? <Check size={14} /> : <Bookmark size={14} />}
                  <span>{inWatchlist ? "In Watchlist" : "Add to Watchlist"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleWatchLater}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.45rem 0.5rem",
                    fontSize: "0.75rem",
                    backgroundColor: "transparent",
                    border: "none",
                    color: inWatchLater ? "var(--primary)" : "var(--text-main)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    fontWeight: inWatchLater ? 600 : 500,
                  }}
                >
                  {inWatchLater ? <Check size={14} /> : <Clock size={14} />}
                  <span>{inWatchLater ? "In Watch Later" : "Watch Later"}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Creator Metadata Row: [Avatar] Creator · views · upload age */}
        <div
          className="card-meta-line"
          style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.35rem 0.45rem",
            fontSize: "0.75rem",
            color: "var(--text-dim)",
            lineHeight: 1.3,
            marginTop: "0.15rem",
          }}
        >
          <div
            className={`card-creator-group ${item.channelId ? "clickable" : "non-clickable"}`}
            onClick={(e) => {
              if (item.channelId) {
                e.stopPropagation();
                router.push(`/channel/${encodeURIComponent(item.channelId)}`);
              }
            }}
            role={item.channelId ? "button" : undefined}
            tabIndex={item.channelId ? 0 : undefined}
            onKeyDown={(e) => {
              if (item.channelId && (e.key === "Enter" || e.key === " ")) {
                e.stopPropagation();
                e.preventDefault();
                router.push(`/channel/${encodeURIComponent(item.channelId)}`);
              }
            }}
            title={item.channelId ? `View ${item.creator || "creator"}'s channel` : undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              color: "var(--text-muted)",
              cursor: item.channelId ? "pointer" : "default",
              maxWidth: "100%",
            }}
          >
            <div
              className="card-avatar-wrap"
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                overflow: "hidden",
                backgroundColor: "var(--bg-surface-elevated)",
                border: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {item.channelAvatar ? (
                <img
                  src={item.channelAvatar}
                  alt={item.creator ? `${item.creator}'s channel avatar` : "Channel avatar"}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "50%",
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fallback = e.currentTarget.parentElement?.querySelector(".card-avatar-fallback") as HTMLElement;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className="card-avatar-fallback"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #38bdf8, #2563eb)",
                  color: "#fff",
                  display: item.channelAvatar ? "none" : "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.625rem",
                  fontWeight: 700,
                }}
              >
                {channelInitial}
              </div>
            </div>

            <span
              className="card-channel-name"
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "180px",
              }}
            >
              {item.creator || "YouTube Creator"}
            </span>
          </div>

          {/* Views and Upload Age */}
          {showProgress || item.progressPercent ? (
            <>
              <span className="card-dot" style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>·</span>
              <span style={{ color: "#f87171", fontWeight: 500 }}>
                {item.progressPercent || 35}% watched
              </span>
            </>
          ) : (
            <>
              {(formattedViews || uploadAge) && (
                <span className="card-dot" style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>·</span>
              )}
              {formattedViews && <span>{formattedViews}</span>}
              {formattedViews && uploadAge && (
                <span className="card-dot" style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>·</span>
              )}
              {uploadAge && <span>{uploadAge}</span>}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .streaming-video-card:hover .thumbnail-wrap img {
          transform: scale(1.04);
        }
        .streaming-video-card:focus-visible {
          box-shadow: 0 0 0 2px var(--primary);
        }
        .creator-channel-link:hover,
        .card-creator-group.clickable:hover .card-channel-name {
          color: var(--primary) !important;
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
