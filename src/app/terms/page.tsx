import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms & Conditions — OmniDiscover",
  description: "Official Terms and Conditions governing use of the OmniDiscover content discovery platform.",
};

export default function TermsPage() {
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
          <FileText size={24} style={{ color: "var(--primary)" }} />
          <h1 style={{ fontSize: "2.25rem", fontWeight: 800 }}>Terms & Conditions</h1>
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
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing, creating an account on, or using OmniDiscover (&quot;the Service&quot;), you acknowledge that you have read, understood, and agree to be bound by these Terms &amp; Conditions (Version 2026.1). If you do not agree to these terms, you must not access or use the Service.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            2. Account Registration and Security
          </h2>
          <p>
            When registering an account, you agree to provide truthful, accurate, and complete information. You are solely responsible for maintaining the confidentiality of your authentication credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use or security breach.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            3. Third-Party Content & Intellectual Property Disclaimers
          </h2>
          <p style={{ marginBottom: "0.75rem" }}>
            OmniDiscover is an indexing, aggregation, and content discovery platform. We do not host, store, or own third-party media files, including:
          </p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li><strong>No Ownership of Third-Party Media:</strong> All video titles, descriptions, movie posters, artwork, track metadata, and channel materials remain the exclusive intellectual property of their respective creators, copyright holders, and licensed distribution networks.</li>
            <li><strong>YouTube Integration:</strong> Video playback is executed solely through the official YouTube IFrame Player API in compliance with YouTube terms.</li>
            <li><strong>TMDB Attribution:</strong> This product uses the TMDB API but is not endorsed or certified by TMDB. Catalog data does not constitute streaming or distribution rights for full-length theatrical films.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            4. API Keys and User-Provided Credentials
          </h2>
          <p>
            Users may optionally supply personal API credentials (such as Google Cloud YouTube API keys or TMDB developer keys) to execute live queries. You represent that you are authorized to use the keys you provide and that your use will adhere to the respective provider’s terms and rate limitations. We do not assume responsibility for external quota exhaustion or third-party provider account suspensions.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            5. Prohibited Activities
          </h2>
          <p style={{ marginBottom: "0.5rem" }}>You agree not to engage in any of the following prohibited behaviors:</p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li>Attempting to bypass Digital Rights Management (DRM) or extract, rip, or download original audio/video files.</li>
            <li>Reverse engineering or tampering with server-side credential encryption mechanisms.</li>
            <li>Using automated crawlers, scrapers, or botnets to abuse platform endpoints or third-party quotas.</li>
            <li>Submitting false credentials or attempting unauthorized cross-tenant data access.</li>
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            6. Service Availability & Modifications
          </h2>
          <p>
            We strive for continuous availability but do not guarantee uninterrupted uptime. Third-party provider APIs may experience maintenance, rate-limit constraints, or changes outside our control. We reserve the right to modify, suspend, or discontinue any feature with reasonable notice where feasible.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            7. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by applicable law, OmniDiscover and its developers shall not be liable for indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to access third-party content.
          </p>
        </section>

        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            8. Governing Law & Contact
          </h2>
          <p>
            These Terms are governed by and construed in accordance with applicable laws. If you have questions concerning these Terms, please consult our <Link href="/help" style={{ color: "var(--primary)" }}>Help Center</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
