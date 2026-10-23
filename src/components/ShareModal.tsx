"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Check, Copy, MessageSquare, Send, Globe } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  title: string;
  currentSeconds: number;
}

function formatTime(totalSeconds: number): string {
  const rounded = Math.floor(totalSeconds);
  const m = Math.floor(rounded / 60);
  const s = rounded % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ShareModal({
  isOpen,
  onClose,
  videoId,
  title,
  currentSeconds,
}: ShareModalProps) {
  const [includeTimestamp, setIncludeTimestamp] = useState(false);
  const [copied, setCopied] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Auto-enable timestamp if video is currently playing beyond 2 seconds
  useEffect(() => {
    if (isOpen && currentSeconds > 2) {
      setIncludeTimestamp(true);
    } else if (isOpen) {
      setIncludeTimestamp(false);
    }
  }, [isOpen, currentSeconds]);

  // Handle escape key and click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validSeconds = Math.max(0, Math.floor(currentSeconds));
  const hasValidTimestamp = includeTimestamp && validSeconds > 0;

  // Canonical YouTube link with timestamp
  const youtubeUrl = hasValidTimestamp
    ? `https://www.youtube.com/watch?v=${videoId}&t=${validSeconds}s`
    : `https://www.youtube.com/watch?v=${videoId}`;

  // Internal watch URL with timestamp
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const internalUrl = hasValidTimestamp
    ? `${origin}/watch/${videoId}?t=${validSeconds}`
    : `${origin}/watch/${videoId}`;

  const shareUrl = youtubeUrl;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      }
    } catch (e) {
      console.warn("Clipboard copy failed", e);
    }
  };

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#25D366" }}>
          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0012.04 2zm0 1.67c4.55 0 8.24 3.7 8.24 8.24 0 2.2-.86 4.28-2.42 5.83a8.18 8.18 0 01-5.82 2.42c-1.46 0-2.88-.39-4.13-1.13l-.3-.18-3.07.81.82-2.99-.19-.31a8.214 8.214 0 01-1.26-4.45c0-4.54 3.7-8.24 8.24-8.24zm4.52 11.66c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.12-.17.25-.65.81-.8 1-.15.19-.3.21-.55.08-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.78 2.72 4.31 3.81.6.26 1.07.41 1.44.53.61.19 1.16.16 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.3z" />
        </svg>
      ),
      action: () => {
        const text = `${title}\n${shareUrl}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
        onClose();
      },
    },
    {
      name: "Telegram",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#229ED9" }}>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.52 2.77-1.18 3.35-1.38 3.73-1.39.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .37z" />
        </svg>
      ),
      action: () => {
        window.open(
          `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`,
          "_blank",
          "noopener,noreferrer"
        );
        onClose();
      },
    },
    {
      name: copied ? "Copied Link" : "Copy Link",
      icon: copied ? <Check size={20} style={{ color: "var(--accent-emerald)" }} /> : <Copy size={20} />,
      action: handleCopy,
      highlight: copied,
    },
    {
      name: "Messages / SMS",
      icon: <MessageSquare size={20} style={{ color: "#10b981" }} />,
      action: () => {
        const text = `${title} ${shareUrl}`;
        window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
        onClose();
      },
    },
    {
      name: "Facebook",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#1877F2" }}>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      action: () => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
          "_blank",
          "noopener,noreferrer,width=600,height=400"
        );
        onClose();
      },
    },
    {
      name: "X (Twitter)",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--text-main)" }}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      action: () => {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`,
          "_blank",
          "noopener,noreferrer,width=600,height=400"
        );
        onClose();
      },
    },
  ];

  return (
    <div className="share-popover-overlay" role="dialog" aria-modal="true" aria-label="Share video">
      <div ref={modalRef} className="share-popover-card">
        {/* Header */}
        <div className="share-header">
          <h3 className="share-title">Share</h3>
          <button
            type="button"
            onClick={onClose}
            className="share-close-btn"
            aria-label="Close share menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* 6 Share Options Grid */}
        <div className="share-options-grid">
          {shareOptions.map((opt) => (
            <button
              key={opt.name}
              type="button"
              onClick={opt.action}
              className={`share-option-btn ${opt.highlight ? "highlighted" : ""}`}
            >
              <div className="share-icon-circle">{opt.icon}</div>
              <span className="share-option-name">{opt.name}</span>
            </button>
          ))}
        </div>

        {/* Timestamp Option */}
        <div className="share-timestamp-row">
          <label className="timestamp-label">
            <input
              type="checkbox"
              checked={includeTimestamp}
              onChange={(e) => setIncludeTimestamp(e.target.checked)}
              className="timestamp-checkbox"
            />
            <span className="timestamp-text">
              Start at current time{" "}
              <strong className="timestamp-val">({formatTime(validSeconds)})</strong>
            </span>
          </label>
        </div>

        {/* URL Box & Copy Action */}
        <div className="share-url-box">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="share-url-input"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            type="button"
            onClick={handleCopy}
            className="btn btn-primary btn-sm share-copy-btn"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .share-popover-overlay {
          position: fixed;
          inset: 0;
          z-index: 999;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: fadeIn 0.2s ease forwards;
        }

        .share-popover-card {
          position: relative;
          width: 100%;
          max-width: 440px;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.25rem 1.5rem;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
          animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .share-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.25rem;
        }

        .share-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }

        .share-close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          transition: color 0.15s ease;
        }

        .share-close-btn:hover {
          color: var(--text-main);
        }

        .share-options-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.875rem 0.5rem;
          margin-bottom: 1.25rem;
        }

        .share-option-btn {
          background: transparent;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: var(--radius-md);
          transition: background-color 0.15s ease, transform 0.15s ease;
        }

        .share-option-btn:hover {
          background-color: var(--bg-subtle);
          transform: translateY(-2px);
        }

        .share-option-btn.highlighted {
          background-color: rgba(16, 185, 129, 0.12);
        }

        .share-icon-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 0.15s ease, transform 0.15s ease;
        }

        .share-option-btn:hover .share-icon-circle {
          border-color: var(--primary);
        }

        .share-option-name {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-main);
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 90px;
        }

        .share-timestamp-row {
          padding: 0.75rem 0.875rem;
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          margin-bottom: 1rem;
        }

        .timestamp-label {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          cursor: pointer;
          user-select: none;
        }

        .timestamp-checkbox {
          width: 16px;
          height: 16px;
          accent-color: var(--primary);
          cursor: pointer;
        }

        .timestamp-text {
          font-size: 0.8125rem;
          color: var(--text-muted);
        }

        .timestamp-val {
          color: var(--primary);
        }

        .share-url-box {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.5rem;
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
        }

        .share-url-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-main);
          font-size: 0.8125rem;
          padding: 0.25rem 0.375rem;
          outline: none;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .share-copy-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          white-space: nowrap;
          flex-shrink: 0;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          0% {
            opacity: 0;
            transform: scale(0.96) translateY(8px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
