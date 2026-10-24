"use client";

import Link from "next/link";
import { Shield, ArrowLeft, Cookie, Database, Trash2, Sliders } from "lucide-react";

export default function PrivacyPolicyPage() {
  const handleOpenCookieSettings = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("open-cookie-settings"));
    }
  };

  return (
    <div className="container" style={{ maxWidth: "860px", padding: "3rem 1.25rem 5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            fontSize: "0.875rem",
            color: "var(--primary)",
            marginBottom: "1rem",
          }}
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <Shield size={24} style={{ color: "var(--accent-emerald)" }} />
          <h1 style={{ fontSize: "2.25rem", fontWeight: 800 }}>Privacy Policy</h1>
        </div>
        <p style={{ color: "var(--text-dim)", fontSize: "0.875rem" }}>
          Document Version: 2026.2 • Effective Date: October 2026 • Last Reviewed: October 24, 2026
        </p>
      </div>

      <div
        className="card"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "2.25rem",
          lineHeight: 1.7,
          color: "var(--text-muted)",
          fontSize: "0.9375rem",
        }}
      >
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            1. Introduction &amp; Overview
          </h2>
          <p>
            Welcome to OmniDiscover (&quot;the Platform&quot;). We respect your privacy and are committed to protecting personal data collected through our service. This Privacy Policy outlines what information we collect, how it is processed, our rolling 30-day activity retention policy, how API credentials are encrypted, and your statutory rights under applicable privacy frameworks, including the Indian Digital Personal Data Protection (DPDP) Act and General Data Protection Regulation (GDPR) standards.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            2. Information We Collect
          </h2>
          <p style={{ marginBottom: "0.5rem" }}>We collect only data necessary to deliver unified discovery services:</p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li><strong>Account Information:</strong> Name, display name, and email address. When password authentication is used, credentials are salted and hashed with PBKDF2 (100,000 iterations of SHA-512) or verified by Supabase Auth.</li>
            <li><strong>User Preferences:</strong> Content region (country preference), interface language, browsing mode (Normal vs Category Mode), theme selection (Dark vs Light), layout density, and preferred categories.</li>
            <li><strong>Watchlist &amp; Saved Items:</strong> Content IDs, provider references, titles, and saved timestamps of items you explicitly bookmark.</li>
            <li><strong>Activity Logs (Search &amp; Watch History):</strong> Search queries executed on the platform and video playback progress, used solely to power your private dashboard history, continue-watching carousels, and transparent recommendation scoring.</li>
            <li><strong>Security &amp; Consent Records:</strong> Timestamps of Terms and Privacy acceptance, cookie consent selections, document versions, and security event logs.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            3. API Credentials &amp; Encryption Architecture
          </h2>
          <p style={{ marginBottom: "0.75rem" }}>
            When you connect personal third-party credentials (such as a YouTube Data API v3 key or TMDB API key), we implement strict server-side cryptographic isolation:
          </p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li><strong>Authenticated Encryption:</strong> All API secrets are encrypted using <strong>AES-256-GCM</strong> with unique 96-bit initialization vectors (IVs) and 128-bit authentication tags.</li>
            <li><strong>No Client Exposure:</strong> Plaintext keys are never returned in client JSON responses or stored in browser localStorage. Only masked representations (e.g. <code>AIza••••••••487</code>) are displayed.</li>
            <li><strong>Internal Server Usage:</strong> Decryption occurs exclusively in server memory during outgoing requests to official provider endpoints.</li>
          </ul>
        </section>

        <section id="cookies">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "0.75rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Cookie size={20} style={{ color: "var(--primary)" }} />
              4. Cookies and Similar Technologies
            </h2>
            <button
              type="button"
              onClick={handleOpenCookieSettings}
              className="btn btn-outline btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
            >
              <Sliders size={14} />
              <span>Manage Cookie Preferences</span>
            </button>
          </div>
          <p style={{ marginBottom: "0.75rem" }}>
            OmniDiscover uses a minimal, transparent storage strategy designed to put user privacy first:
          </p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li><strong>Essential Cookies:</strong> Secure, HttpOnly, SameSite=Lax session cookies (<code>omni_session_v2</code> and Supabase Auth tokens) strictly required for user authentication, session persistence, and Cross-Site Request Forgery (CSRF) mitigation.</li>
            <li><strong>Functional Browser Storage:</strong> HTML5 <code>localStorage</code> is used to store user interface preferences (dark/light theme preference, country region preference, and volume/miniplayer state) across sessions without unnecessary server roundtrips.</li>
            <li><strong>No Tracking Pixels:</strong> We do not deploy third-party advertising cookies, behavioural cross-site tracking pixels, fingerprinting scripts, or data-broker trackers.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Database size={20} style={{ color: "var(--accent-emerald)" }} />
            5. Data Retention and Local Storage Lifecycles
          </h2>
          <p style={{ marginBottom: "0.75rem" }}>
            We implement strict data minimization principles with an automated lifecycle policy:
          </p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li><strong>30-Day Server Retention for Activity:</strong> Search query history (<code>search_history</code>) and video watch records (<code>watch_history</code>) are subject to a 30-day retention schedule. Records older than 30 days are automatically pruned via automated database maintenance jobs.</li>
            <li><strong>Preserved Account Records:</strong> User profiles, country and language preferences, saved watchlists (<code>saved_content</code>), and encrypted API credentials remain safely preserved until explicitly edited or deleted by the user.</li>
            <li><strong>Browser-Local Cache Separation:</strong> Temporary local storage in your browser may retain recent search terms or cached metadata for offline resilience. You can clear this anytime using the &quot;Clear Local Activity Cache&quot; action in Settings or via browser privacy tools.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            6. Third-Party Provider Integrations
          </h2>
          <p>
            When searching or streaming content, requests are dispatched to official external service providers:
          </p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
            <li><strong>YouTube (Google LLC):</strong> Video searches, channel feeds, and embedded video streaming comply with the <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>Google Privacy Policy</a> and YouTube Terms of Service.</li>
            <li><strong>The Movie Database (TMDB):</strong> Movie and TV metadata, posters, and ratings are queried in accordance with TMDB API terms.</li>
            <li><strong>Spotify:</strong> Music catalog metadata is retrieved under Spotify Developer terms.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Trash2 size={20} style={{ color: "#f43f5e" }} />
            7. Complete Account Deletion (&quot;Right to be Forgotten&quot;)
          </h2>
          <p>
            You have the right to permanently erase your entire digital footprint at any time. When you initiate account deletion from <strong>Settings &rarr; Privacy &amp; Security</strong>:
          </p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
            <li>Your Supabase Auth user record is permanently deleted.</li>
            <li>All associated database rows across <code>profiles</code>, <code>user_preferences</code>, <code>provider_credentials</code>, <code>saved_content</code>, <code>watch_history</code>, and <code>search_history</code> are cascaded and permanently deleted.</li>
            <li>All application cookies, session tokens, and browser-stored caches are immediately flushed.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            8. User Rights and Data Portability
          </h2>
          <p style={{ marginBottom: "0.5rem" }}>Under data protection regulations, you hold the right to:</p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li><strong>Export Your Data:</strong> Download a full machine-readable JSON archive of your profile, preferences, saved watchlist, and activity history at any time from Settings.</li>
            <li><strong>Rectification:</strong> Immediately update your profile display name, region, and preferences from Settings.</li>
            <li><strong>Consent Revocation:</strong> Revoke or reconfigure your cookie consent choices at any time using the Cookie Preferences trigger above.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            9. Contact &amp; Privacy Officer
          </h2>
          <p>
            If you have questions regarding this Privacy Policy or wish to exercise any statutory rights, please visit our <Link href="/help" style={{ color: "var(--primary)" }}>Help Center</Link> or consult your designated application administrator.
          </p>
        </section>
      </div>
    </div>
  );
}
