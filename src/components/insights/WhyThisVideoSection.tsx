"use client";

import { Sparkles, HelpCircle, Layers } from "lucide-react";
import { WhyThisVideoItem } from "@/data/insights-demo-data";
import { WhyThisVideoCard } from "./WhyThisVideoCard";

interface WhyThisVideoSectionProps {
  items: WhyThisVideoItem[];
}

export function WhyThisVideoSection({ items }: WhyThisVideoSectionProps) {
  return (
    <div className="insights-card why-this-video-section">
      <div className="section-header">
        <div>
          <div className="title-row">
            <Sparkles size={20} className="icon-sparkles" />
            <h2 className="section-title">Why This Video?</h2>
            <span className="demo-chip">Explainable AI Pattern</span>
          </div>
          <p className="section-subtitle">
            Transparent rationale indicators demonstrating why specific videos are recommended based on viewing affinity, recent searches, and regional trends.
          </p>
        </div>
      </div>

      <div className="why-video-grid">
        {items.map((item) => (
          <WhyThisVideoCard key={item.id} item={item} />
        ))}
      </div>

      <div className="pattern-note">
        <HelpCircle size={14} className="pattern-icon" />
        <span>
          <strong>Reusable Pattern:</strong> In Phase 2 and future discovery updates, this explanatory card component will appear contextually across Watch Next feeds, Home recommendations, and Search results to provide transparent recommendations.
        </span>
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

        .icon-sparkles {
          color: var(--primary);
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
          background: rgba(56, 189, 248, 0.12);
          color: var(--primary);
          border: 1px solid rgba(56, 189, 248, 0.3);
        }

        .section-subtitle {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin: 0;
        }

        .why-video-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.25rem;
          margin-bottom: 1.25rem;
        }

        .pattern-note {
          display: flex;
          align-items: flex-start;
          gap: 0.625rem;
          padding: 0.75rem 1rem;
          background-color: var(--bg-base);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.45;
        }

        .pattern-icon {
          color: var(--primary);
          flex-shrink: 0;
          margin-top: 2px;
        }

        @media (max-width: 640px) {
          .why-video-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
