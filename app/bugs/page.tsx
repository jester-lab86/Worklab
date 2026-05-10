"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

interface Bug {
  id: number;
  project_id: number;
  project_name: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  reported_by: string;
  created_at: string;
  resolved_at: string | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ff3b5c",
  high: "#ff8c00",
  normal: "var(--cyan)",
  low: "var(--muted)",
};

const STATUS_COLORS: Record<string, string> = {
  open: "var(--red)",
  "in-progress": "var(--amber)",
  resolved: "var(--green)",
};

export default function BugsPage() {
  const router = useRouter();
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const [expandedBug, setExpandedBug] = useState<number | null>(null);

  async function load() {
    const res = await fetch("/api/bugs");
    const data = await res.json();
    setBugs(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(bug: Bug, status: string) {
    await fetch(`/api/bugs/${bug.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function deleteBug(id: number) {
    if (!confirm("Delete this bug? This cannot be undone.")) return;
    await fetch(`/api/bugs/${id}`, { method: "DELETE" });
    load();
  }

  // Build project list for filter
  const projects = [...new Map(bugs.map(b => [b.project_id, b.project_name])).entries()];

  const filtered = bugs.filter(b => {
    if (projectFilter !== "all" && String(b.project_id) !== projectFilter) return false;
    if (severityFilter !== "all" && b.severity !== severityFilter) return false;
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    return true;
  });

  // KPI counts
  const total = bugs.length;
  const open = bugs.filter(b => b.status === "open").length;
  const inProgress = bugs.filter(b => b.status === "in-progress").length;
  const critical = bugs.filter(b => b.severity === "critical" && b.status !== "resolved").length;
  const resolved = bugs.filter(b => b.status === "resolved").length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* HEADER */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: "56px", borderBottom: "1px solid var(--border)", background: "var(--surface)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ fontFamily: "var(--font-syne)", fontSize: "18px", fontWeight: 800, letterSpacing: "3px", color: "var(--cyan)", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "8px", height: "8px", background: "var(--cyan)", borderRadius: "50%", animation: "blink 2s infinite" }} />
            FORGE
          </div>
          <div style={{ width: "1px", height: "20px", background: "var(--border)" }} />
          <span style={{ fontSize: "11px", color: "#ff3b5c", letterSpacing: "1px", fontFamily: "var(--font-jetbrains)", fontWeight: 700 }}>BUG TRACKER</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Link href="/dashboard" style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: "2px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", textDecoration: "none", letterSpacing: "1px" }}>DASHBOARD</Link>
          <ThemeToggle />
        </div>
      </header>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px 16px" }}>

        {/* KPI STRIP */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "20px" }} className="bugs-kpi-grid">
          {[
            { label: "Total Bugs", value: total, color: "var(--muted)" },
            { label: "Open", value: open, color: "var(--red)" },
            { label: "In Progress", value: inProgress, color: "var(--amber)" },
            { label: "Critical", value: critical, color: "#ff3b5c" },
            { label: "Resolved", value: resolved, color: "var(--green)" },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", padding: "14px 16px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${kpi.color}, transparent)` }} />
              <div style={{ fontSize: "9px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px", fontFamily: "var(--font-jetbrains)" }}>{kpi.label}</div>
              <div style={{ fontFamily: "var(--font-syne)", fontSize: "28px", fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* FILTERS */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", padding: "14px 20px", marginBottom: "20px", display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Status filter */}
          <div style={{ display: "flex", borderRadius: "2px", overflow: "hidden", border: "1px solid var(--border2)" }}>
            {["all", "open", "in-progress", "resolved"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: "5px 10px", background: statusFilter === s ? "var(--cyan-dim)" : "transparent", border: "none", color: statusFilter === s ? "var(--cyan)" : "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "9px", cursor: "pointer", letterSpacing: "0.5px", textTransform: "uppercase" }}>{s}</button>
            ))}
          </div>

          {/* Severity filter */}
          <div style={{ display: "flex", borderRadius: "2px", overflow: "hidden", border: "1px solid var(--border2)" }}>
            {["all", "critical", "high", "normal", "low"].map(s => (
              <button key={s} onClick={() => setSeverityFilter(s)} style={{ padding: "5px 10px", background: severityFilter === s ? `${SEVERITY_COLORS[s] || "var(--cyan-dim)"}20` : "transparent", border: "none", color: severityFilter === s ? (SEVERITY_COLORS[s] || "var(--cyan)") : "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "9px", cursor: "pointer", letterSpacing: "0.5px", textTransform: "uppercase" }}>{s}</button>
            ))}
          </div>

          {/* Project filter */}
          <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 10px", borderRadius: "2px", outline: "none" }}>
            <option value="all">All Projects</option>
            {projects.map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}
          </select>

          <div style={{ flex: 1 }} />
          <span style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)" }}>{filtered.length} bug{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* BUG LIST */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "12px", letterSpacing: "2px" }}>LOADING...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "12px" }}>
              No bugs match the current filters.
            </div>
          ) : (
            filtered.map(bug => {
              const isExpanded = expandedBug === bug.id;
              const severityColor = SEVERITY_COLORS[bug.severity] || "var(--muted)";
              const statusColor = STATUS_COLORS[bug.status] || "var(--muted)";

              return (
                <div key={bug.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  {/* Bug row */}
                  <div onClick={() => setExpandedBug(isExpanded ? null : bug.id)}
                    style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 20px", cursor: "pointer", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    {/* Severity dot */}
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0, background: severityColor, boxShadow: `0 0 6px ${severityColor}` }} />

                    {/* Title */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontFamily: "var(--font-syne)", fontWeight: 600, color: bug.status === "resolved" ? "var(--muted)" : "var(--text)", textDecoration: bug.status === "resolved" ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bug.title}</div>
                      <div style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", marginTop: "2px" }}>
                        {bug.project_name} · {bug.reported_by === "user" ? "👤 User" : "🔧 Self"} · {new Date(bug.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </div>

                    {/* Severity badge */}
                    <span style={{ fontSize: "8px", padding: "2px 7px", borderRadius: "2px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", background: `${severityColor}15`, border: `1px solid ${severityColor}40`, color: severityColor, fontFamily: "var(--font-jetbrains)", whiteSpace: "nowrap", flexShrink: 0 }}>{bug.severity}</span>

                    {/* Status badge */}
                    <span style={{ fontSize: "8px", padding: "2px 7px", borderRadius: "2px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", background: `${statusColor}15`, border: `1px solid ${statusColor}40`, color: statusColor, fontFamily: "var(--font-jetbrains)", whiteSpace: "nowrap", flexShrink: 0 }}>{bug.status}</span>

                    <span style={{ fontSize: "9px", color: "var(--muted)", flexShrink: 0 }}>{isExpanded ? "▼" : "▶"}</span>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div style={{ padding: "12px 20px 16px 42px", background: "var(--surface2)", borderTop: "1px solid var(--border)" }}>
                      {bug.description && (
                        <p style={{ fontSize: "12px", color: "var(--muted)", lineHeight: 1.7, marginBottom: "12px" }}>{bug.description}</p>
                      )}

                      {/* Status controls */}
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                        <span style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", alignSelf: "center", marginRight: "4px" }}>STATUS:</span>
                        {["open", "in-progress", "resolved"].map(s => (
                          <button key={s} onClick={() => updateStatus(bug, s)} style={{ padding: "4px 10px", borderRadius: "2px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--font-jetbrains)", background: bug.status === s ? `${STATUS_COLORS[s]}20` : "transparent", border: `1px solid ${bug.status === s ? STATUS_COLORS[s] : "var(--border2)"}`, color: bug.status === s ? STATUS_COLORS[s] : "var(--muted)" }}>{s}</button>
                        ))}
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <Link href={`/projects/${bug.project_id}`} style={{ fontSize: "10px", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", textDecoration: "none", letterSpacing: "0.5px" }}>
                          → VIEW PROJECT
                        </Link>
                        <button onClick={() => deleteBug(bug.id)} style={{ fontSize: "10px", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-jetbrains)", padding: 0 }}
                          onMouseEnter={e => e.currentTarget.style.color = "var(--red)"}
                          onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
                        >✕ DELETE</button>
                        {bug.resolved_at && (
                          <span style={{ fontSize: "9px", color: "var(--green)", fontFamily: "var(--font-jetbrains)" }}>
                            ✓ Resolved {new Date(bug.resolved_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @media (max-width: 768px) {
          .bugs-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}