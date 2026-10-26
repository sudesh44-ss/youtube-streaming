"use client";

import { Cpu, Music, GraduationCap, Gamepad2, Globe, Sparkles, TrendingUp, AlertCircle } from "lucide-react";
import { InterestScoreItem } from "@/data/insights-demo-data";

interface InterestScoresSectionProps {
  interests: InterestScoreItem[];
}

export function InterestScoresSection({ interests }: InterestScoresSectionProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Cpu":
        return <Cpu size={18} />;
      case "Music":
        return <Music size={18} />;
      case "GraduationCap":
        return <GraduationCap size={18} />;
      case "Gamepad2":
        return <Gamepad2 size={18} />;
      case "Globe":
        return <Globe size={18} />;
      default:
        return <Sparkles size={18} />;
    }
  };

  return (
    <div className="insights-card interests-section">
      <div className="section-header">
        <div>
          <div className="title-row">
            <Sparkles size={20} className="icon-sparkles" />
            <h2 className="section-title">Your Interests</h2>
            <span className="demo-chip">Demo Estimates</span>
          </div>
          <p className="section-subtitle">
            Estimated affinity scores representing simulated category distribution across watched content.
          </p>
        </div>
      </div>

      {/* Grid of Interests */}
      <div className="interests-grid">
        {interests.map((item) => (
          <div key={item.id} className="interest-card">
            <div className="interest-card-top">
              <div
                className="interest-icon-box"
                style={{
                  backgroundColor: `${item.color}18`,
                  color: item.color,
                  borderColor: `${item.color}35`,
                }}
              >
                {getIcon(item.iconName)}
              </div>
              <div className="score-badge-wrap">
                <span className="score-badge" style={{ color: item.color }}>
                  {item.scorePercent}%
                </span>
                <span className="score-label">Affinity</span>
              </div>
            </div>

            <h3 className="interest-name">{item.category}</h3>

            {/* Visual Indicator Bar */}
            <div className="interest-progress-track">
              <div
                className="interest-progress-fill"
                style={{
                  width: `${item.scorePercent}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>

            <div className="interest-meta-row">
              <span className="interest-stats">
                {item.watchTimeFormatted} • {item.videoCount} videos
              </span>
              <span className="interest-trend">
                <TrendingUp size={12} /> {item.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Explicit Disclaimer Notice */}
      <div className="disclaimer-strip">
        <AlertCircle size={14} className="disclaimer-icon" />
        <span>
          <strong>Simulated Affinity Rationale:</strong> These scores are demo estimates created solely for user interface evaluation. Tubify has not calculated or inferred these values from your personal Google or YouTube viewing history.
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

        .interests-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .interest-card {
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .interest-card:hover {
          transform: translateY(-2px);
          border-color: var(--text-muted);
        }

        .interest-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .interest-icon-box {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid;
        }

        .score-badge-wrap {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .score-badge {
          font-size: 1.125rem;
          font-weight: 800;
          line-height: 1;
        }

        .score-label {
          font-size: 0.625rem;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .interest-name {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--text-main);
          margin: 0;
        }

        .interest-progress-track {
          width: 100%;
          height: 6px;
          background-color: var(--bg-base);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .interest-progress-fill {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.4s ease;
        }

        .interest-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .interest-trend {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #10b981;
          font-weight: 500;
          font-size: 0.6875rem;
        }

        .disclaimer-strip {
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

        .disclaimer-icon {
          color: var(--text-dim);
          flex-shrink: 0;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}
