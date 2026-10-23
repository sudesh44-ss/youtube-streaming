"use client";

import { useState } from "react";
import Link from "next/link";
import { ProviderStatus } from "@/lib/types";
import { Video, Film, Music, CheckCircle2, AlertCircle, RefreshCw, Unlink, Key, Eye, EyeOff, BookOpen, Lock } from "lucide-react";
import { YouTubeConnectionPopup } from "./YouTubeConnectionPopup";

interface ProviderCardProps {
  provider: ProviderStatus;
  onRefresh: () => void;
}

export function ProviderCard({ provider, onRefresh }: ProviderCardProps) {
  const isConnected = provider.status === "connected";
  const [isEditing, setIsEditing] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showYtPopup, setShowYtPopup] = useState(false);

  const getIcon = () => {
    switch (provider.id) {
      case "youtube": return <Video size={24} style={{ color: "#ef4444" }} />;
      case "tmdb": return <Film size={24} style={{ color: "var(--primary)" }} />;
      case "spotify": return <Music size={24} style={{ color: "#10b981" }} />;
    }
  };

  const getStatusBadge = () => {
    switch (provider.status) {
      case "connected":
        return <span className="badge badge-emerald"><CheckCircle2 size={13} /> Connected</span>;
      case "invalid_credentials":
        return <span className="badge badge-rose"><AlertCircle size={13} /> Invalid Credentials</span>;
      case "quota_exceeded":
        return <span className="badge badge-amber"><AlertCircle size={13} /> Quota Exceeded</span>;
      case "unavailable":
        return <span className="badge badge-rose"><AlertCircle size={13} /> Provider Outage</span>;
      default:
        return <span className="badge badge-cyan">Not Connected</span>;
    }
  };

  const handleTestExisting = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: provider.id }),
      });
      const data = await res.json();
      if (data.result?.isValid) {
        setTestResult({ success: true, message: "Connection test succeeded! Service is responding normally." });
      } else {
        setTestResult({
          success: false,
          message: data.result?.errorMessage || data.error || "Connection test failed.",
        });
      }
    } catch {
      setTestResult({ success: false, message: "Network error during test execution." });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;

    setLoading(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/providers/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: provider.id,
          apiKey: apiKeyInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTestResult({
          success: false,
          message: data.error || "Credential validation failed. Please inspect your key.",
        });
      } else {
        setTestResult({
          success: true,
          message: "API credentials successfully validated and encrypted!",
        });
        setIsEditing(false);
        setApiKeyInput("");
        onRefresh();
        if (provider.id === "youtube") {
          setShowYtPopup(true);
        }
      }
    } catch {
      setTestResult({ success: false, message: "Failed to connect provider. Please check network." });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${provider.name}? Stored encrypted keys will be permanently deleted.`)) {
      return;
    }

    setLoading(true);
    try {
      await fetch("/api/providers/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: provider.id }),
      });
      setTestResult(null);
      setIsEditing(false);
      onRefresh();
    } catch {
      alert("Failed to disconnect.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--bg-surface-elevated)",
              border: "1px solid var(--border-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {getIcon()}
          </div>
          <div>
            <h3 style={{ fontSize: "1.0625rem", fontWeight: 600, color: "var(--text-main)" }}>
              {provider.name}
            </h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
              Requires {provider.requiredCredential}
            </span>
          </div>
        </div>

        <div>{getStatusBadge()}</div>
      </div>

      {/* Description */}
      <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
        {provider.description}
      </p>

      {/* Connection Info & Locked Input View */}
      {provider.status === "connected" && !isEditing && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label className="label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 0 }}>
            <span>Active {provider.name} {provider.requiredCredential}:</span>
            <span style={{ fontSize: "0.75rem", color: "var(--accent-emerald)", display: "flex", alignItems: "center", gap: "0.25rem", fontWeight: 600 }}>
              <Lock size={12} /> Locked &amp; Encrypted (AES-256-GCM)
            </span>
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              className="input"
              value={provider.maskedKey || "••••••••••••••••"}
              disabled
              readOnly
              style={{
                backgroundColor: "var(--bg-surface-elevated)",
                color: "var(--text-main)",
                cursor: "not-allowed",
                fontFamily: "monospace",
                letterSpacing: "0.05em",
                paddingRight: "2.5rem",
                opacity: 0.9,
              }}
            />
            <div
              style={{
                position: "absolute",
                right: "0.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-dim)",
              }}
              title="API key is securely locked and protected"
            >
              <Lock size={16} />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-dim)" }}>
            <span>Last Validated: {provider.lastValidatedAt ? new Date(provider.lastValidatedAt).toLocaleString() : "Verified"}</span>
            <span>Server-side HKDF derived AES-256</span>
          </div>
        </div>
      )}

      {/* Status Alerts / Test Result */}
      {testResult && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-md)",
            fontSize: "0.8125rem",
            backgroundColor: testResult.success ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
            border: `1px solid ${testResult.success ? "rgba(16, 185, 129, 0.4)" : "rgba(244, 63, 94, 0.4)"}`,
            color: testResult.success ? "var(--accent-emerald)" : "var(--accent-rose)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          {testResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Credential Entry Form (Directly accessible if not connected or if editing/replacing) */}
      {!isConnected || isEditing ? (
        <form onSubmit={handleSaveCredentials} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label className="label">Enter your {provider.name} {provider.requiredCredential}:</label>
            <div style={{ position: "relative" }}>
              <input
                type={showKey ? "text" : "password"}
                className="input"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={`Paste your ${provider.name} ${provider.requiredCredential} here...`}
                required
                style={{ paddingRight: "2.5rem" }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{
                  position: "absolute",
                  right: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-dim)",
                  cursor: "pointer",
                }}
                aria-label={showKey ? "Hide key" : "Show key"}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
              Credentials are validated live, then encrypted using server-side AES-256-GCM.
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.625rem", marginTop: "0.25rem" }}>
            <Link
              href={provider.setupGuideUrl}
              className="btn btn-outline btn-sm"
              style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
            >
              <BookOpen size={14} /> Setup Guide
            </Link>

            <div style={{ display: "flex", gap: "0.625rem" }}>
              {isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setApiKeyInput("");
                    setTestResult(null);
                  }}
                  className="btn btn-outline btn-sm"
                  disabled={loading}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={loading || !apiKeyInput.trim()}
              >
                {loading ? <RefreshCw size={14} className="spin" /> : <Key size={14} />}
                Validate &amp; Encrypt
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* Action Buttons Row when Connected */
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.625rem", marginTop: "auto" }}>
          <Link
            href={provider.setupGuideUrl}
            className="btn btn-outline btn-sm"
            style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
          >
            <BookOpen size={14} /> Setup Guide
          </Link>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={handleTestExisting}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              title="Test existing connection"
            >
              {loading ? <RefreshCw size={14} className="spin" /> : <RefreshCw size={14} />} Test Connection
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="btn btn-outline btn-sm"
            >
              Replace Key
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={loading}
              className="btn btn-danger btn-sm"
              title="Disconnect provider"
            >
              <Unlink size={14} /> Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Floating prompt to connect YouTube account after API key save */}
      <YouTubeConnectionPopup
        isOpen={showYtPopup}
        onClose={() => setShowYtPopup(false)}
      />
    </div>
  );
}
