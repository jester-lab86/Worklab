"use client";

import Link from "next/link";
import { Project } from "@/types";

function getPhaseColor(status: string) {
  if (status === "complete" || status === "completed") return "#10b981";
  if (status === "in-progress" || status === "in_progress") return "#00d4ff";
  if (status === "planned") return "#1e3a5f";
  return "#1e2d45";
}

function getStatusColor(status: string) {
  if (status === "launched") return "#10b981";
  if (status === "building") return "#f59e0b";
  return "#8b5cf6";
}

function getAllPhases(project: Project) {
  if (project.versions && project.versions.length > 0) {
    return project.versions.map((v: Record<string, unknown>) => ({
      versionName: `v${v.number || "?"}`,
      phases: Array.isArray(v.phases) ? v.phases as Record<string, unknown>[] : [],
    }));
  }
  return [];
}

export default function RoadmapClient({ projects }: { projects: Project[] }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      color: "var(--text)",
      fontFamily: "var(--font-jetbrains)",
    }}>

      {/* TOP BAR */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", height: "56px", borderBottom: "1px solid var(--border)",
        background: "rgba(6,10,16,0.9)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <Link href="/dashboard" style={{
            fontFamily: "var(--font-jetbrains)", fontSize: "11px",
            color: "var(--muted)", textDecoration: "none", letterSpacing: "1px",
            transition: "color 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--cyan)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
          >
            ← DASHBOARD
          </Link>
          <span style={{ color: "var(--border)", fontSize: "12px" }}>|</span>
          <span style={{
            fontFamily: "var(--font-syne)", fontSize: "14px", fontWeight: 800,
            letterSpacing: "3px", color: "var(--cyan)",
          }}>
            PORTFOLIO ROADMAP
          </span>
        </div>
        <div style={{ fontSize: "11px", color: "var(--muted)", letterSpacing: "1px" }}>
          <span style={{ color: "var(--cyan)", fontWeight: 600 }}>{projects.length}</span> ACTIVE OPERATIONS
        </div>
      </header>

      <div style={{ padding: "32px" }}>

        {/* LEGEND */}
        <div style={{
          display: "flex", alignItems: "center", gap: "24px",
          marginBottom: "32px", padding: "12px 20px",
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: "4px",
        }}>
          <span style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "2px" }}>LEGEND</span>
          {[
            { label: "COMPLETE", color: "#10b981" },
            { label: "IN PROGRESS", color: "#00d4ff" },
            { label: "PLANNED", color: "#1e3a5f" },
          ].map(l => (
            <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: "24px", height: "8px", borderRadius: "2px", background: l.color, border: l.color === "#1e3a5f" ? "1px solid #2a4a6f" : "none" }} />
              <span style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px" }}>{l.label}</span>
            </div>
          ))}
        </div>

        {/* PROJECT ROWS */}
        {projects.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--muted)", padding: "80px 0", fontSize: "12px" }}>
            No projects found.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {projects.map(project => {
              const statusColor = getStatusColor(project.status);
              const versionGroups = getAllPhases(project);

              return (
                <div key={project.id} style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: "4px", overflow: "hidden",
                  transition: "border-color 0.2s",
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border2)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                >
                  {/* Color accent bar at top */}
                  <div style={{ height: "2px", background: `linear-gradient(90deg, ${statusColor}, transparent)` }} />

                  <div style={{ padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: "24px" }}>

                    {/* PROJECT LABEL */}
                    <div style={{ minWidth: "200px", maxWidth: "200px" }}>
                      <Link href={`/projects/${project.id}`} style={{ textDecoration: "none" }}>
                        <div style={{
                          fontFamily: "var(--font-syne)", fontSize: "13px", fontWeight: 700,
                          color: "var(--text)", marginBottom: "4px",
                          transition: "color 0.2s", cursor: "pointer",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}
                          onMouseEnter={e => e.currentTarget.style.color = "var(--cyan)"}
                          onMouseLeave={e => e.currentTarget.style.color = "var(--text)"}
                        >
                          {project.name}
                        </div>
                      </Link>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{
                          fontSize: "9px", fontWeight: 700, letterSpacing: "1px",
                          padding: "2px 7px", borderRadius: "2px",
                          background: project.status === "launched" ? "rgba(16,185,129,0.1)" : project.status === "building" ? "rgba(245,158,11,0.1)" : "rgba(139,92,246,0.1)",
                          border: `1px solid ${statusColor}44`,
                          color: statusColor,
                        }}>
                          {project.status?.toUpperCase()}
                        </span>
                        <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                          v{project.version || "1.0"}
                        </span>
                      </div>
                    </div>

                    {/* TIMELINE BARS */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                      {versionGroups.length === 0 ? (
                        <div style={{ fontSize: "10px", color: "var(--muted)", paddingTop: "4px" }}>
                          No roadmap data
                        </div>
                      ) : (
                        versionGroups.map((group, gi) => (
                          <div key={gi} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {/* Version label */}
                            <span style={{
                              fontSize: "9px", color: "var(--muted)", letterSpacing: "1px",
                              minWidth: "32px", textAlign: "right", flexShrink: 0,
                            }}>
                              {String(group.versionName)}
                            </span>
                            {/* Phase bars */}
                            <div style={{ display: "flex", gap: "3px", flex: 1, flexWrap: "wrap" }}>
                              {group.phases.length === 0 ? (
                                <div style={{ fontSize: "10px", color: "var(--muted)" }}>No phases</div>
                              ) : (
                                group.phases.map((phase: Record<string, unknown>, pi: number) => {
                                  const phaseStatus = phase.completed === true ? "complete" : String(phase.status || "planned");
                                  const color = getPhaseColor(phaseStatus);
                                  const phaseName = String(phase.title || phase.name || `Phase ${pi + 1}`);
                                  return (
                                    <div
                                      key={pi}
                                      title={`${phaseName} — ${phaseStatus}`}
                                      style={{
                                        height: "20px",
                                        minWidth: "60px",
                                        flex: "1 1 60px",
                                        maxWidth: "160px",
                                        background: color,
                                        borderRadius: "2px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "8px",
                                        letterSpacing: "0.5px",
                                        color: phaseStatus === "planned" ? "#2a4a6f" : "rgba(0,0,0,0.7)",
                                        fontWeight: 700,
                                        overflow: "hidden",
                                        whiteSpace: "nowrap",
                                        textOverflow: "ellipsis",
                                        padding: "0 6px",
                                        cursor: "default",
                                        border: phaseStatus === "planned" ? "1px solid #2a4a6f" : "none",
                                        transition: "opacity 0.15s",
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                                      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                                    >
                                      {phaseName.length > 14 ? phaseName.slice(0, 14) + "…" : phaseName}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* LINK TO OPS CENTER */}
                    <Link href={`/projects/${project.id}`} style={{
                      fontSize: "10px", color: "var(--muted)", textDecoration: "none",
                      letterSpacing: "1px", flexShrink: 0, paddingTop: "2px",
                      transition: "color 0.2s",
                    }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--cyan)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
                    >
                      OPS →
                    </Link>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}