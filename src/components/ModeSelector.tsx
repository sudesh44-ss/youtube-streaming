"use client";

import { BrowsingMode } from "@/lib/types";
import { Sparkles, Layers, Zap, Video } from "lucide-react";

interface ModeSelectorProps {
  mode: BrowsingMode;
  onChange: (mode: BrowsingMode) => void;
  videoType?: "all" | "shorts" | "videos";
  onVideoTypeChange?: (videoType: "all" | "shorts" | "videos") => void;
}

export function ModeSelector({ mode, onChange, videoType = "all", onVideoTypeChange }: ModeSelectorProps) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.875rem",
        flexWrap: "wrap",
      }}
      aria-label="Discovery & Mode Controls"
    >
      {/* 1. Video Format Filter Group: [ Shorts | Videos ] */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0.25rem",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-full)",
          gap: "0.25rem",
        }}
        role="group"
        aria-label="Format filter"
      >
        {/* Shorts Button */}
        <button
          type="button"
          onClick={() => {
            if (onVideoTypeChange) {
              onVideoTypeChange(videoType === "shorts" ? "all" : "shorts");
            }
          }}
          className={`chip ${videoType === "shorts" ? "chip-active" : ""}`}
          style={{
            border: "none",
            padding: "0.4rem 0.9rem",
            fontWeight: videoType === "shorts" ? 600 : 400,
          }}
          title="Filter by YouTube Shorts"
        >
          <Zap size={15} style={{ color: videoType === "shorts" ? "#ef4444" : "inherit" }} />
          <span>Shorts</span>
        </button>

        {/* Videos Button */}
        <button
          type="button"
          onClick={() => {
            if (onVideoTypeChange) {
              onVideoTypeChange(videoType === "videos" ? "all" : "videos");
            }
          }}
          className={`chip ${videoType === "videos" ? "chip-active" : ""}`}
          style={{
            border: "none",
            padding: "0.4rem 0.9rem",
            fontWeight: videoType === "videos" ? 600 : 400,
          }}
          title="Filter by Standard Videos"
        >
          <Video size={15} />
          <span>Videos</span>
        </button>
      </div>

      {/* 2. Browsing Mode Group: [ Normal Mode | Category Mode ] */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0.25rem",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-full)",
          gap: "0.25rem",
        }}
        role="group"
        aria-label="Browsing mode selection"
      >
        {/* Normal Mode Button */}
        <button
          type="button"
          onClick={() => onChange("normal")}
          className={`chip ${mode === "normal" ? "chip-active" : ""}`}
          style={{
            border: "none",
            padding: "0.4rem 1rem",
            fontWeight: mode === "normal" ? 600 : 400,
          }}
          title="Cross-category serendipitous discovery"
        >
          <Sparkles size={16} />
          <span>Normal Mode</span>
        </button>

        {/* Category Mode Button */}
        <button
          type="button"
          onClick={() => onChange("category")}
          className={`chip ${mode === "category" ? "chip-active" : ""}`}
          style={{
            border: "none",
            padding: "0.4rem 1rem",
            fontWeight: mode === "category" ? 600 : 400,
          }}
          title="Focused exploration strictly isolated to chosen category"
        >
          <Layers size={16} />
          <span>Category Mode</span>
        </button>
      </div>
    </div>
  );
}
