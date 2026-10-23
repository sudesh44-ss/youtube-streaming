"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NormalizedContentItem } from "@/lib/types";
import { ContentCard } from "@/components/ContentCard";
import { ApiKeyRequirement } from "@/components/ApiKeyRequirement";
import { RefreshCw, AlertCircle, ArrowLeft, Video } from "lucide-react";

interface CategoryMeta {
  title: string;
  icon: string;
  description: string;
}

const CATEGORY_MAP: Record<string, CategoryMeta> = {
  trending: {
    title: "Trending on YouTube",
    icon: "🔥",
    description: "Browse what is popular and trending across YouTube right now.",
  },
  music: {
    title: "Music & Live Performances",
    icon: "🎵",
    description: "Discover official music videos, live concerts, studio sessions, and premiere tracks.",
  },
  gaming: {
    title: "Gaming & Highlights",
    icon: "🎮",
    description: "Explore gameplay walkthroughs, esports matches, trailers, and gaming community highlights.",
  },
  study: {
    title: "Study & Lectures",
    icon: "📚",
    description: "Watch educational tutorials, university lectures, deep-dive courses, and skill-building guides.",
  },
};

export default function DiscoverCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const router = useRouter();
  const { category: rawCategory } = use(params);
  const categoryKey = (rawCategory || "trending").toLowerCase();
  const meta = CATEGORY_MAP[categoryKey] || {
    title: "Category Discovery",
    icon: "✨",
    description: "Discover curated videos for this category.",
  };

  const [items, setItems] = useState<NormalizedContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [requiresApiKey, setRequiresApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategoryVideos = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/content/category?category=${encodeURIComponent(categoryKey)}${refresh ? "&refresh=true" : ""}`
        );
        const data = await res.json();

        if (data.requiresApiKey) {
          setRequiresApiKey(true);
          setItems([]);
          return;
        }

        setRequiresApiKey(false);

        if (!res.ok) {
          setError(data.error || "Failed to load category videos.");
        } else {
          setItems(Array.isArray(data.items) ? data.items : []);
          setNextPageToken(data.nextPageToken || undefined);
        }
      } catch {
        setError("Network error while connecting to YouTube service.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [categoryKey]
  );

  useEffect(() => {
    fetchCategoryVideos();
  }, [fetchCategoryVideos]);

  const handleLoadMore = async () => {
    if (loadingMore || !nextPageToken) return;
    setLoadingMore(true);

    try {
      const res = await fetch(
        `/api/content/category?category=${encodeURIComponent(categoryKey)}&pageToken=${encodeURIComponent(nextPageToken)}`
      );
      const data = await res.json();
      if (res.ok && Array.isArray(data.items)) {
        setItems((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          const nextBatch = data.items.filter((it: NormalizedContentItem) => !seen.has(it.id));
          return [...prev, ...nextBatch];
        });
        setNextPageToken(data.nextPageToken || undefined);
      }
    } catch {
      // fail-safe
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSelectVideo = (video: NormalizedContentItem) => {
    if (video.provider === "youtube" && video.providerId) {
      const q = new URLSearchParams();
      if (video.title) q.set("title", video.title);
      router.push(`/watch/${encodeURIComponent(video.providerId)}?${q.toString()}`);
    }
  };

  return (
    <div className="container" style={{ padding: "2.5rem 1.25rem 5rem" }}>
      {/* Navigation Header */}
      <div style={{ marginBottom: "2rem" }}>
        <Link
          href="/dashboard"
          className="btn btn-outline btn-sm"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", marginBottom: "1rem" }}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </Link>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
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
              <span>{meta.icon}</span>
              <span>{meta.title}</span>
            </h1>
            <p style={{ color: "var(--text-muted)", marginTop: "0.375rem", fontSize: "0.9375rem" }}>
              {meta.description}
            </p>
          </div>

          {!requiresApiKey && (
            <button
              type="button"
              onClick={() => fetchCategoryVideos(true)}
              disabled={refreshing || loading}
              className="btn btn-outline btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
              title="Refresh category videos"
            >
              <RefreshCw size={14} className={refreshing ? "spin" : ""} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* API Key Missing State */}
      {requiresApiKey && <ApiKeyRequirement />}

      {/* Error Notice */}
      {!requiresApiKey && error && (
        <div
          style={{
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "rgba(244, 63, 94, 0.15)",
            border: "1px solid rgba(244, 63, 94, 0.35)",
            color: "var(--accent-rose)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={() => fetchCategoryVideos(true)} className="btn btn-outline btn-sm">
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {!requiresApiKey && loading && (
        <div className="search-results-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div className="skeleton" style={{ width: "100%", paddingTop: "56.25%", borderRadius: "10px" }} />
              <div className="skeleton" style={{ height: "18px", width: "85%", marginTop: "0.5rem" }} />
              <div className="skeleton" style={{ height: "14px", width: "55%" }} />
            </div>
          ))}
        </div>
      )}

      {/* Video Results Grid */}
      {!requiresApiKey && !loading && items.length > 0 && (
        <div>
          <div className="search-results-grid">
            {items.map((video) => (
              <ContentCard key={video.id} item={video} onSelect={handleSelectVideo} />
            ))}
          </div>

          {/* Load More Button */}
          {nextPageToken && (
            <div style={{ textAlign: "center", marginTop: "3rem" }}>
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="btn btn-outline"
                style={{
                  minWidth: "200px",
                  padding: "0.625rem 1.75rem",
                  fontWeight: 600,
                  borderRadius: "var(--radius-full)",
                }}
              >
                {loadingMore ? (
                  <>
                    <RefreshCw size={14} className="spin" style={{ marginRight: "0.5rem" }} />
                    <span>Loading More...</span>
                  </>
                ) : (
                  <span>Load More Videos</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!requiresApiKey && !loading && items.length === 0 && !error && (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "4rem 2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "var(--bg-surface-elevated)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-dim)",
            }}
          >
            <Video size={28} />
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>No Videos Found</h3>
          <p style={{ color: "var(--text-muted)", maxWidth: "440px", fontSize: "0.9375rem" }}>
            Currently no videos are available for this category. Check your connection or refresh to try again.
          </p>
          <button onClick={() => fetchCategoryVideos(true)} className="btn btn-outline btn-sm">
            Refresh Category
          </button>
        </div>
      )}

      <style jsx>{`
        .search-results-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.75rem 1.25rem;
          width: 100%;
        }

        @media (min-width: 1024px) {
          .search-results-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .search-results-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1.25rem 1rem !important;
          }
        }
        @media (max-width: 639px) {
          .search-results-grid {
            grid-template-columns: 1fr !important;
            gap: 1.25rem !important;
          }
        }
      `}</style>
    </div>
  );
}
