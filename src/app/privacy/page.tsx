"use client";

import Link from "next/link";
import { Shield, ArrowLeft, Cookie, Database, Trash2, Sliders, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { reopenCookieConsentModal } from "@/lib/cookie-consent";

export default function PrivacyPolicyPage() {
  const handleOpenCookieSettings = () => {
    reopenCookieConsentModal();
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
          Document Version: 2026.3 • Effective Date: October 2026 • Last Reviewed: October 25, 2026
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
        {/* Section 1 */}
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            1. Operator Information &amp; Scope
          </h2>
          <p>
            OmniDiscover (&quot;the Platform&quot;, &quot;we&quot;, &quot;our&quot;) is a privacy-first web application designed
            for streamlined content discovery, personalized recommendations, and creator interaction across media ecosystems.
            This Privacy Policy describes transparently how we collect, store, process, protect, and delete personal data.
            OmniDiscover is operated by the OmniDiscover project development team. For privacy queries, statutory requests,
            or data protection matters, please reach our team through the in-app{" "}
            <Link href="/help" style={{ color: "var(--primary)" }}>Help Center</Link> or the project repository.
          </p>
        </section>

        {/* Section 2 */}
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            2. Information We Collect and Sources
          </h2>
          <p style={{ marginBottom: "0.5rem" }}>We collect only data necessary to deliver verified discovery services:</p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li>
              <strong>Account &amp; Authentication Data:</strong> When registering, your name, display name, and email address
              are stored. Password authentication uses PBKDF2 (100,000 rounds of SHA-512) or Supabase Auth. We distinguish
              your OmniDiscover login identity from any Google account separately authorized for YouTube features.
            </li>
            <li>
              <strong>Google &amp; YouTube Authorized Data:</strong> If you connect a Google account, we retrieve your authorized
              channel title, channel identifier, Google account email, and OAuth tokens. Tokens are encrypted server-side with
              AES-256-GCM.
            </li>
            <li>
              <strong>User Preferences:</strong> Regional content filter (country code), UI language, browsing mode (Normal vs
              Category Mode), theme (Dark vs Light), and content categories.
            </li>
            <li>
              <strong>Saved Items &amp; Watchlist:</strong> Content IDs, provider references, titles, and timestamps when you
              explicitly bookmark videos.
            </li>
            <li>
              <strong>Activity Logs (30-Day Server Retention):</strong> Search queries and video playback progress are logged to
              power your continue-watching carousels, dashboard history, and recommendation scoring. Raw activity older than
              30 days is automatically purged by scheduled database maintenance routines.
            </li>
            <li>
              <strong>Learned Recommendation Profiles:</strong> Aggregate category and creator affinities stored in{" "}
              <code>user_recommendation_profiles</code> to preserve discovery adaptiveness across 30-day raw log cleanups.
              You can reset this profile anytime from Settings.
            </li>
            <li>
              <strong>Technical &amp; Security Logs:</strong> IP addresses (processed transiently for Upstash Redis distributed
              rate limiting to defend against brute-force attacks), user-agent strings, and security event logs.
            </li>
          </ul>
        </section>

        {/* Section 3: Dedicated Google OAuth Section */}
        <section style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "1.25rem", backgroundColor: "var(--bg-surface-elevated)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <Lock size={20} style={{ color: "#ef4444" }} />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
              3. Google &amp; YouTube Account Authorization
            </h2>
          </div>
          <p style={{ marginBottom: "0.75rem" }}>
            OmniDiscover allows users to optionally connect their personal Google account to interact with YouTube creators
            directly within the application. Please review the following verified technical safeguards:
          </p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <li>
              <strong>Independent Authorization:</strong> Signing in to OmniDiscover does not grant YouTube permissions. You must
              explicitly authorize Google OAuth in a separate, dedicated consent step. You can use different Google accounts
              for OmniDiscover login and YouTube actions.
            </li>
            <li>
              <strong>Requested Scopes &amp; Actions:</strong> We request only the following scopes:
              <ul style={{ paddingLeft: "1.25rem", marginTop: "0.25rem", display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.875rem" }}>
                <li><code>openid</code>, <code>email</code>, <code>profile</code>: Verifies the connected Google account email and channel identity.</li>
                <li><code>https://www.googleapis.com/auth/youtube</code> and <code>youtube.force-ssl</code>: Enables in-app creator subscriptions (<code>subscriptions.insert</code> / <code>delete</code>) and video ratings (<code>videos.rate</code>).</li>
              </ul>
            </li>
            <li>
              <strong>Server-Side Encryption at Rest:</strong> All OAuth access and refresh tokens are encrypted using{" "}
              <strong>AES-256-GCM</strong> with unique 96-bit initialization vectors (IVs) and 128-bit authentication tags before
              persistence. Plaintext tokens or client secrets are <strong>never</strong> transmitted to the browser or stored in localStorage.
            </li>
            <li>
              <strong>No Sale or Advertising Use:</strong> Google and YouTube user data is <strong>never sold</strong>, never shared
              with data brokers, and never used for targeted advertisements, marketing campaigns, or cross-site profiling.
            </li>
            <li>
              <strong>Google API Services User Data Policy Compliance:</strong> OmniDiscover&apos;s use and transfer to any other app
              of information received from Google APIs will adhere to the{" "}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>
                Google API Services User Data Policy
              </a>, including the Limited Use requirements.
            </li>
            <li>
              <strong>Revocation &amp; Disconnection:</strong> You can disconnect your YouTube account at any time in{" "}
              <strong>Settings &rarr; YouTube Account &rarr; Disconnect Account</strong>. Disconnection permanently deletes stored
              encrypted credentials from our database and immediately triggers external revocation at Google&apos;s OAuth endpoint{" "}
              (<code>https://oauth2.googleapis.com/revoke</code>). You may also revoke access directly through your{" "}
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>
                Google Account Security Settings
              </a>.
            </li>
            <li>
              <strong>Security Limitations:</strong> Authenticated encryption protects stored tokens against unauthorized database
              inspection, but no Internet transmission or cloud environment is unconditionally risk-free.
            </li>
          </ul>
        </section>

        {/* Section 4: Cookies & Storage */}
        <section id="cookies">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "0.75rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Cookie size={20} style={{ color: "var(--primary)" }} />
              4. Cookies and Client-Side Storage
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
            OmniDiscover enforces a functional, transparent consent model. We distinguish necessary cookies from functional browser storage:
          </p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li>
              <strong>Strictly Necessary Cookies:</strong> Secure, HttpOnly, SameSite=Lax cookies strictly required for authentication
              and security: <code>platform_session</code> (primary session token, 30 days), Supabase Auth session tokens (<code>sb-*-auth-token</code>),
              and <code>youtube_oauth_state</code> (10-minute temporary CSRF validation token during OAuth authorization). These cannot be disabled.
            </li>
            <li>
              <strong>Functional Browser Storage (Consent-Gated):</strong> Local HTML5 <code>localStorage</code> and client-side{" "}
              <code>IndexedDB</code> used to remember your theme preference (<code>platform_theme</code>), regional content preference,
              offline search cache (<code>omnidiscover_search_cache_db</code>, 24-hour TTL), and local watchlist bookmarks. When optional
              storage is rejected, these keys are stopped and cleared.
            </li>
            <li>
              <strong>Zero Tracking Pixels or Ad Cookies:</strong> OmniDiscover does not deploy third-party advertising cookies,
              Google Analytics, behavioral tracking pixels, or fingerprinting scripts.
            </li>
          </ul>
        </section>

        {/* Section 5: Data Retention */}
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Database size={20} style={{ color: "var(--accent-emerald)" }} />
            5. Data Retention Lifecycles
          </h2>
          <p style={{ marginBottom: "0.75rem" }}>
            We implement strict data minimization through automated lifecycle cleanups:
          </p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li>
              <strong>30-Day Server Retention for Raw Activity:</strong> Search queries (<code>search_history</code>) and video watch
              progress records (<code>watch_history</code>) are automatically purged after 30 calendar days via automated database
              maintenance routines.
            </li>
            <li>
              <strong>Persistent Recommendation Profiles:</strong> High-level learned topic and creator affinities in{" "}
              <code>user_recommendation_profiles</code> allow the discovery engine to remain personalized across 30-day raw log cleanups.
              You can reset these learned affinities at any time via Settings or the Insights dashboard.
            </li>
            <li>
              <strong>Preserved Account Records:</strong> Profiles, user preferences, bookmarks (<code>saved_content</code>), and encrypted
              API credentials remain stored until explicitly edited or deleted by the user.
            </li>
            <li>
              <strong>Browser Search Cache:</strong> IndexedDB search results expire automatically after 24 hours (strictly adhering to
              YouTube API Services Developer Policies) and are completely wiped upon account logout.
            </li>
          </ul>
        </section>

        {/* Section 6: Third-Party Providers */}
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            6. Third-Party Service Providers
          </h2>
          <p>
            When utilizing OmniDiscover, external requests are dispatched exclusively to verified service providers:
          </p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
            <li>
              <strong>YouTube &amp; Google LLC:</strong> Video search queries, channel metadata, subscriber actions, and embedded playback
              are processed via official Google APIs in compliance with the{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>Google Privacy Policy</a> and{" "}
              <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>YouTube Terms of Service</a>.
            </li>
            <li>
              <strong>Supabase Inc.:</strong> Cloud-hosted PostgreSQL database and authentication infrastructure. User data is isolated
              via PostgreSQL Row-Level Security (RLS) policies.
            </li>
            <li>
              <strong>Upstash Inc.:</strong> Distributed Redis instance utilized solely for IP-based rate limiting to prevent denial-of-service
              and brute-force credential stuffing attacks. No search queries or video contents are stored in Redis.
            </li>
            <li>
              <strong>Vercel Inc.:</strong> Application hosting, edge network, and serverless compute infrastructure.
            </li>
            <li>
              <strong>The Movie Database (TMDB) (Optional):</strong> Cinematic metadata and posters are queried only if the user supplies
              a personal TMDB API key.
            </li>
          </ul>
        </section>

        {/* Section 7: Account Deletion */}
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Trash2 size={20} style={{ color: "#f43f5e" }} />
            7. Complete Account Deletion (&quot;Right to be Forgotten&quot;)
          </h2>
          <p>
            You have the right to permanently erase your entire digital footprint at any time. When you initiate account deletion from{" "}
            <strong>Settings &rarr; Privacy &amp; Security &rarr; Delete Account</strong>:
          </p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
            <li>If a YouTube account is connected, OmniDiscover automatically attempts external token revocation with Google.</li>
            <li>Your Supabase Auth user record is permanently deleted.</li>
            <li>
              All associated database rows across <code>profiles</code>, <code>user_preferences</code>, <code>provider_credentials</code>,{" "}
              <code>oauth_connections</code>, <code>content_feedback</code>, <code>user_recommendation_profiles</code>,{" "}
              <code>saved_content</code>, <code>watch_history</code>, and <code>search_history</code> are permanently erased.
            </li>
            <li>All session cookies, authentication tokens, and browser-stored caches are immediately invalidated and purged.</li>
          </ul>
        </section>

        {/* Section 8: User Rights */}
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            8. User Rights and Data Portability
          </h2>
          <p style={{ marginBottom: "0.5rem" }}>Under data protection regulations (including DPDP and GDPR), you hold the right to:</p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li>
              <strong>Export Your Data:</strong> Download a full machine-readable JSON archive of your account profile, preferences,
              watchlist, and search history anytime from Settings.
            </li>
            <li>
              <strong>Rectification:</strong> Immediately update your display name, preferred region, and interface preferences from Settings.
            </li>
            <li>
              <strong>History Erasure:</strong> Clear your search history and watch progress independently at any time.
            </li>
            <li>
              <strong>Consent Revocation:</strong> Reconfigure your cookie and functional storage consent choices at any time using the
              Cookie Preferences trigger in the footer.
            </li>
          </ul>
        </section>

        {/* Section 9: Children's Privacy */}
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            9. Children&apos;s Privacy
          </h2>
          <p>
            OmniDiscover is not directed to children under the age of 13 (or under 16 where required by local law). We do not knowingly
            collect personal data from children. If you become aware that a child has provided us with personal data without parental
            consent, please contact us immediately to remove the information.
          </p>
        </section>

        {/* Section 10: Contact */}
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            10. Contact &amp; Updates
          </h2>
          <p>
            We may update this Privacy Policy periodically to reflect technological or legal changes. Material updates will be indicated
            by an updated Document Version and Effective Date at the top of this policy. For inquiries, please consult our{" "}
            <Link href="/help" style={{ color: "var(--primary)" }}>Help Center</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
