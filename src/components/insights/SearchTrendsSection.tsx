"use client";

import { Search, TrendingUp, Sparkles, Tag, ShieldCheck } from "lucide-react";
import { SearchTrendItem } from "@/data/insights-demo-data";

interface SearchTrendsSectionProps {
  trends: SearchTrendItem[];
}

export function SearchTrendsSection({ trends }: SearchTrendsSectionProps) {
  return (
    <div className="insights-card trends-section">
      <div className="section-header">
        <div>
          <div className="title-row">
            <Search size={20} className="icon-search" />
            <h2 className="section-title">Your Search Trends</h2>
            <span className="demo-chip">Sample Search Data</span>
          </div>
          <p className="section-subtitle">
            Example frequent search queries and interest signals used to personalize discovery feeds.
          </p>
        </div>
      </div>

      <div className="trends-list">
        {trends.map((item, index) => (
          <div key={item.id} className="trend-row-item">
            <div className="trend-rank">#{index + 1}</div>

            <div className="trend-main-info">
              <div className="query-row">
                <Search size={14} className="query-icon" />
                <span className="query-text">{item.query}</span>
              </div>
              <div className="meta-sub-row">
                <span className="trend-cat-tag">
                  <Tag size={11} /> {item.category}
                </span>
                <span className="trend-badge-pill">
                  <TrendingUp size={11} /> {item.trendBadge}
                </span>
              </div>
            </div>

            <div className="count-badge-wrap">
              <span className="search-count-num">{item.searchCount}</span>
              <span className="search-count-label">searches</span>
            </div>
          </div>
        ))}
      </div>

      {/* Privacy Guarantee Note */}
      <div className="privacy-guarantee-note">
        <ShieldCheck size={14} className="shield-icon" />
        <span>
          <strong>Privacy Isolation:</strong> In Tubify, search queries remain strictly isolated to your authenticated account session and local device storage. Real search trends are never shared with external ad brokers.
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

        .icon-search {
          color: #f59e0b;
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
          background: rgba(245, 158, 11, 0.12);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }

        .section-subtitle {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin: 0;
        }

        .trends-list {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          margin-bottom: 1.25rem;
        }

        .trend-row-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          transition: transform 0.15s ease, border-color 0.15s ease;
        }

        .trend-row-item:hover {
          transform: translateX(4px);
          border-color: var(--primary);
        }

        .trend-rank {
          font-size: 0.875rem;
          font-weight: 700;
          color: var(--text-dim);
          width: 24px;
          text-align: center;
        }

        .trend-main-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .query-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .query-icon {
          color: var(--primary);
          flex-shrink: 0;
        }

        .query-text {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .meta-sub-row {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }

        .trend-cat-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.6875rem;
          color: var(--text-dim);
        }

        .trend-badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.6875rem;
          color: #10b981;
          font-weight: 500;
        }

        .count-badge-wrap {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          flex-shrink: 0;
        }

        .search-count-num {
          font-size: 1.125rem;
          font-weight: 800;
          color: var(--primary);
          line-height: 1;
        }

        .search-count-label {
          font-size: 0.625rem;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .privacy-guarantee-note {
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

        .shield-icon {
          color: #10b981;
          flex-shrink: 0;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}
