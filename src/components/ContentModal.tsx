"use client";

import { useEffect } from "react";
import { NormalizedContentItem } from "@/lib/types";
import { X, ExternalLink, Shield, Info } from "lucide-react";
import { addToWatchHistory } from "@/lib/local-storage";

interface ContentModalProps {
  item: NormalizedContentItem | null;
  onClose: () => void;
  onToggleSave?: (item: NormalizedContentItem) => void;
}

export function ContentModal({ item, onClose, onToggleSave }: ContentModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Record playback viewing session for Continue Watching & Local Watch History
  useEffect(() => {
    if (item && item.provider === "youtube" && item.providerId) {
      addToWatchHistory({
        videoId: item.providerId,
        title: item.title,
        thumbnailUrl: item.thumbnail,
        channelName: item.creator || "YouTube Creator",
        duration: item.duration,
        lastWatched: Date.now(),
      });

      fetch("/api/content/watch-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentId: item.providerId,
          provider: "youtube",
          title: item.title,
          channelName: item.creator || "YouTube Creator",
          thumbnailUrl: item.thumbnail,
          durationSeconds: 900, // 15 min default
          progressSeconds: 315, // 35% watched
        }),
      }).catch(() => {});
    }
  }, [item]);

  if (!item) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ overflow: "hidden" }}
      >
        {/* Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              className="badge"
              style={{
                backgroundColor: "var(--bg-surface-elevated)",
                color: "var(--primary)",
                border: "1px solid var(--border-color)",
              }}
            >
              {item.category.toUpperCase()}
            </span>
            {item.subcategory && (
              <span className="badge badge-cyan">{item.subcategory}</span>
            )}
          </div>

          <button
            onClick={onClose}
            className="btn btn-outline btn-sm"
            style={{ borderRadius: "50%", padding: "0.3rem", border: "none" }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Media Player Area */}
        <div
          style={{
            position: "relative",
            width: "100%",
            paddingTop: "56.25%", // 16:9
            backgroundColor: "#000",
          }}
        >
          {item.playbackMethod === "iframe_embed" && item.embedUrl ? (
            <iframe
              src={`${item.embedUrl}?autoplay=1&rel=0&modestbranding=1`}
              title={item.title}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: 0,
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.85)), url(${item.thumbnail})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                padding: "2rem",
                textAlign: "center",
              }}
            >
              <Info size={40} style={{ color: "var(--primary)", marginBottom: "1rem" }} />
              <h4 style={{ fontSize: "1.125rem", color: "#fff", marginBottom: "0.5rem" }}>
                Catalog Preview & Discovery Metadata
              </h4>
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", maxWidth: "450px", marginBottom: "1.25rem" }}>
                {item.provider === "tmdb"
                  ? "TMDB provides licensed cinematic metadata and ratings. To stream full feature films, please visit legitimate streaming distributors."
                  : "Audio playback for this provider is subject to third-party preview licensing restrictions."}
              </p>
              <a
                href={item.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
              >
                <ExternalLink size={15} /> Open on Official Provider
              </a>
            </div>
          )}
        </div>

        {/* Details & Metadata */}
        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-main)" }}>
              {item.title}
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.8125rem", color: "var(--text-dim)" }}>
              {item.creator && <span>By {item.creator}</span>}
              {item.publicationDate && <span>Released: {item.publicationDate}</span>}
              <span>Type: {item.contentType.toUpperCase()}</span>
            </div>
          </div>

          <p style={{ fontSize: "0.9375rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
            {item.description}
          </p>

          {/* Action Row */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              paddingTop: "1rem",
              borderTop: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.75rem", color: "var(--text-dim)" }}>
              <Shield size={14} />
              <span>Attribution: {item.providerAttribution}</span>
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <a
                href={item.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-sm"
              >
                <ExternalLink size={15} /> Provider Page
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
