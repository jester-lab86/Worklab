"use client";

import Link from "next/link";
import { Project } from "@/types";
import { useState } from "react";
import AnalyticsChatPanel from "@/components/AnalyticsChatPanel";
import GlobalNav from "@/components/GlobalNav";

function getPct(project: Project): number {
  if (!project.versions || project.versions.length === 0) return 0;
  const allPhases = project.versions.flatMap(v => v.phases || []);
  if (allPhases.length === 0) return 0;
  const done = allPhases.filter(p => p.completed).length;
  return Math.round((done / allPhases.length) * 100);
}

function getTasks(project: Project): { total: number; done: number } {
  let tasks = project.still_to_complete;
  if (typeof tasks === "string") {
    try { tasks = JSON.parse(tasks); } catch { return { total: 0, done: 0 }; }
  }
  if (!Array.isArray(tasks)) return { total: 0, done: 0 };
  const valid = tasks.filter((t: any) => t && typeof t === "object" && "description" in t);
  return {
    total: valid.length,
    done: valid.filter((t: any) => t.done === true).length,
  };
}

function KpiValue({ value, color }: { value: string | number; color: string }) {
  const str = String(value);
  if (str.includes("/")) {
    const [left, right] = str.split("/");
    return (
      <div style={{ fontFamily: "var(--font-syne)", fontWeight: 800, color, lineHeight: 1.1 }}>
        <span style={{ fontSize: "24px" }}>{left}</span>
        <span style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 600 }}>/{right}</span>
      </div>
    );
  }
  return (
    <div style={{ fontFamily: "var(--font-syne)", fontSize: "28px", fontWeight: 800, color, lineHeight: 1 }}>
      {value}
    </div>
  );
}

