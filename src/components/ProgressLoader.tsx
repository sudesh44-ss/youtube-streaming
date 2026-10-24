"use client";

import { useState, useEffect } from "react";

interface ProgressLoaderProps {
  message: string;
  isComplete?: boolean;
}

export function ProgressLoader({ message, isComplete = false }: ProgressLoaderProps) {
  const [percent, setPercent] = useState(14);

  useEffect(() => {
    if (isComplete) {
      setPercent(100);
      return;
    }

    // Time-based smooth progress that approaches 99% asymptotically without falsely reaching 100%
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setPercent((prev) => {
        if (prev >= 99) return 99;
        // Asymptotically approaches 99%
        const target = Math.min(99, Math.floor(15 + (1 - Math.exp(-elapsed / 1100)) * 84));
        return Math.max(prev, target);
      });
    }, 75);

    return () => clearInterval(interval);
  }, [isComplete]);

  return (
    <div className="progress-loader-container">
      {/* First row: Circular loading spinner + percentage counter */}
      <div className="progress-loader-row">
        <div className="progress-spinner" aria-hidden="true" />
        <span className="progress-percent" aria-live="polite">
          {percent}%
        </span>
      </div>

      {/* Second row: Status text centered directly beneath spinner and percentage */}
      <p className="progress-message">{message}</p>

      <style jsx>{`
        .progress-loader-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.875rem;
          padding: 5rem 1rem;
          width: 100%;
          box-sizing: border-box;
        }

        .progress-loader-row {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
        }

        .progress-spinner {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid rgba(56, 189, 248, 0.2);
          border-top-color: var(--primary, #38bdf8);
          animation: fastSpinner 0.57s linear infinite; /* 1.75x standard 1s rotation */
          flex-shrink: 0;
          box-sizing: border-box;
        }

        :global([data-theme="light"]) .progress-spinner {
          border-color: rgba(2, 132, 199, 0.2);
          border-top-color: var(--primary, #0284c7);
        }

        .progress-percent {
          font-size: 1.15rem;
          font-weight: 700;
          color: var(--text-main, #ffffff);
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.01em;
          min-width: 44px;
          text-align: left;
        }

        .progress-message {
          font-size: 0.9375rem;
          color: var(--text-muted, #94a3b8);
          margin: 0;
          text-align: center;
          font-weight: 500;
        }

        @keyframes fastSpinner {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .progress-spinner {
            animation: fastSpinner 2s linear infinite;
          }
        }
      `}</style>
    </div>
  );
}
