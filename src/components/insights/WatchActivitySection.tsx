"use client";

import Link from "next/link";
import { Play, History, CheckCircle, ExternalLink } from "lucide-react";
import { WatchActivityItem } from "@/data/insights-demo-data";

interface WatchActivitySectionProps {
  activity: WatchActivityItem[];
}

export function WatchActivitySection({ activity }: WatchActivitySectionProps) {
  return (
    <div className="insights-card activity-section">
      <div className="section-header">
        <div>
          <div className="title-row">
            <History size={20} className="icon-history" />
            <h2 className="section-title">Your Watch Activity</h2>
            <span className="demo-chip">Sample Activity</span>
          </div>
          <p className="section-subtitle">
            Illustrative log of watched videos showing approximate playback progress and timestamps.
          </p>
        </div>
      </div>

      <div className="activity-grid">
        {activity.map((item) => (
          <div key={item.id} className="activity-item-card">
            {/* Thumbnail with 16:9 ratio and progress overlay */}
            <div className="thumb-container">
              <img
                src={item.thumbnail}
                alt={item.title}
                className="thumb-image"
                loading="lazy"
              />
              <span className="duration-tag">{item.totalDuration}</span>
              <div className="play-hover-scrim">
                <Play size={24} className="play-icon" />
              </div>
              {/* Red playback progress bar at the bottom of the thumbnail */}
              <div className="thumb-progress-track">
                <div
                  className="thumb-progress-fill"
                  style={{ width: `${item.completionPercent}%` }}
                />
              </div>
            </div>

            {/* Content Details */}
            <div className="activity-details">
              <span className="category-pill">{item.category}</span>
              <h3 className="video-title" title={item.title}>
                {item.title}
              </h3>
              <p className="creator-name">{item.creator}</p>

              {/* Watch duration & completion percentage */}
              <div className="progress-info-row">
                <span className="completion-text">
                  <strong style={{ color: item.completionPercent > 80 ? "#10b981" : "#f87171" }}>
                    {item.completionPercent}% watched
                  </strong>{" "}
                  ({item.watchedDuration} of {item.totalDuration})
                </span>
                <span className="timestamp-text">{item.watchedAt}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .insights-card {
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: var(--shadow-sm);
        }

        .section-header {
          margin-bottom: 1.25rem;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-bottom: 0.35rem;
        }

        .icon-history {
          color: #10b981;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }

        .demo-chip {
          display: inline-block;
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 0.15rem 0.5rem;
          border-radius: var(--radius-full);
          background: rgba(16, 185, 129, 0.12);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .section-subtitle {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin: 0;
        }

        .activity-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.25rem;
        }

        .activity-item-card {
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .activity-item-card:hover {
          transform: translateY(-2px);
          border-color: var(--primary);
        }

        .thumb-container {
          position: relative;
          width: 100%;
          padding-top: 56.25%; /* 16:9 ratio */
          background-color: var(--bg-subtle);
          overflow: hidden;
        }

        .thumb-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .activity-item-card:hover .thumb-image {
          transform: scale(1.04);
        }

        .duration-tag {
          position: absolute;
          bottom: 10px;
          right: 8px;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.85);
          color: #ffffff;
          font-size: 0.6875rem;
          font-weight: 600;
          z-index: 2;
        }

        .play-hover-scrim {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
          z-index: 1;
        }

        .activity-item-card:hover .play-hover-scrim {
          opacity: 1;
        }

        .play-icon {
          color: #ffffff;
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.5));
        }

        .thumb-progress-track {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(0, 0, 0, 0.5);
          z-index: 3;
        }

        .thumb-progress-fill {
          height: 100%;
          background-color: #ef4444;
        }

        .activity-details {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          flex: 1;
        }

        .category-pill {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          width: fit-content;
        }

        .video-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-main);
          line-height: 1.35;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .creator-name {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 0;
        }

        .progress-info-row {
          margin-top: auto;
          padding-top: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          font-size: 0.75rem;
          border-top: 1px solid var(--border-color);
        }

        .completion-text {
          color: var(--text-main);
        }

        .timestamp-text {
          font-size: 0.6875rem;
          color: var(--text-dim);
        }
      `}</style>
    </div>
  );
}
