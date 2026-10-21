"use client";

import { useState } from "react";
import { NormalizedContentItem } from "@/lib/types";
import { Bookmark, Play, Video, Film, Music, Check } from "lucide-react";

interface ContentCardProps {
  item: NormalizedContentItem;
  onSelect: (item: NormalizedContentItem) => void;
  onToggleSave?: (item: NormalizedContentItem) => void;
}

export function ContentCard({ item, onSelect, onToggleSave }: ContentCardProps) {
  const [isSaved, setIsSaved] = useState(Boolean(item.saved));
  const [saveLoading, setSaveLoading] = useState(false);

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (saveLoading) return;
    setSaveLoading(true);

    const nextState = !isSaved;
    setIsSaved(nextState);

    try {
      if (nextState) {
        await fetch("/api/content/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: item.provider,
            contentId: item.providerId,
            contentType: item.contentType,
            title: item.title,
            description: item.description,
            thumbnail: item.thumbnail,
            category: item.category,
            externalUrl: item.externalUrl,
            metadata: {
              creator: item.creator,
              publicationDate: item.publicationDate,
              playbackMethod: item.playbackMethod,
              embedUrl: item.embedUrl,
            },
          }),
        });
      } else {
        await fetch(`/api/content/saved?provider=${item.provider}&contentId=${item.providerId}`, {
          method: "DELETE",
        });
      }
      if (onToggleSave) onToggleSave({ ...item, saved: nextState });
    } catch (err) {
      console.error("Save toggle error:", err);
      setIsSaved(!nextState); // revert on error
    } finally {
      setSaveLoading(false);
    }
  };

  const getProviderIcon = () => {
    switch (item.provider) {
      case "youtube": return <Video size={13} />;
      case "tmdb": return <Film size={13} />;
      case "spotify": return <Music size={13} />;
    }
  };

  const getBadgeClass = () => {
    switch (item.provider) {
      case "youtube": return "badge-rose";
      case "tmdb": return "badge-cyan";
      case "spotify": return "badge-emerald";
    }
  };

  return (
    <div
      onClick={() => onSelect(item)}
      className="card card-hover"
      style={{
        padding: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        position: "relative",
      }}
    >
      {/* Thumbnail Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingTop: item.contentType === "movie" ? "120%" : "56.25%", // 16:9 or 2:3 ratio
          backgroundColor: "var(--bg-subtle)",
          overflow: "hidden",
        }}
      >
        <img
          src={item.thumbnail}
          alt={item.title}
          loading="lazy"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transition: "transform 0.3s ease",
          }}
          onError={(e) => {
            // Fallback placeholder image
            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80";
          }}
        />

        {/* Hover Overlay with Play Icon */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0,
            transition: "opacity 0.2s ease",
          }}
          className="overlay-play"
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "rgba(56, 189, 248, 0.9)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            }}
          >
            <Play size={22} style={{ marginLeft: "3px" }} />
          </div>
        </div>

        {/* Badges on Top */}
        <div
          style={{
            position: "absolute",
            top: "0.625rem",
            left: "0.625rem",
            display: "flex",
            gap: "0.375rem",
            zIndex: 10,
          }}
        >
          <span className={`badge ${getBadgeClass()}`}>
            {getProviderIcon()} {item.provider}
          </span>
          {item.subcategory && (
            <span
              className="badge"
              style={{
                backgroundColor: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(4px)",
                color: "#f8fafc",
              }}
            >
              {item.subcategory}
            </span>
          )}
        </div>

        {/* Save to Watchlist Button */}
        <button
          type="button"
          onClick={handleSaveClick}
          aria-label={isSaved ? "Remove from Watchlist" : "Save to Watchlist"}
          title={isSaved ? "Saved to Watchlist" : "Add to Watchlist"}
          style={{
            position: "absolute",
            top: "0.625rem",
            right: "0.625rem",
            zIndex: 10,
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            backgroundColor: isSaved ? "var(--accent-amber)" : "rgba(0, 0, 0, 0.65)",
            color: isSaved ? "#000" : "#fff",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "var(--transition)",
            backdropFilter: "blur(4px)",
          }}
        >
          {isSaved ? <Check size={16} /> : <Bookmark size={16} />}
        </button>
      </div>

      {/* Card Info */}
      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", flex: 1, gap: "0.5rem" }}>
        <h3
          style={{
            fontSize: "0.9375rem",
            fontWeight: 600,
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            color: "var(--text-main)",
          }}
        >
          {item.title}
        </h3>

        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--text-muted)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            lineHeight: 1.5,
          }}
        >
          {item.description}
        </p>

        <div
          style={{
            marginTop: "auto",
            paddingTop: "0.625rem",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.75rem",
            color: "var(--text-dim)",
          }}
        >
          <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>
            {item.creator || item.providerAttribution}
          </span>
          {item.publicationDate && (
            <span>{item.publicationDate.slice(0, 4)}</span>
          )}
        </div>
      </div>

      <style jsx>{`
        .card-hover:hover .overlay-play {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
}