export default function AnalyticsClient({ projects }: { projects: Project[] }) {
  console.log(projects);
  const [chatOpen, setChatOpen] = useState(false);
  const total = projects.length;
  const launched = projects.filter(p => p.status === "launched").length;
  const building = projects.filter(p => p.status === "building").length;
  const concept = projects.filter(p => p.status === "concept").length;
  const blocked = projects.filter(p => p.blockers && p.blockers.trim().length > 0).length;

  const avgPct = total ? Math.round(projects.reduce((s, p) => s + getPct(p), 0) / total) : 0;

  const allTasks = projects.reduce((acc, p) => {
    const t = getTasks(p);
    return { total: acc.total + t.total, done: acc.done + t.done };
  }, { total: 0, done: 0 });

  const totalVersions = projects.reduce((s, p) => s + (p.versions?.length || 0), 0);
  const completedVersions = projects.reduce((s, p) => s + (p.versions?.filter(v => v.status === "complete").length || 0), 0);

  const priorityCounts = {
    CRITICAL: projects.filter(p => p.priority === "CRITICAL").length,
    HIGH: projects.filter(p => p.priority === "HIGH").length,
    NORMAL: projects.filter(p => (p.priority || "NORMAL") === "NORMAL").length,
    BACKLOG: projects.filter(p => p.priority === "BACKLOG").length,
  };

  const priorityColors: Record<string, string> = {
    CRITICAL: "#ff3b5c", HIGH: "#ff8c00", NORMAL: "#00d4ff", BACKLOG: "#3d5572",
  };

  const statusColors: Record<string, string> = {
    launched: "#10b981", building: "#f59e0b", concept: "#8b5cf6",
  };

  const totalBugs = projects.reduce(
  (sum, p) => sum + (p.bugs?.length || 0),
  0
);

const openBugs = projects.reduce(
  (sum, p) =>
    sum +
    (p.bugs?.filter((b: any) => b.status !== "resolved")
      .length || 0),
  0
);

const criticalBugs = projects.reduce(
  (sum, p) =>
    sum +
    (p.bugs?.filter(
      (b: any) =>
        b.severity === "critical" &&
        b.status !== "resolved"
    ).length || 0),
  0
);

const resolvedBugs = projects.reduce(
  (sum, p) =>
    sum +
    (p.bugs?.filter(
      (b: any) => b.status === "resolved"
    ).length || 0),
  0
);

const kpis = [
  {
    label: "Total Projects",
    value: total,
    color: "var(--cyan)",
  },
  {
    label: "Avg Completion",
    value: `${avgPct}%`,
    color: "var(--cyan)",
  },
  {
    label: "Tasks Done",
    value: `${allTasks.done}/${allTasks.total}`,
    color: "var(--green)",
  },
  {
    label: "Versions Complete",
    value: `${completedVersions}/${totalVersions}`,
    color: "var(--purple)",
  },
  {
    label: "Open Bugs",
    value: openBugs,
    color:
      openBugs > 0
        ? "#ff3b5c"
        : "var(--muted)",
  },
];

  return (
    <>
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-jetbrains)" }}>
    <GlobalNav breadcrumb="ANALYTICS" />
        <div style={{ padding: "24px 16px", maxWidth: "1200px", margin: "0 auto" }}>

          {/* KPI ROW */}
          <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "20px" }}>
            {kpis.map(kpi => (
              <div key={kpi.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", padding: "14px 16px", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${kpi.color}, transparent)` }} />
                <div style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>{kpi.label}</div>
                <KpiValue value={kpi.value} color={kpi.color} />
              </div>
            ))}
          </div>

          {/* STATUS + PRIORITY */}
          <div className="two-col-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>

            {/* STATUS DISTRIBUTION */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", color: "var(--cyan)" }}>STATUS DISTRIBUTION</span>
              </div>
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                {[
                  { label: "Launched", value: launched, color: statusColors.launched },
                  { label: "Building", value: building, color: statusColors.building },
                  { label: "Concept", value: concept, color: statusColors.concept },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "11px", color: s.color, letterSpacing: "1px" }}>{s.label.toUpperCase()}</span>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: s.color }}>{s.value}</span>
                    </div>
                    <div style={{ background: "var(--surface3)", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ height: "100%", background: s.color, width: total ? `${Math.round((s.value / total) * 100)}%` : "0%", borderRadius: "3px", transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PRIORITY DISTRIBUTION */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", color: "var(--amber)" }}>PRIORITY DISTRIBUTION</span>
              </div>
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
                {Object.entries(priorityCounts).map(([priority, count]) => (
                  <div key={priority}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <span style={{ fontSize: "11px", color: priorityColors[priority], letterSpacing: "1px" }}>{priority}</span>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: priorityColors[priority] }}>{count}</span>
                    </div>
                    <div style={{ background: "var(--surface3)", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ height: "100%", background: priorityColors[priority], width: total ? `${Math.round((count / total) * 100)}%` : "0%", borderRadius: "3px", transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PER-PROJECT COMPLETION */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden", marginBottom: "16px" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", color: "var(--green)" }}>COMPLETION RATE — PER PROJECT</span>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {[...projects].sort((a, b) => getPct(b) - getPct(a)).map(p => {
                const pct = getPct(p);
                const tasks = getTasks(p);
                const statusColor = statusColors[p.status] || "var(--cyan)";
                return (
                  <div key={p.id}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                      <Link href={`/projects/${p.id}`} style={{ fontFamily: "var(--font-syne)", fontSize: "13px", fontWeight: 700, color: "var(--text)", textDecoration: "none", flex: 1, minWidth: "100px", transition: "color 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.color = "var(--cyan)"}
                        onMouseLeave={e => e.currentTarget.style.color = "var(--text)"}
                      >{p.name}</Link>
                      <span style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "2px", fontWeight: 700, letterSpacing: "1px", background: `${statusColor}18`, border: `1px solid ${statusColor}40`, color: statusColor, whiteSpace: "nowrap" }}>{p.status.toUpperCase()}</span>
                      <span style={{ fontSize: "10px", color: "var(--muted)", whiteSpace: "nowrap" }}>{tasks.done}/{tasks.total} tasks</span>
                      <span style={{ fontFamily: "var(--font-syne)", fontSize: "14px", fontWeight: 800, color: pct === 100 ? "var(--green)" : "var(--cyan)", minWidth: "40px", textAlign: "right" }}>{pct}%</span>
                    </div>
                    <div style={{ background: "var(--surface3)", height: "4px", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ height: "100%", background: pct === 100 ? "var(--green)" : `linear-gradient(90deg, var(--cyan), var(--purple))`, width: `${pct}%`, borderRadius: "2px", transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TASK THROUGHPUT */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", color: "var(--purple)" }}>TASK THROUGHPUT — PER PROJECT</span>
            </div>
            <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
              {projects.map(p => {
                const t = getTasks(p);
                const pct = t.total ? Math.round((t.done / t.total) * 100) : 0;
                return (
                  <div key={p.id} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "4px", padding: "14px", position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, var(--purple), transparent)` }} />
                    <div style={{ fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 700, marginBottom: "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "10px", color: "var(--muted)" }}>{t.done} done / {t.total} total</span>
                      <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--purple)" }}>{pct}%</span>
                    </div>
                    <div style={{ background: "var(--surface3)", height: "4px", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ height: "100%", background: "var(--purple)", width: `${pct}%`, borderRadius: "2px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
{/* BUG ANALYTICS */}
<div
  style={{
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "4px",
    overflow: "hidden",
    marginTop: "16px",
  }}
>
  <div
    style={{
      padding: "14px 20px",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "10px",
    }}
  >
    <span
      style={{
        fontFamily: "var(--font-syne)",
        fontSize: "12px",
        fontWeight: 700,
        letterSpacing: "1px",
        color: "#ff3b5c",
      }}
    >
      BUG OVERVIEW
    </span>

    <div
      style={{
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontSize: "9px",
          padding: "2px 8px",
          borderRadius: "2px",
          background: "rgba(255,59,92,0.1)",
          border:
            "1px solid rgba(255,59,92,0.25)",
          color: "#ff3b5c",
          fontWeight: 700,
          letterSpacing: "1px",
        }}
      >
        {openBugs} OPEN
      </span>

      <span
        style={{
          fontSize: "9px",
          padding: "2px 8px",
          borderRadius: "2px",
          background: "rgba(16,185,129,0.1)",
          border:
            "1px solid rgba(16,185,129,0.25)",
          color: "var(--green)",
          fontWeight: 700,
          letterSpacing: "1px",
        }}
      >
        {resolvedBugs} RESOLVED
      </span>

      <span
        style={{
          fontSize: "9px",
          padding: "2px 8px",
          borderRadius: "2px",
          background: "rgba(255,140,0,0.1)",
          border:
            "1px solid rgba(255,140,0,0.25)",
          color: "#ff8c00",
          fontWeight: 700,
          letterSpacing: "1px",
        }}
      >
        {criticalBugs} CRITICAL
      </span>
    </div>
  </div>

  <div
    style={{
      padding: "16px 20px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    }}
  >
    {[...projects]
      .filter(
        p => p.bugs && p.bugs.length > 0
      )
      .sort(
        (a, b) =>
          (b.bugs?.filter(
            (x: any) =>
              x.status !== "resolved"
          ).length || 0) -
          (a.bugs?.filter(
            (x: any) =>
              x.status !== "resolved"
          ).length || 0)
      )
      .map(project => {
        const bugs = project.bugs || [];

        const open =
          bugs.filter(
            (b: any) =>
              b.status !== "resolved"
          ).length || 0;

        const resolved =
          bugs.filter(
            (b: any) =>
              b.status === "resolved"
          ).length || 0;

        const critical =
          bugs.filter(
            (b: any) =>
              b.severity === "critical" &&
              b.status !== "resolved"
          ).length || 0;

        return (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            style={{
              textDecoration: "none",
            }}
          >
            <div
              style={{
                background: "var(--surface2)",
                border:
                  "1px solid var(--border)",
                borderRadius: "4px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                gap: "12px",
                transition:
                  "border-color 0.15s",
              }}
              onMouseEnter={e =>
                (e.currentTarget.style.borderColor =
                  "var(--border2)")
              }
              onMouseLeave={e =>
                (e.currentTarget.style.borderColor =
                  "var(--border)")
              }
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <span
                  style={{
                    fontFamily:
                      "var(--font-syne)",
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  {project.name}
                </span>

                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--muted)",
                  }}
                >
                  {bugs.length} total bugs
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    padding: "2px 7px",
                    borderRadius: "2px",
                    background:
                      "rgba(255,59,92,0.1)",
                    border:
                      "1px solid rgba(255,59,92,0.25)",
                    color: "#ff3b5c",
                    fontWeight: 700,
                  }}
                >
                  {open} OPEN
                </span>

                <span
                  style={{
                    fontSize: "9px",
                    padding: "2px 7px",
                    borderRadius: "2px",
                    background:
                      "rgba(16,185,129,0.1)",
                    border:
                      "1px solid rgba(16,185,129,0.25)",
                    color: "var(--green)",
                    fontWeight: 700,
                  }}
                >
                  {resolved} FIXED
                </span>

                {critical > 0 && (
                  <span
                    style={{
                      fontSize: "9px",
                      padding: "2px 7px",
                      borderRadius: "2px",
                      background:
                        "rgba(255,140,0,0.1)",
                      border:
                        "1px solid rgba(255,140,0,0.25)",
                      color: "#ff8c00",
                      fontWeight: 700,
                    }}
                  >
                    {critical} CRITICAL
                  </span>
                )}
              </div>
            </div>
          </Link>
        );
      })}
  </div>
</div>
        </div>
      </div>

      {chatOpen && (
        <AnalyticsChatPanel
          projects={projects}
          onClose={() => setChatOpen(false)}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .kpi-grid > div:last-child {
            grid-column: span 2;
          }
          .two-col-grid {
            grid-template-columns: 1fr !important;
          }
          .analytics-count {
            display: none;
          }
          .intel-label {
            display: none;
          }
        }
      `}</style>
    </>
  );
}