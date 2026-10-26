import Link from "next/link";
import { FileText, ArrowLeft, Shield, Video, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Terms & Conditions — Tubify",
  description: "Official Terms and Conditions governing use of the Tubify content discovery platform.",
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
          <h1 style={{ fontSize: "2.25rem", fontWeight: 800 }}>Terms &amp; Conditions</h1>
        </div>
        <p style={{ color: "var(--text-dim)", fontSize: "0.875rem" }}>
          Document Version: 2026.2 • Effective Date: October 2026 • Last Reviewed: October 25, 2026
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
        {/* Section 1 */}
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            1. Acceptance of Terms &amp; Eligibility
          </h2>
          <p>
            By accessing, creating an account on, or using Tubify (&quot;the Service&quot;, &quot;we&quot;, &quot;our&quot;),
            you acknowledge that you have read, understood, and agree to be bound by these Terms &amp; Conditions (Version 2026.2)
            and our accompanying <Link href="/privacy" style={{ color: "var(--primary)" }}>Privacy Policy</Link>. If you do not
            agree with these Terms, you must immediately discontinue use of the Service. You represent that you are at least 13
            years old (or 16 where required by applicable local law) and possess legal capacity to enter into these Terms.
          </p>
        </section>

        {/* Section 2 */}
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            2. Account Registration and Responsibility
          </h2>
          <p>
            When registering, you agree to provide truthful, accurate, and current information. You are solely responsible for
            safeguarding the confidentiality of your authentication credentials and for all actions performed through your account.
            You must notify the Tubify team immediately via the <Link href="/help" style={{ color: "var(--primary)" }}>Help Center</Link> of
            any unauthorized access or security breach. Tubify is not liable for losses resulting from compromised passwords.
          </p>
        </section>

        {/* Section 3: Dedicated Google/YouTube Section */}
        <section style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "1.25rem", backgroundColor: "var(--bg-surface-elevated)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <Video size={20} style={{ color: "#ef4444" }} />
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", margin: 0 }}>
              3. Google OAuth &amp; YouTube Account Integration
            </h2>
          </div>
          <p style={{ marginBottom: "0.75rem" }}>
            Tubify offers optional integration with YouTube via Google OAuth 2.0. By connecting your Google account, you
            expressly agree to the following conditions:
          </p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li>
              <strong>Non-Affiliation Disclaimer:</strong> Tubify is an independent software application and is{" "}
              <strong>not affiliated with, endorsed by, sponsored by, or partner-certified by Google LLC or YouTube</strong>.
              All YouTube trademarks, logos, and brand elements belong exclusively to Google LLC.
            </li>
            <li>
              <strong>Third-Party Agreement Compliance:</strong> By utilizing YouTube integration or viewing YouTube content,
              you agree to be bound by the{" "}
              <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>
                YouTube Terms of Service
              </a>{" "}
              and the{" "}
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>
                Google Privacy Policy
              </a>.
            </li>
            <li>
              <strong>Authorized Actions on Your Behalf:</strong> When you connect your YouTube account, you authorize Tubify
              to execute user-directed YouTube API requests on your behalf, strictly limited to: (a) subscribing and unsubscribing
              to creators you choose, (b) recording video ratings/likes you initiate, and (c) displaying your authorized channel identity.
            </li>
            <li>
              <strong>Revocation Rights:</strong> You may disconnect your YouTube account at any time in{" "}
              <strong>Settings &rarr; YouTube Account &rarr; Disconnect Account</strong>, which purges stored credentials and triggers
              Google token revocation. You also retain the absolute right to revoke access directly via{" "}
              <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>
                Google Security Settings
              </a>.
            </li>
            <li>
              <strong>API Availability &amp; Quotas:</strong> YouTube actions depend upon Google API availability, network connectivity,
              and API quota allocations. Google may modify, suspend, or restrict API access, endpoints, or permissions at any time
              without notice. Tubify is not liable for external service interruptions, API quota exhaustion, or account actions
              enforced by Google.
            </li>
          </ul>
        </section>

        {/* Section 4 */}
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            4. User-Provided API Keys &amp; Bring-Your-Own-Key (BYOK)
          </h2>
          <p>
            Users may supply personal developer API credentials (such as a YouTube Data API v3 key or TMDB key) in Settings.
            You represent that you are legally authorized to generate and use the keys you provide, and that your usage complies
            with the respective provider&apos;s developer terms and rate limits. All user-supplied API keys are stored encrypted
            at rest using server-side AES-256-GCM authenticated encryption. We do not assume liability for quota exhaustion or
            third-party developer account restrictions.
          </p>
        </section>

        {/* Section 5 */}
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            5. Intellectual Property &amp; Content Aggregation
          </h2>
          <p style={{ marginBottom: "0.75rem" }}>
            Tubify functions as a content aggregation, indexing, and recommendation engine. We do not host, store, or own
            third-party media files:
          </p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li>
              <strong>Ownership of Media:</strong> Video titles, descriptions, channel artwork, thumbnails, and audio-visual streams
              remain the intellectual property of their original creators, rights holders, or distribution platforms.
            </li>
            <li>
              <strong>Embedded Playback:</strong> All video playback occurs strictly through official, compliant embed players
              (such as the YouTube IFrame Player API). Tubify does not bypass playback controls, strip ads, or alter
              content streams.
            </li>
            <li>
              <strong>Metadata Attribution:</strong> Cinematic metadata is queried from The Movie Database (TMDB) under fair use
              and developer attribution terms.
            </li>
          </ul>
        </section>

        {/* Section 6 */}
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            6. User Content &amp; Recommendation Feedback
          </h2>
          <p>
            You retain full ownership of any search queries, watchlist selections, and feedback (&quot;not interested&quot;, &quot;like&quot;,
            &quot;dislike&quot;) you submit. You grant Tubify only the limited, non-exclusive license necessary to process your
            inputs to generate your personalized discovery feed. We do not claim proprietary rights over your data, nor do we sell
            user preferences to advertisers.
          </p>
        </section>

        {/* Section 7 */}
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            7. Acceptable Use and Prohibited Activities
          </h2>
          <p style={{ marginBottom: "0.5rem" }}>You agree not to engage in any of the following prohibited behaviors:</p>
          <ul style={{ paddingLeft: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li>Attempting to bypass Digital Rights Management (DRM) or extract, rip, scrape, or download original media streams.</li>
            <li>Reverse engineering, decompiling, or probing the server-side credential encryption architecture (AES-256-GCM).</li>
            <li>Deploying automated bots, scrapers, or crawlers that abuse platform APIs or exceed distributed rate limits.</li>
            <li>Submitting false credentials, attempting cross-account unauthorized access, or interfering with service integrity.</li>
            <li>Using the Service for any unlawful purpose or in violation of applicable content distributor terms.</li>
          </ul>
        </section>

        {/* Section 8 */}
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            8. Service Availability &amp; Modifications
          </h2>
          <p>
            We strive for reliable service operation but cannot guarantee continuous, uninterrupted uptime. The Service is provided on
            an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. Third-party provider APIs, serverless infrastructure, or upstream
            network providers may undergo maintenance or rate-limiting outside our control. We reserve the right to modify, enhance,
            or suspend features with reasonable advance notice where feasible.
          </p>
        </section>

        {/* Section 9 */}
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            9. Account Termination &amp; Deletion
          </h2>
          <p>
            You may terminate your account at any time in <strong>Settings &rarr; Privacy &amp; Security &rarr; Delete Account</strong>.
            Account deletion permanently wipes your profile, preferences, watchlists, encrypted OAuth tokens, and activity history.
            We reserve the right to suspend or terminate accounts that violate these Terms, engage in credential tampering, or abuse
            platform infrastructure.
          </p>
        </section>

        {/* Section 10 */}
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            10. Disclaimer of Warranties &amp; Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by applicable law, Tubify and its developers disclaim all warranties, express or
            implied, including warranties of merchantability, fitness for a particular purpose, and non-infringement. In no event
            shall Tubify, its developers, or contributors be liable for indirect, incidental, consequential, special, or punitive
            damages, including loss of data, quota exhaustion, or service interruptions resulting from third-party API changes.
          </p>
        </section>

        {/* Section 11 */}
        <section>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.75rem" }}>
            11. Changes to Terms &amp; Contact
          </h2>
          <p>
            We may update these Terms periodically to reflect evolving legal, security, and feature requirements. Updated versions
            will be posted here with an updated Effective Date. Continued use of the Service following revisions constitutes acceptance
            of the updated Terms. If you have questions concerning these Terms, please consult our{" "}
            <Link href="/help" style={{ color: "var(--primary)" }}>Help Center</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
