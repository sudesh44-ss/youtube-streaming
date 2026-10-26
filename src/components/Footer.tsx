"use client";

import Link from "next/link";
import { ShieldCheck, FileText, HelpCircle, Code, Cookie } from "lucide-react";
import { reopenCookieConsentModal } from "@/lib/cookie-consent";

export function Footer() {
  return (
    <footer className="footer-root">
      <div className="container">
        <div className="footer-grid">
          {/* Brand & Overview */}
          <div className="footer-brand">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.875rem" }}>
              <span style={{ fontWeight: 700, fontSize: "1.125rem", color: "var(--text-main)" }}>
                Tub<span style={{ color: "var(--primary)" }}>ify</span>
              </span>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", color: "var(--text-dim)" }}>
              <Code size={14} /> Production Build v1.0.0
            </div>
          </div>

          {/* Two-Column Navigation Layout */}
          <div className="footer-nav-columns">
            {/* Left column: Platform, and Legal & Privacy directly below it */}
            <div className="footer-nav-col">
              {/* Platform */}
              <div>
                <h4 className="footer-col-heading">Platform</h4>
                <ul className="footer-link-list">
                  <li><Link href="/dashboard" className="footer-link">Discovery Dashboard</Link></li>
                  <li><Link href="/dashboard/saved" className="footer-link">Saved Watchlist</Link></li>
                  <li><Link href="/settings" className="footer-link">Settings Center</Link></li>
                  <li><Link href="/settings/connections" className="footer-link">API Connections</Link></li>
                </ul>
              </div>

              {/* Legal & Privacy directly below Platform in left column */}
              <div style={{ marginTop: "1.75rem" }}>
                <h4 className="footer-col-heading">Legal & Privacy</h4>
                <ul className="footer-link-list">
                  <li>
                    <Link href="/privacy" className="footer-link-icon">
                      <ShieldCheck size={15} /> <span>Privacy Policy</span>
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="footer-link-icon">
                      <FileText size={15} /> <span>Terms & Conditions</span>
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={reopenCookieConsentModal}
                      className="footer-link-icon"
                      style={{ background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer", textAlign: "left", width: "100%", color: "inherit" }}
                    >
                      <Cookie size={15} /> <span>Cookie Preferences</span>
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right column: Help & Guides */}
            <div className="footer-nav-col">
              <div>
                <h4 className="footer-col-heading">Help & Guides</h4>
                <ul className="footer-link-list">
                  <li>
                    <Link href="/help" className="footer-link-icon">
                      <HelpCircle size={15} /> <span>Help Center</span>
                    </Link>
                  </li>
                  <li><Link href="/help/connecting-youtube" className="footer-link">YouTube API Setup</Link></li>
                  <li><Link href="/help/connecting-tmdb" className="footer-link">TMDB Setup</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Bottom Row: Copyright & Made with 💗 on same line */}
        <div className="footer-bottom-row">
          <p className="footer-bottom-text">© 2026 Tubify. All rights reserved.</p>
          <p className="footer-bottom-text">Made with 💗</p>
        </div>
      </div>

      <style jsx>{`
        .footer-root {
          border-top: 1px solid var(--border-color);
          background-color: var(--bg-surface);
          padding: 3rem 0 2rem;
          margin-top: auto;
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .footer-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2.5rem;
          margin-bottom: 2.5rem;
        }

        @media (min-width: 768px) {
          .footer-grid {
            grid-template-columns: 240px 1fr;
            gap: 3rem;
          }
        }

        .footer-nav-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        .footer-col-heading {
          font-weight: 600;
          color: var(--text-main);
          margin-bottom: 0.875rem;
          font-size: 0.9375rem;
        }

        .footer-link-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }

        .footer-link {
          color: inherit;
          text-decoration: none;
          transition: color 0.15s ease;
        }

        .footer-link:hover {
          color: var(--primary);
        }

        .footer-link-icon {
          color: inherit;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          transition: color 0.15s ease;
        }

        .footer-link-icon:hover {
          color: var(--primary);
        }

        .footer-bottom-row {
          border-top: 1px solid var(--border-color);
          padding-top: 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          color: var(--text-dim);
          gap: 0.75rem;
          flex-wrap: nowrap;
        }

        .footer-bottom-text {
          margin: 0;
          white-space: nowrap;
        }

        @media (max-width: 360px) {
          .footer-bottom-text {
            font-size: 0.6875rem;
          }
        }
      `}</style>
    </footer>
  );
}
