"use client";

import { useTheme } from "./ThemeProvider";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const nextThemeLabel = isDark ? "Light" : "Dark";
  const actionTitle = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="btn btn-outline btn-sm"
      aria-label={actionTitle}
      title={actionTitle}
      style={{ padding: "0.4rem 0.6rem", borderRadius: "var(--radius-full)" }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span style={{ fontSize: "0.75rem", textTransform: "capitalize" }}>{nextThemeLabel}</span>
    </button>
  );
}
