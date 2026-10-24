"use client";

import { MusicCategory } from "./types";

export const MUSIC_CATEGORIES: MusicCategory[] = [
  { id: "all", name: "Top Charts", query: "trending top hits music songs" },
  { id: "chill", name: "Chill & Lo-Fi", query: "lofi chill beats study relax" },
  { id: "bollywood", name: "Bollywood", query: "latest bollywood romantic songs" },
  { id: "workout", name: "Workout & Energy", query: "workout gym motivation energetic music" },
  { id: "focus", name: "Focus & Study", query: "ambient study instrumental focus deep work" },
  { id: "pop", name: "Pop", query: "pop hits billboard top songs" },
  { id: "rock", name: "Rock & Alternative", query: "rock classic alternative songs" },
  { id: "acoustic", name: "Acoustic & Unplugged", query: "acoustic cover live unplugged guitar" },
  { id: "hiphop", name: "Hip-Hop & Rap", query: "hip hop rap tracks beats" },
];

interface MusicCategoriesProps {
  selectedCategory: string;
  onSelectCategory: (cat: MusicCategory) => void;
}

export function MusicCategories({ selectedCategory, onSelectCategory }: MusicCategoriesProps) {
  return (
    <div className="music-categories-bar" role="tablist" aria-label="Music Moods and Genres">
      {MUSIC_CATEGORIES.map((cat) => {
        const isSelected = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelectCategory(cat)}
            className={`music-category-chip ${isSelected ? "selected" : ""}`}
          >
            {cat.name}
          </button>
        );
      })}

      <style jsx>{`
        .music-categories-bar {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          overflow-x: auto;
          padding: 0.75rem 0 1rem;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .music-categories-bar::-webkit-scrollbar {
          display: none;
        }

        .music-category-chip {
          white-space: nowrap;
          padding: 0.45rem 1rem;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          color: var(--text-muted);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .music-category-chip:hover {
          color: var(--text-main);
          border-color: var(--border-focus);
          background-color: var(--bg-subtle);
          transform: translateY(-1px);
        }

        .music-category-chip.selected {
          background-color: var(--text-main);
          color: var(--bg-main);
          border-color: var(--text-main);
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
