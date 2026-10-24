"use client";

import { useState } from "react";
import { Calendar, Flame, Activity, Info, ShieldAlert } from "lucide-react";
import { MonthlyWatchTimeSummary } from "@/data/insights-demo-data";

interface MonthlyWatchTimeCardProps {
  summary: MonthlyWatchTimeSummary;
}

export function MonthlyWatchTimeCard({ summary }: MonthlyWatchTimeCardProps) {
  const [hoveredDay, setHoveredDay] = useState<{ day: number; formatted: string } | null>(null);

  // Maximum minutes in a single day for intensity scaling (220 min)
  const maxDayMinutes = 220;

  return (
    <div className="insights-card monthly-card">
      {/* Top Header */}
      <div className="card-top-header">
        <div className="title-group">
          <div className="title-row">
            <Calendar size={20} className="header-icon" />
            <h2 className="card-title">Monthly Watch Time</h2>
            <span className="demo-chip">Demo Data</span>
          </div>
          <p className="reporting-period-text">
            Reporting Period: <strong>{summary.reportingPeriod}</strong>
          </p>
        </div>

        <div className="monthly-badge-group">
          <div className="active-days-badge">
            <Flame size={15} className="flame-icon" />
            <span>
              <strong>{summary.daysActive}</strong> of {summary.totalDaysInMonth} Days Active
            </span>
          </div>
        </div>
      </div>

      {/* Primary Metrics Row */}
      <div className="metrics-row">
        <div className="metric-cell">
          <span className="metric-label">Calendar Month Total</span>
          <span className="metric-value">{summary.totalFormatted}</span>
          <span className="metric-sub">{summary.monthName}</span>
        </div>

        <div className="metric-cell">
          <span className="metric-label">Daily Average</span>
          <span className="metric-value">{summary.dailyAverageFormatted}</span>
          <span className="metric-sub">Across active days</span>
        </div>

        <div className="metric-cell">
          <span className="metric-label">Peak Activity Day</span>
          <span className="metric-value peak-highlight">{summary.mostActiveDay}</span>
          <span className="metric-sub">Highest daily duration</span>
        </div>
      </div>

      {/* Progress Toward Month Completion */}
      <div className="progress-section">
        <div className="progress-label-row">
          <span className="progress-title">Activity Coverage in Current Month</span>
          <span className="progress-percent">{summary.progressPercent}% Active Days</span>
        </div>
        <div className="progress-track">
          <div className="progress-bar-fill" style={{ width: `${summary.progressPercent}%` }} />
        </div>
      </div>

      {/* Daily Activity Density Grid / Heatmap */}
      <div className="heatmap-section">
        <div className="heatmap-header">
          <span className="heatmap-title">Daily Activity Distribution (Oct 1 – Oct 24)</span>
          <div className="heatmap-legend">
            <span className="legend-text">Less</span>
            <div className="legend-scale">
              <span className="scale-box intensity-0" />
              <span className="scale-box intensity-1" />
              <span className="scale-box intensity-2" />
              <span className="scale-box intensity-3" />
            </div>
            <span className="legend-text">More</span>
          </div>
        </div>

        <div className="days-grid">
          {summary.dailyBreakdown.map((item) => {
            const ratio = item.minutes / maxDayMinutes;
            let intensityClass = "intensity-1";
            if (ratio > 0.75) intensityClass = "intensity-3";
            else if (ratio > 0.45) intensityClass = "intensity-2";

            return (
              <div
                key={item.day}
                className={`day-box ${intensityClass}`}
                onMouseEnter={() => setHoveredDay({ day: item.day, formatted: item.formatted })}
                onMouseLeave={() => setHoveredDay(null)}
              >
                <span className="day-number">{item.day}</span>
              </div>
            );
          })}
        </div>

        {/* Hover info tooltip */}
        <div className="hover-status-strip">
          {hoveredDay ? (
            <span>
              Oct {hoveredDay.day}: <strong>{hoveredDay.formatted} watched</strong>
            </span>
          ) : (
            <span className="muted-hint">Hover over any day square to inspect duration</span>
          )}
        </div>
      </div>

      {/* Explanatory Boundary Notice */}
      <div className="boundary-notice">
        <Info size={14} className="notice-icon" />
        <span>
          <strong>Calendar Boundary &amp; Timezone Notice:</strong> In the eventual backend implementation, monthly reporting calculates strictly between local 00:00:00 on the first day and 23:59:59 on the last day of the calendar month according to the user&apos;s configured timezone.
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

        .card-top-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.25rem;
        }

        .title-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }

        .header-icon {
          color: #a855f7;
        }

        .card-title {
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
          background: rgba(168, 85, 247, 0.12);
          color: #a855f7;
          border: 1px solid rgba(168, 85, 247, 0.3);
        }

        .reporting-period-text {
          font-size: 0.8125rem;
          color: var(--text-muted);
          margin: 0;
        }

        .reporting-period-text strong {
          color: var(--text-main);
        }

        .active-days-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.75rem;
          background-color: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: var(--radius-md);
          font-size: 0.8125rem;
          color: #f59e0b;
        }

        .flame-icon {
          color: #f59e0b;
        }

        /* Metrics Grid */
        .metrics-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .metric-cell {
          padding: 1rem;
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .metric-label {
          font-size: 0.75rem;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          font-weight: 600;
        }

        .metric-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-main);
          letter-spacing: -0.02em;
        }

        .metric-value.peak-highlight {
          font-size: 1.05rem;
          color: #a855f7;
          margin-top: 0.25rem;
        }

        .metric-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        /* Progress */
        .progress-section {
          background-color: var(--bg-base);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .progress-label-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.8125rem;
          margin-bottom: 0.5rem;
        }

        .progress-title {
          color: var(--text-muted);
          font-weight: 500;
        }

        .progress-percent {
          color: var(--primary);
          font-weight: 700;
        }

        .progress-track {
          width: 100%;
          height: 8px;
          background-color: var(--bg-surface-elevated);
          border-radius: var(--radius-full);
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #38bdf8, #a855f7);
          border-radius: var(--radius-full);
        }

        /* Heatmap Grid */
        .heatmap-section {
          background-color: var(--bg-base);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1rem;
          margin-bottom: 1.25rem;
        }

        .heatmap-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .heatmap-title {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-muted);
        }

        .heatmap-legend {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.6875rem;
          color: var(--text-dim);
        }

        .legend-scale {
          display: flex;
          gap: 2px;
        }

        .scale-box {
          width: 10px;
          height: 10px;
          border-radius: 2px;
        }

        .days-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
          gap: 6px;
          margin-bottom: 0.5rem;
        }

        .day-box {
          height: 36px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.15s ease, filter 0.15s ease;
        }

        .day-box:hover {
          transform: scale(1.1);
          filter: brightness(1.2);
          z-index: 2;
        }

        .day-number {
          font-size: 0.6875rem;
          font-weight: 600;
        }

        .intensity-0 {
          background-color: var(--bg-surface-elevated);
          color: var(--text-dim);
        }

        .intensity-1 {
          background-color: rgba(56, 189, 248, 0.25);
          color: var(--text-main);
        }

        .intensity-2 {
          background-color: rgba(56, 189, 248, 0.65);
          color: #ffffff;
        }

        .intensity-3 {
          background-color: #0284c7;
          color: #ffffff;
        }

        .hover-status-strip {
          min-height: 1.25rem;
          font-size: 0.75rem;
          color: var(--primary);
          text-align: right;
        }

        .muted-hint {
          color: var(--text-dim);
          font-style: italic;
        }

        /* Boundary Notice */
        .boundary-notice {
          display: flex;
          align-items: flex-start;
          gap: 0.625rem;
          padding: 0.75rem 1rem;
          background-color: rgba(168, 85, 247, 0.08);
          border: 1px solid rgba(168, 85, 247, 0.25);
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.45;
        }

        .notice-icon {
          color: #a855f7;
          flex-shrink: 0;
          margin-top: 2px;
        }

        @media (max-width: 640px) {
          .metrics-row {
            grid-template-columns: 1fr;
          }
          .days-grid {
            grid-template-columns: repeat(auto-fill, minmax(28px, 1fr));
            gap: 4px;
          }
          .day-box {
            height: 28px;
          }
        }
      `}</style>
    </div>
  );
}
