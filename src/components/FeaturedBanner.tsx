"use client";

import { useState, useEffect } from "react";
import { NormalizedContentItem } from "@/lib/types";
import { Play, Plus, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { isInLocalWatchlist, toggleLocalWatchlist, STORAGE_CHANGE_EVENT } from "@/lib/local-storage";

interface FeaturedBannerProps {
  items: NormalizedContentItem[];
  onPlay: (item: NormalizedContentItem) => void;
  onToggleSave?: (item: NormalizedContentItem) => void;
}

export function FeaturedBanner({ items, onPlay, onToggleSave }: FeaturedBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedItems, setSavedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (items.length > 0) {
      const initialMap: Record<string, boolean> = {};
      items.forEach((item) => {
        initialMap[item.id] = isInLocalWatchlist(item.providerId) || Boolean(item.saved);
      });
      setSavedItems(initialMap);
    }

    const handleStorageChange = () => {
      if (items.length > 0) {
        const nextMap: Record<string, boolean> = {};
        items.forEach((item) => {
          nextMap[item.id] = isInLocalWatchlist(item.providerId) || Boolean(item.saved);
        });
        setSavedItems(nextMap);
      }
    };

    window.addEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
    return () => window.removeEventListener(STORAGE_CHANGE_EVENT, handleStorageChange);
  }, [items]);

  if (!items || items.length === 0) return null;

  const currentItem = items[currentIndex] || items[0];
  const isSaved = Boolean(savedItems[currentItem.id]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleWatchlistToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextSaved = toggleLocalWatchlist({
      videoId: currentItem.providerId,
      title: currentItem.title,
      thumbnailUrl: currentItem.thumbnail,
      channelId: currentItem.channelId,
      channelTitle: currentItem.creator,
      category: currentItem.category,
      duration: currentItem.duration,
      views: currentItem.views,
    });
    setSavedItems((prev) => ({ ...prev, [currentItem.id]: nextSaved }));

    try {
      if (nextSaved) {
        await fetch("/api/content/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: currentItem.provider,
            contentId: currentItem.providerId,
            contentType: currentItem.contentType,
            title: currentItem.title,
            description: currentItem.description,
            thumbnail: currentItem.thumbnail,
            category: currentItem.category,
            externalUrl: currentItem.externalUrl,
            metadata: {
              creator: currentItem.creator,
              publicationDate: currentItem.publicationDate,
              playbackMethod: currentItem.playbackMethod,
              embedUrl: currentItem.embedUrl,
              duration: currentItem.duration,
            },
          }),
        });
      } else {
        await fetch(
          `/api/content/saved?provider=${currentItem.provider}&contentId=${currentItem.providerId}`,
          { method: "DELETE" }
        );
      }
      if (onToggleSave) {
        onToggleSave({ ...currentItem, saved: nextSaved });
      }
    } catch (err) {
      console.error("Watchlist toggle error in banner:", err);
    }
  };

  const duration = currentItem.duration || "18:24";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        borderRadius: "16px",
        overflow: "hidden",
        marginBottom: "2.5rem",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
        backgroundColor: "#030712",
      }}
      aria-roledescription="carousel"
      aria-label="Featured Videos"
    >
      {/* Background Image with Dark & Vignette Overlay */}
      <div
        style={{
          position: "relative",
          width: "100%",
          minHeight: "340px",
          height: "clamp(320px, 35vw, 420px)",
        }}
      >
        <img
          src={currentItem.thumbnail}
          alt={currentItem.title}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 30%",
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1600&q=80";
          }}
        />

        {/* Gradient Mask Overlays */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(3, 7, 18, 0.95) 0%, rgba(3, 7, 18, 0.8) 45%, rgba(3, 7, 18, 0.25) 75%, rgba(3, 7, 18, 0.6) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(3, 7, 18, 0.1) 0%, rgba(3, 7, 18, 0.85) 100%)",
          }}
        />

        {/* Banner Content Container */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "clamp(1.5rem, 4vw, 3rem) clamp(1.5rem, 5vw, 4rem)",
            maxWidth: "680px",
            zIndex: 10,
          }}
        >
          {/* YouTube Featured Video Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1rem",
              fontSize: "0.8125rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "#fff",
            }}
          >
            {/* Red YouTube Play Icon */}
            <div
              style={{
                width: "22px",
                height: "16px",
                borderRadius: "4px",
                backgroundColor: "#ff0000",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 10px rgba(255, 0, 0, 0.4)",
              }}
            >
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderTop: "4px solid transparent",
                  borderBottom: "4px solid transparent",
                  borderLeft: "6px solid #fff",
                  marginLeft: "1px",
                }}
              />
            </div>
            <span>YouTube</span>
            <span style={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: 600 }}>FEATURED VIDEO</span>
          </div>

          {/* Heading Title */}
          <h2
            style={{
              fontSize: "clamp(1.5rem, 3.2vw, 2.5rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              color: "#ffffff",
              marginBottom: "0.875rem",
              letterSpacing: "-0.02em",
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.5)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {currentItem.title}
          </h2>

          {/* Subtitle / Description */}
          <p
            style={{
              fontSize: "clamp(0.875rem, 1.2vw, 1rem)",
              lineHeight: 1.5,
              color: "rgba(255, 255, 255, 0.8)",
              marginBottom: "1.75rem",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              maxWidth: "540px",
            }}
          >
            {currentItem.description}
          </p>

          {/* Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => onPlay(currentItem)}
              className="btn btn-primary btn-lg"
              style={{
                borderRadius: "var(--radius-full)",
                padding: "0.625rem 1.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontWeight: 600,
                fontSize: "0.9375rem",
                boxShadow: "0 4px 16px rgba(37, 99, 235, 0.4)",
              }}
            >
              <Play size={16} fill="currentColor" /> Play Now
            </button>

            <button
              type="button"
              onClick={handleWatchlistToggle}
              className="btn btn-outline btn-lg"
              style={{
                borderRadius: "var(--radius-full)",
                padding: "0.625rem 1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontWeight: 600,
                fontSize: "0.9375rem",
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                borderColor: "rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                backdropFilter: "blur(8px)",
              }}
            >
              {isSaved ? (
                <>
                  <Check size={16} style={{ color: "#38bdf8" }} /> In Watchlist
                </>
              ) : (
                <>
                  <Plus size={16} /> Add to Watchlist
                </>
              )}
            </button>
          </div>
        </div>

        {/* Duration Badge Bottom Right */}
        <div
          style={{
            position: "absolute",
            bottom: "1.25rem",
            right: "1.5rem",
            padding: "0.25rem 0.6rem",
            borderRadius: "6px",
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            color: "#ffffff",
            fontSize: "0.8125rem",
            fontWeight: 700,
            letterSpacing: "0.03em",
            zIndex: 10,
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          {duration}
        </div>

        {/* Carousel Arrow Controls */}
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous featured video"
              style={{
                position: "absolute",
                left: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 20,
                transition: "background-color 0.2s ease",
              }}
            >
              <ChevronLeft size={22} />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next featured video"
              style={{
                position: "absolute",
                right: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 20,
                transition: "background-color 0.2s ease",
              }}
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}

        {/* Carousel Dot Indicators */}
        {items.length > 1 && (
          <div
            style={{
              position: "absolute",
              bottom: "1.25rem",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              zIndex: 20,
            }}
          >
            {items.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                style={{
                  width: idx === currentIndex ? "24px" : "8px",
                  height: "8px",
                  borderRadius: "4px",
                  backgroundColor: idx === currentIndex ? "var(--primary)" : "rgba(255, 255, 255, 0.35)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  padding: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
