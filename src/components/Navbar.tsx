"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Compass, Bookmark, Settings, HelpCircle, LogOut, Menu, X, User } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface UserInfo {
  id: string;
  email: string;
  name: string;
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "rgba(9, 13, 22, 0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-color)",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "64px",
        }}
      >
        {/* Logo */}
        <Link
          href={user ? "/dashboard" : "/"}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            fontWeight: 700,
            fontSize: "1.125rem",
            color: "var(--text-main)",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #38bdf8, #2563eb)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 2px 8px var(--primary-glow)",
            }}
          >
            <Compass size={20} />
          </div>
          <span>Omni<span style={{ color: "var(--primary)" }}>Discover</span></span>
        </Link>

        {/* Desktop Nav Links */}
        <nav
          style={{
            display: "none",
            alignItems: "center",
            gap: "1.5rem",
            fontSize: "0.9375rem",
            color: "var(--text-muted)",
          }}
          className="desktop-nav"
        >
          {user ? (
            <>
              <Link
                href="/dashboard"
                style={{
                  color: pathname === "/dashboard" ? "var(--primary)" : "inherit",
                  fontWeight: pathname === "/dashboard" ? 600 : 400,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <Compass size={17} /> Dashboard
              </Link>
              <Link
                href="/dashboard/saved"
                style={{
                  color: pathname === "/dashboard/saved" ? "var(--primary)" : "inherit",
                  fontWeight: pathname === "/dashboard/saved" ? 600 : 400,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <Bookmark size={17} /> Watchlist
              </Link>
              <Link
                href="/settings"
                style={{
                  color: pathname.startsWith("/settings") ? "var(--primary)" : "inherit",
                  fontWeight: pathname.startsWith("/settings") ? 600 : 400,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <Settings size={17} /> Settings
              </Link>
              <Link
                href="/help"
                style={{
                  color: pathname.startsWith("/help") ? "var(--primary)" : "inherit",
                  fontWeight: pathname.startsWith("/help") ? 600 : 400,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <HelpCircle size={17} /> Help
              </Link>
            </>
          ) : (
            <>
              <Link href="/#features">Features</Link>
              <Link href="/#categories">Categories</Link>
              <Link href="/help">Help Center</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
            </>
          )}
        </nav>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <ThemeToggle />

          {!loading && (
            <>
              {user ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <Link
                    href="/settings"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.375rem 0.75rem",
                      borderRadius: "var(--radius-full)",
                      backgroundColor: "var(--bg-surface-elevated)",
                      border: "1px solid var(--border-color)",
                      fontSize: "0.875rem",
                    }}
                  >
                    <User size={15} style={{ color: "var(--primary)" }} />
                    <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.name.split(" ")[0]}
                    </span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="btn btn-outline btn-sm"
                    title="Sign Out"
                    aria-label="Sign Out"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  <Link href="/auth/signin" className="btn btn-outline btn-sm">
                    Sign In
                  </Link>
                  <Link href="/auth/signup" className="btn btn-primary btn-sm">
                    Get Started
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Mobile hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="btn btn-outline btn-sm mobile-toggle"
            aria-label="Toggle navigation menu"
            style={{ display: "none" }}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          style={{
            borderTop: "1px solid var(--border-color)",
            backgroundColor: "var(--bg-surface)",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {user ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                style={{ padding: "0.5rem 0", color: "var(--text-main)" }}
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/saved"
                onClick={() => setMobileMenuOpen(false)}
                style={{ padding: "0.5rem 0", color: "var(--text-main)" }}
              >
                Watchlist
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                style={{ padding: "0.5rem 0", color: "var(--text-main)" }}
              >
                Settings Center
              </Link>
              <Link
                href="/help"
                onClick={() => setMobileMenuOpen(false)}
                style={{ padding: "0.5rem 0", color: "var(--text-main)" }}
              >
                Help & Documentation
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="btn btn-danger btn-sm"
                style={{ justifyContent: "flex-start", marginTop: "0.5rem" }}
              >
                <LogOut size={16} /> Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/#features" onClick={() => setMobileMenuOpen(false)} style={{ padding: "0.5rem 0" }}>
                Features
              </Link>
              <Link href="/#categories" onClick={() => setMobileMenuOpen(false)} style={{ padding: "0.5rem 0" }}>
                Categories
              </Link>
              <Link href="/help" onClick={() => setMobileMenuOpen(false)} style={{ padding: "0.5rem 0" }}>
                Help Center
              </Link>
              <Link href="/privacy" onClick={() => setMobileMenuOpen(false)} style={{ padding: "0.5rem 0" }}>
                Privacy Policy
              </Link>
              <Link href="/terms" onClick={() => setMobileMenuOpen(false)} style={{ padding: "0.5rem 0" }}>
                Terms & Conditions
              </Link>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
                <Link
                  href="/auth/signin"
                  className="btn btn-outline btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Create Account
                </Link>
              </div>
            </>
          )}
        </div>
      )}

      <style jsx>{`
        @media (min-width: 768px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-toggle {
            display: none !important;
          }
        }
        @media (max-width: 767px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-toggle {
            display: inline-flex !important;
          }
        }
      `}</style>
    </header>
  );
}
