"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acknowledgePrivacy, setAcknowledgePrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password validation signals
  const hasMinLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!acceptTerms || !acknowledgePrivacy) {
      setError("Please accept the Terms & Conditions and acknowledge the Privacy Policy.");
      return;
    }

    if (!hasMinLength || !hasLetter || !hasNumber) {
      setError("Please ensure your password meets all complexity requirements.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          confirmPassword,
          acceptTerms,
          acknowledgePrivacy,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("An unexpected network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.25rem",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "480px",
          padding: "2.5rem 2rem",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #38bdf8, #2563eb)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              marginBottom: "1rem",
              boxShadow: "0 4px 12px var(--primary-glow)",
            }}
          >
            <Compass size={24} />
          </div>
          <h1 style={{ fontSize: "1.625rem", fontWeight: 700, marginBottom: "0.375rem" }}>
            Create Your Account
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Unlock personalized discovery, watchlists, and encrypted API connections
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "rgba(244, 63, 94, 0.15)",
              border: "1px solid rgba(244, 63, 94, 0.35)",
              color: "var(--accent-rose)",
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1.25rem",
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="input-group">
            <label className="label" htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Mercer"
              required
              autoComplete="name"
            />
          </div>

          <div className="input-group">
            <label className="label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label className="label" htmlFor="password">Password</label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                autoComplete="new-password"
                style={{ paddingRight: "2.5rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
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
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Password Strength Checklist */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.375rem",
                marginTop: "0.5rem",
                fontSize: "0.75rem",
                color: "var(--text-dim)",
              }}
            >
              <span style={{ color: hasMinLength ? "var(--accent-emerald)" : "inherit", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <CheckCircle2 size={12} /> Min 8 characters
              </span>
              <span style={{ color: hasLetter ? "var(--accent-emerald)" : "inherit", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <CheckCircle2 size={12} /> Includes letter
              </span>
              <span style={{ color: hasNumber ? "var(--accent-emerald)" : "inherit", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <CheckCircle2 size={12} /> Includes number
              </span>
              <span style={{ color: passwordsMatch ? "var(--accent-emerald)" : "inherit", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <CheckCircle2 size={12} /> Passwords match
              </span>
            </div>
          </div>

          <div className="input-group">
            <label className="label" htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
              required
              autoComplete="new-password"
            />
          </div>

          {/* Mandatory Legal Acceptance Checkboxes */}
          <div
            style={{
              padding: "0.875rem",
              backgroundColor: "var(--bg-surface-elevated)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-color)",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
              <input
                type="checkbox"
                id="terms"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                style={{ accentColor: "var(--primary)", width: "16px", height: "16px", marginTop: "3px" }}
                required
              />
              <label htmlFor="terms" style={{ fontSize: "0.8125rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                I have read and agree to the{" "}
                <Link href="/terms" target="_blank" style={{ color: "var(--primary)", fontWeight: 500, textDecoration: "underline" }}>
                  Terms & Conditions (v2026.1)
                </Link>
                .
              </label>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem" }}>
              <input
                type="checkbox"
                id="privacy"
                checked={acknowledgePrivacy}
                onChange={(e) => setAcknowledgePrivacy(e.target.checked)}
                style={{ accentColor: "var(--primary)", width: "16px", height: "16px", marginTop: "3px" }}
                required
              />
              <label htmlFor="privacy" style={{ fontSize: "0.8125rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                I acknowledge the{" "}
                <Link href="/privacy" target="_blank" style={{ color: "var(--primary)", fontWeight: 500, textDecoration: "underline" }}>
                  Privacy Policy (v2026.1)
                </Link>{" "}
                and understand how my data is secured.
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading || !acceptTerms || !acknowledgePrivacy}
            style={{ width: "100%", marginTop: "0.5rem" }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        {/* Footer Link */}
        <div
          style={{
            marginTop: "1.75rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--border-color)",
            textAlign: "center",
            fontSize: "0.875rem",
            color: "var(--text-muted)",
          }}
        >
          Already have an account?{" "}
          <Link href="/auth/signin" style={{ color: "var(--primary)", fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
