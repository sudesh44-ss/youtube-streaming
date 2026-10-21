import Link from "next/link";
import { notFound } from "next/navigation";
import { HELP_ARTICLES } from "@/lib/help-articles";
import { ArrowLeft, Clock, ArrowRight, Settings } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return HELP_ARTICLES.map((article) => ({
    slug: article.slug,
  }));
}

export default async function HelpDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const article = HELP_ARTICLES.find((a) => a.slug === slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = HELP_ARTICLES.filter((a) => article.relatedSlugs?.includes(a.slug));

  return (
    <div className="container" style={{ maxWidth: "860px", padding: "3rem 1.25rem 5rem" }}>
      {/* Breadcrumb Navigation */}
      <nav style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--text-dim)", marginBottom: "1.5rem" }}>
        <Link href="/help" style={{ color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <ArrowLeft size={14} /> Help Center
        </Link>
        <span>/</span>
        <span>{article.category}</span>
        <span>/</span>
        <span style={{ color: "var(--text-main)", fontWeight: 500 }}>{article.title}</span>
      </nav>

      {/* Article Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
          <span className="badge badge-cyan">{article.category}</span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <Clock size={12} /> Last updated: {article.updatedDate}
          </span>
        </div>
        <h1 style={{ fontSize: "2.25rem", fontWeight: 800, lineHeight: 1.2, marginBottom: "1rem", color: "var(--text-main)" }}>
          {article.title}
        </h1>
        <div
          style={{
            padding: "1rem 1.25rem",
            backgroundColor: "var(--bg-surface-elevated)",
            borderRadius: "var(--radius-md)",
            borderLeft: "4px solid var(--primary)",
            fontSize: "0.9375rem",
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}
        >
          {article.summary}
        </div>
      </div>

      {/* Article Content */}
      <article
        className="card"
        style={{
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          lineHeight: 1.7,
          color: "var(--text-muted)",
          fontSize: "0.9375rem",
        }}
      >
        <div
          dangerouslySetInnerHTML={{
            __html: article.content
              .replace(/### (.*?)\n/g, '<h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-top: 1.5rem; margin-bottom: 0.5rem;">$1</h3>')
              .replace(/## (.*?)\n/g, '<h2 style="font-size: 1.35rem; font-weight: 700; color: var(--text-main); margin-top: 1.75rem; margin-bottom: 0.75rem;">$1</h2>')
              .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-main); font-weight: 600;">$1</strong>')
              .replace(/`([^`]+)`/g, '<code style="background-color: var(--bg-surface-elevated); padding: 0.15rem 0.35rem; border-radius: 4px; font-family: monospace; font-size: 0.85em;">$1</code>')
              .replace(/\n- (.*?)\n/g, '<li style="margin-left: 1.5rem; margin-bottom: 0.35rem;">$1</li>')
              .replace(/\n\d+\. (.*?)\n/g, '<li style="margin-left: 1.5rem; margin-bottom: 0.35rem;">$1</li>'),
          }}
        />

        {/* Relevant Action Card */}
        {article.slug.includes("connecting") || article.slug.includes("api-key") ? (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1.25rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(56, 189, 248, 0.08)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <h4 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.25rem" }}>
                Ready to manage your API connections?
              </h4>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                Add, test, or replace encrypted provider credentials in the Settings Center.
              </p>
            </div>
            <Link href="/settings/connections" className="btn btn-primary btn-sm">
              <Settings size={15} /> Go to API Connections
            </Link>
          </div>
        ) : null}
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <div style={{ marginTop: "3rem" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1.25rem" }}>
            Related Guides & Documentation
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
            {relatedArticles.map((rel) => (
              <Link
                key={rel.slug}
                href={`/help/${rel.slug}`}
                className="card card-hover"
                style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}
              >
                <span className="badge badge-cyan" style={{ width: "fit-content" }}>{rel.category}</span>
                <h4 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-main)" }}>
                  {rel.title}
                </h4>
                <div style={{ marginTop: "auto", fontSize: "0.75rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  View Article <ArrowRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
