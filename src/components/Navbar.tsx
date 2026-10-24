"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Compass,
  Bookmark,
  Settings,
  HelpCircle,
  LogOut,
  User,
  Sparkles,
  Layers,
  ShieldCheck,
  FileText,
  Clock,
  Search,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { clearLocalUserCollections } from "@/lib/local-storage";
import { isSupabaseConfigured, createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface UserInfo {
  id: string;
  email: string;
  name: string;
}

// Client-side in-flight session deduplication to prevent concurrent duplicate requests
let inFlightSessionPromise: Promise<any> | null = null;

async function fetchSessionShared(): Promise<any> {
  if (inFlightSessionPromise) return inFlightSessionPromise;
  inFlightSessionPromise = fetch("/api/auth/session")
    .then(async (res) => {
      const data = res.ok ? await res.json() : null;
      return { status: res.status, data };
    })
    .catch(() => null)
    .finally(() => {
      inFlightSessionPromise = null;
    });
  return inFlightSessionPromise;
}

const AUTH_NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: Compass },
  { label: "Watchlist", href: "/dashboard/saved", icon: Bookmark },
  { label: "Watch History", href: "/dashboard/history", icon: Clock },
  { label: "Search History", href: "/dashboard/search-history", icon: Search },
  { label: "Settings", href: "/settings", icon: Settings },
];

const PUBLIC_NAV_ITEMS = [
  { label: "Features", href: "/#features", icon: Sparkles },
  { label: "Categories", href: "/#categories", icon: Layers },
  { label: "Help Center", href: "/help", icon: HelpCircle },
  { label: "Privacy", href: "/privacy", icon: ShieldCheck },
  { label: "Terms", href: "/terms", icon: FileText },
];

