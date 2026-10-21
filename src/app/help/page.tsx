"use client";

import { useState } from "react";
import Link from "next/link";
import { HELP_ARTICLES } from "@/lib/help-articles";
import { HelpCircle, Search, ArrowRight, AlertCircle } from "lucide-react";

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = [
    "All",
    "Getting Started",
    "Authentication & Account",
    "Discovery & Search",
    "API Integrations",
    "Privacy & Security",
    "Troubleshooting",
  ];

  const filteredArticles = HELP_ARTICLES.filter((article) => {
    const matchesCategory = selectedCategory === "All" || article.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || (
      article.title.toLowerCase().includes(q) ||
      article.summary.toLowerCase().includes(q) ||
      article.content.toLowerCase().includes(q)
    );
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="container" style={{ padding: "3rem 1.25rem 5rem" }}>
      {/* Hero Banner */}
      <div
        style={{
          textAlign: "center",
          maxWidth: "720px",
          margin: "0 auto 3rem",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.375rem 0.875rem",
            borderRadius: "var(--radius-full)",
            backgroundColor: "rgba(56, 189, 248, 0.1)",
            color: "var(--primary)",
            fontSize: "0.8125rem",
            fontWeight: 600,
            marginBottom: "1rem",
          }}
        >
          <HelpCircle size={16} /> Knowledge Base & Guides
        </div>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "0.75rem", letterSpacing: "-0.02em" }}>
          Help Center & Documentation
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.0625rem", lineHeight: 1.6, marginBottom: "2rem" }}>
          Explore guides on browsing modes, API key encryption, search ranking, and third-party setups.
        </p>

        {/* Search Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-lg)",
            padding: "0.625rem 1rem",
            gap: "0.75rem",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <Search size={20} style={{ color: "var(--text-dim)" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search across all 20 guides and articles..."
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-main)",
              fontSize: "1rem",
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="btn btn-outline btn-sm"
              style={{ padding: "0.2rem 0.5rem", border: "none" }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          overflowX: "auto",
          paddingBottom: "1rem",
          marginBottom: "2rem",
          scrollbarWidth: "none",
        }}
      >
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`chip ${selectedCategory === cat ? "chip-active" : ""}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Article Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {filteredArticles.map((article) => (
          <Link
            key={article.slug}
            href={`/help/${article.slug}`}
            className="card card-hover"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              textDecoration: "none",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="badge badge-cyan">{article.category}</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{article.updatedDate}</span>
            </div>

            <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--text-main)", lineHeight: 1.4 }}>
              {article.title}
            </h3>

            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.5, flex: 1 }}>
              {article.summary}
            </p>

            <div
              style={{
                marginTop: "auto",
                paddingTop: "0.75rem",
                borderTop: "1px solid var(--border-color)",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                color: "var(--primary)",
                fontSize: "0.8125rem",
                fontWeight: 500,
              }}
            >
              Read Guide <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </div>

      {filteredArticles.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <AlertCircle size={36} style={{ color: "var(--text-dim)", margin: "0 auto 1rem" }} />
          <h3 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.5rem" }}>No matching guides found</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
            Try broadening your search term or select another category.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
            }}
            className="btn btn-outline btn-sm"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
