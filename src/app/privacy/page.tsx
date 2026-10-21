import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — OmniDiscover",
  description: "Official Privacy Policy and Data Subject Rights regarding account data, encrypted credentials, and provider APIs.",
};

export default function PrivacyPolicyPage() {
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
          Document Version: 2026.1 • Effective Date: October 21, 2026 • Last Reviewed: October 2026
        </p>
      </div>

      <div
        className="card"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "2rem",
          lineHeight: 1.7,
          color: "var(--text-muted)",
          fontSize: "0.9375rem",
        }}
      >
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            1. Introduction & Overview
          </h2>
          <p>
            Welcome to OmniDiscover (&quot;the Platform&quot;). We respect your privacy and are committed to protecting personal data collected through our service. This Privacy Policy outlines what information we collect, how it is processed, how API credentials are encrypted, and your statutory rights under applicable privacy frameworks, including the Indian Digital Personal Data Protection (DPDP) Act and General Data Protection Regulation (GDPR) standards.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            2. Information We Collect
          </h2>
          <p style={{ marginBottom: "0.5rem" }}>We collect only data necessary to deliver unified discovery services:</p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li><strong>Account Information:</strong> Name, email address, salted and hashed password (stored using PBKDF2 with 100,000 iterations of SHA-512).</li>
            <li><strong>User Preferences:</strong> Browsing mode preference (Normal vs Category Mode), theme selection, layout density, accessibility flags (reduced motion, high contrast), and preferred categories.</li>
            <li><strong>Watchlist & Saved Items:</strong> Provider references, content IDs, and timestamps of items you explicitly save.</li>
            <li><strong>Search Queries:</strong> Search strings executed on the platform, used solely to power your private search history and refine transparent recommendation scoring.</li>
            <li><strong>Legal Consent Logs:</strong> Timestamp of Terms and Privacy acceptance, document versions, and anonymized user-agent strings recorded at registration.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            3. API Credentials & Encryption Architecture
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

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            4. Cookies and Session Technologies
          </h2>
          <p>
            We use secure, HttpOnly, SameSite=Lax session cookies (<code>platform_session</code>) solely to authenticate user requests and protect against Cross-Site Request Forgery (CSRF). We do not deploy third-party advertising cookies, behavioural cross-site tracking pixels, or fingerprinting scripts.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            5. Third-Party Provider Integrations
          </h2>
          <p>
            When executing queries, requests are dispatched to external service providers:
          </p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
            <li><strong>YouTube (Google LLC):</strong> YouTube video searches and embedded player streaming comply with the <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)" }}>Google Privacy Policy</a> and YouTube Terms of Service.</li>
            <li><strong>The Movie Database (TMDB):</strong> Movie metadata, posters, and ratings are queried in accordance with TMDB API terms.</li>
            <li><strong>Spotify:</strong> Music catalog metadata is retrieved under Spotify Developer terms.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            6. Data Retention and Deletion
          </h2>
          <p>
            Your account data, preferences, and encrypted credentials are retained as long as your account remains active. You can clear your search history at any time from the dashboard. Upon requesting account deletion via <strong>Settings &rarr; Privacy &amp; Security</strong>, your user record, credentials, preferences, and saved watchlist are permanently erased from the database immediately.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            7. User Rights and Data Portability
          </h2>
          <p style={{ marginBottom: "0.5rem" }}>Under data protection regulations, you hold the right to:</p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li><strong>Export Your Data:</strong> You can download a complete JSON archive of all profile information, preferences, saved items, and search queries via Settings.</li>
            <li><strong>Rectification:</strong> You can update display names and browsing preferences directly.</li>
            <li><strong>Erasure (&quot;Right to be Forgotten&quot;):</strong> Complete and permanent removal of your account and credentials with single-click confirmation.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            8. Contact Information
          </h2>
          <p>
            If you have questions regarding this Privacy Policy or wish to lodge a privacy grievance, please visit our <Link href="/help" style={{ color: "var(--primary)" }}>Help Center</Link> or consult your designated application administrator.
          </p>
        </section>
      </div>
    </div>
  );
}
