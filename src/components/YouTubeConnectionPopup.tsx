"use client";

import { useEffect, useState } from "react";
import { Video, X } from "lucide-react";

interface YouTubeConnectionPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = "omnidiscover_yt_popup_dismissed";

export function YouTubeConnectionPopup({ isOpen, onClose }: YouTubeConnectionPopupProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const isDismissed = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY) === "true";
      if (!isDismissed) {
        setVisible(true);
      }
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    setVisible(false);
    onClose();
  };

  const handleConnect = () => {
    // Navigate to YouTube OAuth connect flow
    window.location.href = "/api/auth/youtube/connect";
  };

  if (!visible) return null;

  return (
    <aside
      className="yt-popup-container"
      role="dialog"
      aria-labelledby="yt-popup-title"
      aria-describedby="yt-popup-desc"
    >
      <div className="yt-popup-card">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="yt-popup-close"
          aria-label="Dismiss YouTube account connection prompt"
        >
          <X size={16} />
        </button>

        {/* Header with Icon */}
        <div className="yt-popup-header">
          <div className="yt-popup-icon-badge">
            <Video size={22} style={{ color: "#ef4444" }} />
          </div>
          <div>
            <h3 id="yt-popup-title" className="yt-popup-title">
              Connect your YouTube account for a personalized experience
            </h3>
            <p id="yt-popup-desc" className="yt-popup-desc">
              Connect to like videos directly on YouTube, sync watch activity, and access your subscriptions with total control.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="yt-popup-actions">
          <button
            type="button"
            onClick={handleDismiss}
            className="btn btn-outline btn-sm yt-popup-dismiss-btn"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={handleConnect}
            className="btn btn-primary btn-sm yt-popup-connect-btn"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .yt-popup-container {
          position: fixed;
          bottom: 1.5rem;
          right: 1.5rem;
          z-index: 990;
          max-width: 440px;
          width: calc(100vw - 3rem);
          animation: slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .yt-popup-card {
          position: relative;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.25rem 1.5rem;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(12px);
        }

        .yt-popup-close {
          position: absolute;
          top: 0.75rem;
          right: 0.75rem;
          background: transparent;
          border: none;
          color: var(--text-dim);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s ease;
        }

        .yt-popup-close:hover {
          color: var(--text-main);
        }

        .yt-popup-header {
          display: flex;
          align-items: flex-start;
          gap: 0.875rem;
          margin-bottom: 1rem;
        }

        .yt-popup-icon-badge {
          width: 42px;
          height: 42px;
          border-radius: 10px;
          background-color: rgba(239, 68, 68, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .yt-popup-title {
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--text-main);
          line-height: 1.35;
          margin: 0 0 0.375rem 0;
          padding-right: 1.25rem;
        }

        .yt-popup-desc {
          font-size: 0.8125rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0;
        }

        .yt-popup-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.625rem;
          margin-top: 0.5rem;
        }

        .yt-popup-connect-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        @keyframes slideUpFade {
          0% {
            opacity: 0;
            transform: translateY(16px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 480px) {
          .yt-popup-container {
            bottom: 1rem;
            right: 0.75rem;
            left: 0.75rem;
            width: auto;
          }
        }
      `}</style>
    </aside>
  );
}
