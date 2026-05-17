"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import ThemeToggle from "@/components/ThemeToggle";

const NAV_ITEMS = [
  { href: "/dashboard", label: "DASHBOARD", icon: "◈", color: "#00d4ff" },
  { href: "/analytics", label: "ANALYTICS", icon: "▲", color: "#8b5cf6" },
  { href: "/roadmap", label: "ROADMAP", icon: "◎", color: "#3b82f6" },
  { href: "/calendar", label: "CALENDAR", icon: "◷", color: "#f59e0b" },
  { href: "/bugs", label: "BUGS", icon: "⚡", color: "#ff3b5c" },
  { href: "/signal", label: "SIGNAL", icon: "◈", color: "#fbbf24" },
];

interface Props {
  currentPage?: string;
  breadcrumb?: string;
}

export default function GlobalNav({ currentPage, breadcrumb }: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* MOBILE OVERLAY */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, backdropFilter: "blur(4px)" }} />
      )}

      {/* MOBILE SLIDE-IN */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "280px",
        background: "#060a10", borderLeft: "1px solid var(--border)",
        zIndex: 201, transform: menuOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.25s ease", padding: "24px 20px",
        display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <span style={{ fontFamily: "var(--font-syne)", fontSize: "14px", fontWeight: 800, letterSpacing: "2px", color: "var(--cyan)" }}>FORGE</span>
          <button onClick={() => setMenuOpen(false)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "20px", cursor: "pointer" }}>✕</button>
        </div>
        {NAV_ITEMS.map(item => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{ textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "4px", borderLeft: `3px solid ${active ? item.color : "transparent"}`, background: active ? `${item.color}10` : "transparent", transition: "all 0.15s" }}>
                <span style={{ fontSize: "14px", color: item.color }}>{item.icon}</span>
                <span style={{ fontFamily: "var(--font-jetbrains)", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", color: active ? item.color : "var(--muted)" }}>{item.label}</span>
              </div>
            </Link>
          );
        })}
        <div style={{ marginTop: "8px", borderTop: "1px solid var(--border)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <ThemeToggle />
          <button onClick={() => signOut({ callbackUrl: "/auth/signin" })} style={{ padding: "10px 16px", background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", letterSpacing: "1px", borderRadius: "2px", cursor: "pointer", textAlign: "left" }}>LOGOUT</button>
        </div>
      </div>

      {/* TOP NAV */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: "56px", borderBottom: "1px solid var(--border)", background: "var(--surface)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
        
        {/* LEFT — Logo + breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "8px", height: "8px", background: "var(--cyan)", borderRadius: "50%", boxShadow: "0 0 8px var(--cyan)", animation: "blink 2s infinite" }} />
            <span style={{ fontFamily: "var(--font-syne)", fontSize: "18px", fontWeight: 800, letterSpacing: "3px", color: "var(--cyan)" }}>FORGE</span>
          </Link>
          {breadcrumb && (
            <>
              <span style={{ color: "var(--border2)", fontSize: "12px" }}>›</span>
              <span style={{ fontFamily: "var(--font-jetbrains)", fontSize: "11px", color: "var(--muted)", letterSpacing: "1px" }}>{breadcrumb}</span>
            </>
          )}
        </div>

        {/* CENTER — Desktop nav links */}
        <nav className="global-nav-desktop" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "2px", borderBottom: `2px solid ${active ? item.color : "transparent"}`, background: active ? `${item.color}10` : "transparent", transition: "all 0.15s", cursor: "pointer" }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = `${item.color}08`; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <span style={{ fontSize: "11px", color: active ? item.color : "var(--muted)" }}>{item.icon}</span>
                  <span style={{ fontFamily: "var(--font-jetbrains)", fontSize: "10px", fontWeight: 700, letterSpacing: "1px", color: active ? item.color : "var(--muted)" }}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* RIGHT — Theme + logout */}
        <div className="global-nav-desktop" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ThemeToggle />
          <button onClick={() => signOut({ callbackUrl: "/auth/signin" })} style={{ padding: "6px 14px", background: "transparent", border: "1px solid var(--border)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", letterSpacing: "1px", borderRadius: "2px", cursor: "pointer" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--red)"; e.currentTarget.style.color = "var(--red)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}>
            LOGOUT
          </button>
        </div>

        {/* MOBILE hamburger */}
        <button className="global-nav-mobile" onClick={() => setMenuOpen(true)} style={{ display: "none", background: "none", border: "1px solid var(--border)", color: "var(--cyan)", padding: "7px 12px", borderRadius: "2px", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}>☰</button>
      </header>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @media (max-width: 768px) {
          .global-nav-desktop { display: none !important; }
          .global-nav-mobile { display: block !important; }
        }
      `}</style>
    </>
  );
}