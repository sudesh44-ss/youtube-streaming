"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Play, Sparkles } from "lucide-react";
import { NormalizedContentItem } from "@/lib/types";

interface RelatedVideosFeedProps {
  currentVideoId: string;
  title: string;
  category?: string;
}

export function RelatedVideosFeed({ currentVideoId, title, category }: RelatedVideosFeedProps) {
  const [items, setItems] = useState<NormalizedContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Extract clean keywords from the video title
  const searchQuery = useMemo(() => {
    if (!title) return category || "trending";
    const clean = title
      .replace(/[|#@\-_:()\[\]]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !["the", "and", "for", "with", "this", "that", "from", "video", "official"].includes(w.toLowerCase()))
      .slice(0, 4)
      .join(" ");
    return clean || category || "recommended";
  }, [title, category]);

  useEffect(() => {
    let active = true;
    const fetchRelated = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/content/search?q=${encodeURIComponent(searchQuery)}&limit=36`);
        if (!res.ok) return;
        const data = await res.json();
        if (active && Array.isArray(data.items)) {
          // Exclude currently playing video
          const filtered = data.items.filter(
            (item: NormalizedContentItem) => item.providerId !== currentVideoId && !item.id?.includes(currentVideoId)
          );
          setItems(filtered.slice(0, 30));
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchRelated();
    return () => {
      active = false;
    };
  }, [currentVideoId, searchQuery]);

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
                  <p className="related-channel-name">{video.creator || "Creator"}</p>
                  <div className="related-meta-row">
                    {video.views && <span>{video.views}</span>}
                    {video.publicationDate && (
                      <>
                        <span className="related-dot">•</span>
                        <span>{new Date(video.publicationDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                      </>
                    )}
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
          border-top: 1px solid var(--border-color);
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

        .related-channel-name {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .related-meta-row {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.6875rem;
          color: var(--text-dim);
        }

        .related-dot {
          color: var(--text-dim);
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
