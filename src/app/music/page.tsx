"use client";

import Link from "next/link";
import { Music, ArrowLeft, Radio, Sparkles } from "lucide-react";

export default function MusicPage() {
  return (
    <div className="music-page-container">
      <div className="container" style={{ maxWidth: "800px", padding: "4rem 1.5rem 5rem" }}>
        <div className="music-dev-card">
          {/* Logo / Badge */}
          <div className="music-dev-icon-wrap">
            <img
              src="/icons/youtube-music.png"
              alt="YouTube Music"
              width={52}
              height={52}
              className="music-dev-icon-img"
            />
          </div>

          <div className="music-status-pill">
            <span className="music-status-dot" />
            <span>Feature in Active Development</span>
          </div>

          <h1 className="music-dev-heading">
            YouTube Music is Under Development
          </h1>

          <p className="music-dev-description">
            We are currently crafting a dedicated, ad-free music streaming experience directly inside Tubify.
            Curated stations, artist radio, and personalized audio playlists will be available in an upcoming release.
          </p>

          <div className="music-dev-actions">
            <Link href="/dashboard" className="btn btn-primary">
              <ArrowLeft size={16} /> Return to YouTube Discovery
            </Link>
            <Link href="/discover/music" className="btn btn-outline">
              <Music size={16} /> Browse Music Videos
            </Link>
          </div>

          {/* Planned Features Preview */}
          <div className="music-dev-features">
            <div className="music-feature-item">
              <div className="music-feature-icon">
                <Radio size={18} />
              </div>
              <div className="music-feature-text">
                <strong>Curated Radio & Mixes</strong>
                <span>Continuous streaming playlists tuned to your favorite genres and moods.</span>
              </div>
            </div>
            <div className="music-feature-item">
              <div className="music-feature-icon">
                <Sparkles size={18} />
              </div>
              <div className="music-feature-text">
                <strong>High-Fidelity Audio Stream</strong>
                <span>Optimized lightweight audio decoding without unnecessary video overhead.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .music-page-container {
          min-height: calc(100vh - 140px);
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: var(--bg-base);
          color: var(--text-main);
        }

        .music-dev-card {
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 3.5rem 2.5rem;
          text-align: center;
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .music-dev-icon-wrap {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.1);
          border: 1.5px solid rgba(239, 68, 68, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          box-shadow: 0 0 24px rgba(239, 68, 68, 0.15);
        }

        .music-dev-icon-img {
          width: 52px;
          height: 52px;
          object-fit: contain;
        }

        .music-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 0.85rem;
          border-radius: var(--radius-full);
          font-size: 0.8125rem;
          font-weight: 500;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          margin-bottom: 1.25rem;
        }

        .music-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #ef4444;
          box-shadow: 0 0 8px #ef4444;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }

        .music-dev-heading {
          font-size: clamp(1.75rem, 3.5vw, 2.25rem);
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 1rem;
          line-height: 1.25;
        }

        .music-dev-description {
          font-size: 1.05rem;
          line-height: 1.6;
          color: var(--text-muted);
          max-width: 600px;
          margin-bottom: 2.25rem;
        }

        .music-dev-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 2.5rem;
        }

        .music-dev-features {
          width: 100%;
          max-width: 600px;
          border-top: 1px solid var(--border-color);
          padding-top: 2rem;
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.25rem;
          text-align: left;
        }

        @media (min-width: 640px) {
          .music-dev-features {
            grid-template-columns: 1fr 1fr;
          }
        }

        .music-feature-item {
          display: flex;
          gap: 0.75rem;
          align-items: flex-start;
          padding: 0.75rem;
          border-radius: var(--radius-md);
          background: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
        }

        .music-feature-icon {
          color: #ef4444;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .music-feature-text {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .music-feature-text strong {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .music-feature-text span {
          font-size: 0.8125rem;
          color: var(--text-muted);
          line-height: 1.4;
        }
      `}</style>
    </div>
  );
}
