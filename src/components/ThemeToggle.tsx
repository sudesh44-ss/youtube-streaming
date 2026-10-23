"use client";

import { useTheme } from "./ThemeProvider";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
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
