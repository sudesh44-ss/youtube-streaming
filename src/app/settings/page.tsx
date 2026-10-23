"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProviderStatus, CATEGORIES } from "@/lib/types";
import { ProviderCard } from "@/components/ProviderCard";
import {
  User,
  Key,
  Palette,
  Sliders,
  Bell,
  Shield,
  Info,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  Lock,
  RefreshCw,
} from "lucide-react";

type SettingsTab =
  | "profile"
  | "connections"
  | "appearance"
  | "preferences"
  | "notifications"
  | "security"
  | "about";

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>("connections");
  const [user, setUser] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Load session, preferences, and provider status
  const loadData = async () => {
    try {
      const [sessionRes, provRes] = await Promise.all([
        fetch("/api/auth/session"),
        fetch("/api/providers/status"),
      ]);

      if (sessionRes.status === 401 || sessionRes.status === 403) {
        router.push("/auth/signin");
        return;
      }

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        if (!sessionData.session?.user) {
          router.push("/auth/signin");
          return;
        }

        setUser(sessionData.session.user);
        setPreferences(sessionData.session.preferences);
        setDisplayName(sessionData.session.user.name || "");
      }

      if (provRes.ok) {
        const provData = await provRes.json();
        setProviders(provData.providers || []);
      }
    } catch (err) {
      console.error("Settings load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const showFeedback = (type: "success" | "error", text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Update Profile Name
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showFeedback("success", "Profile name updated successfully.");
      setUser((prev: any) => ({ ...prev, name: displayName }));
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword: confirmNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showFeedback("success", "Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  // Save Preferences
  const handleUpdatePreferences = async (updated: any) => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error("Failed to save preferences.");
      setPreferences((prev: any) => ({ ...prev, ...updated }));
      showFeedback("success", "Preferences saved.");

      // If theme updated, apply immediately
      if (updated.theme) {
        document.documentElement.setAttribute("data-theme", updated.theme);
        localStorage.setItem("platform_theme", updated.theme);
      }
    } catch (err: any) {
      showFeedback("error", err.message);
    } finally {
      setSaving(false);
    }
  };

  // Clear Search History
  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear your entire search query history?")) return;
    try {
      await fetch("/api/content/history", { method: "DELETE" });
      showFeedback("success", "Search history permanently cleared.");
    } catch {
      showFeedback("error", "Failed to clear history.");
    }
  };

  // Delete Account
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm("CAUTION: This will permanently erase your profile, encrypted credentials, saved watchlist, and sessions. This action cannot be undone. Are you sure?")) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert("Your account has been deleted. Thank you for using OmniDiscover.");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to delete account.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: "5rem 0", textAlign: "center" }}>
        <RefreshCw size={32} className="spin" style={{ color: "var(--primary)", margin: "0 auto 1rem" }} />
        <p style={{ color: "var(--text-muted)" }}>Loading settings center...</p>
      </div>
    );
  }

  const tabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: "connections", label: "API Connections", icon: Key },
    { id: "profile", label: "Profile & Account", icon: User },
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "preferences", label: "Content & Preferences", icon: Sliders },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Privacy & Security", icon: Shield },
    { id: "about", label: "About & Legal", icon: Info },
  ];

  return (
    <div className="container" style={{ padding: "2.5rem 1.25rem 5rem" }}>
      {/* Title */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
          Settings Center
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
          Manage your account, encrypted API connections, display themes, and data security
        </p>
      </div>

      {/* Status Feedback Toast */}
      {statusMessage && (
        <div
          style={{
            padding: "0.875rem 1.25rem",
            borderRadius: "var(--radius-md)",
            marginBottom: "1.5rem",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            backgroundColor: statusMessage.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
            border: `1px solid ${statusMessage.type === "success" ? "rgba(16, 185, 129, 0.4)" : "rgba(244, 63, 94, 0.4)"}`,
            color: statusMessage.type === "success" ? "var(--accent-emerald)" : "var(--accent-rose)",
          }}
        >
          {statusMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Layout Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          gap: "2rem",
          alignItems: "flex-start",
        }}
        className="settings-layout"
      >
        {/* Navigation Sidebar */}
        <aside
          className="card"
          style={{
            padding: "0.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.625rem 0.875rem",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  backgroundColor: isActive ? "var(--bg-surface-elevated)" : "transparent",
                  color: isActive ? "var(--primary)" : "var(--text-muted)",
                  fontWeight: isActive ? 600 : 400,
                  fontSize: "0.875rem",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "var(--transition)",
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Content Pane */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* TAB B: API CONNECTIONS */}
          {activeTab === "connections" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div className="card" style={{ padding: "1.25rem" }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                  Third-Party API Connections
                </h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Connecting provider keys is completely optional. Supplying your personal API keys enables direct live requests with your own project quotas. All secrets are encrypted at rest with server-side <strong>AES-256-GCM</strong>.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {providers.map((p) => (
                  <ProviderCard key={p.id} provider={p} onRefresh={loadData} />
                ))}
              </div>
            </div>
          )}

          {/* TAB A: PROFILE & ACCOUNT */}
          {activeTab === "profile" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div className="card">
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "1rem" }}>
                  Account Profile
                </h3>
                <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="input-group">
                    <label className="label">Full Name</label>
                    <input
                      type="text"
                      className="input"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="label">Email Address (Read-only)</label>
                    <input
                      type="email"
                      className="input"
                      value={user?.email || ""}
                      disabled
                      style={{ opacity: 0.6 }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.8125rem", color: "var(--text-dim)" }}>
                    <span>Account Status: <strong style={{ color: "var(--accent-emerald)" }}>Active &amp; Verified</strong></span>
                    {user?.createdAt && (
                      <span>Member since: {new Date(user.createdAt).toLocaleDateString()}</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={saving}
                    style={{ width: "fit-content", marginTop: "0.5rem" }}
                  >
                    Save Changes
                  </button>
                </form>
              </div>

              {/* Password Change Form */}
              <div className="card">
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "1rem" }}>
                  Change Password
                </h3>
                <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "420px" }}>
                  <div className="input-group">
                    <label className="label">Current Password</label>
                    <input
                      type="password"
                      className="input"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="label">New Password</label>
                    <input
                      type="password"
                      className="input"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters, letters and numbers"
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label className="label">Confirm New Password</label>
                    <input
                      type="password"
                      className="input"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn btn-secondary btn-sm"
                    disabled={saving}
                    style={{ width: "fit-content" }}
                  >
                    <Lock size={14} /> Update Password
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB C: APPEARANCE */}
          {activeTab === "appearance" && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 700 }}>Appearance &amp; Accessibility</h3>

              <div>
                <label className="label" style={{ marginBottom: "0.5rem", display: "block" }}>Color Theme</label>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  {["dark", "light", "system"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleUpdatePreferences({ theme: t })}
                      className={`chip ${preferences?.theme === t ? "chip-active" : ""}`}
                      style={{ textTransform: "capitalize", padding: "0.5rem 1rem" }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label" style={{ marginBottom: "0.5rem", display: "block" }}>Layout Density</label>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  {["comfortable", "compact"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleUpdatePreferences({ layoutDensity: d })}
                      className={`chip ${preferences?.layoutDensity === d ? "chip-active" : ""}`}
                      style={{ textTransform: "capitalize", padding: "0.5rem 1rem" }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", paddingTop: "0.5rem", borderTop: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <h4 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>Reduced Motion</h4>
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Minimizes smooth animations and transitions</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences?.reducedMotion)}
                    onChange={(e) => handleUpdatePreferences({ reducedMotion: e.target.checked })}
                    style={{ width: "18px", height: "18px", accentColor: "var(--primary)" }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <h4 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>High Contrast</h4>
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Increases text contrast and border definitions</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(preferences?.highContrast)}
                    onChange={(e) => handleUpdatePreferences({ highContrast: e.target.checked })}
                    style={{ width: "18px", height: "18px", accentColor: "var(--primary)" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB D: CONTENT & PREFERENCES */}
          {activeTab === "preferences" && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 700 }}>Content Discovery Preferences</h3>

              <div>
                <label className="label" style={{ marginBottom: "0.5rem", display: "block" }}>Default Browsing Mode</label>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button
                    type="button"
                    onClick={() => handleUpdatePreferences({ defaultMode: "normal" })}
                    className={`chip ${preferences?.defaultMode === "normal" ? "chip-active" : ""}`}
                  >
                    Normal Mode (Cross-Category Discovery)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdatePreferences({ defaultMode: "category" })}
                    className={`chip ${preferences?.defaultMode === "category" ? "chip-active" : ""}`}
                  >
                    Category Mode (Isolated by Topic)
                  </button>
                </div>
              </div>

              <div>
                <label className="label" style={{ marginBottom: "0.75rem", display: "block" }}>
                  Preferred Topics (Influences Normal Mode Recommendations)
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.625rem" }}>
                  {CATEGORIES.map((cat) => {
                    const isChecked = preferences?.preferredCategories?.includes(cat.id);
                    return (
                      <label
                        key={cat.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.5rem 0.75rem",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "var(--bg-surface-elevated)",
                          fontSize: "0.8125rem",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const current = preferences?.preferredCategories || [];
                            const next = e.target.checked
                              ? [...current, cat.id]
                              : current.filter((id: string) => id !== cat.id);
                            handleUpdatePreferences({ preferredCategories: next });
                          }}
                          style={{ accentColor: "var(--primary)" }}
                        />
                        <span>{cat.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB E: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 700 }}>Notification Controls</h3>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <h4 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>Security Alerts</h4>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Receive email alerts for password changes or unrecognized sessions</p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(preferences?.securityAlerts)}
                  onChange={(e) => handleUpdatePreferences({ securityAlerts: e.target.checked })}
                  style={{ width: "18px", height: "18px", accentColor: "var(--primary)" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "0.75rem", borderTop: "1px solid var(--border-color)" }}>
                <div>
                  <h4 style={{ fontSize: "0.9375rem", fontWeight: 600 }}>Product Updates &amp; Changelogs</h4>
                  <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>Occasional updates regarding new providers or features</p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(preferences?.emailAlerts)}
                  onChange={(e) => handleUpdatePreferences({ emailAlerts: e.target.checked })}
                  style={{ width: "18px", height: "18px", accentColor: "var(--primary)" }}
                />
              </div>
            </div>
          )}

          {/* TAB F: PRIVACY & SECURITY */}
          {activeTab === "security" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* Data Rights & Export */}
              <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700 }}>Data Subject Rights &amp; Portability</h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Under our Privacy Policy and applicable data protection regulations, you can download a complete archive of your stored data or clear your activity records.
                </p>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                  <a
                    href="/api/user/export"
                    download
                    className="btn btn-secondary btn-sm"
                  >
                    <Download size={14} /> Export My Data (JSON)
                  </a>
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="btn btn-outline btn-sm"
                  >
                    <Trash2 size={14} /> Clear Search History
                  </button>
                  <Link href="/privacy" className="btn btn-outline btn-sm">
                    View Privacy Policy
                  </Link>
                </div>
              </div>

              {/* Danger Zone: Account Deletion */}
              <div
                className="card"
                style={{
                  border: "1px solid rgba(244, 63, 94, 0.4)",
                  backgroundColor: "rgba(244, 63, 94, 0.04)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent-rose)" }}>
                  <Trash2 size={20} />
                  <h3 style={{ fontSize: "1.125rem", fontWeight: 700 }}>Danger Zone — Permanent Account Erasure</h3>
                </div>
                <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Permanently erase your account, encrypted provider keys, saved watchlist items, and query history from our database. This action is irreversible.
                </p>

                <form onSubmit={handleDeleteAccount} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "380px" }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label className="label">Confirm Your Password</label>
                    <input
                      type="password"
                      className="input"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Enter password to confirm"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-danger btn-sm"
                    disabled={saving || !deletePassword}
                    style={{ width: "fit-content" }}
                  >
                    Permanently Delete Account
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB I: ABOUT & LEGAL */}
          {activeTab === "about" && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 700 }}>About OmniDiscover</h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                Production-grade content discovery platform uniting educational lectures, music, movies, gaming, technology, sports, and news.
              </p>

              <div
                style={{
                  padding: "0.75rem 1rem",
                  backgroundColor: "var(--bg-surface-elevated)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  fontSize: "0.8125rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.375rem",
                }}
              >
                <div>Application Version: <strong>1.0.0 (Release)</strong></div>
                <div>Runtime: <strong>Next.js 16 (App Router) • Node 26 SQLite • Turbopack</strong></div>
                <div>Encryption Standard: <strong>AES-256-GCM (Authenticated)</strong></div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", paddingTop: "0.5rem" }}>
                <Link href="/terms" className="btn btn-outline btn-sm">Terms &amp; Conditions</Link>
                <Link href="/privacy" className="btn btn-outline btn-sm">Privacy Policy</Link>
                <Link href="/help" className="btn btn-outline btn-sm">Help Center</Link>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .settings-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
