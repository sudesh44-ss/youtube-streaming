"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
  Eye,
  Loader2,
} from "lucide-react";
import { useInAppBack } from "@/lib/useInAppBack";
import { NormalizedContentItem } from "@/lib/types";

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
  const handleBack = useInAppBack("/dashboard");

  const [channel, setChannel] = useState<ChannelDetails | null>(null);
  const [uploads, setUploads] = useState<NormalizedContentItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscription state
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subToast, setSubToast] = useState<string | null>(null);

  const fetchChannelData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/content/channel?id=${encodeURIComponent(channelId)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load channel");
      }
      const data = await res.json();
      setChannel(data.channel);
      setIsSubscribed(Boolean(data.channel?.isSubscribed));
      setUploads(data.uploads || []);
      setNextPageToken(data.nextPageToken);
    } catch (err: any) {
      setError(err.message || "Failed to load creator channel");
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    fetchChannelData();
  }, [fetchChannelData]);

  // Load more 10 videos per request
  const handleLoadMore = async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/content/channel?id=${encodeURIComponent(channelId)}&pageToken=${encodeURIComponent(nextPageToken)}`
      );
      if (res.ok) {
        const data = await res.json();
        setUploads((prev) => [...prev, ...(data.uploads || [])]);
        setNextPageToken(data.nextPageToken);
      }
    } catch {
      // Graceful error
    } finally {
      setLoadingMore(false);
    }
  };

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
          // Alert user to connect YouTube in Settings
          alert("To subscribe to YouTube creators directly, please connect your YouTube account in Settings.");
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
              <p className="channel-desc">{channel.description}</p>
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
            <h2 className="uploads-title">Channel Uploads</h2>
            <span className="uploads-count-badge">{uploads.length} videos displayed</span>
          </div>

          {uploads.length === 0 ? (
            <div className="uploads-empty">
              <p style={{ color: "var(--text-muted)" }}>No public uploads found for this channel.</p>
            </div>
          ) : (
            <div className="channel-videos-grid">
              {uploads.map((video) => {
                const vidId = video.providerId || video.id?.replace(/^youtube:/, "");
                return (
                  <Link
                    key={video.id}
                    href={`/watch/${vidId}`}
                    className="channel-video-card"
                  >
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

                    <div className="video-card-meta">
                      <h3 className="video-card-title" title={video.title}>
                        {video.title}
                      </h3>
                      <div className="video-sub-meta">
                        {video.publicationDate && (
                          <span>{new Date(video.publicationDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Load More Button (10 videos per batch) */}
          {nextPageToken && (
            <div className="load-more-container">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="btn btn-outline load-more-btn"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Loading next 10 videos...</span>
                  </>
                ) : (
                  <span>Load More (10 Videos)</span>
                )}
              </button>
            </div>
          )}
        </section>
      </div>

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
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
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
          margin-bottom: 1.25rem;
        }

        .uploads-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }

        .uploads-count-badge {
          font-size: 0.75rem;
          color: var(--text-dim);
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
        }

        .video-sub-meta {
          margin-top: 0.375rem;
          font-size: 0.6875rem;
          color: var(--text-dim);
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
            flex-direction: column;
            align-items: center;
            text-align: center;
          }
          .channel-stats-row {
            justify-content: center;
          }
          .channel-banner-container {
            height: 160px;
          }
        }
      `}</style>
    </div>
  );
}
