"use client";

import Link from "next/link";
import { Project } from "@/types";
import { useState } from "react";
import AnalyticsChatPanel from "@/components/AnalyticsChatPanel";
import GlobalNav from "@/components/GlobalNav";

function getPct(project: Project): number {
  if (!project.versions || project.versions.length === 0) return 0;

  const allPhases = project.versions.flatMap(
    v => v.phases || []
  );

  if (allPhases.length === 0) return 0;

  const done = allPhases.filter(
    p => p.completed
  ).length;

  return Math.round(
    (done / allPhases.length) * 100
  );
}

function getTasks(project: Project): {
  total: number;
  done: number;
} {
  let tasks = project.still_to_complete;

  if (typeof tasks === "string") {
    try {
      tasks = JSON.parse(tasks);
    } catch {
      return { total: 0, done: 0 };
    }
  }

  if (!Array.isArray(tasks)) {
    return { total: 0, done: 0 };
  }

  const valid = tasks.filter(
    (t: any) =>
      t &&
      typeof t === "object" &&
      "description" in t
  );

  return {
    total: valid.length,
    done: valid.filter(
      (t: any) => t.done === true
    ).length,
  };
}

function KpiValue({
  value,
  color,
}: {
  value: string | number;
  color: string;
}) {
  const str = String(value);

  if (str.includes("/")) {
    const [left, right] = str.split("/");

    return (
      <div
        style={{
          fontFamily: "var(--font-syne)",
          fontWeight: 800,
          color,
          lineHeight: 1.1,
        }}
      >
        <span style={{ fontSize: "24px" }}>
          {left}
        </span>

        <span
          style={{
            fontSize: "13px",
            color: "var(--muted)",
            fontWeight: 600,
          }}
        >
          /{right}
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "var(--font-syne)",
        fontSize: "28px",
        fontWeight: 800,
        color,
        lineHeight: 1,
      }}
    >
      {value}
    </div>
  );
}

