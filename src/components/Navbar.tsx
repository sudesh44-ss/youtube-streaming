"use client";

import { useEffect, useState, useRef } from "react";
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
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface UserInfo {
  id: string;
  email: string;
  name: string;
}

const MENU_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: Compass },
  { label: "Watchlist", href: "/dashboard/saved", icon: Bookmark },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Features", href: "/#features", icon: Sparkles },
  { label: "Categories", href: "/#categories", icon: Layers },
  { label: "Help Center", href: "/help", icon: HelpCircle },
  { label: "Privacy", href: "/privacy", icon: ShieldCheck },
  { label: "Terms", href: "/terms", icon: FileText },
];

const DISCOVER_SECTIONS = [
  { label: "Trending on YouTube", sectionId: "trending", href: "/dashboard#trending", emoji: "🔥" },
  { label: "Recommended for You", sectionId: "recommended", href: "/dashboard#recommended", emoji: "✨" },
  { label: "Music & Live Performances", sectionId: "music", href: "/dashboard#music", emoji: "🎵" },
  { label: "Gaming & Highlights", sectionId: "gaming", href: "/dashboard#gaming", emoji: "🎮" },
  { label: "Study & Lectures", sectionId: "study", href: "/dashboard#study", emoji: "📚" },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const desktopPanelRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.session?.user) {
          setUser(data.session.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [pathname]);

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
      setUser(null);
      router.push("/");
      router.refresh();
    } catch (e) {
      console.error("Logout error", e);
    }
  };

  const handleSectionClick = (e: React.MouseEvent, sectionId: string) => {
    e.preventDefault();
    setMenuOpen(false);

    if (pathname === "/dashboard") {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.pushState(null, "", `/dashboard#${sectionId}`);
      }
    } else {
      router.push(`/dashboard#${sectionId}`);
    }
  };

  return (
    <header className="navbar-header">
      <div className="container nav-container">
        {/* Logo */}
        <Link
          href={user ? "/dashboard" : "/"}
          className="nav-logo"
        >
          <div className="nav-logo-icon">
            <Compass size={20} />
          </div>
          <span>Omni<span style={{ color: "var(--primary)" }}>Discover</span></span>
        </Link>

        {/* Action Controls & Menu Trigger */}
        <div className="nav-actions">
          {!loading && !user && (
            <div className="nav-auth-buttons">
              <Link href="/auth/signin" className="btn btn-outline btn-sm">
                Sign In
              </Link>
              <Link href="/auth/signup" className="btn btn-primary btn-sm">
                Get Started
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

          {/* Desktop Dropdown Panel */}
          {menuOpen && (
            <div
              ref={desktopPanelRef}
              id="nav-desktop-menu-panel"
              role="menu"
              aria-label="Navigation menu"
              className="nav-desktop-panel"
            >
              {/* 1 to 8 Items */}
              <div className="menu-panel-list">
                {MENU_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className={`menu-panel-item ${isActive ? "active" : ""}`}
                    >
                      <span className="menu-panel-item-icon">
                        <Icon size={17} />
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Visual Divider */}
              <div className="menu-panel-divider" />

              {/* Discover Feed Section Shortcuts */}
              <div className="menu-sections-group">
                <div className="menu-sections-heading">Discover Feed</div>
                {DISCOVER_SECTIONS.map((sec) => (
                  <a
                    key={sec.sectionId}
                    href={sec.href}
                    role="menuitem"
                    onClick={(e) => handleSectionClick(e, sec.sectionId)}
                    className="menu-panel-item"
                  >
                    <span className="menu-section-icon" aria-hidden="true">
                      {sec.emoji}
                    </span>
                    <span>{sec.label}</span>
                  </a>
                ))}
              </div>

              {/* Visual Divider */}
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
                      title="Sign Out"
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
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
                      Sign In
                    </Link>
                    <Link
                      href="/auth/signup"
                      onClick={() => setMenuOpen(false)}
                      className="btn btn-primary btn-sm"
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      Get Started
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

            {/* Drawer Nav Items */}
            <div className="drawer-nav-list">
              {MENU_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`drawer-nav-item ${isActive ? "active" : ""}`}
                  >
                    <span className="menu-panel-item-icon">
                      <Icon size={18} />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Visual Divider */}
            <div className="menu-panel-divider" style={{ margin: "0.25rem 0.75rem" }} />

            {/* Discover Feed Section Shortcuts */}
            <div className="drawer-sections-group" style={{ padding: "0 0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <div className="menu-sections-heading" style={{ padding: "0.25rem 0.75rem" }}>Discover Feed</div>
              {DISCOVER_SECTIONS.map((sec) => (
                <a
                  key={sec.sectionId}
                  href={sec.href}
                  onClick={(e) => handleSectionClick(e, sec.sectionId)}
                  className="drawer-nav-item"
                >
                  <span className="menu-section-icon" aria-hidden="true">
                    {sec.emoji}
                  </span>
                  <span>{sec.label}</span>
                </a>
              ))}
            </div>

            {/* Visual Divider */}
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
          background-color: rgba(9, 13, 22, 0.88);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-color);
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }

        :global([data-theme="light"]) .navbar-header {
          background-color: rgba(255, 255, 255, 0.92);
        }

        .nav-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
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
          width: 280px;
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
        }

        .menu-sections-group {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .menu-sections-heading {
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-dim);
          padding: 0.375rem 0.75rem 0.2rem;
        }

        .menu-section-icon {
          font-size: 1rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          flex-shrink: 0;
        }

        .menu-panel-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .menu-panel-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.55rem 0.75rem;
          border-radius: var(--radius-sm);
          color: var(--text-main);
          font-size: 0.9375rem;
          font-weight: 500;
          text-decoration: none;
          transition: background-color 0.15s ease, color 0.15s ease;
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
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: color 0.15s ease;
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
          width: 280px;
          max-width: 82vw;
          background-color: var(--bg-surface);
          border-right: 1px solid var(--border-color);
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          z-index: 1000;
          overflow-y: auto;
          animation: mobileSlideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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
        }

        .drawer-nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          min-height: 44px;
          border-radius: var(--radius-sm);
          color: var(--text-main);
          font-size: 0.9375rem;
          font-weight: 500;
          text-decoration: none;
          transition: background-color 0.15s ease, color 0.15s ease;
        }

        .drawer-nav-item:hover,
        .drawer-nav-item.active {
          background-color: var(--bg-subtle);
          color: var(--primary);
          font-weight: 600;
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
