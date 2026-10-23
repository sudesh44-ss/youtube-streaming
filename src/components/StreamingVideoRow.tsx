"use client";

import React, { useRef } from "react";
import { NormalizedContentItem } from "@/lib/types";
import { ContentCard } from "./ContentCard";
import { ChevronRight } from "lucide-react";

interface StreamingVideoRowProps {
  id?: string;
  title: string;
  icon?: React.ReactNode;
  items: NormalizedContentItem[];
  onSelect: (item: NormalizedContentItem) => void;
  onToggleSave?: (item: NormalizedContentItem) => void;
  onViewAll?: () => void;
  showProgress?: boolean;
}

export function StreamingVideoRow({
  id,
  title,
  icon,
  items,
  onSelect,
  onToggleSave,
  onViewAll,
  showProgress,
}: StreamingVideoRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  return (
    <section id={id} style={{ marginBottom: "2.75rem", width: "100%", scrollMarginTop: "5.5rem" }}>
      {/* Section Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {icon && <span style={{ fontSize: "1.25rem", display: "inline-flex" }}>{icon}</span>}
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--text-main)",
              letterSpacing: "-0.01em",
              margin: 0,
            }}
          >
            {title}
          </h2>
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="btn btn-outline btn-sm"
            style={{
              border: "none",
              background: "transparent",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
              padding: "0.25rem 0.5rem",
            }}
          >
            <span>View All</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Responsive Video Grid: 3 per row on desktop, 2 on tablet, 1 on mobile */}
      <div
        ref={scrollRef}
        className="streaming-cards-row"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1.75rem 1.25rem",
          width: "100%",
        }}
      >
        {items.map((item) => (
          <ContentCard
            key={item.id}
            item={item}
            onSelect={onSelect}
            onToggleSave={onToggleSave}
            showProgress={showProgress}
          />
        ))}
      </div>

      <style jsx>{`
        @media (min-width: 1024px) {
          .streaming-cards-row {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .streaming-cards-row {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1.25rem 1rem !important;
          }
        }
        @media (max-width: 639px) {
          .streaming-cards-row {
            grid-template-columns: 1fr !important;
            gap: 1.25rem !important;
          }
        }
      `}</style>
    </section>
  );
}
