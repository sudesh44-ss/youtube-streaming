"use client";

import Link from "next/link";
import { ShieldCheck, FileText, HelpCircle, Code } from "lucide-react";

export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border-color)",
        backgroundColor: "var(--bg-surface)",
        padding: "3rem 0 2rem",
        marginTop: "auto",
        fontSize: "0.875rem",
        color: "var(--text-muted)",
      }}
    >
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "2.5rem",
            marginBottom: "2.5rem",
          }}
        >
          {/* Brand & Overview */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.875rem" }}>
              <span style={{ fontWeight: 700, fontSize: "1.125rem", color: "var(--text-main)" }}>
                Omni<span style={{ color: "var(--primary)" }}>Discover</span>
              </span>
            </div>
            <p style={{ lineHeight: 1.6, color: "var(--text-dim)", marginBottom: "1rem" }}>
              Unified discovery architecture spanning education, music, movies, gaming, technology, sports, and news.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", fontSize: "0.75rem", color: "var(--text-dim)" }}>
              <Code size={14} /> Production Build v1.0.0
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 style={{ fontWeight: 600, color: "var(--text-main)", marginBottom: "1rem" }}>Platform</h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              <li><Link href="/dashboard" style={{ color: "inherit" }}>Discovery Dashboard</Link></li>
              <li><Link href="/#categories" style={{ color: "inherit" }}>Category Directory</Link></li>
              <li><Link href="/dashboard/saved" style={{ color: "inherit" }}>Saved Watchlist</Link></li>
              <li><Link href="/settings" style={{ color: "inherit" }}>Settings Center</Link></li>
              <li><Link href="/settings/connections" style={{ color: "inherit" }}>API Connections</Link></li>
            </ul>
          </div>

          {/* Documentation & Help */}
          <div>
            <h4 style={{ fontWeight: 600, color: "var(--text-main)", marginBottom: "1rem" }}>Help & Guides</h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              <li><Link href="/help" style={{ color: "inherit", display: "flex", alignItems: "center", gap: "0.375rem" }}><HelpCircle size={15} /> Help Center</Link></li>
              <li><Link href="/help/getting-started" style={{ color: "inherit" }}>Getting Started</Link></li>
              <li><Link href="/help/category-mode" style={{ color: "inherit" }}>Category Mode Guide</Link></li>
              <li><Link href="/help/connecting-youtube" style={{ color: "inherit" }}>YouTube API Setup</Link></li>
              <li><Link href="/help/connecting-tmdb" style={{ color: "inherit" }}>TMDB Setup</Link></li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 style={{ fontWeight: 600, color: "var(--text-main)", marginBottom: "1rem" }}>Legal & Privacy</h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              <li>
                <Link href="/privacy" style={{ color: "inherit", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <ShieldCheck size={15} /> Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" style={{ color: "inherit", display: "flex", alignItems: "center", gap: "0.375rem" }}>
                  <FileText size={15} /> Terms & Conditions
                </Link>
              </li>
              <li><Link href="/help/api-key-security" style={{ color: "inherit" }}>Encryption & Security</Link></li>
              <li><Link href="/help/privacy-data-controls" style={{ color: "inherit" }}>Data Subject Rights</Link></li>
            </ul>
          </div>
        </div>

        {/* Provider Attributions & Copyright */}
        <div
          style={{
            borderTop: "1px solid var(--border-color)",
            paddingTop: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            fontSize: "0.75rem",
            color: "var(--text-dim)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "space-between", alignItems: "center" }}>
            <p>© 2026 OmniDiscover. All rights reserved.</p>
            <p>
              Attribution: YouTube™ is a trademark of Google LLC. This platform uses the TMDB API but is not endorsed or certified by TMDB. Spotify® is a registered trademark of Spotify AB.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
