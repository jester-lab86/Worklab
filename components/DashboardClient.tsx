"use client";

import { useState } from "react";
import Link from "next/link";
import { Project } from "@/types";
import GlobalNav from "@/components/GlobalNav";

function getPct(project: Project) {
  if (project.versions && project.versions.length > 0) {
    const allPhases = project.versions.flatMap(
      v => v.phases || []
    );

    if (allPhases.length > 0) {
      const done = allPhases.filter(
        p => p.completed
      ).length;

      return Math.round(
        (done / allPhases.length) * 100
      );
    }
  }

  if (!project.phases || project.phases.length === 0)
    return 0;

  const done = project.phases.filter(
    p => p.completed
  ).length;

  return Math.round(
    (done / project.phases.length) * 100
  );
}

function getTypeIcon(type: string) {
  if (type === "mechanical") return "🔧";
  if (type === "home") return "🏠";
  if (type === "other") return "⚙️";
  return "💻";
}

export default function DashboardClient({
  projects,
}: {
  projects: Project[];
}) {
  const [search, setSearch] = useState("");

  const filtered = projects.filter(p => {
    return (
      p.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      p.description
        ?.toLowerCase()
        .includes(search.toLowerCase())
    );
  });

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
    p => p.blockers && p.blockers.trim().length > 0
  ).length;

  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
        }}
      >
        <GlobalNav breadcrumb="DASHBOARD" />

        <div
          style={{
            display: "flex",
            minHeight: "calc(100vh - 56px)",
          }}
        >
          {/* SIDEBAR */}
          <nav
            className="desktop-sidebar"
            style={{
              width: "240px",
              minWidth: "240px",
              borderRight: "1px solid var(--border)",
              padding: "24px 0",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                letterSpacing: "2px",
                color: "var(--muted)",
                padding: "0 20px 12px",
                textTransform: "uppercase",
              }}
            >
              Projects
            </div>

            {filtered.map(p => {
              const pct = getPct(p);

              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  style={{
                    textDecoration: "none",
                  }}
                >
                  <div
                    style={{
                      padding: "10px 20px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span>
                      {getTypeIcon(
                        p.project_type || "software"
                      )}
                    </span>

                    <span
                      style={{
                        flex: 1,
                        color: "var(--text)",
                        fontSize: "13px",
                        fontFamily:
                          "var(--font-syne)",
                      }}
                    >
                      {p.name}
                    </span>

                    <span
                      style={{
                        color: "var(--cyan)",
                        fontSize: "10px",
                      }}
                    >
                      {pct}%
                    </span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* MAIN */}
          <main
            style={{
              flex: 1,
              padding: "24px 16px",
            }}
          >
            {/* SEARCH */}
            <input
              value={search}
              onChange={e =>
                setSearch(e.target.value)
              }
              placeholder="Search projects..."
              style={{
                width: "100%",
                marginBottom: "20px",
                background: "var(--surface)",
                border:
                  "1px solid var(--border)",
                color: "var(--text)",
                padding: "10px 14px",
                borderRadius: "4px",
              }}
            />

            {/* STATS */}
            <div
              className="stats-grid"
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(5, 1fr)",
                gap: "12px",
                marginBottom: "24px",
              }}
            >
              {[
                {
                  label: "Total",
                  value: total,
                  color: "var(--cyan)",
                },
                {
                  label: "Launched",
                  value: launched,
                  color: "var(--green)",
                },
                {
                  label: "Building",
                  value: building,
                  color: "var(--amber)",
                },
                {
                  label: "Concept",
                  value: concept,
                  color: "var(--purple)",
                },
                {
                  label: "Blocked",
                  value: blocked,
                  color: "var(--red)",
                },
              ].map(stat => (
                <div
                  key={stat.label}
                  style={{
                    background: "var(--surface)",
                    border:
                      "1px solid var(--border)",
                    borderRadius: "4px",
                    padding: "14px 16px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "28px",
                      fontWeight: 800,
                      color: stat.color,
                    }}
                  >
                    {stat.value}
                  </div>

                  <div
                    style={{
                      fontSize: "10px",
                      color: "var(--muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* PROJECT GRID */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill,minmax(280px,1fr))",
                gap: "14px",
              }}
            >
              {filtered.map(p => {
                const pct = getPct(p);

                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    style={{
                      textDecoration: "none",
                    }}
                  >
                    <div
                      style={{
                        background:
                          "var(--surface)",
                        border:
                          "1px solid var(--border)",
                        borderRadius: "4px",
                        padding: "20px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "10px",
                        }}
                      >
                        <span>
                          {getTypeIcon(
                            p.project_type ||
                              "software"
                          )}
                        </span>

                        <span
                          style={{
                            fontFamily:
                              "var(--font-syne)",
                            fontWeight: 700,
                            color:
                              "var(--text)",
                          }}
                        >
                          {p.name}
                        </span>
                      </div>

                      <div
                        style={{
                          background:
                            "var(--surface3)",
                          height: "4px",
                          borderRadius: "2px",
                          overflow: "hidden",
                          marginBottom: "10px",
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background:
                              "var(--cyan)",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          fontSize: "12px",
                          color:
                            "var(--muted)",
                        }}
                      >
                        {pct}% COMPLETE
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </main>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .desktop-sidebar {
            display: none !important;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </>
  );
}