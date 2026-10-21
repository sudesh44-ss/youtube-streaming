"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("platform_theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initial = prefersDark ? "dark" : "light";
      setTheme(initial);
      document.documentElement.setAttribute("data-theme", initial);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("platform_theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-outline btn-sm"
      aria-label="Toggle visual theme"
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      style={{ padding: "0.4rem 0.6rem", borderRadius: "var(--radius-full)" }}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      <span style={{ fontSize: "0.75rem", textTransform: "capitalize" }}>{theme}</span>
    </button>
  );
}
