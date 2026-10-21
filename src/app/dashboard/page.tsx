"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { NormalizedContentItem, BrowsingMode, CATEGORIES } from "@/lib/types";
import { ModeSelector } from "@/components/ModeSelector";
import { CategoryBar } from "@/components/CategoryBar";
import { SearchBar } from "@/components/SearchBar";
import { ContentCard } from "@/components/ContentCard";
import { ContentModal } from "@/components/ContentModal";
import { SlidersHorizontal, RefreshCw, AlertCircle, Compass, Bookmark } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();

  // Authentication & session state
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Discovery Controls
  const [mode, setMode] = useState<BrowsingMode>("normal");
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortBy, setSortBy] = useState<"relevance" | "date" | "title">("relevance");

  // Content Data
  const [items, setItems] = useState<NormalizedContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Playback Modal
  const [activeItem, setActiveItem] = useState<NormalizedContentItem | null>(null);

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

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch unified content based on mode, category, subcategory, and search query
  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
      if (selectedCategory) params.set("category", selectedCategory);
      if (selectedSubcategory) params.set("subcategory", selectedSubcategory);
      params.set("mode", mode);
      params.set("sortBy", sortBy);
      params.set("limit", "24");

      const endpoint = debouncedQuery.trim()
        ? `/api/content/search?${params.toString()}`
        : `/api/content/recommendations?${params.toString()}`;

      const res = await fetch(endpoint);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load discovery items.");
      } else {
        setItems(data.items || []);
      }
    } catch {
      setError("Network error while communicating with discovery service.");
    } finally {
      setLoading(false);
    }
  }, [mode, selectedCategory, selectedSubcategory, debouncedQuery, sortBy]);

  useEffect(() => {
    if (user) {
      fetchContent();
    }
  }, [user, fetchContent]);

  // Handle Mode Change
  const handleModeChange = (newMode: BrowsingMode) => {
    setMode(newMode);
    if (newMode === "category" && !selectedCategory) {
      // Default to study when entering category mode if none selected
      setSelectedCategory("study");
    }
  };

  // Handle Category Change
  const handleCategoryChange = (catId: string | undefined) => {
    setSelectedCategory(catId);
    setSelectedSubcategory(undefined);
  };

  const activeCategoryDef = CATEGORIES.find((c) => c.id === selectedCategory);

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
      {/* Top Header Row with Mode Selector & Saved Link */}
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
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>
            {mode === "category" && activeCategoryDef
              ? `${activeCategoryDef.name} Discovery`
              : "Discover Content"}
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
            {mode === "category"
              ? "Category Mode Active — Strict topical relevance & filtering"
              : "Normal Mode Active — Mixed cross-category serendipitous exploration"}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <ModeSelector mode={mode} onChange={handleModeChange} />
          <Link
            href="/dashboard/saved"
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: "var(--radius-full)" }}
            title="View Saved Watchlist"
          >
            <Bookmark size={15} /> Watchlist
          </Link>
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
        onSearch={setDebouncedQuery}
        categoryName={activeCategoryDef?.name}
        isCategoryMode={mode === "category"}
      />

      {/* Filter and Sort Status Bar */}
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
          <span>Showing <strong>{items.length}</strong> items</span>
          {debouncedQuery && (
            <span>for query: <em>&quot;{debouncedQuery}&quot;</em></span>
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
        <div className="grid-cards">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="skeleton" style={{ width: "100%", paddingTop: "56.25%" }} />
              <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div className="skeleton" style={{ height: "18px", width: "80%" }} />
                <div className="skeleton" style={{ height: "14px", width: "95%" }} />
                <div className="skeleton" style={{ height: "14px", width: "40%", marginTop: "0.5rem" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content Grid */}
      {!loading && items.length > 0 && (
        <div className="grid-cards">
          {items.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              onSelect={setActiveItem}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && !error && (
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
                setSearchQuery("");
                setDebouncedQuery("");
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
        onClose={() => setActiveItem(null)}
      />
    </div>
  );
}
