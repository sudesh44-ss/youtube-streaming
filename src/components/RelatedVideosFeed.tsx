"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, Sparkles } from "lucide-react";
import { NormalizedContentItem } from "@/lib/types";
import { formatUploadAge, formatViewCount } from "@/lib/format-utils";

interface RelatedVideosFeedProps {
  currentVideoId: string;
  title: string;
  category?: string;
}

export function RelatedVideosFeed({ currentVideoId, title, category }: RelatedVideosFeedProps) {
  const router = useRouter();
  const [items, setItems] = useState<NormalizedContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extract clean keywords from the video title
  const searchQuery = useMemo(() => {
    if (!title) return category || "";
    const clean = title
      .replace(/[|#@\-_:()\[\]]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !["the", "and", "for", "with", "this", "that", "from", "video", "official"].includes(w.toLowerCase()))
      .slice(0, 4)
      .join(" ");
    return clean || category || "";
  }, [title, category]);

  const fetchRelated = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    setItems([]);
    if (!searchQuery) {
      setLoading(false);
      return;
    }
    try {
      const collected: NormalizedContentItem[] = [];
      const seen = new Set<string>([currentVideoId]);
      let pageToken: string | undefined;

      // The search endpoint caps each page at 20. Two pages fill the 40-card limit.
      for (let page = 0; page < 2 && collected.length < 40; page += 1) {
        const params = new URLSearchParams({ q: searchQuery, limit: "20" });
        if (pageToken) params.set("pageToken", pageToken);
        const res = await fetch(`/api/content/search?${params.toString()}`, { signal });
        if (!res.ok) throw new Error("Could not load related videos.");
        const data = await res.json();
        if (!Array.isArray(data.items)) throw new Error("Related videos were unavailable.");

        for (const item of data.items as NormalizedContentItem[]) {
          const id = item.providerId || item.id?.replace(/^youtube:/, "");
          if (!id || seen.has(id)) continue;
          seen.add(id);
          collected.push(item);
          if (collected.length === 40) break;
        }
        if (!signal?.aborted) setItems([...collected]);
        pageToken = data.nextPageToken || undefined;
        if (!pageToken) break;
      }

      if (!signal?.aborted) setItems(collected);
    } catch (err) {
      if (!signal?.aborted) setError(err instanceof Error ? err.message : "Could not load related videos.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [currentVideoId, searchQuery]);

  useEffect(() => {
    const controller = new AbortController();
    fetchRelated(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchRelated]);

  return (
    <section className="related-videos-section" aria-label="Related Videos">
      <div className="related-header">
        <Sparkles size={18} style={{ color: "var(--primary)" }} />
        <h2 className="related-title">Related Recommendations</h2>
      </div>

      {loading && (
        <div className="related-skeleton-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="related-skeleton-card">
              <div className="skeleton-thumb" />
              <div className="skeleton-title" />
              <div className="skeleton-meta" />
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="related-state" role="status">
          <span>{error}</span>
          <button type="button" onClick={() => fetchRelated()}>Retry</button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="related-empty">No related videos were found.</p>
      )}

      {!loading && items.length > 0 && (
        <div className="related-grid">
          {items.map((video) => {
            const vidId = video.providerId || video.id?.replace(/^youtube:/, "");
            return (
              <Link
                key={video.id}
                href={`/watch/${vidId}`}
                className="related-video-card"
              >
                <div className="related-thumb-wrap">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="related-thumb-img"
                    loading="lazy"
                  />
                  <div className="related-thumb-scrim">
                    <div className="related-play-pill">
                      <Play size={14} fill="#ffffff" color="#ffffff" style={{ marginLeft: "2px" }} />
                    </div>
                  </div>
                  {video.duration && <span className="related-duration">{video.duration}</span>}
                </div>

                <div className="related-card-info">
                  <h3 className="related-video-title" title={video.title}>
                    {video.title}
                  </h3>

                  {/* Creator metadata row on the same line: [Avatar] Creator · views · upload age */}
                  <div className="related-meta-line">
                    {video.creator && (
                    <div
                      className={`related-creator-group ${video.channelId ? "clickable" : "non-clickable"}`}
                      onClick={(e) => {
                        if (video.channelId) {
                          e.preventDefault();
                          e.stopPropagation();
                          router.push(`/channel/${encodeURIComponent(video.channelId)}`);
                        }
                      }}
                      title={video.channelId ? `View ${video.creator}'s channel` : undefined}
                    >
                      <div className="related-avatar-wrap">
                        {video.channelAvatar ? (
                          <img
                            src={video.channelAvatar}
                            alt={video.creator}
                            className="related-avatar-img"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                              const fb = (e.target as HTMLElement).parentElement?.querySelector(".related-avatar-fallback") as HTMLElement;
                              if (fb) fb.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className="related-avatar-fallback"
                          style={{ display: video.channelAvatar ? "none" : "flex" }}
                        >
                          {video.creator.charAt(0).toUpperCase()}
                        </div>
                      </div>

                      <span className="related-channel-name">
                        {video.creator}
                      </span>
                    </div>
                    )}

                    {(() => {
                      const formattedViews = formatViewCount(video.views);
                      const uploadAge = formatUploadAge(video.publicationDate);
                      return (
                        <>
                          {video.creator && (formattedViews || uploadAge) && <span className="related-dot">·</span>}
                          {formattedViews && <span>{formattedViews}</span>}
                          {formattedViews && uploadAge && <span className="related-dot">·</span>}
                          {uploadAge && <span>{uploadAge}</span>}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .related-videos-section {
          margin-top: 2.5rem;
          padding-top: 1.5rem;
          border-top: none;
        }

        .related-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
        }

        .related-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }

        .related-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.25rem;
        }

        .related-video-card {
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

        .related-video-card:hover {
          transform: translateY(-3px);
          border-color: var(--primary);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        }

        .related-thumb-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          background: var(--bg-subtle, #2a2b2e);
          overflow: hidden;
        }

        .related-thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .related-video-card:hover .related-thumb-img {
          transform: scale(1.05);
        }

        .related-thumb-scrim {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          opacity: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s ease;
        }

        .related-video-card:hover .related-thumb-scrim {
          opacity: 1;
        }

        .related-play-pill {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 10px rgba(56, 189, 248, 0.4);
        }

        .related-duration {
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

        .related-card-info {
          padding: 0.75rem 0.875rem 0.875rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .related-video-title {
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

        .related-meta-line {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.35rem 0.45rem;
          font-size: 0.75rem;
          color: var(--text-dim);
          line-height: 1.3;
          margin-top: 0.15rem;
          min-width: 0;
        }

        .related-creator-group {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          color: var(--text-muted);
        }

        .related-creator-group.clickable {
          cursor: pointer;
        }

        .related-creator-group.clickable:hover .related-channel-name {
          color: var(--primary);
          text-decoration: underline;
        }

        .related-creator-group.non-clickable {
          cursor: default;
        }

        .related-avatar-wrap {
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

        .related-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        .related-avatar-fallback {
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

        .related-channel-name {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 130px;
          transition: color 0.15s ease;
        }

        .related-dot {
          color: var(--text-dim);
        }

        .related-state,
        .related-empty {
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .related-state {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .related-state button {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background: var(--bg-surface);
          color: var(--text-main);
          padding: 0.35rem 0.65rem;
          cursor: pointer;
        }

        /* Skeleton loader */
        .related-skeleton-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.25rem;
        }

        .related-skeleton-card {
          border-radius: var(--radius-md);
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .skeleton-thumb {
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: 6px;
          background: var(--bg-subtle);
          animation: pulse 1.5s ease-in-out infinite;
        }

        .skeleton-title {
          height: 14px;
          width: 85%;
          border-radius: 4px;
          background: var(--bg-subtle);
          animation: pulse 1.5s ease-in-out infinite;
        }

        .skeleton-meta {
          height: 10px;
          width: 45%;
          border-radius: 4px;
          background: var(--bg-subtle);
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.25; }
        }

        @media (max-width: 640px) {
          .related-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
}
