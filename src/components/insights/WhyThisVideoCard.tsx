"use client";

import { Sparkles, HelpCircle, Compass, Zap, Tag, CheckCircle } from "lucide-react";
import { WhyThisVideoItem } from "@/data/insights-demo-data";

interface WhyThisVideoCardProps {
  item: WhyThisVideoItem;
}

export function WhyThisVideoCard({ item }: WhyThisVideoCardProps) {
  const getSignalBadgeColor = (type: WhyThisVideoItem["signalType"]) => {
    switch (type) {
      case "category_affinity":
        return { bg: "rgba(56, 189, 248, 0.12)", border: "rgba(56, 189, 248, 0.3)", text: "#38bdf8" };
      case "search_relevance":
        return { bg: "rgba(168, 85, 247, 0.12)", border: "rgba(168, 85, 247, 0.3)", text: "#a855f7" };
      case "trending_in_country":
        return { bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)", text: "#f59e0b" };
      default:
        return { bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.3)", text: "#10b981" };
    }
  };

  const colors = getSignalBadgeColor(item.signalType);

  return (
    <div className="why-video-card">
      {/* Top Media Row */}
      <div className="media-row">
        <div className="thumb-wrap">
          <img
            src={item.thumbnail}
            alt={item.title}
            className="thumb-img"
            loading="lazy"
          />
          <span className="duration-tag">{item.duration}</span>
        </div>

        <div className="media-info">
          <h4 className="video-title" title={item.title}>
            {item.title}
          </h4>
          <p className="creator-row">
            <span>{item.creator}</span>
            <span className="dot-sep">•</span>
            <span>{item.views}</span>
          </p>
        </div>
      </div>

      {/* Recommendation Explanation Bubble */}
      <div className="explanation-callout">
        <div className="explanation-header">
          <div className="explanation-title-group">
            <Sparkles size={14} className="sparkle-icon" />
            <span className="explanation-title">Why This Video?</span>
          </div>
          <span
            className="signal-badge"
            style={{
              backgroundColor: colors.bg,
              borderColor: colors.border,
              color: colors.text,
            }}
          >
            {item.signalBadge}
          </span>
        </div>

        <p className="explanation-body">&ldquo;{item.explanation}&rdquo;</p>
      </div>

      <style jsx>{`
        .why-video-card {
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }

        .why-video-card:hover {
          border-color: var(--primary);
          transform: translateY(-2px);
        }

        .media-row {
          display: flex;
          gap: 0.875rem;
          align-items: flex-start;
        }

        .thumb-wrap {
          position: relative;
          width: 120px;
          min-width: 120px;
          aspect-ratio: 16 / 9;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background-color: var(--bg-subtle);
        }

        .thumb-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .duration-tag {
          position: absolute;
          bottom: 4px;
          right: 4px;
          padding: 1px 4px;
          border-radius: 3px;
          background: rgba(0, 0, 0, 0.85);
          color: #ffffff;
          font-size: 0.625rem;
          font-weight: 600;
        }

        .media-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0;
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

        .creator-row {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .dot-sep {
          color: var(--text-dim);
        }

        /* Explanation Callout */
        .explanation-callout {
          background-color: var(--bg-base);
          border: 1px solid var(--border-color);
          border-left: 3px solid var(--primary);
          border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
          padding: 0.625rem 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .explanation-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .explanation-title-group {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .sparkle-icon {
          color: var(--primary);
        }

        .explanation-title {
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-main);
        }

        .signal-badge {
          font-size: 0.6875rem;
          font-weight: 600;
          padding: 0.1rem 0.45rem;
          border-radius: var(--radius-full);
          border: 1px solid;
        }

        .explanation-body {
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.4;
          margin: 0;
          font-style: italic;
        }

        @media (max-width: 480px) {
          .media-row {
            flex-direction: column;
          }
          .thumb-wrap {
            width: 100%;
            min-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
