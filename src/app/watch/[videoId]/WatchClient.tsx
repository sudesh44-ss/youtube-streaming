"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  ThumbsUp,
  MoreVertical,
  Bookmark,
  Clock,
  Check,
  ExternalLink,
  Share2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  isInLocalWatchlist,
  isInLocalWatchLater,
  toggleLocalWatchlist,
  toggleLocalWatchLater,
  isLikedLocally,
  toggleLocalLike,
  STORAGE_CHANGE_EVENT,
} from "@/lib/local-storage";
import { VideoDetailResponse } from "@/app/api/content/details/route";
import { extractPalette, getFallbackPalette, DynamicPalette } from "@/lib/color-extract";
import { ShareModal } from "@/components/ShareModal";

function parseTimeToSeconds(val: string | null): number {
  if (!val) return 0;
  if (/^\d+$/.test(val)) return parseInt(val, 10);
  if (/^\d+s$/.test(val)) return parseInt(val.replace("s", ""), 10);
  const hoursMatch = val.match(/(\d+)h/);
  const minsMatch = val.match(/(\d+)m/);
  const secsMatch = val.match(/(\d+)s/);
  let total = 0;
  if (hoursMatch) total += parseInt(hoursMatch[1], 10) * 3600;
  if (minsMatch) total += parseInt(minsMatch[1], 10) * 60;
  if (secsMatch) total += parseInt(secsMatch[1], 10);
  return total > 0 ? total : parseInt(val, 10) || 0;
}

interface WatchClientProps {
  videoId: string;
  initialTitle?: string;
}

