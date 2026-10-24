"use client";

import { useState } from "react";
import { Sparkles, Layers } from "lucide-react";

export function InteractiveHeroDemo({ children }: { children?: React.ReactNode }) {
  const [demoMode, setDemoMode] = useState<"normal" | "category">("normal");

  return (
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
        {children ? (
          children
        ) : (
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
        )}
      </div>
    </div>
  );
}
