"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { NormalizedContentItem, BrowsingMode, CATEGORIES, YouTubeChannelItem } from "@/lib/types";
import { ModeSelector } from "@/components/ModeSelector";
import { CategoryBar } from "@/components/CategoryBar";
import { SearchBar } from "@/components/SearchBar";
import { ContentCard } from "@/components/ContentCard";
import { ChannelCard } from "@/components/ChannelCard";
import { ContentModal } from "@/components/ContentModal";
import { FeaturedBanner } from "@/components/FeaturedBanner";
import { StreamingVideoRow } from "@/components/StreamingVideoRow";
import { SlidersHorizontal, RefreshCw, AlertCircle, Compass, Bookmark, Users, Video } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();

  // Authentication & session state
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Discovery Controls
  const [mode, setMode] = useState<BrowsingMode>("normal");
  const [videoType, setVideoType] = useState<"all" | "shorts" | "videos">("all");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [sortBy, setSortBy] = useState<"relevance" | "date" | "title">("relevance");

  // Content Data
  const [items, setItems] = useState<NormalizedContentItem[]>([]);
  const [continueWatchingItems, setContinueWatchingItems] = useState<NormalizedContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination for search results
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);

  // Channel Search Results & active tab
  const [channelResults, setChannelResults] = useState<YouTubeChannelItem[]>([]);
  const [searchTab, setSearchTab] = useState<"videos" | "channels">("videos");

  // Dynamic Feed Data for Normal Streaming Discovery
  const [feedSections, setFeedSections] = useState<{
    trending: NormalizedContentItem[];
    recommended: NormalizedContentItem[];
    music: NormalizedContentItem[];
    gaming: NormalizedContentItem[];
    study: NormalizedContentItem[];
  }>({
    trending: [],
    recommended: [],
    music: [],
    gaming: [],
    study: [],
  });

  // Incremental feed recommendations loading
  const [feedBatch, setFeedBatch] = useState(1);
  const [moreRecommended, setMoreRecommended] = useState<NormalizedContentItem[]>([]);
  const [loadingMoreFeed, setLoadingMoreFeed] = useState(false);

  // Active Playback Modal
  const [activeItem, setActiveItem] = useState<NormalizedContentItem | null>(null);

  // Dedicated watch page navigation handler
  const handleSelectItem = (item: NormalizedContentItem) => {
    if (item.provider === "youtube" && item.providerId) {
      const params = new URLSearchParams();
      if (item.title) params.set("title", item.title);
      const q = params.toString();
      router.push(`/watch/${encodeURIComponent(item.providerId)}${q ? `?${q}` : ""}`);
      return;
    }
    setActiveItem(item);
  };

  // Request race-condition guard
  const requestIdRef = useRef(0);

  // Check authentication
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (!data.session?.user) {
          router.push("/auth/signin");
        } else {
          setUser(data.session.user);
          if (data.session.preferences?.defaultMode) {
            setMode(data.session.preferences.defaultMode);
          }
        }
      })
      .catch(() => router.push("/auth/signin"))
      .finally(() => setAuthLoading(false));
  }, [router]);

  // Load real watch progress for Continue Watching row
  const fetchWatchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/content/watch-progress");
      const data = await res.json();
      if (Array.isArray(data.history) && data.history.length > 0) {
        const mapped: NormalizedContentItem[] = data.history.map((h: any) => ({
          id: `youtube:${h.content_id}`,
          provider: "youtube",
          providerId: h.content_id,
          contentType: "video",
          title: h.title,
          description: "",
          thumbnail: h.thumbnail_url,
          category: "general",
          creator: h.channel_name || "YouTube Creator",
          externalUrl: `https://www.youtube.com/watch?v=${h.content_id}`,
          playbackMethod: "iframe_embed",
          embedUrl: `https://www.youtube.com/embed/${h.content_id}`,
          providerAttribution: "YouTube",
          availabilityStatus: "available",
          progressPercent: h.progress_percent,
          duration: h.duration_seconds
            ? `${Math.floor(h.duration_seconds / 60)}:${(h.duration_seconds % 60).toString().padStart(2, "0")}`
            : undefined,
        }));
        setContinueWatchingItems(mapped);
      }
    } catch {
      // Continue watching fails gracefully
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchWatchHistory();
    }
  }, [user, fetchWatchHistory]);

  // Fetch unified content based on mode, category, subcategory, search query, and videoType
  const fetchContent = useCallback(
    async (overrideQuery?: string, overrideVideoType?: "all" | "shorts" | "videos") => {
      const activeQuery = overrideQuery !== undefined ? overrideQuery : submittedQuery;
      const activeVideoType = overrideVideoType !== undefined ? overrideVideoType : videoType;
      const currentReqId = ++requestIdRef.current;

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (activeQuery.trim()) params.set("q", activeQuery.trim());
        if (selectedCategory) params.set("category", selectedCategory);
        if (selectedSubcategory) params.set("subcategory", selectedSubcategory);
        params.set("mode", mode);
        params.set("sortBy", sortBy);
        if (activeVideoType !== "all") params.set("videoType", activeVideoType);
        // Explicit 20-item cap for search results
        params.set("limit", activeQuery.trim() ? "20" : "24");

        const endpoint = activeQuery.trim()
          ? `/api/content/search?${params.toString()}`
          : `/api/content/recommendations?${params.toString()}`;

        const res = await fetch(endpoint);
        const data = await res.json();

        // Stale response guard: discard if a newer request was dispatched
        if (currentReqId !== requestIdRef.current) return;

        if (!res.ok) {
          if (res.status === 429) {
            setError("Rate limit or quota reached. Please wait a moment before trying again.");
          } else {
            setError(data.error || "Failed to load discovery items.");
          }
        } else {
          const rawItems = Array.isArray(data.items) ? data.items : [];
          // Deduplicate by item ID
          const seenIds = new Set<string>();
          const deduped: NormalizedContentItem[] = [];
          for (const item of rawItems) {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              deduped.push(item);
            }
          }
          // Strictly cap at 20 items for explicit search results
          setItems(activeQuery.trim() ? deduped.slice(0, 20) : deduped);
          setNextPageToken(activeQuery.trim() ? (data.nextPageToken || undefined) : undefined);
          if (activeQuery.trim() && Array.isArray(data.channels)) {
            setChannelResults(data.channels);
          } else if (!activeQuery.trim()) {
            setChannelResults([]);
          }
        }
      } catch {
        if (currentReqId === requestIdRef.current) {
          setError("Network error while communicating with discovery service.");
        }
      } finally {
        if (currentReqId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [mode, selectedCategory, selectedSubcategory, submittedQuery, videoType, sortBy]
  );

  // Subsequent search batch retrieval (Load More)
  const handleLoadMoreVideos = async () => {
    if (loadingMore || !nextPageToken || !submittedQuery.trim()) return;
    setLoadingMore(true);

    try {
      const params = new URLSearchParams();
      params.set("q", submittedQuery.trim());
      if (selectedCategory) params.set("category", selectedCategory);
      if (selectedSubcategory) params.set("subcategory", selectedSubcategory);
      params.set("mode", mode);
      params.set("sortBy", sortBy);
      if (videoType !== "all") params.set("videoType", videoType);
      params.set("limit", "20");
      params.set("pageToken", nextPageToken);

      const res = await fetch(`/api/content/search?${params.toString()}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.items)) {
        setItems((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          const nextBatch: NormalizedContentItem[] = [];
          for (const it of data.items) {
            if (!seen.has(it.id)) {
              seen.add(it.id);
              nextBatch.push(it);
            }
          }
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

  // Subsequent feed recommendations batch retrieval (Load More)
  const handleLoadMoreFeed = async () => {
    if (loadingMoreFeed) return;
    setLoadingMoreFeed(true);

    try {
      const nextBatch = feedBatch + 1;
      const res = await fetch(`/api/content/feed?batch=${nextBatch}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.items) && data.items.length > 0) {
        setMoreRecommended((prev) => {
          const seen = new Set([...items.map((i) => i.id), ...prev.map((i) => i.id)]);
          const nextBatchItems = data.items.filter((it: NormalizedContentItem) => !seen.has(it.id));
          return [...prev, ...nextBatchItems];
        });
        setFeedBatch(nextBatch);
      }
    } catch {
      // fail-safe
    } finally {
      setLoadingMoreFeed(false);
    }
  };

  // Dynamic Feed Fetcher for Streaming Discovery Rows
  const fetchFeed = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/content/feed${refresh ? "?refresh=true" : ""}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setFeedSections({
          trending: data.trending || [],
          recommended: data.recommended || [],
          music: data.music || [],
          gaming: data.gaming || [],
          study: data.study || [],
        });
        const combined = [
          ...(data.trending || []),
          ...(data.recommended || []),
          ...(data.music || []),
          ...(data.gaming || []),
          ...(data.study || []),
        ];
        setItems(combined);
      } else {
        fetchContent();
      }
    } catch {
      fetchContent();
    } finally {
      setLoading(false);
    }
  }, [fetchContent]);

  const activeCategoryDef = CATEGORIES.find((c) => c.id === selectedCategory);
  const isStreamingDefaultView = mode === "normal" && !submittedQuery.trim() && !selectedCategory;

  useEffect(() => {
    if (user) {
      if (isStreamingDefaultView) {
        fetchFeed();
      } else {
        fetchContent();
      }
    }
  }, [user, isStreamingDefaultView, fetchFeed, fetchContent]);

  // Smooth scroll handler when hash is present in URL
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };

    if (!loading && isStreamingDefaultView) {
      handleHash();
    }

    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [loading, isStreamingDefaultView]);

  // Handle Explicit Search Submission
  const handleSearchSubmit = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setSubmittedQuery(trimmed);
    setNextPageToken(undefined);
    setSearchTab("videos");
    fetchContent(trimmed, videoType);
  };

  // Handle Clear Search
  const handleClearSearch = () => {
    setSearchQuery("");
    setSubmittedQuery("");
    setChannelResults([]);
    setNextPageToken(undefined);
    setSearchTab("videos");
    fetchContent("", videoType);
  };

  // Handle Video Type Filter Change (Shorts / Videos)
  const handleVideoTypeChange = (newType: "all" | "shorts" | "videos") => {
    setVideoType(newType);
    fetchContent(submittedQuery, newType);
  };

  // Handle Mode Change
  const handleModeChange = (newMode: BrowsingMode) => {
    setMode(newMode);
    if (newMode === "category" && !selectedCategory) {
      setSelectedCategory("study");
    }
  };

  // Handle Category Change
  const handleCategoryChange = (catId: string | undefined) => {
    setSelectedCategory(catId);
    setSelectedSubcategory(undefined);
  };

  if (authLoading) {
    return (
      <div className="container" style={{ padding: "5rem 0", textAlign: "center" }}>
        <RefreshCw size={32} className="spin" style={{ color: "var(--primary)", margin: "0 auto 1rem" }} />
        <p style={{ color: "var(--text-muted)" }}>Authenticating session...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "2rem 1.25rem 5rem" }}>
      {/* Top Header Row with Mode Selector & Saved Watchlist Link */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "var(--text-main)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            {mode === "category" && activeCategoryDef
              ? `${activeCategoryDef.name} Discovery`
              : "Discover"}
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <ModeSelector
            mode={mode}
            onChange={handleModeChange}
            videoType={videoType}
            onVideoTypeChange={handleVideoTypeChange}
          />
        </div>
      </div>

      {/* Category Bar Navigation */}
      <CategoryBar
        selectedCategory={selectedCategory}
        selectedSubcategory={selectedSubcategory}
        onSelectCategory={handleCategoryChange}
        onSelectSubcategory={setSelectedSubcategory}
        isCategoryMode={mode === "category"}
      />

      {/* Search Omnibar */}
      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onSearch={handleSearchSubmit}
        categoryName={activeCategoryDef?.name}
        isCategoryMode={mode === "category"}
        loading={loading && Boolean(submittedQuery)}
      />

      {/* Filter and Sort Status Bar (Active during search or category mode) */}
      {(!isStreamingDefaultView || submittedQuery) && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            marginBottom: "1.5rem",
            fontSize: "0.8125rem",
            color: "var(--text-dim)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>Showing <strong>{items.length}</strong> {videoType === "shorts" ? "Shorts" : videoType === "videos" ? "Videos" : "items"}</span>
            {submittedQuery && (
              <span>for query: <em>&quot;{submittedQuery}&quot;</em></span>
            )}
            {videoType !== "all" && (
              <span className="badge badge-rose" style={{ textTransform: "capitalize" }}>{videoType}</span>
            )}
            {selectedSubcategory && (
              <span className="badge badge-cyan">{selectedSubcategory}</span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <SlidersHorizontal size={14} />
            <span>Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="select"
              style={{
                padding: "0.25rem 0.5rem",
                fontSize: "0.8125rem",
                borderRadius: "var(--radius-sm)",
                width: "auto",
              }}
            >
              <option value="relevance">Relevance</option>
              <option value="date">Publication Date</option>
              <option value="title">Title (A-Z)</option>
            </select>

            <button
              onClick={() => fetchContent()}
              className="btn btn-outline btn-sm"
              title="Refresh feed"
              style={{ padding: "0.3rem 0.5rem" }}
            >
              <RefreshCw size={13} className={loading ? "spin" : ""} />
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
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
          <button onClick={() => fetchContent()} className="btn btn-outline btn-sm">
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div>
          <div className="skeleton" style={{ width: "100%", height: "340px", borderRadius: "16px", marginBottom: "2rem" }} />
          <div className="search-results-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div className="skeleton" style={{ width: "100%", paddingTop: "56.25%", borderRadius: "10px" }} />
                <div className="skeleton" style={{ height: "18px", width: "85%", marginTop: "0.5rem" }} />
                <div className="skeleton" style={{ height: "14px", width: "55%" }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STREAMING DASHBOARD VIEW (Default Normal Browsing) */}
      {!loading && isStreamingDefaultView && items.length > 0 && (
        <div>
          {/* A. Featured Video Cinematic Banner */}
          <FeaturedBanner
            items={feedSections.trending.length > 0 ? feedSections.trending.slice(0, 5) : items.slice(0, 5)}
            onPlay={handleSelectItem}
          />

          {/* B. Trending on YouTube */}
          <StreamingVideoRow
            id="trending"
            title="Trending on YouTube"
            icon="🔥"
            items={feedSections.trending.length > 0 ? feedSections.trending : items.slice(0, 6)}
            onSelect={handleSelectItem}
            onViewAll={() => {
              handleClearSearch();
              handleSearchSubmit("trending");
            }}
          />

          {/* C. Continue Watching (Rendered only when real playback progress exists) */}
          {continueWatchingItems.length > 0 && (
            <StreamingVideoRow
              title="Continue Watching"
              icon="🕒"
              items={continueWatchingItems}
              onSelect={handleSelectItem}
              showProgress={true}
              onViewAll={() => router.push("/dashboard/saved")}
            />
          )}

          {/* D. Recommended for You */}
          <StreamingVideoRow
            id="recommended"
            title="Recommended for You"
            icon="✨"
            items={feedSections.recommended.length > 0 ? feedSections.recommended : items.slice(6, 12)}
            onSelect={handleSelectItem}
            onViewAll={() => {
              handleClearSearch();
              fetchFeed(true);
            }}
          />

          {/* E. YouTube Music & Audio Row */}
          {(feedSections.music.length > 0 || items.some((i) => i.category === "music")) && (
            <StreamingVideoRow
              id="music"
              title="Music & Live Performances"
              icon="🎵"
              items={
                feedSections.music.length > 0
                  ? feedSections.music
                  : items.filter((i) => i.category === "music").slice(0, 6)
              }
              onSelect={handleSelectItem}
              onViewAll={() => {
                setMode("category");
                handleCategoryChange("music");
              }}
            />
          )}

          {/* Gaming Row */}
          {(feedSections.gaming.length > 0 || items.some((i) => i.category === "gaming")) && (
            <StreamingVideoRow
              id="gaming"
              title="Gaming & Highlights"
              icon="🎮"
              items={
                feedSections.gaming.length > 0
                  ? feedSections.gaming
                  : items.filter((i) => i.category === "gaming").slice(0, 6)
              }
              onSelect={handleSelectItem}
              onViewAll={() => {
                setMode("category");
                handleCategoryChange("gaming");
              }}
            />
          )}

          {/* Study & Education Row */}
          {(feedSections.study.length > 0 || items.some((i) => i.category === "study")) && (
            <StreamingVideoRow
              id="study"
              title="Study & Lectures"
              icon="📚"
              items={
                feedSections.study.length > 0
                  ? feedSections.study
                  : items.filter((i) => i.category === "study").slice(0, 6)
              }
              onSelect={handleSelectItem}
              onViewAll={() => {
                setMode("category");
                handleCategoryChange("study");
              }}
            />
          )}

          {/* F. More Recommended Videos (Incremental Batch Loading) */}
          {moreRecommended.length > 0 && (
            <StreamingVideoRow
              id="more-recommended"
              title="More Recommended for You"
              icon="✨"
              items={moreRecommended}
              onSelect={handleSelectItem}
            />
          )}

          {/* Incremental Recommendation Batch Loading Trigger */}
          <div style={{ textAlign: "center", marginTop: "1rem", marginBottom: "3rem" }}>
            <button
              type="button"
              onClick={handleLoadMoreFeed}
              disabled={loadingMoreFeed}
              className="btn btn-outline"
              style={{
                minWidth: "240px",
                padding: "0.625rem 1.75rem",
                fontWeight: 600,
                borderRadius: "var(--radius-full)",
              }}
            >
              {loadingMoreFeed ? (
                <>
                  <RefreshCw size={14} className="spin" style={{ marginRight: "0.5rem" }} />
                  <span>Discovering More Videos...</span>
                </>
              ) : (
                <span>Load More Recommendations</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Search Result Tabs: Videos vs Channels */}
      {!loading && submittedQuery && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            marginBottom: "1.5rem",
            borderBottom: "1px solid var(--border-color)",
            paddingBottom: "0.75rem",
          }}
        >
          <button
            type="button"
            onClick={() => setSearchTab("videos")}
            className={`btn btn-sm ${searchTab === "videos" ? "btn-primary" : "btn-outline"}`}
            style={{ borderRadius: "var(--radius-full)", padding: "0.35rem 0.875rem" }}
          >
            <span>Videos</span>
            <span style={{ opacity: 0.85, fontSize: "0.75rem", marginLeft: "0.35rem" }}>
              ({items.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSearchTab("channels")}
            className={`btn btn-sm ${searchTab === "channels" ? "btn-primary" : "btn-outline"}`}
            style={{ borderRadius: "var(--radius-full)", padding: "0.35rem 0.875rem" }}
          >
            <span>Channels</span>
            <span style={{ opacity: 0.85, fontSize: "0.75rem", marginLeft: "0.35rem" }}>
              ({channelResults.length})
            </span>
          </button>
        </div>
      )}

      {/* CHANNELS TAB RESULTS */}
      {!loading && submittedQuery && searchTab === "channels" && (
        <div style={{ marginBottom: "3rem" }}>
          {channelResults.length > 0 ? (
            <div
              className="channels-results-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {channelResults.map((ch) => (
                <ChannelCard key={ch.id} channel={ch} />
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
              <p style={{ color: "var(--text-muted)", margin: 0 }}>
                No matching YouTube channels found for &quot;{submittedQuery}&quot;. Try searching with their display name or handle (e.g. @channel).
              </p>
            </div>
          )}
        </div>
      )}

      {/* SEARCH / CATEGORY MODE FILTERED RESULTS GRID (VIDEOS TAB) */}
      {!loading && !isStreamingDefaultView && searchTab === "videos" && items.length > 0 && (
        <div>
          <div className="search-results-grid">
            {items.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                onSelect={handleSelectItem}
              />
            ))}
          </div>

          {/* Load More Videos button using YouTube nextPageToken */}
          {nextPageToken && (
            <div style={{ textAlign: "center", marginTop: "2.5rem" }}>
              <button
                type="button"
                onClick={handleLoadMoreVideos}
                disabled={loadingMore}
                className="btn btn-outline"
                style={{
                  minWidth: "190px",
                  padding: "0.625rem 1.5rem",
                  fontWeight: 600,
                  borderRadius: "var(--radius-full)",
                }}
              >
                {loadingMore ? (
                  <>
                    <RefreshCw size={14} className="spin" style={{ marginRight: "0.5rem" }} />
                    <span>Loading Next 20 Videos...</span>
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
      {!loading && items.length === 0 && (!submittedQuery || searchTab === "videos") && !error && (
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
            <Compass size={28} />
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>No Discovery Results Found</h3>
          <p style={{ color: "var(--text-muted)", maxWidth: "480px", fontSize: "0.9375rem" }}>
            {mode === "category"
              ? "Category Mode is currently filtering strictly. Try selecting another subcategory, clearing your query, or switching to Normal Mode."
              : "We could not find items matching your search query. Try broadening your terms."}
          </p>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button
              onClick={() => {
                handleClearSearch();
                setSelectedSubcategory(undefined);
              }}
              className="btn btn-outline btn-sm"
            >
              Clear Search &amp; Subcategories
            </button>
            {mode === "category" && (
              <button
                onClick={() => setMode("normal")}
                className="btn btn-primary btn-sm"
              >
                Switch to Normal Mode
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content Playback / Detail Modal */}
      <ContentModal
        item={activeItem}
        onClose={() => {
          setActiveItem(null);
          // Refresh continue watching if a video was played
          fetchWatchHistory();
        }}
      />

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