const DISCOVER_SECTIONS = [
  { label: "Trending on YouTube", sectionId: "trending", href: "/discover/trending", emoji: "🔥" },
  { label: "Music & Live Performances", sectionId: "music", href: "/discover/music", emoji: "🎵" },
  { label: "Gaming & Highlights", sectionId: "gaming", href: "/discover/gaming", emoji: "🎮" },
  { label: "Study & Lectures", sectionId: "study", href: "/discover/study", emoji: "📚" },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const desktopPanelRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  const checkSession = useCallback(async () => {
    try {
      const response = await fetchSessionShared();
      if (!response) return;

      if (response.status === 401 || response.status === 403) {
        setUser(null);
        return;
      }

      if (response.data?.session?.user) {
        setUser(response.data.session.user);
      } else {
        setUser(null);
      }
    } catch {
      // Network interruption, offline, or transient timeout.
      // Do NOT set user to null on temporary failures to prevent unexpected logouts.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [pathname, checkSession]);

  // Synchronize on auth changes or window focus without aggressive logout on failure
  useEffect(() => {
    const handleAuthChange = () => checkSession();
    window.addEventListener("focus", handleAuthChange);
    window.addEventListener("auth-change", handleAuthChange);
    return () => {
      window.removeEventListener("focus", handleAuthChange);
      window.removeEventListener("auth-change", handleAuthChange);
    };
  }, [checkSession]);

  // Real-time Supabase Auth state listener for token refresh and external session changes
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          checkSession();
        } else if (event === "SIGNED_OUT") {
          setUser(null);
        }
      });
      return () => {
        subscription.unsubscribe();
      };
    } catch {
      // Safe fallback
    }
  }, [checkSession]);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Handle escape key, outside clicks, and body scroll lock
  useEffect(() => {
    if (!menuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        toggleBtnRef.current?.focus();
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        desktopPanelRef.current &&
        !desktopPanelRef.current.contains(target) &&
        toggleBtnRef.current &&
        !toggleBtnRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    if (window.innerWidth < 768) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      if (isSupabaseConfigured()) {
        try {
          const supabase = createClient();
          await supabase.auth.signOut();
        } catch {
          // Graceful browser signout
        }
      }
      clearLocalUserCollections();
      setUser(null);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth-change"));
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      console.error("Logout error", e);
    }
  };

  const handleSectionClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setMenuOpen(false);
    router.push(href);
  };

  const isAuthenticated = !loading && Boolean(user);

  const authNavItems = [
    { label: t("nav.dashboard") || "Dashboard", href: "/dashboard", icon: Compass },
    { label: t("nav.watchlist") || "Watchlist", href: "/dashboard/saved", icon: Bookmark },
    { label: t("nav.history") || "Watch History", href: "/dashboard/history", icon: Clock },
    { label: t("nav.searchHistory") || "Search History", href: "/dashboard/search-history", icon: Search },
    { label: t("nav.settings") || "Settings", href: "/settings", icon: Settings },
  ];

  const publicNavItems = [
    { label: "Features", href: "/#features", icon: Sparkles },
    { label: t("nav.categories") || "Categories", href: "/#categories", icon: Layers },
    { label: t("nav.help") || "Help Center", href: "/help", icon: HelpCircle },
    { label: "Privacy", href: "/privacy", icon: ShieldCheck },
    { label: "Terms", href: "/terms", icon: FileText },
  ];

  const visibleMenuItems = isAuthenticated
    ? [...authNavItems, ...publicNavItems]
    : publicNavItems;

  return (
    <header className="navbar-header">
      <div className="container nav-container">
        {/* Brand */}
        <div className="nav-brand-group">
          <Link
            href={user ? "/dashboard" : "/"}
            className="nav-logo"
          >
            <div className="nav-logo-icon">
              <Compass size={20} />
            </div>
            <span>Omni<span style={{ color: "var(--primary)" }}>Discover</span></span>
          </Link>
        </div>

        {/* Action Controls & Menu Trigger */}
        <div className="nav-actions">
          {/* Portfolio Attribution Link */}
          <a
            href="https://sudeshcreation.shop"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-portfolio-link"
            title="Portfolio • sudeshcreation.shop"
            aria-label="Creator Portfolio"
          >
            <img
              src="/icons/portfolio_logo.png"
              alt="Sudesh Creation"
              width={24}
              height={24}
              className="nav-portfolio-img"
            />
          </a>

          {!loading && !user && (
            <div className="nav-auth-buttons">
              <Link href="/auth/signin" className="btn btn-outline btn-sm">
                {t("nav.signIn") || "Sign In"}
              </Link>
              <Link href="/auth/signup" className="btn btn-primary btn-sm">
                {t("nav.signUp") || "Get Started"}
              </Link>
            </div>
          )}

          {/* Unified Menu Toggle Button using icons folder */}
          <button
            ref={toggleBtnRef}
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="btn btn-outline btn-sm nav-menu-toggle"
            aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            aria-controls="nav-desktop-menu-panel"
          >
            <img
              src={menuOpen ? "/icons/close.png" : "/icons/hamburger.png"}
              alt=""
              width={18}
              height={18}
              className="nav-menu-icon-img"
              aria-hidden="true"
            />
          </button>

          {/* Platform Switcher: YouTube & YouTube Music — Immediately right of Menu Button, Authenticated Only */}
          {!loading && Boolean(user) && (
            <div className="nav-app-switcher" role="group" aria-label="Switch Platform">
              <Link
                href="/dashboard"
                className={`app-switcher-btn ${!pathname?.startsWith("/music") ? "active" : ""}`}
                title="YouTube"
                aria-label="YouTube"
              >
                <img
                  src="/icons/youtube.png"
                  alt="YouTube"
                  width={20}
                  height={20}
                  className="app-switcher-icon"
                />
              </Link>
              <Link
                href="/music"
                className={`app-switcher-btn ${pathname?.startsWith("/music") ? "active" : ""}`}
                title="YouTube Music"
                aria-label="YouTube Music"
              >
                <img
                  src="/icons/youtube-music.png"
                  alt="YouTube Music"
                  width={20}
                  height={20}
                  className="app-switcher-icon"
                />
              </Link>
            </div>
          )}

          {/* Desktop Dropdown Panel */}
          {menuOpen && (
            <div
              ref={desktopPanelRef}
              id="nav-desktop-menu-panel"
              role="menu"
              aria-label="Navigation menu"
              className="nav-desktop-panel"
            >
              {/* Navigation Items */}
              <div className="menu-panel-list">
                {visibleMenuItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className={`menu-panel-item ${isActive ? "active" : ""}`}
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: "11px",
                        width: "100%",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        className="menu-panel-item-icon"
                        aria-hidden="true"
                        style={{
                          width: "20px",
                          height: "20px",
                          minWidth: "20px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={18} />
                      </span>
                      <span
                        className="menu-panel-item-label"
                        style={{
                          flex: 1,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          textAlign: "left",
                        }}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Discover Feed Section Shortcuts — Authenticated Only */}
              {isAuthenticated && (
                <>
                  <div className="menu-panel-divider" />
                  <div className="menu-sections-group">
                    <div className="menu-sections-heading">Discover Feed</div>
                    {DISCOVER_SECTIONS.map((sec) => (
                      <a
                        key={sec.sectionId}
                        href={sec.href}
                        role="menuitem"
                        onClick={(e) => handleSectionClick(e, sec.href)}
                        className="menu-panel-item"
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: "11px",
                          width: "100%",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          className="menu-section-icon"
                          aria-hidden="true"
                          style={{
                            width: "20px",
                            height: "20px",
                            minWidth: "20px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {sec.emoji}
                        </span>
                        <span
                          className="menu-panel-item-label"
                          style={{
                            flex: 1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            textAlign: "left",
                          }}
                        >
                          {sec.label}
                        </span>
                      </a>
                    ))}
                  </div>
                </>
              )}

              {/* Visual Divider before Account & Appearance */}
              <div className="menu-panel-divider" />

              {/* Account & Appearance Section */}
              <div className="menu-account-section">
                <div className="menu-theme-row">
                  <span className="menu-theme-label">Appearance</span>
                  <ThemeToggle />
                </div>

                {user ? (
                  <div className="menu-user-block">
                    <div className="menu-user-info">
                      <div className="menu-user-avatar">
                        <User size={16} />
                      </div>
                      <div className="menu-user-text">
                        <div className="menu-user-name">{user.name}</div>
                        <div className="menu-user-role">
                          {user.email === "admin@example.com" ? "Administrator" : "Standard Account"}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        handleLogout();
                      }}
                      className="btn btn-outline btn-sm menu-signout-btn"
                      title={t("nav.signOut") || "Sign Out"}
                    >
                      <LogOut size={14} />
                      <span>{t("nav.signOut") || "Sign Out"}</span>
                    </button>
                  </div>
                ) : (
                  <div className="menu-guest-block">
                    <Link
                      href="/auth/signin"
                      onClick={() => setMenuOpen(false)}
                      className="btn btn-outline btn-sm"
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      {t("nav.signIn") || "Sign In"}
                    </Link>
                    <Link
                      href="/auth/signup"
                      onClick={() => setMenuOpen(false)}
                      className="btn btn-primary btn-sm"
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      {t("nav.signUp") || "Get Started"}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Navigation (slides in from left) */}
      {menuOpen && (
        <div className="nav-mobile-overlay">
          {/* Backdrop */}
          <div
            className="nav-mobile-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Sliding from Left */}
          <aside
            id="nav-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation drawer"
            className="nav-mobile-drawer"
          >
            {/* Drawer Header */}
            <div className="drawer-header">
              <Link
                href={user ? "/dashboard" : "/"}
                onClick={() => setMenuOpen(false)}
                className="drawer-logo"
              >
                <div className="nav-logo-icon">
                  <Compass size={18} />
                </div>
                <span>Omni<span style={{ color: "var(--primary)" }}>Discover</span></span>
              </Link>

              <div className="drawer-header-actions">
                <a
                  href="https://sudeshcreation.shop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="drawer-portfolio-link"
                  title="Portfolio • sudeshcreation.shop"
                  aria-label="Creator Portfolio"
                >
                  <img
                    src="/icons/portfolio_logo.png"
                    alt="Portfolio"
                    width={22}
                    height={22}
                    className="portfolio-badge-img"
                  />
                </a>

                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="btn btn-outline btn-sm drawer-close-btn"
                  aria-label="Close navigation menu"
                >
                  <img
                    src="/icons/close.png"
                    alt=""
                    width={16}
                    height={16}
                    className="nav-menu-icon-img"
                    aria-hidden="true"
                  />
                </button>
              </div>
            </div>

            {/* Drawer Nav Items */}
            <div className="drawer-nav-list">
              {visibleMenuItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`drawer-nav-item ${isActive ? "active" : ""}`}
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: "11px",
                      width: "100%",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span
                      className="menu-panel-item-icon"
                      aria-hidden="true"
                      style={{
                        width: "20px",
                        height: "20px",
                        minWidth: "20px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} />
                    </span>
                    <span
                      className="drawer-nav-item-label"
                      style={{
                        flex: 1,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        textAlign: "left",
                      }}
                    >
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* Discover Feed Section Shortcuts — Authenticated Only */}
            {isAuthenticated && (
              <>
                <div className="menu-panel-divider" style={{ margin: "0.25rem 0.75rem" }} />
                <div
                  className="drawer-sections-group"
                  style={{ padding: "0 0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}
                >
                  <div className="menu-sections-heading" style={{ padding: "0.25rem 0.75rem" }}>
                    Discover Feed
                  </div>
                  {DISCOVER_SECTIONS.map((sec) => (
                    <a
                      key={sec.sectionId}
                      href={sec.href}
                      onClick={(e) => handleSectionClick(e, sec.href)}
                      className="drawer-nav-item"
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: "11px",
                        width: "100%",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        className="menu-section-icon"
                        aria-hidden="true"
                        style={{
                          width: "20px",
                          height: "20px",
                          minWidth: "20px",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {sec.emoji}
                      </span>
                      <span
                        className="drawer-nav-item-label"
                        style={{
                          flex: 1,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          textAlign: "left",
                        }}
                      >
                        {sec.label}
                      </span>
                    </a>
                  ))}
                </div>
              </>
            )}

            {/* Visual Divider before Account & Appearance */}
            <div className="menu-panel-divider" style={{ margin: "0.25rem 0.75rem" }} />

            {/* Mobile Drawer Footer Actions */}
            <div className="drawer-footer">
              <div className="menu-theme-row" style={{ marginBottom: "0.875rem" }}>
                <span className="menu-theme-label">Appearance</span>
                <ThemeToggle />
              </div>

              {user ? (
                <div className="menu-user-block">
                  <div className="menu-user-info">
                    <div className="menu-user-avatar">
                      <User size={16} />
                    </div>
                    <div className="menu-user-text">
                      <div className="menu-user-name">{user.name}</div>
                      <div className="menu-user-role">
                        {user.email === "admin@example.com" ? "Administrator" : "Standard Account"}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                    className="btn btn-danger btn-sm"
                    style={{ justifyContent: "center", marginTop: "0.5rem", width: "100%" }}
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  <Link
                    href="/auth/signin"
                    className="btn btn-outline btn-sm"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="btn btn-primary btn-sm"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => setMenuOpen(false)}
                  >
                    Create Free Account
                  </Link>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      <style jsx>{`
        .navbar-header {
          position: sticky;
          top: 0;
          z-index: 50;
          background-color: var(--navbar-bg, rgba(17, 18, 18, 0.88));
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-color);
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }

        :global([data-theme="light"]) .navbar-header {
          background-color: var(--navbar-bg, rgba(255, 255, 255, 0.92));
        }

        .nav-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
        }

        .nav-brand-group {
          display: flex;
          align-items: center;
          gap: 1.125rem;
        }

        .nav-app-switcher {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: transparent;
          border: none;
          padding: 0;
          margin-left: 0.125rem;
        }

        .app-switcher-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          text-decoration: none;
          box-sizing: border-box;
          outline: none;
          flex-shrink: 0;
        }

        .app-switcher-btn:hover {
          background-color: var(--bg-subtle);
          border-color: var(--border-focus);
          transform: scale(1.06);
        }

        .app-switcher-btn:focus-visible {
          outline: 2px solid var(--primary);
          outline-offset: 2px;
        }

        /* Active highlight: subtle light-red background for the active platform */
        .app-switcher-btn.active {
          background-color: rgba(239, 68, 68, 0.16);
          border-color: rgba(239, 68, 68, 0.45);
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.25);
        }

        :global([data-theme="light"]) .app-switcher-btn.active {
          background-color: rgba(239, 68, 68, 0.12);
          border-color: rgba(239, 68, 68, 0.35);
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
        }

        .app-switcher-icon {
          width: 20px;
          height: 20px;
          object-fit: contain;
          border-radius: 50%;
          display: block;
        }

        .nav-portfolio-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
          background-color: var(--bg-surface-elevated);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
          flex-shrink: 0;
          text-decoration: none;
        }

        .nav-portfolio-link:hover {
          border-color: var(--primary);
          transform: translateY(-1px) scale(1.05);
          box-shadow: 0 2px 10px rgba(56, 189, 248, 0.25);
        }

        .nav-portfolio-img {
          width: 22px;
          height: 22px;
          object-fit: contain;
        }

        .drawer-header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .drawer-portfolio-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
          background-color: var(--bg-surface-elevated);
          transition: all 0.2s ease;
        }

        .drawer-portfolio-link:hover {
          border-color: var(--primary);
          transform: scale(1.05);
        }

        .portfolio-badge-img {
          width: 20px;
          height: 20px;
          object-fit: contain;
        }

        .nav-logo {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          font-weight: 700;
          font-size: 1.125rem;
          color: var(--text-main);
          text-decoration: none;
        }

        .nav-logo-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: linear-gradient(135deg, #38bdf8, #2563eb);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 2px 8px var(--primary-glow);
        }

        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          font-size: 0.9375rem;
          color: var(--text-muted);
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          color: inherit;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .nav-link:hover,
        .nav-link.active {
          color: var(--primary);
          font-weight: 600;
        }

        .nav-actions {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .nav-user-controls {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .nav-user-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.75rem;
          border-radius: var(--radius-full);
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          font-size: 0.875rem;
          color: var(--text-main);
          text-decoration: none;
        }

        .nav-user-name {
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .nav-auth-buttons {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }

        .nav-menu-toggle {
          padding: 0.45rem;
          min-width: 36px;
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
          cursor: pointer;
        }

        .nav-menu-icon-img {
          width: 18px;
          height: 18px;
          object-fit: contain;
          filter: brightness(0) invert(1);
          transition: transform 0.2s ease;
        }

        :global([data-theme="light"]) .nav-menu-icon-img {
          filter: brightness(0);
        }

        /* Desktop Dropdown Styles */
        .nav-desktop-panel {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 290px;
          max-height: calc(100vh - 80px);
          overflow-y: auto;
          background-color: var(--bg-surface);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          padding: 0.5rem;
          z-index: 100;
          animation: desktopDropdownFade 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: top right;
          box-sizing: border-box;
        }

        .menu-sections-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          width: 100%;
          box-sizing: border-box;
        }

        .menu-sections-heading {
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-dim);
          padding: 0.375rem 0.75rem 0.2rem;
        }

        .menu-panel-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
          box-sizing: border-box;
        }

        .menu-panel-item {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          flex-wrap: nowrap !important;
          width: 100% !important;
          box-sizing: border-box !important;
          gap: 11px;
          padding: 0.55rem 0.75rem;
          border-radius: var(--radius-sm);
          color: var(--text-main);
          text-decoration: none;
          white-space: nowrap;
          transition: background-color 0.15s ease, color 0.15s ease;
          cursor: pointer;
        }

        .menu-panel-item:hover {
          background-color: var(--bg-subtle);
          color: var(--primary);
        }

        .menu-panel-item:focus-visible {
          outline: 2px solid var(--border-focus);
          outline-offset: -1px;
        }

        .menu-panel-item.active {
          background-color: var(--bg-subtle);
          color: var(--primary);
          font-weight: 600;
        }

        .menu-panel-item-icon {
          width: 20px;
          height: 20px;
          min-width: 20px;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
          color: var(--text-muted);
          transition: color 0.15s ease;
          line-height: 1;
        }

        .menu-panel-item-icon svg {
          width: 18px;
          height: 18px;
          display: block;
          flex-shrink: 0;
        }

        .menu-section-icon {
          width: 20px;
          height: 20px;
          min-width: 20px;
          font-size: 1rem;
          line-height: 1;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
        }

        .menu-panel-item-label {
          flex: 1;
          font-size: 0.9375rem;
          font-weight: 500;
          line-height: 1.25;
          color: inherit;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: left;
        }

        .menu-panel-item:hover .menu-panel-item-icon,
        .menu-panel-item.active .menu-panel-item-icon {
          color: var(--primary);
        }

        .menu-panel-divider {
          height: 1px;
          background-color: var(--border-color);
          margin: 0.5rem 0;
        }

        .menu-account-section {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          padding: 0.25rem;
        }

        .menu-theme-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.25rem 0.5rem;
        }

        .menu-theme-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .menu-user-block {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          padding: 0.625rem;
          background-color: var(--bg-surface-elevated);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
        }

        .menu-user-info {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }

        .menu-user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(56, 189, 248, 0.15);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .menu-user-text {
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .menu-user-name {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .menu-user-role {
          font-size: 0.75rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .menu-signout-btn {
          width: 100%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.25);
        }

        .menu-signout-btn:hover {
          background-color: rgba(239, 68, 68, 0.1);
          border-color: #ef4444;
          color: #ef4444;
        }

        .menu-guest-block {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        @keyframes desktopDropdownFade {
          0% {
            opacity: 0;
            transform: translateY(-8px) scale(0.97);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Mobile Drawer Styles */
        .nav-mobile-overlay {
          position: fixed;
          inset: 0;
          z-index: 999;
        }

        .nav-mobile-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(4px);
          animation: mobileFadeIn 0.2s ease forwards;
        }

        .nav-mobile-drawer {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          width: 290px;
          max-width: 85vw;
          background-color: var(--bg-surface);
          border-right: 1px solid var(--border-color);
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          z-index: 1000;
          overflow-y: auto;
          animation: mobileSlideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          box-sizing: border-box;
        }

        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid var(--border-color);
        }

        .drawer-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 700;
          font-size: 1rem;
          color: var(--text-main);
          text-decoration: none;
        }

        .drawer-close-btn {
          padding: 0.375rem;
          min-width: 32px;
          min-height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .drawer-nav-list {
          display: flex;
          flex-direction: column;
          padding: 0.875rem 0.75rem;
          gap: 0.25rem;
          flex: 1;
          width: 100%;
          box-sizing: border-box;
        }

        .drawer-nav-item {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
          flex-wrap: nowrap !important;
          width: 100% !important;
          box-sizing: border-box !important;
          gap: 11px;
          padding: 0.75rem 1rem;
          min-height: 44px;
          border-radius: var(--radius-sm);
          color: var(--text-main);
          font-size: 0.9375rem;
          font-weight: 500;
          text-decoration: none;
          white-space: nowrap;
          transition: background-color 0.15s ease, color 0.15s ease;
          cursor: pointer;
        }

        .drawer-nav-item:hover,
        .drawer-nav-item.active {
          background-color: var(--bg-subtle);
          color: var(--primary);
          font-weight: 600;
        }

        .drawer-nav-item:focus-visible {
          outline: 2px solid var(--border-focus);
          outline-offset: -1px;
        }

        .drawer-nav-item .menu-panel-item-icon {
          width: 20px;
          height: 20px;
          min-width: 20px;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
          color: var(--text-muted);
        }

        .drawer-nav-item .menu-panel-item-icon svg {
          width: 18px;
          height: 18px;
          display: block;
          flex-shrink: 0;
        }

        .drawer-nav-item .menu-section-icon {
          width: 20px;
          height: 20px;
          min-width: 20px;
          font-size: 1rem;
          line-height: 1;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
        }

        .drawer-nav-item-label {
          flex: 1;
          font-size: 0.9375rem;
          font-weight: 500;
          line-height: 1.25;
          color: inherit;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: left;
        }

        .drawer-nav-item:hover .menu-panel-item-icon,
        .drawer-nav-item.active .menu-panel-item-icon {
          color: var(--primary);
        }

        .drawer-footer {
          padding: 1.25rem;
          border-top: 1px solid var(--border-color);
          background-color: var(--bg-surface-elevated);
        }

        @keyframes mobileFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes mobileSlideInLeft {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(0);
          }
        }

        /* Responsive Breakpoints */
        @media (min-width: 768px) {
          .nav-mobile-overlay {
            display: none !important;
          }
        }

        @media (max-width: 767px) {
          .nav-desktop-panel {
            display: none !important;
          }
          .desktop-nav {
            display: none !important;
          }
          .nav-auth-buttons {
            display: none !important;
          }
          .nav-signout-btn {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
}