export default function AnalyticsClient({
  projects,
}: {
  projects: Project[];
}) {
  const [chatOpen, setChatOpen] =
    useState(false);

  const total = projects.length;

  const launched = projects.filter(
    p => p.status === "launched"
  ).length;

  const building = projects.filter(
    p => p.status === "building"
  ).length;

  const concept = projects.filter(
    p => p.status === "concept"
  ).length;

  const blocked = projects.filter(
    p =>
      p.blockers &&
      p.blockers.trim().length > 0
  ).length;

  const avgPct = total
    ? Math.round(
        projects.reduce(
          (s, p) => s + getPct(p),
          0
        ) / total
      )
    : 0;

  const allTasks = projects.reduce(
    (acc, p) => {
      const t = getTasks(p);

      return {
        total: acc.total + t.total,
        done: acc.done + t.done,
      };
    },
    { total: 0, done: 0 }
  );

  const totalVersions = projects.reduce(
    (s, p) =>
      s + (p.versions?.length || 0),
    0
  );

  const completedVersions =
    projects.reduce(
      (s, p) =>
        s +
        (p.versions?.filter(
          v => v.status === "complete"
        ).length || 0),
      0
    );

  const totalBugs = projects.reduce(
    (sum, p) =>
      sum + ((p as any).bugs?.length || 0),
    0
  );

  const openBugs = projects.reduce(
    (sum, p) =>
      sum +
      ((p as any).bugs?.filter(
        (b: any) =>
          b.status !== "resolved"
      ).length || 0),
    0
  );

  const criticalBugs = projects.reduce(
    (sum, p) =>
      sum +
      ((p as any).bugs?.filter(
        (b: any) =>
          b.severity === "critical" &&
          b.status !== "resolved"
      ).length || 0),
    0
  );

  const priorityCounts = {
    CRITICAL: projects.filter(
      p => p.priority === "CRITICAL"
    ).length,

    HIGH: projects.filter(
      p => p.priority === "HIGH"
    ).length,

    NORMAL: projects.filter(
      p =>
        (p.priority || "NORMAL") ===
        "NORMAL"
    ).length,

    BACKLOG: projects.filter(
      p => p.priority === "BACKLOG"
    ).length,
  };

  const priorityColors: Record<
    string,
    string
  > = {
    CRITICAL: "#ff3b5c",
    HIGH: "#ff8c00",
    NORMAL: "#00d4ff",
    BACKLOG: "#3d5572",
  };

  const statusColors: Record<
    string,
    string
  > = {
    launched: "#10b981",
    building: "#f59e0b",
    concept: "#8b5cf6",
  };

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
      label: "Open Bugs",
      value: openBugs,
      color: "var(--red)",
    },
    {
      label: "Critical Bugs",
      value: criticalBugs,
      color: "#ff3b5c",
    },
  ];

  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          color: "var(--text)",
          fontFamily:
            "var(--font-jetbrains)",
        }}
      >
        <GlobalNav breadcrumb="ANALYTICS" />

        <div
          style={{
            padding: "24px 16px",
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          {/* KPI ROW */}
          <div
            className="kpi-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(5, 1fr)",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            {kpis.map(kpi => (
              <div
                key={kpi.label}
                style={{
                  background:
                    "var(--surface)",
                  border:
                    "1px solid var(--border)",
                  borderRadius: "4px",
                  padding: "14px 16px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "2px",
                    background: `linear-gradient(90deg, ${kpi.color}, transparent)`,
                  }}
                />

                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--muted)",
                    letterSpacing: "1px",
                    textTransform:
                      "uppercase",
                    marginBottom: "8px",
                  }}
                >
                  {kpi.label}
                </div>

                <KpiValue
                  value={kpi.value}
                  color={kpi.color}
                />
              </div>
            ))}
          </div>

          {/* BUG PANEL */}
          <div
            style={{
              background: "var(--surface)",
              border:
                "1px solid var(--border)",
              borderRadius: "4px",
              overflow: "hidden",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                padding: "14px 20px",
                borderBottom:
                  "1px solid var(--border)",
              }}
            >
              <span
                style={{
                  fontFamily:
                    "var(--font-syne)",
                  fontSize: "12px",
                  fontWeight: 700,
                  letterSpacing: "1px",
                  color: "#ff3b5c",
                }}
              >
                BUG OVERVIEW
              </span>
            </div>

            <div
              style={{
                padding: "16px 20px",
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "12px",
              }}
            >
              {projects.map(project => {
                const bugs =
                  (project as any).bugs || [];

                const open =
                  bugs.filter(
                    (b: any) =>
                      b.status !==
                      "resolved"
                  ).length;

                const critical =
                  bugs.filter(
                    (b: any) =>
                      b.severity ===
                        "critical" &&
                      b.status !==
                        "resolved"
                  ).length;

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    style={{
                      textDecoration:
                        "none",
                    }}
                  >
                    <div
                      style={{
                        background:
                          "var(--surface2)",
                        border:
                          "1px solid var(--border)",
                        borderRadius: "4px",
                        padding: "14px",
                        transition:
                          "border-color 0.15s",
                      }}
                      onMouseEnter={e =>
                        (e.currentTarget.style.borderColor =
                          "#ff3b5c55")
                      }
                      onMouseLeave={e =>
                        (e.currentTarget.style.borderColor =
                          "var(--border)")
                      }
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems:
                            "center",
                          marginBottom:
                            "10px",
                        }}
                      >
                        <span
                          style={{
                            fontFamily:
                              "var(--font-syne)",
                            fontSize:
                              "13px",
                            fontWeight: 700,
                            color:
                              "var(--text)",
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {project.name}
                        </span>

                        <span
                          style={{
                            fontSize:
                              "10px",
                            color:
                              "var(--muted)",
                          }}
                        >
                          {bugs.length} bugs
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize:
                              "9px",
                            padding:
                              "3px 8px",
                            borderRadius:
                              "2px",
                            background:
                              "rgba(239,68,68,0.1)",
                            border:
                              "1px solid rgba(239,68,68,0.2)",
                            color:
                              "var(--red)",
                            fontWeight: 700,
                            letterSpacing:
                              "1px",
                          }}
                        >
                          {open} OPEN
                        </span>

                        <span
                          style={{
                            fontSize:
                              "9px",
                            padding:
                              "3px 8px",
                            borderRadius:
                              "2px",
                            background:
                              "rgba(255,59,92,0.1)",
                            border:
                              "1px solid rgba(255,59,92,0.25)",
                            color:
                              "#ff3b5c",
                            fontWeight: 700,
                            letterSpacing:
                              "1px",
                          }}
                        >
                          {critical} CRITICAL
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* STATUS + PRIORITY */}
          <div
            className="two-col-grid"
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            {/* STATUS DISTRIBUTION */}
            <div
              style={{
                background: "var(--surface)",
                border:
                  "1px solid var(--border)",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom:
                    "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    fontFamily:
                      "var(--font-syne)",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing:
                      "1px",
                    color:
                      "var(--cyan)",
                  }}
                >
                  STATUS DISTRIBUTION
                </span>
              </div>

              <div
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: "14px",
                }}
              >
                {[
                  {
                    label: "Launched",
                    value: launched,
                    color:
                      statusColors.launched,
                  },
                  {
                    label: "Building",
                    value: building,
                    color:
                      statusColors.building,
                  },
                  {
                    label: "Concept",
                    value: concept,
                    color:
                      statusColors.concept,
                  },
                ].map(s => (
                  <div key={s.label}>
                    <div
                      style={{
                        display:
                          "flex",
                        justifyContent:
                          "space-between",
                        marginBottom:
                          "6px",
                      }}
                    >
                      <span
                        style={{
                          fontSize:
                            "11px",
                          color:
                            s.color,
                          letterSpacing:
                            "1px",
                        }}
                      >
                        {s.label.toUpperCase()}
                      </span>

                      <span
                        style={{
                          fontSize:
                            "11px",
                          fontWeight: 700,
                          color:
                            s.color,
                        }}
                      >
                        {s.value}
                      </span>
                    </div>

                    <div
                      style={{
                        background:
                          "var(--surface3)",
                        height: "6px",
                        borderRadius:
                          "3px",
                        overflow:
                          "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          background:
                            s.color,
                          width: total
                            ? `${Math.round(
                                (s.value /
                                  total) *
                                  100
                              )}%`
                            : "0%",
                          borderRadius:
                            "3px",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PRIORITY DISTRIBUTION */}
            <div
              style={{
                background: "var(--surface)",
                border:
                  "1px solid var(--border)",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom:
                    "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    fontFamily:
                      "var(--font-syne)",
                    fontSize: "12px",
                    fontWeight: 700,
                    letterSpacing:
                      "1px",
                    color:
                      "var(--amber)",
                  }}
                >
                  PRIORITY DISTRIBUTION
                </span>
              </div>

              <div
                style={{
                  padding: "16px 20px",
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: "14px",
                }}
              >
                {Object.entries(
                  priorityCounts
                ).map(
                  ([priority, count]) => (
                    <div key={priority}>
                      <div
                        style={{
                          display:
                            "flex",
                          justifyContent:
                            "space-between",
                          marginBottom:
                            "6px",
                        }}
                      >
                        <span
                          style={{
                            fontSize:
                              "11px",
                            color:
                              priorityColors[
                                priority
                              ],
                            letterSpacing:
                              "1px",
                          }}
                        >
                          {priority}
                        </span>

                        <span
                          style={{
                            fontSize:
                              "11px",
                            fontWeight: 700,
                            color:
                              priorityColors[
                                priority
                              ],
                          }}
                        >
                          {count}
                        </span>
                      </div>

                      <div
                        style={{
                          background:
                            "var(--surface3)",
                          height: "6px",
                          borderRadius:
                            "3px",
                          overflow:
                            "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            background:
                              priorityColors[
                                priority
                              ],
                            width: total
                              ? `${Math.round(
                                  (count /
                                    total) *
                                    100
                                )}%`
                              : "0%",
                            borderRadius:
                              "3px",
                          }}
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {chatOpen && (
        <AnalyticsChatPanel
          projects={projects}
          onClose={() =>
            setChatOpen(false)
          }
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
        }
      `}</style>
    </>
  );
}