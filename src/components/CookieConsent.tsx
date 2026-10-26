"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Cookie, ShieldCheck, X, Sliders, Check, Lock, ArrowLeft } from "lucide-react";
import {
  getStoredConsent,
  saveConsentPreferences,
  acceptAllConsent,
  rejectOptionalConsent,
  OPEN_COOKIE_SETTINGS_EVENT,
  CONSENT_STORAGE_KEY,
} from "@/lib/cookie-consent";

// Storage and event compatibility: "omnidiscover_cookie_consent" and "open-cookie-settings"
export { CONSENT_STORAGE_KEY, OPEN_COOKIE_SETTINGS_EVENT };

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [functionalChoice, setFunctionalChoice] = useState(true);

  // Load existing consent on mount or schedule initial banner
  useEffect(() => {
    const existing = getStoredConsent();
    if (!existing) {
      // First visit: subtle 600ms entrance delay
      const timer = setTimeout(() => setIsVisible(true), 600);
      return () => clearTimeout(timer);
    } else {
      setFunctionalChoice(existing.functional);
    }
  }, []);

  // Listen for global reopen trigger (e.g. from footer link or privacy policy)
  useEffect(() => {
    const handleReopen = () => {
      const existing = getStoredConsent();
      if (existing) {
        setFunctionalChoice(existing.functional);
      }
      setIsCustomizing(true);
      setIsVisible(true);
    };

    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, handleReopen);
    return () => {
      window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, handleReopen);
    };
  }, []);

  // Keyboard accessibility: Escape closes modal or banner
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVisible) {
        if (isCustomizing) {
          setIsCustomizing(false);
        } else {
          // Closing via Escape records Reject Optional to prevent non-consensual tracking
          rejectOptionalConsent();
          setIsVisible(false);
        }
      }
    },
    [isVisible, isCustomizing]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleAcceptAll = () => {
    acceptAllConsent();
    setIsVisible(false);
    setIsCustomizing(false);
  };

  const handleRejectOptional = () => {
    rejectOptionalConsent();
    setIsVisible(false);
    setIsCustomizing(false);
  };

  const handleSaveCustom = () => {
    saveConsentPreferences({ functional: functionalChoice });
    setIsVisible(false);
    setIsCustomizing(false);
  };

  if (!isVisible) return null;

  return (
    <aside
      className={`cookie-consent-overlay ${isCustomizing ? "overlay-active" : ""}`}
      role="dialog"
      aria-labelledby="cookie-title"
      aria-describedby="cookie-desc"
      aria-modal={isCustomizing}
    >
      <div className={`cookie-consent-card ${isCustomizing ? "card-customizing" : ""}`}>
        {/* Card Header */}
        <div className="cookie-header">
          <div className="cookie-icon-bubble">
            <Cookie size={18} />
          </div>
          <div className="cookie-title-group">
            <h3 id="cookie-title" className="cookie-title">
              {isCustomizing ? "Privacy & Cookie Preferences" : "Cookie & Storage Preferences"}
            </h3>
            <span className="cookie-tag">Privacy First</span>
          </div>
          <button
            type="button"
            onClick={handleRejectOptional}
            className="cookie-close-btn"
            aria-label="Dismiss notice with essential security cookies only"
          >
            <X size={16} />
          </button>
        </div>

        {/* View 1: Main Banner */}
        {!isCustomizing ? (
          <>
            <p id="cookie-desc" className="cookie-description">
              Tubify uses <strong>Strictly Necessary</strong> cookies for authentication, CSRF mitigation, and
              account security. We use <strong>Functional Browser Storage</strong> (<code>localStorage</code> and{" "}
              <code>IndexedDB</code>) solely to remember your theme, regional preferences, and offline search cache.
              We deploy <strong>zero</strong> advertising or third-party tracking pixels.
            </p>

            <div className="cookie-actions">
              <button
                type="button"
                onClick={handleRejectOptional}
                className="btn btn-outline btn-sm cookie-btn"
                title="Only allow essential authentication and CSRF security cookies"
              >
                Reject Optional
              </button>
              <button
                type="button"
                onClick={() => setIsCustomizing(true)}
                className="btn btn-outline btn-sm cookie-btn"
                style={{ borderColor: "var(--border-color)", color: "var(--text-main)" }}
              >
                <Sliders size={13} style={{ marginRight: "0.25rem" }} />
                <span>Customize</span>
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="btn btn-primary btn-sm cookie-btn"
              >
                <ShieldCheck size={14} style={{ marginRight: "0.25rem" }} />
                <span>Accept All</span>
              </button>
            </div>

            <div className="cookie-footer">
              <Link href="/privacy#cookies" className="cookie-policy-link">
                Read full Cookie &amp; Storage Policy
              </Link>
            </div>
          </>
        ) : (
          /* View 2: Detailed Category Customization View */
          <div className="custom-categories-container">
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.5 }}>
              Choose which client-side storage technologies you permit. You can change these preferences at any time
              from the site footer or Privacy Policy.
            </p>

            <div className="categories-list">
              {/* Category 1: Strictly Necessary */}
              <div className="category-item">
                <div className="category-meta">
                  <div className="category-header">
                    <span className="category-name">Strictly Necessary</span>
                    <span className="badge badge-emerald category-status">
                      <Lock size={11} style={{ marginRight: "0.25rem" }} />
                      Always Active
                    </span>
                  </div>
                  <p className="category-desc">
                    Required for user login, session management (<code>platform_session</code>, Supabase tokens), and
                    CSRF protection during Google OAuth connections. Cannot be disabled without breaking the platform.
                  </p>
                </div>
              </div>

              {/* Category 2: Functional Browser Storage */}
              <div className="category-item">
                <div className="category-meta">
                  <div className="category-header">
                    <span className="category-name">Functional &amp; UI Storage</span>
                    <label className="toggle-label" htmlFor="toggle-functional">
                      <input
                        id="toggle-functional"
                        type="checkbox"
                        checked={functionalChoice}
                        onChange={(e) => setFunctionalChoice(e.target.checked)}
                        className="toggle-input"
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                  <p className="category-desc">
                    Stores your dark/light theme, country/language filters, video ratings, and offline search results
                    cache in your browser’s <code>localStorage</code> and <code>IndexedDB</code>. Never sent to advertising networks.
                  </p>
                </div>
              </div>

              {/* Category 3: Analytics & Performance */}
              <div className="category-item category-disabled">
                <div className="category-meta">
                  <div className="category-header">
                    <span className="category-name">Analytics &amp; Performance</span>
                    <span className="badge category-status" style={{ opacity: 0.6 }}>
                      Not Deployed
                    </span>
                  </div>
                  <p className="category-desc">
                    Tubify does not deploy Google Analytics, tracking pixels, or third-party telemetry scripts.
                    This category is permanently inactive.
                  </p>
                </div>
              </div>

              {/* Category 4: Advertising & Cross-Site Tracking */}
              <div className="category-item category-disabled">
                <div className="category-meta">
                  <div className="category-header">
                    <span className="category-name">Advertising &amp; Profiling</span>
                    <span className="badge category-status" style={{ opacity: 0.6 }}>
                      Not Deployed
                    </span>
                  </div>
                  <p className="category-desc">
                    Tubify does not sell personal data, host third-party advertisements, or participate in
                    cross-site behavioral profiling.
                  </p>
                </div>
              </div>
            </div>

            <div className="custom-actions">
              <button
                type="button"
                onClick={() => setIsCustomizing(false)}
                className="btn btn-outline btn-sm"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
              >
                <ArrowLeft size={13} />
                <span>Back</span>
              </button>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={handleRejectOptional}
                  className="btn btn-outline btn-sm"
                >
                  Essential Only
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  className="btn btn-primary btn-sm"
                >
                  <Check size={14} style={{ marginRight: "0.25rem" }} />
                  <span>Save Preferences</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .cookie-consent-overlay {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 10000;
          }

          .cookie-consent-overlay.overlay-active {
            inset: 0;
            background: rgba(0, 0, 0, 0.55);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            bottom: 0;
            right: 0;
          }

          .cookie-consent-card {
            width: 440px;
            max-width: calc(100vw - 32px);
            background-color: var(--bg-surface);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-lg);
            padding: 1.25rem;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
            animation: slideUpFade 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            backdrop-filter: blur(16px);
          }

          .cookie-consent-card.card-customizing {
            width: 520px;
            max-height: 90vh;
            overflow-y: auto;
          }

          :global([data-theme="light"]) .cookie-consent-card {
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.15);
          }

          .cookie-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 0.875rem;
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
            line-height: 1.55;
            margin: 0 0 1rem;
          }

          .cookie-actions {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex-wrap: wrap;
          }

          .cookie-btn {
            flex: 1;
            min-width: 105px;
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

          /* Categories View */
          .custom-categories-container {
            display: flex;
            flex-direction: column;
            gap: 0.875rem;
          }

          .categories-list {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            max-height: 52vh;
            overflow-y: auto;
            padding-right: 4px;
          }

          .category-item {
            background: var(--bg-surface-elevated);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 0.75rem 0.875rem;
          }

          .category-item.category-disabled {
            opacity: 0.7;
          }

          .category-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 0.35rem;
          }

          .category-name {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-main);
          }

          .category-status {
            font-size: 0.6875rem;
            padding: 2px 6px;
            display: inline-flex;
            align-items: center;
          }

          .category-desc {
            font-size: 0.78125rem;
            color: var(--text-muted);
            line-height: 1.45;
            margin: 0;
          }

          .custom-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 1rem;
            padding-top: 0.75rem;
            border-top: 1px solid var(--border-color);
          }

          /* Switch styling */
          .toggle-label {
            position: relative;
            display: inline-block;
            width: 36px;
            height: 20px;
            cursor: pointer;
          }

          .toggle-input {
            opacity: 0;
            width: 0;
            height: 0;
          }

          .toggle-slider {
            position: absolute;
            cursor: pointer;
            inset: 0;
            background-color: rgba(255, 255, 255, 0.2);
            transition: 0.2s;
            border-radius: 20px;
          }

          .toggle-slider:before {
            position: absolute;
            content: "";
            height: 14px;
            width: 14px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: 0.2s;
            border-radius: 50%;
          }

          .toggle-input:checked + .toggle-slider {
            background-color: var(--primary);
          }

          .toggle-input:checked + .toggle-slider:before {
            transform: translateX(16px);
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
            .cookie-consent-overlay:not(.overlay-active) {
              bottom: 16px;
              right: 16px;
              left: 16px;
            }
            .cookie-consent-card {
              width: auto;
            }
          }
        `}</style>
      </div>
    </aside>
  );
}
