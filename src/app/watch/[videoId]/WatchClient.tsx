"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
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
  PictureInPicture2,
  Minimize2,
  Bell,
  UserPlus,
  Loader2,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useInAppBack } from "@/lib/useInAppBack";
import { useMiniPlayer } from "@/lib/MiniPlayerContext";
import { VideoDescriptionRenderer } from "@/components/VideoDescriptionRenderer";
import { RelatedVideosFeed } from "@/components/RelatedVideosFeed";
import {
  isInLocalWatchlist,
  isInLocalWatchLater,
  toggleLocalWatchlist,
  toggleLocalWatchLater,
  isLikedLocally,
  toggleLocalLike,
  addToWatchHistory,
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
  return total;
}

function parseDurationToSeconds(dur?: string): number {
  if (!dur) return 0;
  const clean = dur.trim();
  const parts = clean.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

interface WatchClientProps {
  videoId: string;
  initialTitle?: string;
}

export default function WatchClient({ videoId, initialTitle }: WatchClientProps) {
  const handleBack = useInAppBack("/dashboard");
  const { openMiniPlayer } = useMiniPlayer();
  const searchParams = useSearchParams();
  const initialTime = parseTimeToSeconds(searchParams ? (searchParams.get("t") || searchParams.get("start")) : null);
  const [currentInitialTime, setInitialTime] = useState(initialTime);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { t } = useTranslation();

  // Playback state: starts FALSE so video does not autoplay on page load
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSeconds, setPlaybackSeconds] = useState(initialTime);

  // Picture-in-Picture state
  const [isPipActive, setIsPipActive] = useState(false);
  const [isPipSupported, setIsPipSupported] = useState(false);
  const pipWindowRef = useRef<any>(null);

  // Feature detect Document Picture-in-Picture support
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsPipSupported("documentPictureInPicture" in window);
    }
  }, []);

  // Clean up PiP window on unmount
  useEffect(() => {
    return () => {
      if (pipWindowRef.current) {
        try {
          pipWindowRef.current.close();
        } catch {
          // Ignore close error on unmount
        }
      }
    };
  }, []);

  // Share Modal state
  const [shareOpen, setShareOpen] = useState(false);

  // Video metadata
  const [item, setItem] = useState<VideoDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Interactive local states
  const [isLiked, setIsLiked] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [inWatchLater, setInWatchLater] = useState(false);

  // Channel subscription state
  const [isChannelSubscribed, setIsChannelSubscribed] = useState<boolean | null>(null);
  const [subscribingChannel, setSubscribingChannel] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(false);

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
    window.addEventListener(STORAGE_CHANGE_EVENT, syncStorageStates);
    return () => {
      window.removeEventListener(STORAGE_CHANGE_EVENT, syncStorageStates);
    };
  }, [syncStorageStates]);

  // Close context menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        menuBtnRef.current &&
        !menuBtnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  // Fetch full video details
  useEffect(() => {
    let isMounted = true;
    setItem(null);
    setIsChannelSubscribed(null);
    setCheckingSubscription(false);
    setError(null);

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
      });

    return () => {
      isMounted = false;
    };
  }, [videoId, initialTitle]);

  useEffect(() => {
    if (!item?.channelId) {
      setIsChannelSubscribed(null);
      return;
    }
    let active = true;
    setCheckingSubscription(true);
    fetch(`/api/content/youtube-subscribe?channelId=${encodeURIComponent(item.channelId)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Subscription status unavailable");
        if (active) setIsChannelSubscribed(Boolean(data.isSubscribed));
      })
      .catch(() => {
        if (active) setIsChannelSubscribed(null);
      })
      .finally(() => {
        if (active) setCheckingSubscription(false);
      });
    return () => { active = false; };
  }, [item?.channelId]);

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
  const sendWatchProgress = useCallback((seconds: number) => {
    if (!videoId) return;
    const durSecs = parseDurationToSeconds(item?.duration) || 600;
    fetch("/api/content/watch-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentId: videoId,
        provider: "youtube",
        title: item?.title || initialTitle || "YouTube Video",
        channelName: item?.creator || "YouTube Creator",
        thumbnailUrl: thumbnail,
        durationSeconds: durSecs,
        progressSeconds: seconds,
      }),
    }).catch(() => {});
  }, [videoId, item, initialTitle, thumbnail]);

  // Track playback time when video is playing and periodically sync
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setPlaybackSeconds((s) => {
        const next = s + 1;
        if (next > 0 && next % 15 === 0) {
          sendWatchProgress(next);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, sendWatchProgress]);

  // Save progress on page leave / unmount
  useEffect(() => {
    return () => {
      if (playbackSeconds > 0) {
        sendWatchProgress(playbackSeconds);
      }
    };
  }, [playbackSeconds, sendWatchProgress]);

  // Play button click handler
  const handleStartPlay = () => {
    setIsPlaying(true);
    if (videoId) {
      addToWatchHistory({
        videoId,
        title: item?.title || initialTitle || "YouTube Video",
        thumbnailUrl: thumbnail,
        channelName: item?.creator || "YouTube Creator",
        duration: item?.duration,
        lastWatched: Date.now(),
        playbackPosition: playbackSeconds,
      });

      sendWatchProgress(playbackSeconds || 1);
    }
  };

  // Timestamp seeking in embedded video player
  const handleSeekTimestamp = (seconds: number) => {
    if (!isPlaying) {
      setInitialTime(seconds);
      setIsPlaying(true);
    } else if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [seconds, true],
        }),
        "*"
      );
    }
  };

  // Miniplayer detachment
  const handleTriggerMiniplayer = () => {
    openMiniPlayer({
      videoId,
      title: item?.title || initialTitle || "YouTube Video",
      channelTitle: item?.creator || "YouTube Creator",
      thumbnail: item?.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      currentTime: playbackSeconds || currentInitialTime || 0,
    });
    handleBack();
  };

  // Subscribe to channel
  const handleToggleChannelSubscribe = async () => {
    if (!item?.channelId || subscribingChannel) return;
    setSubscribingChannel(true);
    const newAction = isChannelSubscribed === true ? "unsubscribe" : "subscribe";
    try {
      const res = await fetch("/api/content/youtube-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: item.channelId,
          action: newAction,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.requiresConnect || data.requiresReauth) {
          showFeedback(data.error || "Connect YouTube in Settings to manage subscriptions.");
          // OAuth requires a full-page redirect so the authorization response can be followed.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/api/auth/youtube/connect");
          return;
        }
        throw new Error(data.error || "Subscription request failed.");
      }
      if (data.verified) {
        setIsChannelSubscribed(data.status === "subscribed");
        showFeedback(data.status === "subscribed" ? "YouTube subscription verified." : "YouTube unsubscribe verified.");
      } else {
        setIsChannelSubscribed(null);
        showFeedback(data.error || "YouTube subscription status could not be verified.");
      }
    } catch (err: any) {
      showFeedback(err.message || "Failed to update subscription");
    } finally {
      setSubscribingChannel(false);
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
    const currentTitle = item?.title || initialTitle || "YouTube Video";
    const thumb = item?.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const next = toggleLocalWatchlist({
      videoId,
      title: currentTitle,
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
    const currentTitle = item?.title || initialTitle || "YouTube Video";
    const thumb = item?.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const next = toggleLocalWatchLater({
      videoId,
      title: currentTitle,
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

  // Document Picture-in-Picture Toggle
  const handleTogglePip = async () => {
    if (isPipActive && pipWindowRef.current) {
      try {
        pipWindowRef.current.close();
      } catch {}
      setIsPipActive(false);
      pipWindowRef.current = null;
      return;
    }

    if (!isPipSupported) {
      showFeedback(t("watch.pipUnsupported"));
      return;
    }

    try {
      if (!isPlaying) {
        setIsPlaying(true);
      }

      const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
        width: 640,
        height: 360,
      });
      pipWindowRef.current = pipWindow;

      [...document.styleSheets].forEach((styleSheet) => {
        try {
          if (styleSheet.href) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.type = styleSheet.type || "text/css";
            link.media = styleSheet.media?.mediaText || "all";
            link.href = styleSheet.href;
            pipWindow.document.head.appendChild(link);
          }
        } catch {}
      });

      pipWindow.document.body.style.margin = "0";
      pipWindow.document.body.style.backgroundColor = "#000";
      pipWindow.document.body.style.overflow = "hidden";
      pipWindow.document.body.style.display = "flex";
      pipWindow.document.body.style.height = "100vh";
      pipWindow.document.body.style.width = "100vw";

      const pipIframe = document.createElement("iframe");
      pipIframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(
        videoId
      )}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1${
        playbackSeconds > 0 ? `&start=${playbackSeconds}` : ""
      }`;
      pipIframe.title = item?.title || initialTitle || "Video";
      pipIframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      pipIframe.allowFullscreen = true;
      pipIframe.style.width = "100%";
      pipIframe.style.height = "100%";
      pipIframe.style.border = "none";

      pipWindow.document.body.appendChild(pipIframe);
      setIsPipActive(true);

      pipWindow.addEventListener("pagehide", () => {
        setIsPipActive(false);
        pipWindowRef.current = null;
      });
    } catch (err: any) {
      console.warn("PiP activation error:", err);
      showFeedback(t("watch.pipUnsupported"));
    }
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
  const creator = item?.creator || "";
  const channelAvatar = item?.channelAvatar;
  const subscriberCount = item?.subscriberCount;
  const views = item?.views;
  const publicationDate = item?.publicationDate;
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
      {/* Top Navigation Row: Context-Aware Back Button */}
      <div className="watch-nav-bar">
        <button
          type="button"
          onClick={handleBack}
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
        <div className="watch-main-column">
          {/* Video Player Box (16:9 Aspect Ratio) */}
          <div className="video-player-wrapper">
            {!isPlaying ? (
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
              <div className="video-iframe-box">
                <iframe
                  ref={iframeRef}
                  src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(
                    videoId
                  )}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1${
                    currentInitialTime > 0 ? `&start=${currentInitialTime}` : ""
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
                {views && <span className="watch-views-text">{views}</span>}
                {views && publicationDate && <span className="meta-separator">•</span>}
                {publicationDate && <span className="watch-date-text">{publicationDate}</span>}
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
              {/* Channel Profile Link */}
              <div className="channel-profile-group">
                {item?.channelId ? (
                  <Link href={`/channel/${item.channelId}`} className="channel-profile-link" title={`View ${creator} channel`}>
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
                      {creator && <h3 className="channel-title">{creator}</h3>}
                      {subscriberCount && <p className="channel-subs">{subscriberCount}</p>}
                    </div>
                  </Link>
                ) : (
                  <div className="channel-profile-link static">
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
                      {creator && <h3 className="channel-title">{creator}</h3>}
                      {subscriberCount && <p className="channel-subs">{subscriberCount}</p>}
                    </div>
                  </div>
                )}

                {item?.channelId && (
                  <button
                    type="button"
                    onClick={handleToggleChannelSubscribe}
                    disabled={subscribingChannel || checkingSubscription}
                    className={`btn btn-sm channel-sub-pill ${isChannelSubscribed ? "subscribed" : "btn-primary"}`}
                    title={isChannelSubscribed === true ? "Subscribed to channel" : "Subscribe to channel"}
                  >
                    {subscribingChannel || checkingSubscription ? (
                      <Loader2 size={14} className="spin" />
                    ) : isChannelSubscribed === true ? (
                      <>
                        <Check size={14} />
                        <span>Subscribed</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={14} />
                        <span>Subscribe</span>
                      </>
                    )}
                  </button>
                )}
                {item?.channelId && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm watch-notification-info"
                    aria-label="YouTube notification preferences cannot be changed here"
                    title="YouTube's API does not let OmniDiscover change notification preferences. Manage them on YouTube."
                    onClick={() => showFeedback("Notification preferences are managed on YouTube; this control cannot change them.")}
                  >
                    <Bell size={16} />
                  </button>
                )}
              </div>

              {/* Action Buttons: 4. Miniplayer, 5. PiP, 6. Like, 7. Share, 8. Three-Dot Menu */}
              <div className="video-action-buttons">
                {/* 4. Floating Miniplayer Button */}
                <button
                  type="button"
                  onClick={handleTriggerMiniplayer}
                  className="btn btn-outline btn-sm watch-action-btn"
                  title="Detached Floating Miniplayer"
                  aria-label="Floating Miniplayer"
                >
                  <Minimize2 size={16} />
                  <span className="action-label-desktop">Miniplayer</span>
                </button>

                {/* 5. Picture-in-Picture Button */}
                <button
                  type="button"
                  onClick={handleTogglePip}
                  className={`btn btn-sm watch-action-btn ${isPipActive ? "active-like" : "btn-outline"}`}
                  title={
                    isPipActive
                      ? t("watch.pipActive")
                      : isPipSupported
                      ? t("watch.pipTooltip")
                      : t("watch.pipUnsupported")
                  }
                  aria-label={t("watch.pip")}
                >
                  <PictureInPicture2 size={16} fill={isPipActive ? "currentColor" : "none"} />
                  <span className="action-label-desktop">{isPipActive ? t("watch.pipActive") : t("watch.pip")}</span>
                </button>

                {/* 6. Like Button */}
                <button
                  type="button"
                  onClick={handleToggleLike}
                  className={`btn btn-sm watch-action-btn ${isLiked ? "active-like" : "btn-outline"}`}
                  title={
                    isLiked
                      ? isYtConfirmed
                        ? "Liked locally & confirmed on YouTube"
                        : "Saved to your Liked videos"
                      : isYtConnected
                      ? "Like video and sync with YouTube"
                      : "Like video locally"
                  }
                  aria-label={isLiked ? "Unlike video" : "Like video"}
                >
                  <ThumbsUp size={16} fill={isLiked ? "currentColor" : "none"} />
                  <span className="action-label-desktop">{isLiked ? (isYtConfirmed ? "Liked" : "Liked") : "Like"}</span>
                </button>

                {/* 7. Share Button */}
                <button
                  type="button"
                  onClick={handleShare}
                  className="btn btn-outline btn-sm watch-action-btn"
                  title="Share video link"
                  aria-label="Share video link"
                >
                  <Share2 size={16} />
                  <span className="action-label-desktop">Share</span>
                </button>

                {/* 8. Three-Dot Menu (Includes Watch on YouTube, Watchlist, Watch Later) */}
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

                  {menuOpen && (
                    <div ref={menuRef} role="menu" className="watch-action-menu">
                      {/* Watch on YouTube External Link */}
                      <a
                        href={item?.externalUrl || `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        role="menuitem"
                        className="menu-action-item"
                        onClick={() => setMenuOpen(false)}
                      >
                        <ExternalLink size={16} />
                        <span>YouTube</span>
                      </a>

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

            {/* Interactive Description Box with Timestamps and Safe Links */}
            <VideoDescriptionRenderer
              description={item?.description || ""}
              onSeek={handleSeekTimestamp}
            />

            {/* Contextual Related Video Recommendations */}
            <RelatedVideosFeed
              currentVideoId={videoId}
              title={title}
              category={item?.category}
            />
          </div>
        </div>
      </div>

      {/* Toast Notice */}
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

        .video-player-wrapper {
          position: relative;
          width: 100%;
          padding-top: 56.25%;
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
        }

        .video-poster-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .video-poster-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(0, 0, 0, 0.75) 0%,
            rgba(0, 0, 0, 0.25) 50%,
            rgba(0, 0, 0, 0.5) 100%
          );
        }

        .prominent-play-button {
          position: relative;
          z-index: 10;
          width: 76px;
          height: 76px;
          border-radius: 50%;
          background-color: var(--dynamic-play-btn, rgba(239, 68, 68, 0.95));
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 24px var(--dynamic-play-glow, rgba(239, 68, 68, 0.5));
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease;
        }

        .prominent-play-button:hover {
          transform: scale(1.1);
        }

        .play-icon-pulse {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .video-preview-badge {
          position: absolute;
          bottom: 1.25rem;
          padding: 0.375rem 0.875rem;
          border-radius: 9999px;
          background-color: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(8px);
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.75rem;
          font-weight: 500;
          letter-spacing: 0.02em;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .video-iframe-box {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .video-iframe {
          width: 100%;
          height: 100%;
          border: none;
        }

        .video-details-card {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .watch-video-title {
          font-size: 1.375rem;
          font-weight: 700;
          color: var(--text-main);
          line-height: 1.35;
          margin: 0;
        }

        .watch-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
          font-size: 0.8125rem;
          color: var(--text-muted);
        }

        .watch-stats-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .meta-separator {
          color: var(--text-dim);
        }

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
          gap: 1rem;
        }

        .channel-profile-link {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          color: inherit;
          transition: opacity 0.15s ease;
        }

        .channel-profile-link:hover:not(.static) {
          opacity: 0.85;
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

        .channel-sub-pill {
          padding: 0.35rem 0.875rem;
          border-radius: 9999px;
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          font-weight: 600;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .channel-sub-pill.subscribed {
          background-color: var(--bg-surface-elevated);
          color: var(--text-main);
          border: 1px solid var(--border-color);
        }

        .watch-notification-info {
          width: 34px;
          height: 34px;
          min-width: 34px;
          padding: 0;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
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
          font-size: 0.8125rem;
          padding: 0.4rem 0.75rem;
          border-radius: 9999px;
        }

        .watch-action-btn.active-like {
          background-color: var(--dynamic-badge-bg, rgba(56, 189, 248, 0.15));
          border-color: var(--dynamic-accent, var(--primary));
          color: var(--dynamic-accent, var(--primary));
        }

        .watch-threedot-btn {
          padding: 0.4rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 34px;
          min-height: 34px;
        }

        .watch-action-menu {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          width: 190px;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          padding: 0.375rem;
          z-index: 50;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .menu-action-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.5rem 0.625rem;
          border-radius: var(--radius-sm);
          font-size: 0.8125rem;
          color: var(--text-main);
          background: none;
          border: none;
          cursor: pointer;
          width: 100%;
          text-align: left;
          transition: background-color 0.15s ease;
        }

        .menu-action-item:hover {
          background-color: var(--bg-subtle);
        }

        .menu-action-item.active-item {
          color: var(--accent-emerald);
          font-weight: 500;
        }

        .watch-toast-notice {
          position: fixed;
          bottom: 24px;
          right: 24px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--text-main);
          font-size: 0.875rem;
          font-weight: 500;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
          z-index: 999;
          animation: toastIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes toastIn {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 767px) {
          .action-label-desktop {
            display: none !important;
          }
          .watch-action-bar {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: flex-start !important;
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            scrollbar-width: none !important;
            gap: 0.5rem !important;
            width: 100% !important;
            padding-bottom: 0.25rem !important;
          }
          .watch-action-bar::-webkit-scrollbar {
            display: none !important;
          }
          .channel-profile-group {
            display: flex !important;
            align-items: center !important;
            gap: 0.5rem !important;
            flex-shrink: 0 !important;
            flex-wrap: nowrap !important;
            width: auto !important;
          }
          .channel-profile-link {
            gap: 0.5rem !important;
          }
          .channel-avatar-circle {
            width: 36px !important;
            height: 36px !important;
            min-width: 36px !important;
          }
          .channel-names {
            max-width: 90px !important;
            overflow: hidden !important;
          }
          .channel-title {
            font-size: 0.8125rem !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .channel-subs {
            font-size: 0.6875rem !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .channel-sub-pill {
            padding: 0.35rem 0.65rem !important;
            font-size: 0.75rem !important;
            flex-shrink: 0 !important;
            white-space: nowrap !important;
          }
          .watch-notification-info {
            width: 34px !important;
            height: 34px !important;
            min-width: 34px !important;
            flex-shrink: 0 !important;
          }
          .video-action-buttons {
            display: flex !important;
            align-items: center !important;
            gap: 0.35rem !important;
            flex-shrink: 0 !important;
            flex-wrap: nowrap !important;
            width: auto !important;
          }
          .watch-action-btn {
            padding: 0.4rem 0.5rem !important;
            min-width: 34px !important;
            height: 34px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          .watch-threedot-btn {
            min-width: 34px !important;
            min-height: 34px !important;
          }
        }
      `}</style>
    </div>
  );
}
