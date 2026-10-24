"use client";

import { useState } from "react";
import { Clock, Calendar, BarChart2, TrendingUp, Info, EyeOff, RotateCcw } from "lucide-react";
import {
  WatchTimePeriod,
  PeriodWatchTimeSummary,
  WatchTimeBarData,
} from "@/data/insights-demo-data";

interface WatchTimeDashboardProps {
  periods: Record<WatchTimePeriod, PeriodWatchTimeSummary>;
  selectedPeriod: WatchTimePeriod;
  onPeriodChange: (period: WatchTimePeriod) => void;
  isEmptyPreview: boolean;
  onToggleEmptyPreview: () => void;
}

export function WatchTimeDashboard({
  periods,
  selectedPeriod,
  onPeriodChange,
  isEmptyPreview,
  onToggleEmptyPreview,
}: WatchTimeDashboardProps) {
  const currentSummary = periods[selectedPeriod];
  const [hoveredBar, setHoveredBar] = useState<WatchTimeBarData | null>(null);

  const chartData = currentSummary.chartData;
  const maxMinutes = Math.max(...chartData.map((d) => d.minutes), 60);

  return (
    <div className="insights-card watch-time-dashboard">
      {/* Header and Controls */}
      <div className="section-header-row">
        <div>
          <div className="section-title-wrap">
            <Clock size={20} className="section-icon" />
            <h2 className="section-title">Watch Time Dashboard</h2>
            <span className="demo-chip">Demo Data</span>
          </div>
          <p className="section-subtitle">
            Track video consumption across standard reporting windows with daily and weekly breakdowns.
          </p>
        </div>

        {/* Period Selector & Empty State Toggle */}
        <div className="controls-group">
          <div className="period-tabs" role="tablist" aria-label="Select watch time period">
            {(
              [
                { id: "yesterday", label: "Yesterday" },
                { id: "last7days", label: "Last 7 Days" },
                { id: "last30days", label: "Last 30 Days" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selectedPeriod === tab.id}
                onClick={() => onPeriodChange(tab.id)}
                className={`period-tab-btn ${selectedPeriod === tab.id ? "active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onToggleEmptyPreview}
            className={`btn btn-outline btn-sm empty-toggle-btn ${isEmptyPreview ? "active" : ""}`}
            title="Toggle empty state to preview future zero-activity accounts"
          >
            {isEmptyPreview ? <RotateCcw size={13} /> : <EyeOff size={13} />}
            <span>{isEmptyPreview ? "Restore Data" : "Preview Empty State"}</span>
          </button>
        </div>
      </div>

      {/* Date Range Banner */}
      <div className="period-info-strip">
        <div className="period-range">
          <Calendar size={14} />
          <span>{currentSummary.dateRange}</span>
        </div>
        <div className="period-stats-pills">
          <span className="stat-pill">
            Total: <strong>{isEmptyPreview ? "0m" : currentSummary.totalFormatted}</strong>
          </span>
          <span className="stat-pill">
            Average: <strong>{isEmptyPreview ? "0m / day" : currentSummary.dailyAverageFormatted}</strong>
          </span>
        </div>
      </div>

      {/* Empty State vs. Populated View */}
      {isEmptyPreview ? (
        <div className="empty-state-box">
          <div className="empty-icon-circle">
            <Clock size={32} />
          </div>
          <h3 className="empty-title">No Watch Activity Recorded</h3>
          <p className="empty-desc">
            No video playback sessions were found for the period <strong>{currentSummary.periodLabel}</strong>. In production, this view appears when a new account has not yet watched any videos or when activity was cleared.
          </p>
          <div className="empty-action-hint">
            <Info size={14} />
            <span>Click &ldquo;Restore Data&rdquo; above to return to the interactive demo preview.</span>
          </div>
        </div>
      ) : (
        <>
          {/* Main Visual Bar Chart */}
          <div className="chart-container">
            <div className="chart-header">
              <span className="chart-legend">
                <span className="legend-indicator" /> Watch Duration
              </span>
              {hoveredBar && (
                <div className="chart-hover-indicator">
                  <strong>{hoveredBar.label}</strong> ({hoveredBar.subLabel}):{" "}
                  <span className="highlight">{hoveredBar.formatted}</span>
                </div>
              )}
            </div>

            <div className="bar-chart-visual">
              {chartData.map((item, idx) => {
                const heightPercent = Math.max(8, Math.round((item.minutes / maxMinutes) * 100));
                const isHovered = hoveredBar?.label === item.label;

                return (
                  <div
                    key={idx}
                    className="bar-column"
                    onMouseEnter={() => setHoveredBar(item)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    <div className="bar-track">
                      <div
                        className={`bar-fill ${isHovered ? "hovered" : ""}`}
                        style={{ height: `${heightPercent}%` }}
                      >
                        <span className="bar-tooltip-label">{item.formatted}</span>
                      </div>
                    </div>
                    <span className="bar-label">{item.label}</span>
                    {item.subLabel && <span className="bar-sublabel">{item.subLabel}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Breakdown Data Table / Pills */}
          <div className="breakdown-grid">
            {chartData.map((item, idx) => (
              <div key={idx} className="breakdown-item">
                <div className="breakdown-left">
                  <span className="breakdown-day">{item.label}</span>
                  {item.subLabel && <span className="breakdown-sub">{item.subLabel}</span>}
                </div>
                <div className="breakdown-right">
                  <span className="breakdown-value">{item.formatted}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <style jsx>{`
        .insights-card {
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: var(--shadow-sm);
        }

        .section-header-row {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .section-title-wrap {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-bottom: 0.35rem;
        }

        .section-icon {
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
          max-width: 600px;
        }

        .controls-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .period-tabs {
          display: inline-flex;
          padding: 0.25rem;
          background-color: var(--bg-base);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
        }

        .period-tab-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 0.8125rem;
          font-weight: 500;
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: var(--transition);
        }

        .period-tab-btn:hover {
          color: var(--text-main);
        }

        .period-tab-btn.active {
          background-color: var(--bg-surface-elevated);
          color: var(--primary);
          font-weight: 600;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .empty-toggle-btn {
          font-size: 0.75rem;
          padding: 0.35rem 0.625rem;
        }

        .empty-toggle-btn.active {
          background-color: rgba(245, 158, 11, 0.15);
          border-color: #f59e0b;
          color: #f59e0b;
        }

        .period-info-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          margin-bottom: 1.5rem;
          font-size: 0.8125rem;
        }

        .period-range {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .period-stats-pills {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .stat-pill {
          color: var(--text-muted);
        }

        .stat-pill strong {
          color: var(--text-main);
        }

        /* Chart */
        .chart-container {
          background-color: var(--bg-base);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1.25rem 1rem 0.75rem;
          margin-bottom: 1.5rem;
        }

        .chart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--text-dim);
          margin-bottom: 1rem;
          height: 1.25rem;
        }

        .chart-legend {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .legend-indicator {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          background: linear-gradient(180deg, var(--primary), #2563eb);
        }

        .chart-hover-indicator {
          color: var(--text-main);
        }

        .chart-hover-indicator .highlight {
          color: var(--primary);
          font-weight: 600;
        }

        .bar-chart-visual {
          display: flex;
          align-items: flex-end;
          gap: 0.75rem;
          height: 180px;
          padding-top: 1.5rem;
        }

        .bar-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100%;
          cursor: pointer;
        }

        .bar-track {
          flex: 1;
          width: 100%;
          max-width: 44px;
          display: flex;
          align-items: flex-end;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }

        .bar-fill {
          width: 100%;
          background: linear-gradient(180deg, var(--primary), #2563eb);
          border-radius: 4px 4px 0 0;
          transition: height 0.3s ease, filter 0.2s ease;
          position: relative;
        }

        .bar-fill.hovered {
          filter: brightness(1.2);
          box-shadow: 0 0 12px var(--primary-glow);
        }

        .bar-tooltip-label {
          position: absolute;
          top: -22px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--text-main);
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.2s ease;
          pointer-events: none;
        }

        .bar-column:hover .bar-tooltip-label {
          opacity: 1;
        }

        .bar-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-main);
          margin-top: 0.5rem;
          text-align: center;
        }

        .bar-sublabel {
          font-size: 0.625rem;
          color: var(--text-dim);
          text-align: center;
          white-space: nowrap;
        }

        /* Breakdown */
        .breakdown-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 0.75rem;
        }

        .breakdown-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.625rem 0.75rem;
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
        }

        .breakdown-left {
          display: flex;
          flex-direction: column;
        }

        .breakdown-day {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-main);
        }

        .breakdown-sub {
          font-size: 0.625rem;
          color: var(--text-dim);
        }

        .breakdown-value {
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--primary);
        }

        /* Empty State */
        .empty-state-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 3rem 1.5rem;
          background-color: var(--bg-base);
          border: 1px dashed var(--border-color);
          border-radius: var(--radius-md);
        }

        .empty-icon-circle {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-dim);
          margin-bottom: 1rem;
        }

        .empty-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0 0 0.5rem;
        }

        .empty-desc {
          font-size: 0.875rem;
          color: var(--text-muted);
          max-width: 520px;
          margin: 0 0 1.25rem;
          line-height: 1.5;
        }

        .empty-action-hint {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: var(--primary);
          background-color: rgba(56, 189, 248, 0.08);
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-sm);
        }

        @media (max-width: 640px) {
          .section-header-row {
            flex-direction: column;
          }
          .period-tabs {
            width: 100%;
            justify-content: space-between;
          }
          .period-tab-btn {
            flex: 1;
            text-align: center;
          }
          .bar-chart-visual {
            height: 150px;
            gap: 0.375rem;
          }
          .bar-track {
            max-width: 32px;
          }
        }
      `}</style>
    </div>
  );
}
