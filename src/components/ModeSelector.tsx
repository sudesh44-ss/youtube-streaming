"use client";

import { BrowsingMode } from "@/lib/types";
import { Sparkles, Layers } from "lucide-react";

interface ModeSelectorProps {
  mode: BrowsingMode;
  onChange: (mode: BrowsingMode) => void;
}

export function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.25rem",
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-full)",
      }}
      role="group"
      aria-label="Browsing Mode Selector"
    >
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
  );
}
