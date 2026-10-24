"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Play,
  Check,
  AlertCircle,
  ExternalLink,
  Users,
  Film,
  Zap,
  Eye,
  Loader2,
  X,
} from "lucide-react";
import { useInAppBack } from "@/lib/useInAppBack";
import { NormalizedContentItem } from "@/lib/types";
import { formatUploadAge, formatViewCount } from "@/lib/format-utils";

interface ChannelDetails {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  avatar: string;
  banner?: string | null;
  subscriberCount?: string;
  videoCount?: string;
  viewCount?: string;
  isSubscribed?: boolean;
  subscriptionId?: string;
}

interface ChannelClientProps {
  channelId: string;
}

export function ChannelClient({ channelId }: ChannelClientProps) {
  const router = useRouter();
  const handleBack = useInAppBack("/dashboard");

  const [channel, setChannel] = useState<ChannelDetails | null>(null);
  const [activeTab, setActiveTab] = useState<"videos" | "shorts">("videos");

  // Independent state for Videos tab
  const [videosUploads, setVideosUploads] = useState<NormalizedContentItem[]>([]);
  const [videosNextPageToken, setVideosNextPageToken] = useState<string | undefined>(undefined);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosLoadingMore, setVideosLoadingMore] = useState(false);
  const [videosLoaded, setVideosLoaded] = useState(false);

  // Independent state for Shorts tab
  const [shortsUploads, setShortsUploads] = useState<NormalizedContentItem[]>([]);
  const [shortsNextPageToken, setShortsNextPageToken] = useState<string | undefined>(undefined);
  const [shortsLoading, setShortsLoading] = useState(false);
  const [shortsLoadingMore, setShortsLoadingMore] = useState(false);
  const [shortsLoaded, setShortsLoaded] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscription state
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subToast, setSubToast] = useState<string | null>(null);

  // Description modal state
  const [descModalOpen, setDescModalOpen] = useState(false);

  // Description modal body scroll lock and escape handler
  useEffect(() => {
    if (!descModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDescModalOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [descModalOpen]);

  const fetchChannelData = useCallback(async () => {
    setLoading(true);
    setVideosLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/content/channel?id=${encodeURIComponent(channelId)}&tab=videos`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load channel");
      }
      const data = await res.json();
      setChannel(data.channel);
      setIsSubscribed(Boolean(data.channel?.isSubscribed));
      setVideosUploads(data.uploads || []);
      setVideosNextPageToken(data.nextPageToken);
      setVideosLoaded(true);
    } catch (err: any) {
      setError(err.message || "Failed to load creator channel");
    } finally {
      setLoading(false);
      setVideosLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    fetchChannelData();
  }, [fetchChannelData]);

  // Handle switching between Videos and Shorts tabs
  const handleTabChange = async (tab: "videos" | "shorts") => {
    if (tab === activeTab) return;
    setActiveTab(tab);

    if (tab === "shorts" && !shortsLoaded) {
      setShortsLoading(true);
      try {
        const res = await fetch(`/api/content/channel?id=${encodeURIComponent(channelId)}&tab=shorts`);
        if (res.ok) {
          const data = await res.json();
          setShortsUploads(data.uploads || []);
          setShortsNextPageToken(data.nextPageToken);
          setShortsLoaded(true);
        }
      } catch {
        // Non-blocking fallback
      } finally {
        setShortsLoading(false);
      }
    } else if (tab === "videos" && !videosLoaded) {
      setVideosLoading(true);
      try {
        const res = await fetch(`/api/content/channel?id=${encodeURIComponent(channelId)}&tab=videos`);
        if (res.ok) {
          const data = await res.json();
          setVideosUploads(data.uploads || []);
          setVideosNextPageToken(data.nextPageToken);
          setVideosLoaded(true);
        }
      } catch {
        // Non-blocking fallback
      } finally {
        setVideosLoading(false);
      }
    }
  };

  // Load more 10 items per batch for the active tab
  const handleLoadMore = async () => {
    if (activeTab === "videos") {
      if (!videosNextPageToken || videosLoadingMore) return;
      setVideosLoadingMore(true);
      try {
        const res = await fetch(
          `/api/content/channel?id=${encodeURIComponent(channelId)}&tab=videos&pageToken=${encodeURIComponent(
            videosNextPageToken
          )}`
        );
        if (res.ok) {
          const data = await res.json();
          setVideosUploads((prev) => [...prev, ...(data.uploads || [])]);
          setVideosNextPageToken(data.nextPageToken);
        }
      } catch {
        // Graceful error
      } finally {
        setVideosLoadingMore(false);
      }
    } else {
      if (!shortsNextPageToken || shortsLoadingMore) return;
      setShortsLoadingMore(true);
      try {
        const res = await fetch(
          `/api/content/channel?id=${encodeURIComponent(channelId)}&tab=shorts&pageToken=${encodeURIComponent(
            shortsNextPageToken
          )}`
        );
        if (res.ok) {
          const data = await res.json();
          setShortsUploads((prev) => [...prev, ...(data.uploads || [])]);
          setShortsNextPageToken(data.nextPageToken);
        }
      } catch {
        // Graceful error
      } finally {
        setShortsLoadingMore(false);
      }
    }
  };

  const currentUploads = activeTab === "videos" ? videosUploads : shortsUploads;
  const currentNextPageToken = activeTab === "videos" ? videosNextPageToken : shortsNextPageToken;
  const currentLoadingMore = activeTab === "videos" ? videosLoadingMore : shortsLoadingMore;
  const currentTabLoading = activeTab === "videos" ? videosLoading : shortsLoading;

  const handleToggleSubscribe = async () => {
    if (subscribing) return;
    setSubscribing(true);
    const newAction = isSubscribed ? "unsubscribe" : "subscribe";
    try {
      const res = await fetch("/api/content/youtube-subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId,
          action: newAction,
          subscriptionId: channel?.subscriptionId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.requiresConnect) {
          if (confirm("Connecting your YouTube account is required to subscribe to creators directly. Would you like to connect your account now in Settings?")) {
            window.location.href = "/settings?tab=youtube_account";
          }
          return;
        }
        throw new Error(data.error || "Subscription request failed.");
      }

      const nextSubState = newAction === "subscribe";
      setIsSubscribed(nextSubState);
      setSubToast(nextSubState ? "Subscribed to channel!" : "Unsubscribed from channel.");
      setTimeout(() => setSubToast(null), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to update subscription");
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="container channel-loading-box">
        <Loader2 size={36} className="spin" style={{ color: "var(--primary)", margin: "0 auto 1rem" }} />
        <p style={{ color: "var(--text-muted)" }}>Loading creator profile &amp; uploads...</p>
      </div>
    );
  }

  if (error || !channel) {
    return (
      <div className="container channel-error-box">
        <AlertCircle size={40} style={{ color: "var(--accent-rose)", margin: "0 auto 1rem" }} />
        <h2>Unable to load creator channel</h2>
        <p style={{ color: "var(--text-muted)", margin: "0.5rem 0 1.5rem" }}>{error}</p>
        <button type="button" onClick={handleBack} className="btn btn-outline">
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="channel-page-root">
      {/* Top Banner */}
      <div className="channel-banner-container">
        {channel.banner ? (
          <img src={channel.banner} alt={channel.title} className="channel-banner-img" />
        ) : (
          <div className="channel-banner-placeholder" />
        )}

        {/* Back Button Floating on Banner */}
        <button
          type="button"
          onClick={handleBack}
          className="btn btn-outline btn-sm channel-back-btn"
          aria-label="Back to discovery list"
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>
      </div>

      <div className="container channel-main-container">
        {/* Creator Info Header */}
        <div className="channel-header-card">
          <div className="channel-avatar-wrap">
            <img src={channel.avatar} alt={channel.title} className="channel-avatar-img" />
          </div>

          <div className="channel-details">
            <div className="channel-title-row">
              <h1 className="channel-name">{channel.title}</h1>
              {channel.customUrl && <span className="channel-handle">{channel.customUrl}</span>}
            </div>

            <div className="channel-stats-row">
              {channel.subscriberCount && (
                <div className="stat-pill">
                  <Users size={14} />
                  <span>{channel.subscriberCount}</span>
                </div>
              )}
              {channel.videoCount && (
                <div className="stat-pill">
                  <Film size={14} />
                  <span>{channel.videoCount} videos</span>
                </div>
              )}
              {channel.viewCount && (
                <div className="stat-pill">
                  <Eye size={14} />
                  <span>{channel.viewCount}</span>
                </div>
              )}
            </div>

            {channel.description && (
              <div className="channel-desc-container">
                <p className="channel-desc">{channel.description}</p>
                {channel.description.length > 70 && (
                  <button
                    type="button"
                    onClick={() => setDescModalOpen(true)}
                    className="channel-read-more-btn"
                  >
                    Read more
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="channel-actions">
            <button
              type="button"
              onClick={handleToggleSubscribe}
              disabled={subscribing}
              className={`btn btn-sm channel-sub-btn ${isSubscribed ? "subscribed" : "btn-primary"}`}
              title={isSubscribed ? "Subscribed on YouTube" : "Subscribe to channel"}
            >
              {subscribing ? (
                <Loader2 size={16} className="spin" />
              ) : isSubscribed ? (
                <>
                  <Check size={16} />
                  <span>Subscribed</span>
                </>
              ) : (
                <>
                  <Bell size={16} />
                  <span>Subscribe</span>
                </>
              )}
            </button>

            <a
              href={`https://www.youtube.com/channel/${channel.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm"
              title="Open Channel on YouTube"
            >
              <span>YouTube</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        {/* Video Uploads Section */}
        <section className="channel-uploads-section" aria-label="Channel Uploads">
          <div className="uploads-header">
            <div className="uploads-title-row">
              <h2 className="uploads-title">Channel Uploads</h2>
              {/* Videos and Shorts Toggle Tabs */}
              <div className="channel-tab-group" role="tablist" aria-label="Channel Uploads Filter">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "videos"}
                  onClick={() => handleTabChange("videos")}
                  className={`channel-tab-btn ${activeTab === "videos" ? "active" : ""}`}
                >
                  <Film size={14} />
                  <span>Videos</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "shorts"}
                  onClick={() => handleTabChange("shorts")}
                  className={`channel-tab-btn ${activeTab === "shorts" ? "active" : ""}`}
                >
                  <Zap size={14} />
                  <span>Shorts</span>
                </button>
              </div>
            </div>

            <span className="uploads-count-badge">
              {currentUploads.length} {activeTab === "shorts" ? "Shorts" : "videos"} displayed
            </span>
          </div>

          {currentTabLoading ? (
            <div className="uploads-tab-loading">
              <Loader2 size={24} className="spin" style={{ color: "var(--primary)" }} />
              <p style={{ color: "var(--text-muted)", marginTop: "0.5rem", fontSize: "0.875rem" }}>
                Loading {activeTab === "shorts" ? "Shorts" : "videos"}...
              </p>
            </div>
          ) : currentUploads.length === 0 ? (
            <div className="uploads-empty">
              <p style={{ color: "var(--text-muted)" }}>
                No public {activeTab === "shorts" ? "Shorts" : "videos"} found for this channel.
              </p>
            </div>
          ) : (
            <div className="channel-videos-grid">
              {currentUploads.map((video) => {
                const vidId = video.providerId || video.id?.replace(/^youtube:/, "");
                const formattedViews = formatViewCount(video.views);
                const uploadAge = formatUploadAge(video.publicationDate);
                const creatorName = video.creator || channel?.title || "Creator";
                const channelAvatarUrl = video.channelAvatar || channel?.avatar;
                const channelInitial = creatorName.charAt(0).toUpperCase();

                return (
                  <div
                    key={video.id}
                    className="channel-video-card"
                    onClick={() => router.push(`/watch/${vidId}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/watch/${vidId}`);
                      }
                    }}
                  >
                    {/* A. 16:9 Thumbnail Box with Duration Badge */}
                    <div className="video-thumb-box">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="video-thumb-img"
                        loading="lazy"
                      />
                      <div className="video-thumb-overlay">
                        <div className="video-play-btn-circle">
                          <Play size={16} fill="#ffffff" color="#ffffff" style={{ marginLeft: "2px" }} />
                        </div>
                      </div>
                      {video.duration && <span className="video-duration">{video.duration}</span>}
                    </div>

                    {/* B. Video Title immediately below thumbnail */}
                    <div className="video-card-meta">
                      <h3
                        className="video-card-title"
                        title={video.title}
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/watch/${vidId}`);
                        }}
                      >
                        {video.title}
                      </h3>

                      {/* C. Compact Creator and Video Metadata row */}
                      <div className="video-card-creator-row">
                        <div
                          className="creator-info-group"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (video.channelId || channel?.id) {
                              router.push(`/channel/${encodeURIComponent(video.channelId || channel!.id)}`);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          title={`View ${creatorName}'s channel`}
                        >
                          <div className="creator-avatar-wrap">
                            {channelAvatarUrl ? (
                              <img
                                src={channelAvatarUrl}
                                alt={creatorName}
                                className="creator-avatar-img"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                  const fb = (e.target as HTMLElement).parentElement?.querySelector(
                                    ".creator-avatar-fb"
                                  ) as HTMLElement;
                                  if (fb) fb.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div
                              className="creator-avatar-fb"
                              style={{ display: channelAvatarUrl ? "none" : "flex" }}
                            >
                              {channelInitial}
                            </div>
                          </div>
                          <span className="creator-name-text">{creatorName}</span>
                        </div>

                        {/* Views and Upload Age */}
                        {(formattedViews || uploadAge) && (
                          <div className="video-stats-inline">
                            {formattedViews && (
                              <>
                                <span className="meta-dot">·</span>
                                <span>{formattedViews}</span>
                              </>
                            )}
                            {uploadAge && (
                              <>
                                <span className="meta-dot">·</span>
                                <span>{uploadAge}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More Button (10 items per batch) */}
          {currentNextPageToken && !currentTabLoading && (
            <div className="load-more-container">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={currentLoadingMore}
                className="btn btn-outline load-more-btn"
              >
                {currentLoadingMore ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Loading next 10 items...</span>
                  </>
                ) : (
                  <span>Load More (10 {activeTab === "shorts" ? "Shorts" : "Videos"})</span>
                )}
              </button>
            </div>
          )}

          {/* End of results indication */}
          {currentUploads.length > 0 && !currentNextPageToken && !currentTabLoading && (
            <div className="end-of-results-banner">
              <span>You&apos;ve reached the end of {activeTab === "shorts" ? "Shorts" : "video"} uploads.</span>
            </div>
          )}
        </section>
      </div>

      {/* Description Modal */}
      {descModalOpen && channel && (
        <div className="channel-desc-modal-overlay">
          <div
            className="channel-desc-modal-backdrop"
            onClick={() => setDescModalOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="channel-desc-modal-title"
            className="channel-desc-modal-card"
          >
            <div className="channel-desc-modal-header">
              <h3 id="channel-desc-modal-title" className="channel-desc-modal-heading">
                About {channel.title}
              </h3>
              <button
                type="button"
                onClick={() => setDescModalOpen(false)}
                className="btn btn-outline btn-sm channel-desc-modal-close"
                aria-label="Close description modal"
              >
                <X size={16} />
              </button>
            </div>
            <div className="channel-desc-modal-body">
              <p className="channel-desc-modal-text">{channel.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Toast */}
      {subToast && (
        <div className="channel-toast">
          <Check size={16} style={{ color: "var(--accent-emerald)" }} />
          <span>{subToast}</span>
        </div>
      )}

      <style jsx>{`
        .channel-page-root {
          min-height: 100vh;
          background-color: var(--bg-main);
          color: var(--text-main);
          padding-bottom: 5rem;
        }

        .channel-banner-container {
          position: relative;
          width: 100%;
          height: 220px;
          background: #18181b;
          overflow: hidden;
        }

        .channel-banner-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .channel-banner-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #1e293b, #0f172a, #1e1b4b);
        }

        .channel-back-btn {
          position: absolute;
          top: 16px;
          left: 16px;
          background: rgba(13, 17, 23, 0.75);
          backdrop-filter: blur(8px);
          border-color: rgba(255, 255, 255, 0.2);
          color: #fff;
          z-index: 10;
        }

        .channel-back-btn:hover {
          background: rgba(13, 17, 23, 0.95);
        }

        .channel-main-container {
          position: relative;
          margin-top: -60px;
          z-index: 5;
        }

        .channel-header-card {
          display: flex;
          align-items: flex-start;
          gap: 1.5rem;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
          margin-bottom: 2rem;
        }

        .channel-avatar-wrap {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 3px solid var(--bg-surface);
          overflow: hidden;
          background: #27272a;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35);
          flex-shrink: 0;
        }

        .channel-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .channel-details {
          flex: 1;
        }

        .channel-title-row {
          display: flex;
          align-items: baseline;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 0.5rem;
        }

        .channel-name {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-main);
          margin: 0;
        }

        .channel-handle {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .channel-stats-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 0.75rem;
        }

        .stat-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.8125rem;
          color: var(--text-muted);
          background-color: var(--bg-surface-elevated);
          padding: 2px 8px;
          border-radius: 9999px;
          border: 1px solid var(--border-color);
        }

        .channel-desc {
          font-size: 0.875rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .channel-read-more-btn {
          background: none;
          border: none;
          padding: 0;
          margin-top: 0.25rem;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--primary);
          cursor: pointer;
          display: inline-block;
        }

        .channel-read-more-btn:hover {
          text-decoration: underline;
        }

        .channel-desc-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.25rem;
        }

        .channel-desc-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.65);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: modalFadeIn 0.2s ease forwards;
        }

        .channel-desc-modal-card {
          position: relative;
          z-index: 1001;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
          width: 100%;
          max-width: 520px;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: modalScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .channel-desc-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--border-color);
        }

        .channel-desc-modal-heading {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }

        .channel-desc-modal-close {
          min-width: 32px;
          min-height: 32px;
          padding: 0.35rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .channel-desc-modal-body {
          padding: 1.25rem;
          overflow-y: auto;
        }

        .channel-desc-modal-text {
          font-size: 0.9375rem;
          line-height: 1.6;
          color: var(--text-main);
          margin: 0;
          white-space: pre-wrap;
          word-break: break-word;
        }

        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modalScaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .channel-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
        }

        .channel-sub-btn.subscribed {
          background-color: var(--bg-subtle);
          color: var(--text-main);
          border: 1px solid var(--border-color);
        }

        /* Uploads */
        .uploads-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .uploads-title-row {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          flex-wrap: wrap;
        }

        .uploads-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }

        .channel-tab-group {
          display: inline-flex;
          align-items: center;
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 3px;
          gap: 2px;
        }

        .channel-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 0.8125rem;
          font-weight: 500;
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: var(--transition);
        }

        .channel-tab-btn:hover {
          color: var(--text-main);
        }

        .channel-tab-btn.active {
          background-color: var(--bg-surface);
          color: var(--primary);
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        }

        .uploads-count-badge {
          font-size: 0.75rem;
          color: var(--text-dim);
        }

        .uploads-tab-loading {
          text-align: center;
          padding: 3.5rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .channel-videos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 1.25rem;
        }

        .channel-video-card {
          display: flex;
          flex-direction: column;
          border-radius: var(--radius-md);
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease, border-color 0.2s ease;
        }

        .channel-video-card:hover {
          transform: translateY(-3px);
          border-color: var(--primary);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        }

        .video-thumb-box {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          background: #1e293b;
          overflow: hidden;
        }

        .video-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .channel-video-card:hover .video-thumb-img {
          transform: scale(1.05);
        }

        .video-thumb-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          opacity: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s ease;
        }

        .channel-video-card:hover .video-thumb-overlay {
          opacity: 1;
        }

        .video-play-btn-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(56, 189, 248, 0.4);
        }

        .video-duration {
          position: absolute;
          bottom: 6px;
          right: 6px;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.8);
          color: #fff;
          font-size: 0.6875rem;
          font-weight: 600;
        }

        .video-card-meta {
          padding: 0.75rem 0.875rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .video-card-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-main);
          line-height: 1.35;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          cursor: pointer;
        }

        .video-card-creator-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.35rem 0.45rem;
          font-size: 0.75rem;
          color: var(--text-dim);
          line-height: 1.3;
          margin-top: 0.25rem;
        }

        .creator-info-group {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          color: var(--text-muted);
          cursor: pointer;
          max-width: 100%;
        }

        .creator-info-group:hover .creator-name-text {
          color: var(--primary);
          text-decoration: underline;
        }

        .creator-avatar-wrap {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          overflow: hidden;
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .creator-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .creator-avatar-fb {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, #38bdf8, #2563eb);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.625rem;
          font-weight: 700;
        }

        .creator-name-text {
          font-size: 0.75rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 130px;
        }

        .video-stats-inline {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }

        .meta-dot {
          color: var(--text-dim);
        }

        .end-of-results-banner {
          text-align: center;
          padding: 2rem 1rem;
          color: var(--text-dim);
          font-size: 0.8125rem;
        }

        .load-more-container {
          margin-top: 2rem;
          display: flex;
          justify-content: center;
        }

        .load-more-btn {
          min-width: 220px;
          justify-content: center;
        }

        .channel-toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 0.625rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          z-index: 100;
          animation: toastIn 0.25s ease;
        }

        .channel-loading-box,
        .channel-error-box {
          text-align: center;
          padding: 6rem 1rem;
        }

        @keyframes toastIn {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
          .channel-header-card {
            display: flex !important;
            flex-direction: row !important;
            align-items: flex-start !important;
            text-align: left !important;
            flex-wrap: wrap !important;
            gap: 1rem !important;
            padding: 1.125rem !important;
          }

          .channel-avatar-wrap {
            width: 72px !important;
            height: 72px !important;
            min-width: 72px !important;
          }

          .channel-details {
            flex: 1 1 calc(100% - 90px) !important;
            min-width: 0 !important;
            text-align: left !important;
          }

          .channel-title-row {
            display: flex !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.15rem !important;
            margin-bottom: 0.35rem !important;
          }

          .channel-name {
            font-size: 1.2rem !important;
            word-break: break-word !important;
          }

          .channel-handle {
            font-size: 0.8125rem !important;
          }

          .channel-stats-row {
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: flex-start !important;
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            scrollbar-width: none !important;
            -webkit-overflow-scrolling: touch !important;
            gap: 0.35rem !important;
            margin-bottom: 0.5rem !important;
            width: 100% !important;
          }

          .channel-stats-row::-webkit-scrollbar {
            display: none !important;
          }

          .stat-pill {
            font-size: 0.75rem !important;
            padding: 2px 7px !important;
            flex-shrink: 0 !important;
            white-space: nowrap !important;
          }

          .channel-desc {
            -webkit-line-clamp: 2 !important;
            font-size: 0.8125rem !important;
          }

          .channel-actions {
            width: 100% !important;
            display: flex !important;
            align-items: center !important;
            gap: 0.5rem !important;
            margin-top: 0.5rem !important;
          }

          .channel-actions .btn {
            flex: 1 !important;
            justify-content: center !important;
          }

          .channel-banner-container {
            height: 150px !important;
          }
        }
      `}</style>
    </div>
  );
}
