"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Project } from "@/types";

function getPct(project: Project) {
  if (project.versions && project.versions.length > 0) {
    const allPhases = project.versions.flatMap(v => v.phases || []);
    if (allPhases.length > 0) {
      const done = allPhases.filter(p => p.completed).length;
      return Math.round((done / allPhases.length) * 100);
    }
  }
  if (!project.phases || project.phases.length === 0) return 0;
  const done = project.phases.filter(p => p.completed).length;
  return Math.round((done / project.phases.length) * 100);
}

export default function DashboardClient({ projects }: { projects: Project[] }) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "priority">("priority");

  const PRIORITY_ORDER = ["CRITICAL", "HIGH", "NORMAL", "BACKLOG"];

  const priorityAccent = (priority: string) => {
    if (priority === "CRITICAL") return "#ff3b5c";
    if (priority === "HIGH") return "#ff8c00";
    if (priority === "BACKLOG") return "#2a3a52";
    return "var(--cyan)";
  };

  const priorityTagStyle = (priority: string): React.CSSProperties => {
    if (priority === "CRITICAL") return { color: "#ff3b5c", background: "rgba(255,59,92,0.1)", border: "1px solid rgba(255,59,92,0.25)" };
    if (priority === "HIGH") return { color: "#ff8c00", background: "rgba(255,140,0,0.1)", border: "1px solid rgba(255,140,0,0.25)" };
    if (priority === "BACKLOG") return { color: "#3d5572", background: "rgba(42,58,82,0.4)", border: "1px solid #1e2d45" };
    return { color: "var(--cyan)", background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.2)" };
  };

  const filtered = projects
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()) ||
      p.tech_stack?.some(t => t.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      const pctA = getPct(a);
      const pctB = getPct(b);
      if (pctB !== pctA) return pctB - pctA;
      return a.name.localeCompare(b.name);
    });

  const total = projects.length;
  const launched = projects.filter(p => p.status === "launched").length;
  const building = projects.filter(p => p.status === "building").length;
  const concept = projects.filter(p => p.status === "concept").length;
  const avgPct = total ? Math.round(projects.reduce((s, p) => s + getPct(p), 0) / total) : 0;
  const blocked = projects.filter(p => p.blockers && p.blockers.trim().length > 0).length;

  return (
    <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", minHeight: "100vh" }}>

      {/* TOP BAR */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", height: "56px", borderBottom: "1px solid var(--border)",
        background: "rgba(6,10,16,0.9)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ fontFamily: "var(--font-syne)", fontSize: "18px", fontWeight: 800, letterSpacing: "3px", color: "var(--cyan)", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "8px", height: "8px", background: "var(--cyan)", borderRadius: "50%", animation: "blink 2s infinite" }} />
          FORGE
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "11px", color: "var(--muted)", letterSpacing: "1px" }}>
            <span style={{ color: "var(--cyan)", fontWeight: 600 }}>{total}</span> PROJECTS ·{" "}
            <span style={{ color: "var(--cyan)", fontWeight: 600 }}>{avgPct}%</span> AVG
          </span>
          {/* SEARCH */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "11px",
              padding: "6px 12px", borderRadius: "2px", outline: "none", width: "180px",
              transition: "border-color 0.2s",
            }}
            onFocus={e => e.target.style.borderColor = "rgba(0,212,255,0.4)"}
            onBlur={e => e.target.style.borderColor = "var(--border)"}
          />
          {/* VIEW TOGGLE */}
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: "2px", overflow: "hidden" }}>
            {(["grid", "priority"] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                fontFamily: "var(--font-jetbrains)", fontSize: "10px", letterSpacing: "1px",
                padding: "6px 12px", border: "none", cursor: "pointer", transition: "all 0.15s",
                background: view === v ? "rgba(0,212,255,0.1)" : "transparent",
                color: view === v ? "var(--cyan)" : "var(--muted)",
                borderRight: v === "grid" ? "1px solid var(--border)" : "none",
              }}>
                {v.toUpperCase()}
              </button>
            ))}
          </div>
          <Link href="/analytics" style={{
  padding: "7px 16px", background: "transparent",
  border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)",
  fontFamily: "var(--font-jetbrains)", fontSize: "11px", letterSpacing: "1px",
  borderRadius: "2px", textDecoration: "none",
}}>
  ◈ ANALYTICS
</Link>
          <Link href="/roadmap" style={{
  padding: "7px 16px", background: "transparent",
  border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)",
  fontFamily: "var(--font-jetbrains)", fontSize: "11px", letterSpacing: "1px",
  borderRadius: "2px", textDecoration: "none",
}}>
  ◈ ROADMAP
