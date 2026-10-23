"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Compass,
  Sparkles,
  Layers,
  Key,
  ShieldCheck,
  ArrowRight,
  GraduationCap,
  Music,
  Film,
  Laugh,
  Cpu,
  Gamepad2,
  Trophy,
  Newspaper,
  Check,
} from "lucide-react";
import { CATEGORIES } from "@/lib/types";
import { getSubcategoryPalette } from "@/lib/pastel-colors";

export default function LandingPage() {
  const [demoMode, setDemoMode] = useState<"normal" | "category">("normal");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5rem", paddingBottom: "4rem" }}>
      {/* HERO SECTION */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          padding: "6rem 0 3rem",
          background: "radial-gradient(circle at 50% 20%, rgba(56, 189, 248, 0.12), transparent 70%)",
        }}
      >
        <div className="container" style={{ textAlign: "center", position: "relative", zIndex: 10 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.375rem 0.875rem",
              borderRadius: "var(--radius-full)",
              backgroundColor: "rgba(56, 189, 248, 0.1)",
              border: "1px solid rgba(56, 189, 248, 0.25)",
              color: "var(--primary)",
              fontSize: "0.8125rem",
              fontWeight: 600,
              marginBottom: "1.5rem",
            }}
          >
            <Compass size={16} /> Content Discovery Reimagined
          </div>

          <h1
            style={{
              fontSize: "clamp(2.5rem, 5vw, 4.25rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              maxWidth: "850px",
              margin: "0 auto 1.5rem",
              background: "linear-gradient(180deg, var(--text-main) 40%, var(--text-muted) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            One Platform. Every Interest.
          </h1>

          <p
            style={{
              fontSize: "clamp(1.05rem, 2vw, 1.25rem)",
              color: "var(--text-muted)",
              maxWidth: "680px",
              margin: "0 auto 2.5rem",
              lineHeight: 1.6,
            }}
          >
            Discover learning resources, music, movies, technology, gaming, and more — all in one place.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "1rem",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: "3.5rem",
            }}
          >
            <Link href="/auth/signup" className="btn btn-primary btn-lg">
              Get Started <ArrowRight size={18} />
            </Link>
            <Link href="#features" className="btn btn-outline btn-lg">
              Explore Features
            </Link>
          </div>

          {/* Interactive Visual Dashboard Preview */}
          <div
            style={{
              maxWidth: "1000px",
              margin: "0 auto",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-color)",
              backgroundColor: "var(--bg-surface)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
              overflow: "hidden",
            }}
          >
            {/* Mock Dashboard Header */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "1rem 1.5rem",
                borderBottom: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-surface-elevated)",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#ef4444" }} />
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#f59e0b" }} />
                <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#10b981" }} />
                <span style={{ marginLeft: "0.75rem", fontSize: "0.8125rem", color: "var(--text-dim)", fontWeight: 500 }}>
                  Discovery Mission Control
                </span>
              </div>

              {/* Interactive Demo Mode Toggle */}
              <div style={{ display: "flex", gap: "0.375rem" }}>
                <button
                  type="button"
                  onClick={() => setDemoMode("normal")}
                  className={`chip btn-sm ${demoMode === "normal" ? "chip-active" : ""}`}
                >
                  <Sparkles size={14} /> Normal Mode
                </button>
                <button
                  type="button"
                  onClick={() => setDemoMode("category")}
                  className={`chip btn-sm ${demoMode === "category" ? "chip-active" : ""}`}
                >
                  <Layers size={14} /> Category Mode
                </button>
              </div>
            </div>

            {/* Mock Content Showcase Grid */}
            <div style={{ padding: "1.5rem" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "1.25rem",
                  textAlign: "left",
                }}
              >
                {demoMode === "normal" ? (
                  <>
                    <div className="card" style={{ padding: "1rem" }}>
                      <span className="badge badge-rose" style={{ marginBottom: "0.5rem" }}>Study</span>
                      <h4 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                        Financial Accounting & Ledger Principles
                      </h4>
                      <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                        Comprehensive lecture on double-entry bookkeeping and cash flows.
                      </p>
                    </div>
                    <div className="card" style={{ padding: "1rem" }}>
                      <span className="badge badge-emerald" style={{ marginBottom: "0.5rem" }}>Music</span>
                      <h4 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                        Lofi Hip Hop Radio — 24/7 Focus Beats
                      </h4>
                      <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                        Peaceful instrumental melodies curated for coding and study.
                      </p>
                    </div>
                    <div className="card" style={{ padding: "1rem" }}>
                      <span className="badge badge-cyan" style={{ marginBottom: "0.5rem" }}>Movies</span>
                      <h4 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                        Dune: Part Two (TMDB Preview)
                      </h4>
                      <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                        Paul Atreides unites with the Fremen on Arrakis. Rating: 8.4/10.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="card" style={{ padding: "1rem", borderColor: "var(--primary)" }}>
                      <span className="badge badge-cyan" style={{ marginBottom: "0.5rem" }}>Study • Accounting</span>
                      <h4 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                        Double-Entry Bookkeeping Deep Dive
                      </h4>
                      <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                        Strictly isolated study material excluding entertainment media.
                      </p>
                    </div>
                    <div className="card" style={{ padding: "1rem", borderColor: "var(--primary)" }}>
                      <span className="badge badge-cyan" style={{ marginBottom: "0.5rem" }}>Study • Economics</span>
                      <h4 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                        Microeconomics: Elasticity & Market Equilibrium
                      </h4>
                      <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                        University syllabus lecture series from leading institutions.
                      </p>
                    </div>
                    <div className="card" style={{ padding: "1rem", borderColor: "var(--primary)" }}>
                      <span className="badge badge-cyan" style={{ marginBottom: "0.5rem" }}>Study • Business Law</span>
                      <h4 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "0.375rem" }}>
                        Contract Formation & Commercial Tort Law
                      </h4>
                      <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                        Essential legal frameworks for commerce and legal students.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1: PLATFORM FEATURES */}
      <section id="features" className="container">
        <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 3.5rem" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1rem" }}>
            Engineered for Purposeful Discovery
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "1.0625rem", lineHeight: 1.6 }}>
            Designed from the ground up to replace algorithm chaos with deliberate, focused, and secure media discovery.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.75rem" }}>
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", backgroundColor: "rgba(56, 189, 248, 0.15)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Layers size={22} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Category & Normal Modes</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
              Switch between laser-focused topic isolation for studies or coding, and broad serendipitous discovery across music, cinema, and games.
            </p>
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "var(--accent-emerald)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Key size={22} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Encrypted API Connections</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
              Connect personal YouTube and TMDB API keys with authenticated AES-256-GCM encryption. Your credentials remain private and unexposed.
            </p>
          </div>

          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", backgroundColor: "rgba(168, 85, 247, 0.15)", color: "var(--accent-purple)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={22} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Transparent Recommendations</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
              Rule-based scoring that honors your active mode, explicit topical interests, and saved items, with full user controls to reset signals.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2: CATEGORY-BASED DISCOVERY */}
      <section id="categories" className="container">
        <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 3rem" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "1rem" }}>
            Comprehensive Topical Categories
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "1.0625rem" }}>
            Dive straight into structured subtopics curated across 8 core knowledge domains.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
          {CATEGORIES.map((cat) => (
            <div key={cat.id} className="card card-hover" style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <span style={{ color: "var(--primary)" }}>
                  {cat.id === "study" && <GraduationCap size={20} />}
                  {cat.id === "music" && <Music size={20} />}
                  {cat.id === "movies" && <Film size={20} />}
                  {cat.id === "comedy" && <Laugh size={20} />}
                  {cat.id === "technology" && <Cpu size={20} />}
                  {cat.id === "gaming" && <Gamepad2 size={20} />}
                  {cat.id === "anime" && <Sparkles size={20} />}
                  {cat.id === "sports" && <Trophy size={20} />}
                  {cat.id === "news" && <Newspaper size={20} />}
                </span>
                <h4 style={{ fontWeight: 600, fontSize: "1rem" }}>{cat.name}</h4>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "0.875rem", lineHeight: 1.5 }}>
                {cat.description}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
                {cat.subcategories.map((sub) => {
                  const palette = getSubcategoryPalette(sub);
                  return (
                    <span
                      key={sub}
                      className="pastel-bubble"
                      style={
                        {
                          "--pastel-bg-light": palette.bgLight,
                          "--pastel-text-light": palette.textLight,
                          "--pastel-border-light": palette.borderLight,
                          "--pastel-bg-dark": palette.bgDark,
                          "--pastel-text-dark": palette.textDark,
                          "--pastel-border-dark": palette.borderDark,
                        } as React.CSSProperties
                      }
                    >
                      {sub}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 5: SECURITY & PRIVACY CONTROLS */}
      <section className="container">
        <div
          className="card"
          style={{
            padding: "3rem 2rem",
            background: "linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(15, 23, 42, 0.9))",
            border: "1px solid var(--border-color)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "2.5rem",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", color: "var(--accent-emerald)", fontSize: "0.8125rem", fontWeight: 600, marginBottom: "0.75rem" }}>
              <ShieldCheck size={18} /> Enterprise-Grade Credential Protection
            </div>
            <h2 style={{ fontSize: "1.875rem", fontWeight: 700, marginBottom: "1rem", lineHeight: 1.3 }}>
              Your Data. Your Credentials. Strictly Isolated.
            </h2>
            <p style={{ color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              We never expose plaintext secrets, track unconsented activity, or sell personal data. API keys are encrypted at rest with AES-256-GCM. You maintain complete control to export all your data or execute immediate account deletion.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
              <Link href="/privacy" className="btn btn-outline btn-sm">
                Review Privacy Policy
              </Link>
              <Link href="/help/api-key-security" className="btn btn-outline btn-sm">
                Read Security Whitepaper
              </Link>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.2)", color: "var(--accent-emerald)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                <Check size={14} />
              </div>
              <div>
                <h4 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>Authenticated AES-256-GCM</h4>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Tamper-proof encryption with 96-bit initialization vectors and 128-bit authentication tags.</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.2)", color: "var(--accent-emerald)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                <Check size={14} />
              </div>
              <div>
                <h4 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>Full Account Export & Erasure</h4>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Download your complete data archive anytime or delete your account in one click.</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "rgba(16, 185, 129, 0.2)", color: "var(--accent-emerald)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                <Check size={14} />
              </div>
              <div>
                <h4 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>HttpOnly Secure Session Cookies</h4>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Guards against XSS credential harvesting by keeping session tokens outside localStorage.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .pastel-bubble {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.65rem;
          font-size: 0.75rem;
          font-weight: 500;
          border-radius: var(--radius-full);
          background-color: var(--pastel-bg-dark);
          color: var(--pastel-text-dark);
          border: 1px solid var(--pastel-border-dark);
          transition: transform 0.15s ease;
          line-height: 1.35;
        }

        :global([data-theme="light"]) .pastel-bubble {
          background-color: var(--pastel-bg-light);
          color: var(--pastel-text-light);
          border-color: var(--pastel-border-light);
        }

        .pastel-bubble:hover {
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}
