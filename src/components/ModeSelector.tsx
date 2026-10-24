"use client";

import { BrowsingMode } from "@/lib/types";
import { Sparkles, Layers, Zap, Video } from "lucide-react";

export interface FormatFilterProps {
  videoType?: "all" | "shorts" | "videos";
  onVideoTypeChange?: (videoType: "all" | "shorts" | "videos") => void;
  className?: string;
}

export function FormatFilter({
  videoType = "all",
  onVideoTypeChange,
  className = "",
}: FormatFilterProps) {
  return (
    <div
      className={`format-filter-group ${className}`}
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
  );
}

export interface BrowsingModeToggleProps {
  mode: BrowsingMode;
  onChange: (mode: BrowsingMode) => void;
  className?: string;
}

export function BrowsingModeToggle({
  mode,
  onChange,
  className = "",
}: BrowsingModeToggleProps) {
  return (
    <div
      className={`browsing-mode-group ${className}`}
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
          padding: "0.4rem 0.85rem",
          fontWeight: mode === "normal" ? 600 : 400,
        }}
        title="Cross-category serendipitous discovery"
      >
        <Sparkles size={15} />
        <span className="mode-label-desktop">Normal Mode</span>
        <span className="mode-label-mobile">Normal</span>
      </button>

      {/* Category Mode Button */}
      <button
        type="button"
        onClick={() => onChange("category")}
        className={`chip ${mode === "category" ? "chip-active" : ""}`}
        style={{
          border: "none",
          padding: "0.4rem 0.85rem",
          fontWeight: mode === "category" ? 600 : 400,
        }}
        title="Focused exploration strictly isolated to chosen category"
      >
        <Layers size={15} />
        <span className="mode-label-desktop">Category Mode</span>
        <span className="mode-label-mobile">Category</span>
      </button>

      <style jsx>{`
        .mode-label-desktop {
          display: inline;
        }
        .mode-label-mobile {
          display: none;
        }
        @media (max-width: 640px) {
          .mode-label-desktop {
            display: none;
          }
          .mode-label-mobile {
            display: inline;
          }
        }
      `}</style>
    </div>
  );
}

export interface ModeSelectorProps {
  mode: BrowsingMode;
  onChange: (mode: BrowsingMode) => void;
  videoType?: "all" | "shorts" | "videos";
  onVideoTypeChange?: (videoType: "all" | "shorts" | "videos") => void;
  variant?: "all" | "format-only" | "mode-only";
}

export function ModeSelector({
  mode,
  onChange,
  videoType = "all",
  onVideoTypeChange,
  variant = "all",
}: ModeSelectorProps) {
  if (variant === "format-only") {
    return <FormatFilter videoType={videoType} onVideoTypeChange={onVideoTypeChange} />;
  }
  if (variant === "mode-only") {
    return <BrowsingModeToggle mode={mode} onChange={onChange} />;
  }
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
      <FormatFilter videoType={videoType} onVideoTypeChange={onVideoTypeChange} />
      <BrowsingModeToggle mode={mode} onChange={onChange} />
    </div>
  );
}
