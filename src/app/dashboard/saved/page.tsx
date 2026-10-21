"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NormalizedContentItem, CATEGORIES } from "@/lib/types";
import { ContentCard } from "@/components/ContentCard";
import { ContentModal } from "@/components/ContentModal";
import { Bookmark, ArrowLeft, RefreshCw, Compass } from "lucide-react";

export default function SavedContentPage() {
  const router = useRouter();
  const [items, setItems] = useState<NormalizedContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeItem, setActiveItem] = useState<NormalizedContentItem | null>(null);

  const fetchSaved = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content/saved");
      if (res.status === 401) {
        router.push("/auth/signin");
        return;
      }
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      console.error("Failed to load saved items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaved();
  }, []);

  const handleToggleSave = (item: NormalizedContentItem) => {
    // If un-saved, filter out
    if (!item.saved) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }
  };

  const filteredItems = items.filter((item) => {
    if (selectedCategory === "All") return true;
    return item.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <div className="container" style={{ padding: "2.5rem 1.25rem 5rem" }}>
      {/* Header */}
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
          }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: "rgba(245, 158, 11, 0.15)",
              color: "var(--accent-amber)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bookmark size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: "1.875rem", fontWeight: 800 }}>Saved Watchlist</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Quick access to your bookmarked lectures, tracks, movies, and tutorials ({items.length} items)
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter Chips */}
      {items.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            overflowX: "auto",
            paddingBottom: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedCategory("All")}
            className={`chip ${selectedCategory === "All" ? "chip-active" : ""}`}
          >
            All Categories ({items.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = items.filter((i) => i.category.toLowerCase() === cat.id.toLowerCase()).length;
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

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "4rem 0" }}>
          <RefreshCw size={28} className="spin" style={{ color: "var(--primary)", margin: "0 auto 1rem" }} />
          <p style={{ color: "var(--text-muted)" }}>Loading your watchlist...</p>
        </div>
      )}

      {/* Grid */}
      {!loading && filteredItems.length > 0 && (
        <div className="grid-cards">
          {filteredItems.map((item) => (
            <ContentCard
              key={item.id}
              item={item}
              onSelect={setActiveItem}
              onToggleSave={handleToggleSave}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && (
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
              color: "var(--accent-amber)",
            }}
          >
            <Bookmark size={28} />
          </div>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Your Watchlist is Empty</h3>
          <p style={{ color: "var(--text-muted)", maxWidth: "450px", fontSize: "0.9375rem" }}>
            Click the bookmark icon on any content card in the dashboard to save videos, films, and courses for later.
          </p>
          <Link href="/dashboard" className="btn btn-primary btn-sm">
            <Compass size={15} /> Explore Content
          </Link>
        </div>
      )}

      {/* Content Modal */}
      <ContentModal
        item={activeItem}
        onClose={() => setActiveItem(null)}
        onToggleSave={handleToggleSave}
      />
    </div>
  );
}