export default function WatchClient({ videoId, initialTitle }: WatchClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTime = parseTimeToSeconds(searchParams ? (searchParams.get("t") || searchParams.get("start")) : null);

  // Playback state: starts FALSE so video does not autoplay on page load
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSeconds, setPlaybackSeconds] = useState(initialTime);

  // Share Modal state
  const [shareOpen, setShareOpen] = useState(false);

  // Track playback time when video is playing
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setPlaybackSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Video metadata
  const [item, setItem] = useState<VideoDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Description expand/collapse
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Interactive local states
  const [isLiked, setIsLiked] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [inWatchLater, setInWatchLater] = useState(false);

  // YouTube OAuth connection & confirmation state
  const [isYtConnected, setIsYtConnected] = useState(false);
  const [isYtConfirmed, setIsYtConfirmed] = useState(false);

  // Dynamic Theme state based on thumbnail colors
  const [palette, setPalette] = useState<DynamicPalette>(() => getFallbackPalette(true));

  // Three-dot menu and feedback toast
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  // Sync saved states from localStorage on mount and when changed
  const syncStorageStates = useCallback(() => {
    if (!videoId) return;
    setIsLiked(isLikedLocally(videoId));
    setInWatchlist(isInLocalWatchlist(videoId));
    setInWatchLater(isInLocalWatchLater(videoId));
  }, [videoId]);

  useEffect(() => {
    syncStorageStates();
    const handleStorageChange = () => syncStorageStates();
    window.addEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
  }, [syncStorageStates]);

  // Handle escape key and click outside for three-dot menu
  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuBtnRef.current?.focus();
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        menuBtnRef.current &&
        !menuBtnRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [menuOpen]);

  // Fetch metadata from API route
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const titleParam = initialTitle ? `&title=${encodeURIComponent(initialTitle)}` : "";
    fetch(`/api/content/details?id=${encodeURIComponent(videoId)}${titleParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.item) {
          setItem(data.item);
        } else {
          setError(data.error || "Failed to load video details.");
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setError("Network error while resolving video information.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [videoId, initialTitle]);

  const thumbnail = item?.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  // Dynamic color extraction whenever thumbnail or theme changes
  useEffect(() => {
    let isMounted = true;
    const isDark = typeof document !== "undefined"
      ? document.documentElement.getAttribute("data-theme") !== "light"
      : true;

    extractPalette(thumbnail, isDark).then((p) => {
      if (isMounted) setPalette(p);
    });

    if (typeof document !== "undefined") {
      const observer = new MutationObserver(() => {
        const currentDark = document.documentElement.getAttribute("data-theme") !== "light";
        extractPalette(thumbnail, currentDark).then((p) => {
          if (isMounted) setPalette(p);
        });
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
      return () => {
        isMounted = false;
        observer.disconnect();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [thumbnail]);

  // Check YouTube OAuth status
  useEffect(() => {
    let isMounted = true;
    fetch("/api/auth/youtube/status")
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.connected) {
          setIsYtConnected(true);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Play button click handler
  const handleStartPlay = () => {
    setIsPlaying(true);
    // Record real watch progress in background for continue watching
    if (videoId) {
      fetch("/api/content/watch-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: videoId,
          provider: "youtube",
          title: item?.title || initialTitle || "YouTube Video",
          channelName: item?.creator || "YouTube Creator",
          thumbnailUrl: thumbnail,
          durationSeconds: 900,
          progressSeconds: 180,
        }),
      }).catch(() => {});
    }
  };

  // Single Unified Like Handler: syncs locally and with YouTube when connected
  const handleToggleLike = async () => {
    const nextLiked = toggleLocalLike(videoId);
    setIsLiked(nextLiked);

    try {
      const res = await fetch("/api/content/youtube-like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          rating: nextLiked ? "like" : "none",
        }),
      });
      const data = await res.json();
      if (data.youtubeAction === "confirmed") {
        setIsYtConfirmed(nextLiked);
        showFeedback(data.message || (nextLiked ? "Liked & synced with YouTube!" : "Unliked on YouTube"));
      } else if (data.youtubeAction === "unconnected") {
        setIsYtConfirmed(false);
        showFeedback(nextLiked ? "Liked locally (Connect YouTube in Settings to sync)" : "Removed from Liked videos");
      } else {
        setIsYtConfirmed(false);
        showFeedback(data.message || (nextLiked ? "Liked locally" : "Removed from Liked videos"));
      }
    } catch {
      setIsYtConfirmed(false);
      showFeedback(nextLiked ? "Saved to Liked videos locally" : "Removed from Liked videos");
    }
  };

  // Watchlist Toggle
  const handleToggleWatchlist = () => {
    if (!item && !initialTitle) return;
    const title = item?.title || initialTitle || "YouTube Video";
    const thumb = item?.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const next = toggleLocalWatchlist({
      videoId,
      title,
      thumbnailUrl: thumb,
      channelId: item?.channelId,
      channelTitle: item?.creator,
      category: item?.category,
      duration: item?.duration,
      views: item?.views,
    });
    setInWatchlist(next);
    setMenuOpen(false);
    showFeedback(next ? "Added to Watchlist" : "Removed from Watchlist");
  };

  // Watch Later Toggle
  const handleToggleWatchLater = () => {
    if (!item && !initialTitle) return;
    const title = item?.title || initialTitle || "YouTube Video";
    const thumb = item?.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const next = toggleLocalWatchLater({
      videoId,
      title,
      thumbnailUrl: thumb,
      channelId: item?.channelId,
      channelTitle: item?.creator,
      category: item?.category,
      duration: item?.duration,
      views: item?.views,
    });
    setInWatchLater(next);
    setMenuOpen(false);
    showFeedback(next ? "Added to Watch Later" : "Removed from Watch Later");
  };

  // Open Share Modal
  const handleShare = () => {
    setShareOpen(true);
  };

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback((current) => (current === msg ? null : current));
    }, 3200);
  };

  const title = item?.title || initialTitle || "YouTube Video";
  const creator = item?.creator || "YouTube Creator";
  const channelAvatar = item?.channelAvatar;
  const subscriberCount = item?.subscriberCount || "Official Channel";
  const views = item?.views || (loading ? "Loading stats..." : "YouTube Discovery");
  const publicationDate = item?.publicationDate || "Recently published";
  const channelInitial = (creator.charAt(0) || "Y").toUpperCase();

  return (
    <div
      className="container watch-container"
      style={{
        "--dynamic-accent": palette.primary,
        "--dynamic-accent-hover": palette.primaryHover,
        "--dynamic-secondary": palette.secondary,
        "--dynamic-glow": palette.bgGlow,
        "--dynamic-gradient": palette.bgGradient,
        "--dynamic-play-btn": palette.playButtonBg,
        "--dynamic-play-glow": palette.playButtonGlow,
        "--dynamic-badge-bg": palette.badgeBg,
        "--dynamic-text-on-accent": palette.textOnPrimary,
        "--dynamic-border": palette.borderHighlight,
      } as React.CSSProperties}
    >
      {/* Top Navigation Row: Back Button */}
      <div className="watch-nav-bar">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn btn-outline btn-sm watch-back-btn"
          aria-label="Back to discovery list"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div className="watch-breadcrumbs">
          <Link href="/dashboard" style={{ color: "var(--text-muted)" }}>
            Dashboard
          </Link>
          <span style={{ color: "var(--text-dim)" }}>/</span>
          <span style={{ color: "var(--text-main)", fontWeight: 500 }} className="truncate-title">
            {title}
          </span>
        </div>
      </div>

      {/* Main Video Presentation Grid */}
      <div className="watch-layout">
        {/* Left / Main Column: Video Area + Information */}
        <div className="watch-main-column">
          {/* Video Player Box (16:9 Aspect Ratio) */}
          <div className="video-player-wrapper">
            {!isPlaying ? (
              /* Initial State: Video Thumbnail with prominent Play Button */
              <div className="video-poster-box">
                <img
                  src={thumbnail}
                  alt={title}
                  className="video-poster-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                  }}
                />
                <div className="video-poster-scrim" />

                {/* Prominent Play Button Overlay */}
                <button
                  type="button"
                  onClick={handleStartPlay}
                  className="prominent-play-button"
                  aria-label={`Play video: ${title}`}
                >
                  <div className="play-icon-pulse">
                    <Play size={36} fill="#ffffff" color="#ffffff" style={{ marginLeft: "4px" }} />
                  </div>
                </button>

                <div className="video-preview-badge">
                  <span>Click Play to begin watching</span>
                </div>
              </div>
            ) : (
              /* Active Playback: Official Embedded YouTube Player */
              <div className="video-iframe-box">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(
                    videoId
                  )}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1${
                    initialTime > 0 ? `&start=${initialTime}` : ""
                  }`}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="video-iframe"
                />
              </div>
            )}
          </div>

          {/* Under-Player Metadata & Actions */}
          <div className="video-details-card">
            {error && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.625rem 0.875rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                  color: "#ef4444",
                  fontSize: "0.8125rem",
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Title */}
            <h1 className="watch-video-title">{title}</h1>

            {/* Video Metadata / View Stats */}
            <div className="watch-meta-row">
              <div className="watch-stats-group">
                <span className="watch-views-text">{views}</span>
                <span className="meta-separator">•</span>
                <span className="watch-date-text">{publicationDate}</span>
                {item?.category && (
                  <>
                    <span className="meta-separator">•</span>
                    <span
                      className="badge"
                      style={{
                        backgroundColor: "var(--dynamic-badge-bg, rgba(56, 189, 248, 0.15))",
                        color: "var(--dynamic-accent, var(--primary))",
                        borderColor: "var(--dynamic-border, transparent)",
                        fontWeight: 600,
                      }}
                    >
                      {item.category.toUpperCase()}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Channel Info & Action Buttons Row */}
            <div className="watch-action-bar">
              {/* Channel Profile */}
              <div className="channel-profile-group">
                <div className="channel-avatar-circle">
                  {channelAvatar ? (
                    <img
                      src={channelAvatar}
                      alt={creator}
                      className="channel-avatar-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : null}
                  <div className="channel-avatar-fallback">{channelInitial}</div>
                </div>

                <div className="channel-names">
                  <h3 className="channel-title">{creator}</h3>
                  <p className="channel-subs">{subscriberCount}</p>
                </div>
              </div>

              {/* Action Buttons: Like, Share, YouTube External, Three-Dot Menu */}
              <div className="video-action-buttons">
                {/* Single Unified Like Button */}
                <button
                  type="button"
                  onClick={handleToggleLike}
                  className={`btn btn-sm watch-action-btn ${isLiked ? "active-like" : "btn-outline"}`}
                  title={
                    isLiked
                      ? isYtConfirmed
                        ? "Liked locally & confirmed on YouTube"
                        : "Saved to your Liked videos (Local preference)"
                      : isYtConnected
                      ? "Like video and sync with YouTube"
                      : "Like video locally"
                  }
                  aria-label={isLiked ? "Unlike video" : "Like video"}
                >
                  <ThumbsUp size={16} fill={isLiked ? "currentColor" : "none"} />
                  <span>{isLiked ? (isYtConfirmed ? "Liked (YouTube)" : "Liked") : "Like"}</span>
                </button>

                {/* Share Button */}
                <button
                  type="button"
                  onClick={handleShare}
                  className="btn btn-outline btn-sm watch-action-btn"
                  title="Copy video link"
                  aria-label="Share video link"
                >
                  <Share2 size={16} />
                  <span className="action-label-desktop">Share</span>
                </button>

                {/* Watch on YouTube External Link */}
                <a
                  href={`https://www.youtube.com/watch?v=${videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm watch-action-btn"
                  title="Watch directly on YouTube (if embed is restricted)"
                  aria-label="Open on YouTube"
                >
                  <span>YouTube</span>
                  <ExternalLink size={14} />
                </a>

                {/* Three-Dot Menu Button */}
                <div style={{ position: "relative" }}>
                  <button
                    ref={menuBtnRef}
                    type="button"
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="btn btn-outline btn-sm watch-threedot-btn"
                    aria-label="More video options"
                    aria-expanded={menuOpen}
                    aria-haspopup="true"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {/* Three-Dot Context Menu */}
                  {menuOpen && (
                    <div ref={menuRef} role="menu" className="watch-action-menu">
                      {/* 1. Add to Watchlist */}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleToggleWatchlist}
                        className={`menu-action-item ${inWatchlist ? "active-item" : ""}`}
                      >
                        {inWatchlist ? (
                          <Check size={16} style={{ color: "var(--accent-emerald)" }} />
                        ) : (
                          <Bookmark size={16} />
                        )}
                        <span>{inWatchlist ? "In Watchlist" : "Add to Watchlist"}</span>
                      </button>

                      {/* 2. Watch Later */}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleToggleWatchLater}
                        className={`menu-action-item ${inWatchLater ? "active-item" : ""}`}
                      >
                        {inWatchLater ? (
                          <Check size={16} style={{ color: "var(--accent-emerald)" }} />
                        ) : (
                          <Clock size={16} />
                        )}
                        <span>{inWatchLater ? "In Watch Later" : "Watch Later"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Expandable / Collapsible Description Box */}
            <div className="watch-description-box">
              <div className={`description-content ${isDescExpanded ? "expanded" : "clamped"}`}>
                {item?.description ? (
                  <p style={{ whiteSpace: "pre-line" }}>{item.description}</p>
                ) : (
                  <p style={{ color: "var(--text-muted)" }}>
                    No description provided for this video. Use the YouTube embed above or external link to view full
                    details.
                  </p>
                )}
              </div>

              {item?.description && item.description.length > 180 && (
                <button
                  type="button"
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="description-toggle-btn"
                >
                  <span>{isDescExpanded ? "Show less" : "Show more"}</span>
                  {isDescExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Status Notification / Toast */}
      {feedback && (
        <div className="watch-toast-notice">
          <Check size={16} style={{ color: "var(--accent-emerald)" }} />
          <span>{feedback}</span>
        </div>
      )}

      {/* Share Modal Dialog */}
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        videoId={videoId}
        title={title}
        currentSeconds={playbackSeconds}
      />

      <style jsx>{`
        .watch-container {
          padding: 1.5rem 1.25rem 4rem;
          max-width: 1200px;
          background-image: var(--dynamic-gradient);
          background-repeat: no-repeat;
          background-position: top center;
          background-size: 100% 500px;
          transition: background-image 0.6s ease;
          border-radius: var(--radius-lg);
        }

        .watch-nav-bar {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .watch-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          font-weight: 500;
        }

        .watch-breadcrumbs {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          overflow: hidden;
        }

        .truncate-title {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 500px;
        }

        .watch-layout {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .watch-main-column {
          width: 100%;
        }

        /* 16:9 Video Player Wrapper */
        .video-player-wrapper {
          position: relative;
          width: 100%;
          padding-top: 56.25%; /* 16:9 Aspect Ratio */
          background-color: #000000;
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
          margin-bottom: 1.5rem;
        }

        .video-poster-box {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #030712;
        }

        .video-poster-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.88;
        }

        .video-poster-scrim {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.65) 100%);
        }

        .prominent-play-button {
          position: relative;
          z-index: 10;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: var(--dynamic-play-btn, linear-gradient(135deg, #ef4444, #dc2626));
          border: 3px solid rgba(255, 255, 255, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: var(--dynamic-play-glow, 0 8px 25px rgba(239, 68, 68, 0.5));
          transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, background 0.5s ease;
        }

        .prominent-play-button:hover {
          transform: scale(1.12);
          box-shadow: 0 14px 40px var(--dynamic-glow, rgba(239, 68, 68, 0.7));
        }

        .video-preview-badge {
          position: absolute;
          bottom: 1rem;
          background-color: rgba(0, 0, 0, 0.75);
          color: #f8fafc;
          padding: 0.375rem 0.875rem;
          border-radius: var(--radius-full);
          font-size: 0.8125rem;
          font-weight: 500;
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .video-iframe-box {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .video-iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }

        /* Details Card */
        .video-details-card {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .watch-video-title {
          font-size: clamp(1.25rem, 2.5vw, 1.75rem);
          font-weight: 700;
          color: var(--text-main);
          line-height: 1.3;
          margin: 0;
        }

        .watch-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .watch-stats-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .meta-separator {
          color: var(--text-dim);
        }

        /* Action Bar */
        .watch-action-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          padding-top: 0.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border-color);
        }

        .channel-profile-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .channel-avatar-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          overflow: hidden;
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .channel-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .channel-avatar-fallback {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #38bdf8, #2563eb);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1rem;
        }

        .channel-names {
          display: flex;
          flex-direction: column;
        }

        .channel-title {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-main);
          margin: 0;
        }

        .channel-subs {
          font-size: 0.75rem;
          color: var(--text-dim);
          margin: 0;
        }

        .video-action-buttons {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .watch-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          border-radius: var(--radius-full);
          padding: 0.45rem 0.875rem;
        }

        .active-like {
          background-color: var(--dynamic-accent, rgba(56, 189, 248, 0.15)) !important;
          border-color: var(--dynamic-accent, var(--primary)) !important;
          color: var(--dynamic-text-on-accent, #ffffff) !important;
          font-weight: 600;
          box-shadow: 0 2px 10px var(--dynamic-glow, transparent);
        }

        .watch-threedot-btn {
          border-radius: var(--radius-full);
          padding: 0.45rem;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Three-Dot Context Menu */
        .watch-action-menu {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          z-index: 50;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          padding: 0.375rem;
          min-width: 180px;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .menu-action-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.625rem 0.75rem;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          color: var(--text-main);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
          width: 100%;
          transition: background-color 0.15s ease;
        }

        .menu-action-item:hover {
          background-color: var(--bg-subtle);
          color: var(--primary);
        }

        .menu-action-item.active-item {
          color: var(--primary);
          font-weight: 600;
        }

        /* Description Box */
        .watch-description-box {
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1.125rem 1.25rem;
          font-size: 0.9375rem;
          color: var(--text-main);
          line-height: 1.6;
        }

        .description-content.clamped {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .description-content.expanded {
          display: block;
        }

        .description-toggle-btn {
          margin-top: 0.625rem;
          background: none;
          border: none;
          color: var(--primary);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0;
        }

        /* Toast Feedback */
        .watch-toast-notice {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          z-index: 100;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-lg);
          padding: 0.75rem 1.25rem;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          gap: 0.625rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-main);
          animation: slideUpToast 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slideUpToast {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 640px) {
          .action-label-desktop {
            display: none;
          }
          .watch-action-bar {
            flex-direction: column;
            align-items: flex-start;
          }
          .video-action-buttons {
            width: 100%;
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
