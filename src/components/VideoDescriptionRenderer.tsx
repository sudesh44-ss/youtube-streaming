"use client";

import { useState, useMemo, useEffect } from "react";
import { ChevronDown, ChevronUp, Clock, ExternalLink } from "lucide-react";

interface VideoDescriptionRendererProps {
  description: string;
  onSeek?: (seconds: number) => void;
}

// Convert "01:23" or "1:23:45" to total seconds
function parseTimestampToSeconds(ts: string): number {
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

export function VideoDescriptionRenderer({ description, onSeek }: VideoDescriptionRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Reset expanded state whenever video description changes (navigating to a different video)
  useEffect(() => {
    setIsExpanded(false);
  }, [description]);

  // Parse lines into tokens: text, timestamp button, or clickable link
  const parsedContent = useMemo(() => {
    if (!description) return [];

    const lines = description.split("\n");

    return lines.map((line, lineIdx) => {
      // Regex matches either timestamp (0:15 or 1:23:45) OR URL
      const tokenRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s]|www\.[^\s<]+[^<.,:;"')\]\s]|\b(?:(?:\d{1,2}:)?\d{1,2}:\d{2})\b)/g;

      const elements: React.ReactNode[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = tokenRegex.exec(line)) !== null) {
        // Plain text before token
        if (match.index > lastIndex) {
          elements.push(line.substring(lastIndex, match.index));
        }

        const token = match[0];
        const isTimestamp = /^(?:(?:\d{1,2}:)?\d{1,2}:\d{2})$/.test(token);
        const isUrl = /^https?:\/\/|^www\./.test(token);

        if (isTimestamp && onSeek) {
          const seconds = parseTimestampToSeconds(token);
          elements.push(
            <button
              key={`ts-${lineIdx}-${match.index}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSeek(seconds);
              }}
              className="desc-timestamp-btn"
              title={`Jump playback to ${token}`}
              aria-label={`Jump to timestamp ${token}`}
            >
              <Clock size={12} className="desc-ts-icon" />
              <span>{token}</span>
            </button>
          );
        } else if (isUrl) {
          const href = token.startsWith("www.") ? `https://${token}` : token;
          elements.push(
            <a
              key={`url-${lineIdx}-${match.index}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="desc-link"
              title={href}
            >
              <span>{token}</span>
              <ExternalLink size={10} className="desc-ext-icon" />
            </a>
          );
        } else {
          elements.push(token);
        }

        lastIndex = tokenRegex.lastIndex;
      }

      // Remaining plain text after last token
      if (lastIndex < line.length) {
        elements.push(line.substring(lastIndex));
      }

      return (
        <span key={`line-${lineIdx}`} className="desc-line">
          {elements.length > 0 ? elements : "\u00A0"}
          {lineIdx < lines.length - 1 && "\n"}
        </span>
      );
    });
  }, [description, onSeek]);

  if (!description) {
    return (
      <div className="watch-description-box empty">
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
          No description provided for this video.
        </p>
      </div>
    );
  }

  // Determine if description exceeds 2 lines
  const isLong = description.length > 120 || description.split("\n").filter((l) => l.trim().length > 0).length > 2;

  const handleBoxClick = (e: React.MouseEvent) => {
    if (!isLong) return;

    // Check if user is currently selecting/highlighting text to copy
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      return; // Do not toggle on text selection
    }

    setIsExpanded((prev) => !prev);
  };

  return (
    <div
      onClick={handleBoxClick}
      className={`watch-description-box ${isLong ? "clickable" : ""} ${isExpanded ? "expanded" : "collapsed"}`}
      role={isLong ? "button" : undefined}
      tabIndex={isLong ? 0 : undefined}
      onKeyDown={(e) => {
        if (isLong && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          setIsExpanded((prev) => !prev);
        }
      }}
      aria-expanded={isLong ? isExpanded : undefined}
      aria-label={isLong ? (isExpanded ? "Collapse video description" : "Expand video description") : undefined}
    >
      <div className={`description-body ${isExpanded ? "expanded" : "clamped"}`}>
        {parsedContent}
      </div>

      {isLong && (
        <div className="description-toggle-row">
          <span className="desc-toggle-label">
            {isExpanded ? "Show less" : "...more"}
          </span>
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      )}

      <style jsx>{`
        .watch-description-box {
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          padding: 1rem 1.125rem;
          margin-top: 1.25rem;
          transition: background-color 0.2s ease, border-color 0.2s ease;
          position: relative;
          user-select: text;
          -webkit-user-select: text;
        }

        .watch-description-box.clickable {
          cursor: pointer;
        }

        .watch-description-box.clickable:hover {
          background-color: var(--bg-subtle);
          border-color: var(--border-focus);
        }

        .description-body {
          font-size: 0.875rem;
          line-height: 1.6;
          color: var(--text-main);
          white-space: pre-wrap;
          word-break: break-word;
        }

        .description-body.clamped {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .description-body.expanded {
          display: block;
        }

        .desc-line {
          display: inline;
        }

        :global(.desc-timestamp-btn) {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 1px 6px;
          margin: 0 3px;
          border-radius: 4px;
          background-color: rgba(56, 189, 248, 0.12);
          color: var(--primary);
          border: 1px solid rgba(56, 189, 248, 0.3);
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          font-variant-numeric: tabular-nums;
          transition: all 0.15s ease;
          vertical-align: middle;
        }

        :global(.desc-timestamp-btn:hover) {
          background-color: var(--primary);
          color: #ffffff;
          border-color: var(--primary);
          transform: translateY(-1px);
        }

        :global(.desc-link) {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          color: var(--primary);
          text-decoration: underline;
          text-underline-offset: 2px;
          word-break: break-all;
          transition: color 0.15s ease;
        }

        :global(.desc-link:hover) {
          color: #38bdf8;
        }

        .description-toggle-row {
          margin-top: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: var(--text-muted);
          font-size: 0.8125rem;
          font-weight: 600;
        }

        .watch-description-box.clickable:hover .description-toggle-row {
          color: var(--primary);
        }
      `}</style>
    </div>
  );
}
