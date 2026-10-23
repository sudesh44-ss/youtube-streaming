"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NormalizedContentItem, CATEGORIES } from "@/lib/types";
import { ContentCard } from "@/components/ContentCard";
import { ContentModal } from "@/components/ContentModal";
import {
  Bookmark,
  Clock,
  ArrowLeft,
  RefreshCw,
  Compass,
  Info,
  Trash2,
} from "lucide-react";
import {
  getLocalWatchlist,
  getLocalWatchLater,
  removeFromLocalWatchlist,
  removeFromLocalWatchLater,
  isInLocalWatchlist,
  isInLocalWatchLater,
  SavedMediaItem,
  STORAGE_CHANGE_EVENT,
} from "@/lib/local-storage";

export default function SavedContentPage() {
  const router = useRouter();

  // Tab: Watchlist or Watch Later
  const [activeTab, setActiveTab] = useState<"watchlist" | "watch_later">("watchlist");

  // Client-side hydration safety
  const [mounted, setMounted] = useState(false);

  // Local storage lists
  const [localWatchlist, setLocalWatchlist] = useState<SavedMediaItem[]>([]);
  const [localWatchLater, setLocalWatchLater] = useState<SavedMediaItem[]>([]);

  // Backend saved items (for authenticated users)
  const [backendItems, setBackendItems] = useState<NormalizedContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Category filter chip
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Active Playback Modal fallback
  const [activeItem, setActiveItem] = useState<NormalizedContentItem | null>(null);

  // Read local storage on client mount
  const syncLocalData = () => {
    setLocalWatchlist(getLocalWatchlist());
    setLocalWatchLater(getLocalWatchLater());
  };

  useEffect(() => {
    setMounted(true);
    syncLocalData();

    const handleStorageChange = () => syncLocalData();
    window.addEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
  }, []);

  // Fetch optional backend saved items
  const fetchBackendSaved = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content/saved");
      if (res.ok) {
        const data = await res.json();
        setBackendItems(Array.isArray(data.items) ? data.items : []);
      }
    } catch {
      // Backend saved fails gracefully; local storage remains intact
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackendSaved();
  }, []);

  // Merge Watchlist: combines local watchlist items + backend saved items, deduplicating by ID
  const watchlistItems: NormalizedContentItem[] = useMemo(() => {
    if (!mounted) return [];
    const seen = new Set<string>();
    const merged: NormalizedContentItem[] = [];

    // Local Watchlist items first
    for (const item of localWatchlist) {
      if (!seen.has(item.videoId)) {
        seen.add(item.videoId);
        merged.push({
          id: `youtube:${item.videoId}`,
          provider: "youtube",
          providerId: item.videoId,
          contentType: "video",
          title: item.title,
          description: "",
          thumbnail: item.thumbnailUrl,
          category: item.category || "general",
          creator: item.channelTitle || "YouTube Creator",
          externalUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
          playbackMethod: "iframe_embed",
          embedUrl: `https://www.youtube.com/embed/${item.videoId}`,
          providerAttribution: "YouTube",
          availabilityStatus: "available",
          duration: item.duration,
          views: item.views,
          saved: true,
        });
      }
    }

    // Backend saved items
    for (const bItem of backendItems) {
      const vId = bItem.providerId || bItem.id.replace("youtube:", "");
      if (!seen.has(vId)) {
        seen.add(vId);
        merged.push({
          ...bItem,
          saved: true,
        });
      }
    }

    return merged;
  }, [mounted, localWatchlist, backendItems]);

  // Watch Later items
  const watchLaterItems: NormalizedContentItem[] = useMemo(() => {
    if (!mounted) return [];
    return localWatchLater.map((item) => ({
      id: `youtube:${item.videoId}`,
      provider: "youtube",
      providerId: item.videoId,
      contentType: "video",
      title: item.title,
      description: "",
      thumbnail: item.thumbnailUrl,
      category: item.category || "general",
      creator: item.channelTitle || "YouTube Creator",
      externalUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
      playbackMethod: "iframe_embed",
      embedUrl: `https://www.youtube.com/embed/${item.videoId}`,
      providerAttribution: "YouTube",
      availabilityStatus: "available",
      duration: item.duration,
      views: item.views,
      saved: true,
    }));
  }, [mounted, localWatchLater]);

  // Current active display items based on selected tab
  const activeItems = activeTab === "watchlist" ? watchlistItems : watchLaterItems;

  const filteredItems = useMemo(() => {
    if (selectedCategory === "All") return activeItems;
    return activeItems.filter(
      (item) => item.category?.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [activeItems, selectedCategory]);

  const handleRemoveItem = (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTab === "watchlist") {
      removeFromLocalWatchlist(videoId);
      fetch(`/api/content/saved?provider=youtube&contentId=${videoId}`, { method: "DELETE" }).catch(() => {});
      setBackendItems((prev) => prev.filter((i) => (i.providerId || i.id) !== videoId));
    } else {
      removeFromLocalWatchLater(videoId);
    }
  };

  const handleSelectItem = (item: NormalizedContentItem) => {
    if (item.provider === "youtube" && item.providerId) {
      router.push(`/watch/${encodeURIComponent(item.providerId)}?title=${encodeURIComponent(item.title)}`);
      return;
    }
    setActiveItem(item);
  };

  return (
    <div className="container" style={{ padding: "2.5rem 1.25rem 5rem" }}>
      {/* Header & Back Button */}
      <div style={{ marginBottom: "2rem" }}>
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            fontSize: "0.875rem",
            color: "var(--primary)",
            marginBottom: "0.75rem",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              backgroundColor: activeTab === "watchlist" ? "rgba(245, 158, 11, 0.15)" : "rgba(56, 189, 248, 0.15)",
              color: activeTab === "watchlist" ? "var(--accent-amber)" : "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {activeTab === "watchlist" ? <Bookmark size={22} /> : <Clock size={22} />}
          </div>
          <div>
            <h1 style={{ fontSize: "1.875rem", fontWeight: 800, margin: 0 }}>
              {activeTab === "watchlist" ? "Saved Watchlist" : "Watch Later"}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: "0.2rem 0 0" }}>
              {activeTab === "watchlist"
                ? `Quick access to your bookmarked lectures, tracks, movies, and tutorials (${watchlistItems.length} items)`
                : `Videos queued for later viewing (${watchLaterItems.length} items)`}
            </p>
          </div>
        </div>
      </div>

      {/* Local Storage Information Notice */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.75rem 1rem",
          borderRadius: "var(--radius-md)",
          backgroundColor: "var(--bg-surface-elevated)",
          border: "1px solid var(--border-color)",
          fontSize: "0.8125rem",
          color: "var(--text-muted)",
          marginBottom: "1.5rem",
        }}
      >
        <Info size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
        <span>
          <strong>Local Storage Notice:</strong> Your saved items are stored securely in your browser&apos;s local storage.
          Clearing browser data or switching devices will not sync local items.
        </span>
      </div>

      {/* Tabs: Watchlist vs Watch Later */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          borderBottom: "1px solid var(--border-color)",
          paddingBottom: "0.75rem",
          marginBottom: "1.5rem",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveTab("watchlist");
            setSelectedCategory("All");
          }}
          className={`btn btn-sm ${activeTab === "watchlist" ? "btn-primary" : "btn-outline"}`}
          style={{ borderRadius: "var(--radius-full)", display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
        >
          <Bookmark size={15} />
          <span>Watchlist ({mounted ? watchlistItems.length : "..."})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("watch_later");
            setSelectedCategory("All");
          }}
          className={`btn btn-sm ${activeTab === "watch_later" ? "btn-primary" : "btn-outline"}`}
          style={{ borderRadius: "var(--radius-full)", display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
        >
          <Clock size={15} />
          <span>Watch Later ({mounted ? watchLaterItems.length : "..."})</span>
        </button>
      </div>

      {/* Category Filter Chips */}
      {mounted && activeItems.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            overflowX: "auto",
            paddingBottom: "0.75rem",
            marginBottom: "1.5rem",
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedCategory("All")}
            className={`chip ${selectedCategory === "All" ? "chip-active" : ""}`}
          >
            All Categories ({activeItems.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = activeItems.filter((i) => i.category?.toLowerCase() === cat.id.toLowerCase()).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`chip ${selectedCategory === cat.id ? "chip-active" : ""}`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Loading Skeleton */}
      {!mounted && loading && (
        <div style={{ textAlign: "center", padding: "4rem 0" }}>
          <RefreshCw size={28} className="spin" style={{ color: "var(--primary)", margin: "0 auto 1rem" }} />
          <p style={{ color: "var(--text-muted)" }}>Loading your saved library...</p>
        </div>
      )}

      {/* Content Grid */}
      {mounted && filteredItems.length > 0 && (
        <div className="saved-cards-grid">
          {filteredItems.map((item) => {
            const videoId = item.providerId || item.id.replace("youtube:", "");
            const inBoth = isInLocalWatchlist(videoId) && isInLocalWatchLater(videoId);

            return (
              <div key={item.id} style={{ position: "relative" }} className="saved-card-container">
                <ContentCard
                  item={item}
                  onSelect={handleSelectItem}
                />

                {/* Remove button and Dual-List Badges */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "0.375rem",
                    padding: "0 0.25rem",
                  }}
                >
                  <div style={{ display: "flex", gap: "0.375rem" }}>
                    {inBoth && (
                      <span
                        className="badge"
                        style={{
                          fontSize: "0.6875rem",
                          backgroundColor: "rgba(56, 189, 248, 0.12)",
                          color: "var(--primary)",
                        }}
                      >
                        In Both Lists
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => handleRemoveItem(videoId, e)}
                    className="btn btn-outline btn-sm"
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "var(--text-dim)",
                      fontSize: "0.75rem",
                      padding: "0.2rem 0.4rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      cursor: "pointer",
                    }}
                    title={`Remove from ${activeTab === "watchlist" ? "Watchlist" : "Watch Later"}`}
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {mounted && filteredItems.length === 0 && (
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
              color: activeTab === "watchlist" ? "var(--accent-amber)" : "var(--primary)",
            }}
          >
            {activeTab === "watchlist" ? <Bookmark size={28} /> : <Clock size={28} />}
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
            {activeTab === "watchlist" ? "Your Watchlist is Empty" : "Your Watch Later List is Empty"}
          </h3>
          <p style={{ color: "var(--text-muted)", maxWidth: "450px", fontSize: "0.9375rem" }}>
            {activeTab === "watchlist"
              ? "Click the three-dot menu on any video card or on the watch page to add videos to your personal watchlist."
              : "Queue videos to watch at your convenience by selecting 'Watch Later' from the video actions menu."}
          </p>
          <Link href="/dashboard" className="btn btn-primary btn-sm">
            <Compass size={15} /> Explore Content
          </Link>
        </div>
      )}

      {/* Content Modal (fallback if non-YouTube provider items exist) */}
      <ContentModal
        item={activeItem}
        onClose={() => setActiveItem(null)}
      />

      <style jsx>{`
        .saved-cards-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.75rem 1.25rem;
          width: 100%;
        }

        @media (min-width: 1024px) {
          .saved-cards-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .saved-cards-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1.25rem 1rem !important;
          }
        }
        @media (max-width: 639px) {
          .saved-cards-grid {
            grid-template-columns: 1fr !important;
            gap: 1.25rem !important;
          }
        }

        .chip {
          padding: 0.35rem 0.85rem;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-color);
          background-color: var(--bg-surface-elevated);
          color: var(--text-muted);
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .chip:hover {
          color: var(--text-main);
          border-color: var(--primary);
        }

        .chip-active {
          background-color: var(--primary);
          border-color: var(--primary);
          color: #ffffff !important;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
