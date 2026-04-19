"use client";

import { useTheme } from "@/components/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      style={{
        padding: "7px 12px",
        background: "transparent",
        border: "1px solid var(--border)",
        color: "var(--muted)",
        borderRadius: "2px",
        cursor: "pointer",
        fontSize: "14px",
        lineHeight: 1,
        transition: "all 0.2s",
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "var(--cyan)";
        e.currentTarget.style.color = "var(--cyan)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.color = "var(--muted)";
      }}
    >
      {theme === "dark" ? "☀" : "🌙"}
    </button>
  );
}