"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, ShieldCheck, X } from "lucide-react";

interface CookieSettings {
  essential: boolean;
  preferences: boolean;
  analytics: boolean;
  timestamp: number;
  version: number;
}

const STORAGE_KEY = "omnidiscover_cookie_consent";
const CURRENT_VERSION = 1;

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // First visit: show after a brief 600ms delay for smooth page entrance
        const timer = setTimeout(() => setIsVisible(true), 600);
        return () => clearTimeout(timer);
      } else {
        const parsed: CookieSettings = JSON.parse(stored);
        if (parsed.version !== CURRENT_VERSION) {
          setIsVisible(true);
        }
      }
    } catch {
      // LocalStorage access restricted / private browsing
    }
  }, []);

  // Listen for manual trigger to reopen cookie settings (e.g. from Privacy or Settings page)
  useEffect(() => {
    const handleReopen = () => {
      setIsVisible(true);
    };
    window.addEventListener("open-cookie-settings", handleReopen);
    return () => {
      window.removeEventListener("open-cookie-settings", handleReopen);
    };
  }, []);

  const saveConsent = (allowPreferences: boolean) => {
    const settings: CookieSettings = {
      essential: true,
      preferences: allowPreferences,
      analytics: false,
      timestamp: Date.now(),
      version: CURRENT_VERSION,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Safe fallback
    }
    setHasInteracted(true);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      className="cookie-consent-card"
      role="dialog"
      aria-label="Cookie & Storage Preferences"
      aria-modal="false"
    >
      <div className="cookie-header">
        <div className="cookie-icon-bubble">
          <Cookie size={18} />
        </div>
        <div className="cookie-title-group">
          <h3 className="cookie-title">Cookie &amp; Storage Preferences</h3>
          <span className="cookie-tag">Privacy First</span>
        </div>
        <button
          type="button"
          onClick={() => saveConsent(false)}
          className="cookie-close-btn"
          aria-label="Dismiss cookie notice with essential cookies only"
        >
          <X size={16} />
        </button>
      </div>

      <p className="cookie-description">
        We use essential cookies for secure authentication and sessions. Functional local storage is
        used to remember your theme and region settings. We never use third-party tracking or advertising cookies.
      </p>

      <div className="cookie-actions">
        <button
          type="button"
          onClick={() => saveConsent(false)}
          className="btn btn-outline btn-sm cookie-btn"
        >
          Essential Only
        </button>
        <button
          type="button"
          onClick={() => saveConsent(true)}
          className="btn btn-primary btn-sm cookie-btn"
        >
          <ShieldCheck size={14} />
          <span>Accept All</span>
        </button>
      </div>

      <div className="cookie-footer">
        <Link href="/privacy#cookies" className="cookie-policy-link">
          Read full Cookie &amp; Storage Policy
        </Link>
      </div>

      <style jsx>{`
        .cookie-consent-card {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 380px;
          max-width: calc(100vw - 32px);
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.25rem;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
          z-index: 1000;
          animation: slideUpFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          backdrop-filter: blur(12px);
        }

        :global([data-theme="light"]) .cookie-consent-card {
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12);
        }

        .cookie-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .cookie-icon-bubble {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background-color: rgba(56, 189, 248, 0.15);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .cookie-title-group {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .cookie-title {
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--text-main);
          margin: 0;
        }

        .cookie-tag {
          font-size: 0.625rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        .cookie-close-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: color 0.15s ease;
        }

        .cookie-close-btn:hover {
          color: var(--text-main);
        }

        .cookie-description {
          font-size: 0.8125rem;
          color: var(--text-muted);
          line-height: 1.5;
          margin: 0 0 1rem;
        }

        .cookie-actions {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }

        .cookie-btn {
          flex: 1;
          justify-content: center;
          font-size: 0.8125rem;
        }

        .cookie-footer {
          margin-top: 0.75rem;
          text-align: center;
        }

        .cookie-policy-link {
          font-size: 0.75rem;
          color: var(--text-dim);
          text-decoration: underline;
          transition: color 0.15s ease;
        }

        .cookie-policy-link:hover {
          color: var(--primary);
        }

        @keyframes slideUpFade {
          0% {
            opacity: 0;
            transform: translateY(16px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 480px) {
          .cookie-consent-card {
            bottom: 16px;
            right: 16px;
            left: 16px;
            width: auto;
          }
        }
      `}</style>
    </aside>
  );
}
