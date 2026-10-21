"use client";

import { CATEGORIES } from "@/lib/types";
import {
  GraduationCap,
  Music,
  Film,
  Cpu,
  Gamepad2,
  Sparkles,
  Trophy,
  Newspaper,
  LayoutGrid,
  X,
} from "lucide-react";

interface CategoryBarProps {
  selectedCategory?: string;
  selectedSubcategory?: string;
  onSelectCategory: (catId: string | undefined) => void;
  onSelectSubcategory: (subcat: string | undefined) => void;
  isCategoryMode: boolean;
}

export function CategoryBar({
  selectedCategory,
  selectedSubcategory,
  onSelectCategory,
  onSelectSubcategory,
  isCategoryMode,
}: CategoryBarProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "GraduationCap": return <GraduationCap size={16} />;
      case "Music": return <Music size={16} />;
      case "Film": return <Film size={16} />;
      case "Cpu": return <Cpu size={16} />;
      case "Gamepad2": return <Gamepad2 size={16} />;
      case "Sparkles": return <Sparkles size={16} />;
      case "Trophy": return <Trophy size={16} />;
      case "Newspaper": return <Newspaper size={16} />;
      default: return <LayoutGrid size={16} />;
    }
  };

  const activeCategoryDef = CATEGORIES.find((c) => c.id === selectedCategory);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", marginBottom: "1.5rem" }}>
      {/* Primary Category Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          overflowX: "auto",
          paddingBottom: "0.5rem",
          scrollbarWidth: "none",
        }}
      >
        <button
          type="button"
          onClick={() => {
            onSelectCategory(undefined);
            onSelectSubcategory(undefined);
          }}
          className={`chip ${!selectedCategory ? "chip-active" : ""}`}
        >
          <LayoutGrid size={16} />
          <span>All Topics</span>
        </button>

        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                onSelectCategory(cat.id);
                onSelectSubcategory(undefined);
              }}
              className={`chip ${isSelected ? "chip-active" : ""}`}
            >
              {getIcon(cat.icon)}
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Subcategory Row (when a category is selected) */}
      {activeCategoryDef && activeCategoryDef.subcategories.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            overflowX: "auto",
            padding: "0.625rem 0.875rem",
            backgroundColor: "var(--bg-surface)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-color)",
          }}
        >
          <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
            Subcategories:
          </span>

          <button
            type="button"
            onClick={() => onSelectSubcategory(undefined)}
            className={`chip btn-sm ${!selectedSubcategory ? "chip-active" : ""}`}
            style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
          >
            All
          </button>

          {activeCategoryDef.subcategories.map((sub) => {
            const isSubSelected = selectedSubcategory?.toLowerCase() === sub.toLowerCase();
            return (
              <button
                key={sub}
                type="button"
                onClick={() => onSelectSubcategory(sub)}
                className={`chip btn-sm ${isSubSelected ? "chip-active" : ""}`}
                style={{ padding: "0.2rem 0.6rem", fontSize: "0.75rem" }}
              >
                {sub}
              </button>
            );
          })}

          {selectedSubcategory && (
            <button
              type="button"
              onClick={() => onSelectSubcategory(undefined)}
              title="Clear subcategory filter"
              className="btn btn-outline btn-sm"
              style={{ marginLeft: "auto", padding: "0.2rem 0.4rem" }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
