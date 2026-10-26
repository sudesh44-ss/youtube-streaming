"use client";

import Link from "next/link";
import { Key, HelpCircle, ArrowRight } from "lucide-react";

interface ApiKeyRequirementProps {
  style?: React.CSSProperties;
  className?: string;
}

export function ApiKeyRequirement({ style, className }: ApiKeyRequirementProps) {
  return (
    <div
      className={`card api-key-requirement-card ${className || ""}`}
      style={{
        textAlign: "center",
        padding: "3.5rem 2rem",
        maxWidth: "600px",
        margin: "2rem auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "1.25rem",
        borderRadius: "var(--radius-lg)",
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-color)",
        boxShadow: "var(--shadow-sm)",
        ...style,
      }}
    >
      <div
        style={{
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          backgroundColor: "rgba(56, 189, 248, 0.15)",
          color: "var(--primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Key size={28} />
      </div>

      <div style={{ maxWidth: "480px" }}>
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "var(--text-main)",
            margin: "0 0 0.625rem",
            letterSpacing: "-0.01em",
          }}
        >
          Connect Your YouTube API Key
        </h2>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.9375rem",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          To explore YouTube videos, search channels, and discover trending content on Tubify, add your YouTube Data API key first.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.875rem",
          justifyContent: "center",
          alignItems: "center",
          marginTop: "0.5rem",
        }}
      >
        <Link
          href="/help/connecting-youtube"
          className="btn btn-outline"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1.25rem",
            fontSize: "0.875rem",
          }}
        >
          <HelpCircle size={16} />
          <span>How to Get API Key</span>
        </Link>

        <Link
          href="/settings"
          className="btn btn-primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.625rem 1.25rem",
            fontSize: "0.875rem",
          }}
        >
          <span>Add API Key</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
}
