"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Play, Disc3, Music2, AlertCircle, Loader2 } from "lucide-react";
import { MusicTrack, MusicCategory } from "./types";
import { MUSIC_CATEGORIES, MusicCategories } from "./MusicCategories";

interface MusicFeedProps {
  onPlayTrack: (track: MusicTrack) => void;
  activeTrackId?: string;
}

export function MusicFeed({ onPlayTrack, activeTrackId }: MusicFeedProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMusic = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/content/search?q=${encodeURIComponent(query)}&limit=24`);
      if (!res.ok) throw new Error("Failed to fetch music tracks.");
      const data = await res.json();
      const items = Array.isArray(data.items) ? data.items : [];

      const mapped: MusicTrack[] = items.map((item: any) => ({
        id: item.id || `yt:${item.providerId}`,
        videoId: item.providerId || item.id?.replace(/^youtube:/, "") || "",
        title: item.title?.replace(/(&quot;|&#39;|&amp;)/g, (m: string) => {
          if (m === "&quot;") return '"';
          if (m === "&#39;") return "'";
          if (m === "&amp;") return "&";
          return m;
        }) || "Music Track",
        artist: item.creator || "Artist",
        thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.providerId}/hqdefault.jpg`,
        duration: item.duration || "Audio",
        views: item.views,
        category: item.category || "Music",
      }));

      setTracks(mapped);
    } catch (err: any) {
      setError(err.message || "Failed to load music tracks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const activeCat = MUSIC_CATEGORIES.find((c) => c.id === selectedCategory);
    const q = searchQuery.trim() ? `${searchQuery.trim()} audio song` : (activeCat?.query || "trending songs music hits");
    fetchMusic(q);
  }, [selectedCategory, fetchMusic]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    fetchMusic(`${searchQuery.trim()} audio song`);
  };

  const heroTrack = tracks.length > 0 ? tracks[0] : null;
  const gridTracks = tracks.length > 0 ? tracks.slice(1) : [];

  return (
    <div className="music-feed-wrapper">
      {/* Music Header & Search */}
      <div className="music-header-row">
        <div className="music-header-left">
          <div className="music-icon-bubble">
            <Disc3 size={24} className="rotating-icon" />
          </div>
          <div>
            <h1 className="music-page-title">YouTube Music</h1>
            <p className="music-page-subtitle">Stream unlimited music, playlists, top charts, and artist highlights</p>
          </div>
        </div>

        {/* Search bar for music */}
        <form onSubmit={handleSearchSubmit} className="music-search-box">
          <Search size={18} className="music-search-icon" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs, artists, albums, or lyrics..."
            className="music-search-input"
            aria-label="Search YouTube Music"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                const activeCat = MUSIC_CATEGORIES.find((c) => c.id === selectedCategory);
                fetchMusic(activeCat?.query || "trending songs");
              }}
              className="music-clear-btn"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Categories Bar */}
      <MusicCategories
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat.id);
          setSearchQuery("");
        }}
      />

      {/* Featured Hero Banner */}
      {!loading && heroTrack && !searchQuery && (
        <section className="music-hero-card" aria-label="Featured Music Spotlight">
          <div className="hero-banner-art">
            <img src={heroTrack.thumbnail} alt={heroTrack.title} className="hero-art-img" />
            <div className="hero-art-scrim" />
          </div>
          <div className="hero-content">
            <span className="hero-badge">Spotlight Release</span>
            <h2 className="hero-title">{heroTrack.title}</h2>
            <p className="hero-artist">{heroTrack.artist}</p>
            <div className="hero-btn-row">
              <button
                type="button"
                onClick={() => onPlayTrack(heroTrack)}
                className="btn btn-primary hero-play-btn"
              >
                <Play size={18} fill="#ffffff" />
                <span>Play Now</span>
              </button>
              <Link
                href={`/watch/${heroTrack.videoId}`}
                className="btn btn-outline hero-watch-btn"
              >
                Watch Video
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Error state */}
      {error && (
        <div className="music-error-box">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => fetchMusic("trending top hits songs")}
            className="btn btn-outline btn-sm"
            style={{ marginLeft: "auto" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="music-loading-grid">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="music-skeleton-card">
              <div className="skeleton-thumb" />
              <div className="skeleton-title" />
              <div className="skeleton-artist" />
            </div>
          ))}
        </div>
      )}

      {/* Music Cards Grid */}
      {!loading && tracks.length > 0 && (
        <div className="music-tracks-grid" role="grid" aria-label="Music tracks">
          {gridTracks.map((track) => {
            const isActive = activeTrackId === track.id;
            return (
              <div
                key={track.id}
                role="gridcell"
                className={`music-card ${isActive ? "active-playing" : ""}`}
                onClick={() => onPlayTrack(track)}
              >
                <div className="music-card-thumb-wrap">
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="music-card-thumb"
                    loading="lazy"
                  />
                  <div className="music-card-overlay">
                    <div className="music-card-play-icon">
                      <Play size={24} fill="#ffffff" color="#ffffff" style={{ marginLeft: "3px" }} />
                    </div>
                  </div>
                  {track.duration && <span className="music-duration-pill">{track.duration}</span>}
                </div>

                <div className="music-card-info">
                  <h3 className="music-card-title" title={track.title}>
                    {track.title}
                  </h3>
                  <p className="music-card-artist" title={track.artist}>
                    {track.artist}
                  </p>
                  {track.views && <span className="music-card-views">{track.views}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && tracks.length === 0 && !error && (
        <div className="music-empty-state">
          <Music2 size={48} style={{ color: "var(--text-dim)", marginBottom: "1rem" }} />
          <h3>No tracks found</h3>
          <p>Try searching for a different track, genre, or mood.</p>
        </div>
      )}

      <style jsx>{`
        .music-feed-wrapper {
          padding: 1.5rem 0 6rem;
        }

        .music-header-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .music-header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .music-icon-bubble {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: linear-gradient(135deg, #f43f5e, #fb7185);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 4px 14px rgba(244, 63, 94, 0.35);
          flex-shrink: 0;
        }

        .music-page-title {
          font-size: 1.625rem;
          font-weight: 800;
          color: var(--text-main);
          margin: 0;
          letter-spacing: -0.02em;
        }

        .music-page-subtitle {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin: 0.25rem 0 0;
        }

        .music-search-box {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
          max-width: 420px;
        }

        .music-search-icon {
          position: absolute;
          left: 14px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .music-search-input {
          width: 100%;
          height: 44px;
          padding: 0 4rem 0 2.75rem;
          border-radius: 9999px;
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          color: var(--text-main);
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .music-search-input:focus {
          border-color: #f43f5e;
          box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.15);
        }

        .music-clear-btn {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          font-size: 0.75rem;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px 6px;
        }

        .music-clear-btn:hover {
          color: var(--text-main);
        }

        /* Hero Banner */
        .music-hero-card {
          position: relative;
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: linear-gradient(135deg, #18181b, #09090b);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          min-height: 240px;
          margin-bottom: 2rem;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
        }

        .hero-banner-art {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 55%;
          overflow: hidden;
        }

        .hero-art-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: blur(1px);
          transform: scale(1.05);
        }

        .hero-art-scrim {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, #18181b 15%, rgba(24, 24, 27, 0.75) 60%, rgba(24, 24, 27, 0.1) 100%);
        }

        .hero-content {
          position: relative;
          z-index: 2;
          padding: 2.25rem;
          max-width: 550px;
        }

        .hero-badge {
          display: inline-block;
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 0.25rem 0.625rem;
          border-radius: 9999px;
          background: rgba(244, 63, 94, 0.2);
          color: #fb7185;
          margin-bottom: 0.75rem;
        }

        .hero-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.25;
          margin: 0 0 0.5rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .hero-artist {
          font-size: 0.9375rem;
          color: rgba(255, 255, 255, 0.75);
          margin: 0 0 1.25rem;
        }

        .hero-btn-row {
          display: flex;
          align-items: center;
          gap: 0.875rem;
        }

        .hero-play-btn {
          background-color: #f43f5e;
          border-color: #f43f5e;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
        }

        .hero-play-btn:hover {
          background-color: #e11d48;
          border-color: #e11d48;
        }

        .hero-watch-btn {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          border-color: rgba(255, 255, 255, 0.2);
        }

        .hero-watch-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        /* Tracks Grid */
        .music-tracks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1.5rem 1.25rem;
        }

        .music-card {
          cursor: pointer;
          border-radius: var(--radius-md);
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          overflow: hidden;
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease, border-color 0.2s ease;
          display: flex;
          flex-direction: column;
        }

        .music-card:hover {
          transform: translateY(-4px);
          border-color: rgba(244, 63, 94, 0.5);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
        }

        .music-card.active-playing {
          border-color: #f43f5e;
          box-shadow: 0 0 14px rgba(244, 63, 94, 0.35);
        }

        .music-card-thumb-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          background-color: #1e293b;
          overflow: hidden;
        }

        .music-card-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .music-card:hover .music-card-thumb {
          transform: scale(1.05);
        }

        .music-card-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.38);
          opacity: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s ease;
        }

        .music-card:hover .music-card-overlay {
          opacity: 1;
        }

        .music-card-play-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #f43f5e;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(244, 63, 94, 0.4);
          transform: scale(0.9);
          transition: transform 0.2s ease;
        }

        .music-card:hover .music-card-play-icon {
          transform: scale(1);
        }

        .music-duration-pill {
          position: absolute;
          bottom: 6px;
          right: 6px;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.75);
          color: #fff;
          font-size: 0.6875rem;
          font-weight: 600;
        }

        .music-card-info {
          padding: 0.75rem 0.875rem 0.875rem;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .music-card-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-main);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .music-card-artist {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .music-card-views {
          font-size: 0.6875rem;
          color: var(--text-dim);
          margin-top: 0.125rem;
        }

        /* Loading Skeletons */
        .music-loading-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1.5rem 1.25rem;
        }

        .music-skeleton-card {
          border-radius: var(--radius-md);
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          padding: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .skeleton-thumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          border-radius: 6px;
          background: var(--bg-subtle);
          animation: pulse 1.5s ease-in-out infinite;
        }

        .skeleton-title {
          height: 14px;
          width: 80%;
          border-radius: 4px;
          background: var(--bg-subtle);
          animation: pulse 1.5s ease-in-out infinite;
        }

        .skeleton-artist {
          height: 12px;
          width: 50%;
          border-radius: 4px;
          background: var(--bg-subtle);
          animation: pulse 1.5s ease-in-out infinite;
        }

        .music-error-box {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-radius: var(--radius-md);
          background-color: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          margin-bottom: 1.5rem;
        }

        .music-empty-state {
          text-align: center;
          padding: 4rem 1rem;
          color: var(--text-muted);
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.25; }
        }

        @media (max-width: 640px) {
          .music-tracks-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem 0.75rem;
          }
          .music-hero-card {
            min-height: 180px;
          }
          .hero-content {
            padding: 1.25rem;
          }
          .hero-title {
            font-size: 1.125rem;
          }
        }
      `}</style>
    </div>
  );
}