</Link>
          <a href="/api/export" download style={{
  padding: "7px 16px", background: "transparent",
  border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)",
  fontFamily: "var(--font-jetbrains)", fontSize: "11px", letterSpacing: "1px",
  borderRadius: "2px", textDecoration: "none",
}}>
  ⬇ EXPORT
</a>
<Link href="/projects/new" style={{
  padding: "7px 16px", background: "var(--cyan-dim)",
  border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)",
  fontFamily: "var(--font-jetbrains)", fontSize: "11px", letterSpacing: "1px",
  borderRadius: "2px", textDecoration: "none",
}}>
  + NEW
</Link>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            style={{
              padding: "7px 16px", background: "transparent",
              border: "1px solid var(--border)", color: "var(--muted)",
              fontFamily: "var(--font-jetbrains)", fontSize: "11px", letterSpacing: "1px",
              borderRadius: "2px", cursor: "pointer", transition: "all 0.2s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--red)";
              e.currentTarget.style.color = "var(--red)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--muted)";
            }}
          >
            LOGOUT
          </button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1 }}>

        {/* SIDEBAR */}
        <nav style={{
          width: "240px", minWidth: "240px", borderRight: "1px solid var(--border)",
          padding: "24px 0", position: "sticky", top: "56px",
          height: "calc(100vh - 56px)", overflowY: "auto",
        }}>
          <div style={{ fontSize: "10px", letterSpacing: "2px", color: "var(--muted)", padding: "0 20px 12px", textTransform: "uppercase" }}>
            Projects
          </div>
          {projects.length === 0 ? (
            <div style={{ padding: "20px", color: "var(--muted)", fontSize: "11px", lineHeight: 1.8 }}>
              No projects yet.
            </div>
          ) : (
            filtered.map(p => {
              const pct = getPct(p);
              return (
                <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    padding: "10px 20px", cursor: "pointer", display: "flex",
                    alignItems: "center", gap: "10px", transition: "all 0.15s",
                    borderLeft: "2px solid transparent",
                  }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "var(--cyan-dim)";
                      e.currentTarget.style.borderLeftColor = "rgba(0,212,255,0.3)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderLeftColor = "transparent";
                    }}
                  >
                    <span style={{ fontFamily: "var(--font-syne)", fontSize: "13px", fontWeight: 600, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--text)" }}>
                      {p.name}
                    </span>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: pct === 100 ? "var(--green)" : "var(--cyan)" }}>
                      {pct}%
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </nav>

        {/* MAIN CONTENT */}
        <main style={{ flex: 1, padding: "32px", overflowY: "auto", minWidth: 0 }}>

          {/* STATS ROW */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px", marginBottom: "28px" }}>
            {[
              { label: "Total", value: total, color: "var(--cyan)" },
              { label: "Launched", value: launched, color: "var(--green)" },
              { label: "Building", value: building, color: "var(--amber)" },
              { label: "Concept", value: concept, color: "var(--purple)" },
              { label: "Blocked", value: blocked, color: "var(--red)" },
            ].map(stat => (
              <div key={stat.label} style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "4px", padding: "16px 20px", position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${stat.color}, transparent)` }} />
                <div style={{ fontFamily: "var(--font-syne)", fontSize: "32px", fontWeight: 800, color: stat.color, lineHeight: 1, marginBottom: "4px" }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* SEARCH RESULTS INFO */}
          {search && (
            <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "16px", letterSpacing: "1px" }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"
            </div>
          )}

          {/* PROJECT GRID */}
          {filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "300px", color: "var(--muted)", textAlign: "center", gap: "12px" }}>
              <div style={{ fontSize: "40px", opacity: 0.3 }}>📂</div>
              <p style={{ fontSize: "12px", lineHeight: 1.7 }}>
                {search ? `No projects match "${search}"` : "No projects yet. Hit + NEW to get started."}
              </p>
            </div>
          ) : view === "grid" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
              {filtered.map(p => {
                const pct = getPct(p);
                const accent = priorityAccent(p.priority || "NORMAL");
                return (
                  <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: "none" }}>
                    <div
                      style={{
                        background: "var(--surface)", border: "1px solid var(--border)",
                        borderRadius: "4px", padding: "20px", cursor: "pointer",
                        transition: "all 0.2s", position: "relative", overflow: "hidden",
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border2)"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                    >
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${accent}, transparent)` }} />
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                        <div style={{ fontFamily: "var(--font-syne)", fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>
                          {p.name}
                        </div>
                        <span style={{
                          fontSize: "9px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase",
                          padding: "2px 8px", borderRadius: "2px", fontFamily: "var(--font-syne)",
                          background: p.status === "launched" ? "rgba(16,185,129,0.1)" : p.status === "building" ? "rgba(245,158,11,0.1)" : "rgba(139,92,246,0.1)",
                          border: p.status === "launched" ? "1px solid rgba(16,185,129,0.3)" : p.status === "building" ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(139,92,246,0.3)",
                          color: p.status === "launched" ? "var(--green)" : p.status === "building" ? "var(--amber)" : "var(--purple)",
                        }}>
                          {p.status}
                        </span>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "14px", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {p.description || "No description yet."}
                      </div>
                      <div style={{ background: "var(--surface3)", height: "3px", borderRadius: "2px", marginBottom: "10px", overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: "2px", background: `linear-gradient(90deg, ${accent}, var(--purple))`, width: `${pct}%`, transition: "width 0.5s ease" }} />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontFamily: "var(--font-syne)", fontSize: "20px", fontWeight: 800, color: pct === 100 ? "var(--green)" : accent }}>
                          {pct}%
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "flex-end" }}>
                          {(p.tech_stack || []).slice(0, 3).map((tech, i) => (
                            <span key={i} style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "2px", background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.15)", color: "var(--cyan)" }}>
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                      {p.blockers && p.blockers.trim().length > 0 && (
                        <div style={{ marginTop: "10px", padding: "6px 10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "2px", fontSize: "10px", color: "var(--red)" }}>
                          ⚠ Active blockers
                        </div>
                      )}
                      {/* Priority tag bottom left */}
                      <div style={{ marginTop: "10px" }}>
                        <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "1px", padding: "2px 7px", borderRadius: "2px", fontFamily: "var(--font-jetbrains)", ...priorityTagStyle(p.priority || "NORMAL") }}>
                          {(p.priority || "NORMAL")}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            /* PRIORITY VIEW */
            <div>
              {PRIORITY_ORDER.map(tier => {
                const tierProjects = filtered.filter(p => (p.priority || "NORMAL") === tier);
                if (tierProjects.length === 0) return null;
                const accent = priorityAccent(tier);
                return (
                  <div key={tier} style={{ marginBottom: "28px" }}>
                    {/* Section divider */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
                      <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "2px", color: accent, fontFamily: "var(--font-jetbrains)" }}>
                        {tier}
                      </span>
                      <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${accent}44, transparent)` }} />
                      <span style={{ fontSize: "10px", color: "var(--muted)" }}>{tierProjects.length}</span>
                    </div>
                    {/* Project rows */}
                    {tierProjects.map(p => {
                      const pct = getPct(p);
                      return (
                        <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: "none" }}>
                          <div style={{
                            background: "var(--surface)", border: "1px solid var(--border)",
                            borderRadius: "4px", padding: "12px 16px", marginBottom: "6px",
                            display: "flex", alignItems: "center", gap: "14px",
                            cursor: "pointer", transition: "border-color 0.15s",
                            position: "relative", overflow: "hidden",
                          }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border2)"}
                            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                          >
                            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: accent }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                                <span style={{ fontFamily: "var(--font-syne)", fontSize: "14px", fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {p.name}
                                </span>
                                <span style={{
                                  fontSize: "9px", fontWeight: 700, letterSpacing: "1px",
                                  padding: "2px 7px", borderRadius: "2px", whiteSpace: "nowrap",
                                  background: p.status === "launched" ? "rgba(16,185,129,0.1)" : p.status === "building" ? "rgba(245,158,11,0.1)" : "rgba(139,92,246,0.1)",
                                  border: p.status === "launched" ? "1px solid rgba(16,185,129,0.3)" : p.status === "building" ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(139,92,246,0.3)",
                                  color: p.status === "launched" ? "var(--green)" : p.status === "building" ? "var(--amber)" : "var(--purple)",
                                }}>
                                  {p.status}
                                </span>
                              </div>
                              <div style={{ fontSize: "10px", color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {p.description || "No description"}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                              <div style={{ width: "80px", background: "var(--surface3)", height: "3px", borderRadius: "2px", overflow: "hidden" }}>
                                <div style={{ height: "100%", borderRadius: "2px", background: accent, width: `${pct}%` }} />
                              </div>
                              <span style={{ fontFamily: "var(--font-syne)", fontSize: "13px", fontWeight: 800, color: pct === 100 ? "var(--green)" : accent, minWidth: "36px", textAlign: "right" }}>
                                {pct}%
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
          
        </main>
      </div>
    </div>
  );
}