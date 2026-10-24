"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ProviderStatus, CATEGORIES } from "@/lib/types";
import { ProviderCard } from "@/components/ProviderCard";
import { COUNTRIES, getCountryByCode, isValidCountryCode } from "@/lib/countries";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { clearLocalUserCollections } from "@/lib/local-storage";
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
  Globe,
  Languages,
  Search,
  Check,
} from "lucide-react";

type SettingsTab =
  | "connections"
  | "profile"
  | "appearance"
  | "country"
  | "language"
  | "preferences"
  | "notifications"
  | "security"
  | "about";

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>("connections");
  const [user, setUser] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [providers, setProviders] = useState<ProviderStatus[]>([
    {
      id: "youtube",
      name: "YouTube Data API v3",
      logo: "Video",
      description:
        "Enables live video search, playlist discovery, educational lecture streaming, music tracks, and verified playback metadata.",
      requiredCredential: "API Key",
      setupGuideUrl: "/help/connecting-youtube",
      status: "not_connected",
    },
    {
      id: "tmdb",
      name: "The Movie Database (TMDB)",
      logo: "Film",
      description:
        "Powers cinematic movie catalogs, ratings, posters, genres, actor overviews, and official trailer previews.",
      requiredCredential: "API Key",
      setupGuideUrl: "/help/connecting-tmdb",
      status: "not_connected",
    },
  ]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Internationalization hook
  const { language, setLanguage, t } = useTranslation();

  // Country & Language state
  const [selectedCountry, setSelectedCountry] = useState<string>("US");
  const [countrySearch, setCountrySearch] = useState<string>("");

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
        if (sessionData.session.preferences?.country) {
          setSelectedCountry(sessionData.session.preferences.country);
        }
        if (sessionData.session.preferences?.language) {
          setLanguage(sessionData.session.preferences.language);
        }
      }

      if (provRes.ok) {
        const provData = await provRes.json();
        if (Array.isArray(provData.providers) && provData.providers.length > 0) {
          setProviders(provData.providers);
        }
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

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  const activeCountryObj = useMemo(() => {
    return getCountryByCode(selectedCountry);
  }, [selectedCountry]);

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
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth-change"));
      }
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
        body: JSON.stringify({ password: deletePassword, confirmPhrase: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (isSupabaseConfigured()) {
        try {
          const supabase = createClient();
          await supabase.auth.signOut();
        } catch {
          // Graceful fallback
        }
      }
      clearLocalUserCollections();
      try {
        localStorage.removeItem("platform_theme");
        localStorage.removeItem("omnidiscover_country");
        localStorage.removeItem("omnidiscover_language");
      } catch {
        // Fallback
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth-change"));
      }

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
    { id: "connections", label: t("settings.tabs.connections") || "API Connections", icon: Key },
    { id: "profile", label: t("settings.tabs.profile") || "Profile & Account", icon: User },
    { id: "appearance", label: t("settings.tabs.appearance") || "Appearance", icon: Palette },
    { id: "country", label: t("settings.tabs.country") || "Country & Region", icon: Globe },
    { id: "language", label: t("settings.tabs.language") || "Language", icon: Languages },
    { id: "preferences", label: t("settings.tabs.preferences") || "Content & Preferences", icon: Sliders },
    { id: "notifications", label: t("settings.tabs.notifications") || "Notifications", icon: Bell },
    { id: "security", label: t("settings.tabs.security") || "Privacy & Security", icon: Shield },
    { id: "about", label: t("settings.tabs.about") || "About & Legal", icon: Info },
  ];

  return (
    <div className="container" style={{ padding: "2.5rem 1.25rem 5rem" }}>
      {/* Title */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
          {t("settings.title") || "Settings Center"}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
          {t("settings.subtitle") || "Manage your account, encrypted API connections, display themes, and data security"}
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

          {/* TAB: COUNTRY & REGION */}
          {activeTab === "country" && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.35rem" }}>
                  {t("country.title") || "Country & Content Region"}
                </h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  {t("country.description") || "Choose your preferred country to prioritize trending videos and regional content in feeds, while keeping international content accessible."}
                </p>
              </div>

              {/* Active Selection Badge / Card */}
              <div
                style={{
                  padding: "1rem 1.25rem",
                  backgroundColor: "var(--bg-surface-elevated)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontSize: "1.75rem", lineHeight: 1 }}>
                    {activeCountryObj?.flag || "🌐"}
                  </span>
                  <div>
                    <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-dim)", fontWeight: 600 }}>
                      {t("country.currentSelection") || "Current Region"}
                    </div>
                    <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-main)" }}>
                      {activeCountryObj?.name || selectedCountry} ({selectedCountry})
                    </div>
                  </div>
                </div>
                <div
                  className="badge badge-emerald"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.35rem 0.65rem" }}
                >
                  <Check size={12} />
                  <span>{t("common.active") || "Active"}</span>
                </div>
              </div>

              {/* Searchable Country Selector */}
              <div>
                <label className="label" style={{ marginBottom: "0.5rem", display: "block" }}>
                  {t("country.selectorLabel") || "Select Your Content Region:"}
                </label>

                {/* Search Filter Box */}
                <div
                  style={{
                    position: "relative",
                    marginBottom: "0.75rem",
                  }}
                >
                  <Search
                    size={16}
                    style={{
                      position: "absolute",
                      left: "0.875rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                      pointerEvents: "none",
                    }}
                  />
                  <input
                    type="text"
                    className="input"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder={t("country.searchPlaceholder") || "Search country by name or code (e.g., India, US, JP)..."}
                    style={{ paddingLeft: "2.5rem" }}
                  />
                </div>

                {/* Country List Grid / Scrollable Area */}
                <div
                  style={{
                    maxHeight: "260px",
                    overflowY: "auto",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-color)",
                    backgroundColor: "var(--bg-surface)",
                    padding: "0.5rem",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: "0.375rem",
                  }}
                >
                  {filteredCountries.map((c) => {
                    const isSelected = selectedCountry === c.code;
                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setSelectedCountry(c.code)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.5rem 0.75rem",
                          borderRadius: "var(--radius-sm)",
                          border: isSelected ? "1px solid var(--primary)" : "1px solid transparent",
                          backgroundColor: isSelected ? "var(--bg-surface-elevated)" : "transparent",
                          color: isSelected ? "var(--primary)" : "var(--text-main)",
                          fontSize: "0.875rem",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "var(--transition)",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", overflow: "hidden" }}>
                          <span style={{ fontSize: "1.125rem", lineHeight: 1 }}>{c.flag}</span>
                          <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            {c.name}
                          </span>
                        </span>
                        <span style={{ fontSize: "0.75rem", opacity: 0.65, fontWeight: 600, marginLeft: "0.5rem" }}>
                          {c.code}
                        </span>
                      </button>
                    );
                  })}
                  {filteredCountries.length === 0 && (
                    <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "1.5rem", color: "var(--text-muted)", fontSize: "0.875rem" }}>
                      No countries matching &quot;{countrySearch}&quot;
                    </div>
                  )}
                </div>
              </div>

              {/* Informative Guidance Banner */}
              <div
                style={{
                  padding: "0.875rem 1rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(59, 130, 246, 0.08)",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                  color: "var(--text-main)",
                  fontSize: "0.8125rem",
                  lineHeight: 1.5,
                  display: "flex",
                  gap: "0.625rem",
                  alignItems: "flex-start",
                }}
              >
                <Info size={16} style={{ color: "#3b82f6", flexShrink: 0, marginTop: "2px" }} />
                <span>{t("country.explanation") || "Content from your selected country will receive higher priority on your homepage and trending feed. International videos and search queries will continue to appear naturally."}</span>
              </div>

              {/* Save Button */}
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", paddingTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => handleUpdatePreferences({ country: selectedCountry })}
                  className="btn btn-primary btn-sm"
                  disabled={saving}
                >
                  {saving ? (t("common.saving") || "Saving...") : (t("country.saveAction") || "Save Country Preference")}
                </button>
              </div>
            </div>
          )}

          {/* TAB: APPLICATION LANGUAGE */}
          {activeTab === "language" && (
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div>
                <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.35rem" }}>
                  {t("language.title") || "Application Language"}
                </h3>
                <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  {t("language.description") || "Choose the language used for the OmniDiscover application interface."}
                </p>
              </div>

              {/* Language Options Cards */}
              <div>
                <label className="label" style={{ marginBottom: "0.75rem", display: "block" }}>
                  {t("language.selectorLabel") || "Select Interface Language:"}
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {[
                    {
                      code: "en" as const,
                      name: "English",
                      nativeName: "English",
                      flag: "🇺🇸",
                      desc: "Default interface, standard international English.",
                    },
                    {
                      code: "hi" as const,
                      name: "Hindi",
                      nativeName: "हिन्दी",
                      flag: "🇮🇳",
                      desc: "पूर्ण हिंदी इंटरफ़ेस और क्षेत्रीय खोज प्राथमिकता।",
                    },
                  ].map((langItem) => {
                    const isSelected = language === langItem.code;
                    return (
                      <button
                        key={langItem.code}
                        type="button"
                        onClick={async () => {
                          setLanguage(langItem.code);
                          await handleUpdatePreferences({ language: langItem.code });
                        }}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-start",
                          gap: "0.5rem",
                          padding: "1.25rem",
                          borderRadius: "var(--radius-md)",
                          border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border-color)",
                          backgroundColor: isSelected ? "var(--bg-surface-elevated)" : "var(--bg-surface)",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "var(--transition)",
                          position: "relative",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "1.5rem" }}>{langItem.flag}</span>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: "1rem", color: isSelected ? "var(--primary)" : "var(--text-main)" }}>
                                {langItem.nativeName}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                {langItem.name}
                              </div>
                            </div>
                          </div>
                          {isSelected && (
                            <div
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "50%",
                                backgroundColor: "var(--primary)",
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Check size={12} />
                            </div>
                          )}
                        </div>
                        <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0, marginTop: "0.25rem", lineHeight: 1.4 }}>
                          {langItem.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Informative Guidance Banner */}
              <div
                style={{
                  padding: "0.875rem 1rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(59, 130, 246, 0.08)",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                  color: "var(--text-main)",
                  fontSize: "0.8125rem",
                  lineHeight: 1.5,
                  display: "flex",
                  gap: "0.625rem",
                  alignItems: "flex-start",
                }}
              >
                <Info size={16} style={{ color: "#3b82f6", flexShrink: 0, marginTop: "2px" }} />
                <span>{t("language.explanation") || "This setting translates navigation, menus, and application controls. Video titles and creator descriptions from YouTube remain in their original language."}</span>
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
                    <label className="label">Confirm Your Password or Type &quot;DELETE&quot;</label>
                    <input
                      type="password"
                      className="input"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      placeholder="Enter password or type DELETE"
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
