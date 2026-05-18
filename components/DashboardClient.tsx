"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Project } from "@/types";
import GlobalNav from "@/components/GlobalNav";

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

function getTypeIcon(type: string) {
  if (type === "mechanical") return "🔧";
  if (type === "home") return "🏠";
  if (type === "other") return "⚙️";
  return "💻";
}

function getStatusColor(status: string) {
  if (status === "launched") return "var(--green)";
  if (status === "building") return "var(--amber)";
  return "var(--purple)";
}

function getPriorityColor(priority: string) {
  if (priority === "CRITICAL") return "#ff3b5c";
  if (priority === "HIGH") return "#ff8c00";
  if (priority === "BACKLOG") return "#3d5572";
  return "var(--cyan)";
}

type ViewMode = "status" | "priority" | "grid";

interface LiveStats {
  openBugs: number;
  criticalBugs: number;
  todayTasks: number;
  weekTasks: number;
  overdueTasks: number;
  loaded: boolean;
}

export default function DashboardClient({ projects }: { projects: Project[] }) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("status");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string>("");
  const aiEndRef = useRef<HTMLDivElement>(null);
  const [liveStats, setLiveStats] = useState<LiveStats>({
    openBugs: 0, criticalBugs: 0, todayTasks: 0, weekTasks: 0, overdueTasks: 0, loaded: false,
  });

  const total = projects.length;
  const launched = projects.filter(p => p.status === "launched").length;
  const building = projects.filter(p => p.status === "building").length;
  const concept = projects.filter(p => p.status === "concept").length;
  const blocked = projects.filter(p => p.blockers && p.blockers.trim().length > 0).length;
  const avgPct = total ? Math.round(projects.reduce((s, p) => s + getPct(p), 0) / total) : 0;

  const allTasks = projects.flatMap(p => {
    const raw = Array.isArray(p.still_to_complete) ? p.still_to_complete : [];
    return raw.map((t: any) => {
      if (typeof t === "string") { try { return JSON.parse(t); } catch { return { done: false }; } }
      return t;
    });
  });
  const doneTasks = allTasks.filter((t: any) => t.done).length;
  const totalTaskCount = allTasks.length;
  const taskCompletionPct = totalTaskCount > 0 ? Math.round((doneTasks / totalTaskCount) * 100) : 0;

  const versionsInProgress = projects.flatMap(p => p.versions || []).filter(v => {
    const phases = v.phases || [];
    const done = phases.filter((ph: any) => ph.completed).length;
    return done > 0 && done < phases.length;
  }).length;

  const onTrackProjects = projects.filter(p => {
    const pct = getPct(p);
    return pct >= 50 || p.status === "launched";
  }).length;
  const onTrackPct = total > 0 ? Math.round((onTrackProjects / total) * 100) : 0;

  const filtered = projects.filter(p => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.tech_stack?.some(t => t.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    async function fetchLiveStats() {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const weekEnd = new Date(today);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const weekStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, "0")}-${String(weekEnd.getDate()).padStart(2, "0")}`;

        const [bugsRes, calRes] = await Promise.all([
          fetch("/api/bugs"),
          fetch("/api/calendar"),
        ]);

        let openBugs = 0;
        let criticalBugs = 0;
        if (bugsRes.ok) {
          const bugs = await bugsRes.json();
          openBugs = bugs.filter((b: any) => b.status === "open").length;
          criticalBugs = bugs.filter((b: any) => b.status === "open" && b.severity === "critical").length;
        }

        let todayTasks = 0;
        let weekTasks = 0;
        let overdueTasks = 0;
        if (calRes.ok) {
          const calData = await calRes.json();
          const tasks = calData.tasks || calData || [];
          tasks.forEach((t: any) => {
            if (!t.dueDate || t.done) return;
            if (t.dueDate === todayStr) todayTasks++;
            if (t.dueDate <= weekStr) weekTasks++;
            if (t.dueDate < todayStr) overdueTasks++;
          });
        }

        setLiveStats({ openBugs, criticalBugs, todayTasks, weekTasks, overdueTasks, loaded: true });
      } catch {
        setLiveStats(s => ({ ...s, loaded: true }));
      }
    }
    fetchLiveStats();
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  async function deleteProject(id: number) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    window.location.reload();
  }

  async function setStatus(id: number, status: string) {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...project, status }),
    });
    window.location.reload();
  }

  async function sendAiMessage() {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = aiInput.trim();
    setAiInput("");
    setAiLoading(true);
    const newMessages = [...aiMessages, { role: "user" as const, content: userMsg }];
    setAiMessages(newMessages);

    const portfolioContext = `You are an AI assistant for FORGE, a project management dashboard. Here is the current portfolio:

${projects.map(p => {
  const pct = getPct(p);
  return `- ${p.name} (${p.status}, ${p.priority || "NORMAL"} priority, ${pct}% complete)${p.blockers?.trim() ? ` [BLOCKED: ${p.blockers}]` : ""}`;
}).join("\n")}

Total: ${total} projects. ${launched} launched, ${building} building, ${concept} concept. ${blocked} blocked. Average completion: ${avgPct}%. Open bugs: ${liveStats.openBugs}. Tasks due today: ${liveStats.todayTasks}. Overdue tasks: ${liveStats.overdueTasks}.

Answer questions about the portfolio, suggest priorities, identify risks, and give actionable recommendations. Be concise and direct.`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, projectContext: portfolioContext }),
      });
      const data = await res.json();
      const reply = data.message || "No response.";
      setAiMessages(prev => [...prev, { role: "assistant", content: reply }]);
      setAiInsight(reply.slice(0, 120) + (reply.length > 120 ? "..." : ""));
    } catch {
      setAiMessages(prev => [...prev, { role: "assistant", content: "Error contacting AI." }]);
    }
    setAiLoading(false);
  }

  function Stat({ label, value, color = "var(--text)" }: { label: string; value: string | number; color?: string }) {
    return (
      <div>
        <div style={{ fontFamily: "var(--font-syne)", fontSize: "20px", fontWeight: 800, color, lineHeight: 1, marginBottom: "2px" }}>{value}</div>
        <div style={{ fontSize: "9px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase" }}>{label}</div>
      </div>
    );
  }

  function ProjectCard({ p }: { p: Project }) {
    const pct = getPct(p);
    const accent = getPriorityColor(p.priority || "NORMAL");
    const statusColor = getStatusColor(p.status);
    const isMenuOpen = openMenuId === p.id;

    return (
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", overflow: "visible", position: "relative", transition: "border-color 0.15s" }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border2)"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"}
      >
        <div style={{ height: "2px", background: `linear-gradient(90deg, ${statusColor}, transparent)`, borderRadius: "6px 6px 0 0" }} />
        <div style={{ padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: "14px", flexShrink: 0 }}>{getTypeIcon(p.project_type || "software")}</span>
              <Link href={`/projects/${p.id}`} style={{ textDecoration: "none" }}>
                <span style={{ fontFamily: "var(--font-syne)", fontSize: "14px", fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{p.name}</span>
              </Link>
            </div>
            <div style={{ position: "relative", flexShrink: 0 }} ref={isMenuOpen ? menuRef : undefined}>
              <button onClick={e => { e.stopPropagation(); setOpenMenuId(isMenuOpen ? null : p.id); }}
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: "2px 6px", fontSize: "16px", lineHeight: 1, borderRadius: "2px" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--text)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--muted)"}
              >···</button>
              {isMenuOpen && (
                <div style={{ position: "absolute", top: "24px", right: 0, background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: "4px", zIndex: 999, minWidth: "160px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                  <Link href={`/projects/${p.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ padding: "10px 14px", fontSize: "11px", color: "var(--text)", fontFamily: "var(--font-jetbrains)", cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface3)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                    >→ Open OPS CENTER</div>
                  </Link>
                  <div style={{ height: "1px", background: "var(--border)" }} />
                  <div style={{ padding: "6px 0" }}>
                    {["concept", "building", "launched"].map(s => (
                      <div key={s} onClick={() => { setStatus(p.id, s); setOpenMenuId(null); }}
                        style={{ padding: "8px 14px", fontSize: "11px", color: p.status === s ? getStatusColor(s) : "var(--muted)", fontFamily: "var(--font-jetbrains)", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface3)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                      >
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: getStatusColor(s), flexShrink: 0 }} />
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                        {p.status === s && <span style={{ marginLeft: "auto", fontSize: "9px" }}>✓</span>}
                      </div>
                    ))}
                  </div>
                  <div style={{ height: "1px", background: "var(--border)" }} />
                  <div onClick={() => { deleteProject(p.id); setOpenMenuId(null); }}
                    style={{ padding: "10px 14px", fontSize: "11px", color: "var(--red)", fontFamily: "var(--font-jetbrains)", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >✕ Delete Project</div>
                </div>
              )}
            </div>
          </div>
          <p style={{ fontSize: "11px", color: "var(--muted)", lineHeight: 1.6, marginBottom: "12px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {p.description || "No description yet."}
          </p>
          <div style={{ background: "var(--surface3)", height: "3px", borderRadius: "2px", marginBottom: "10px", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: "2px", background: `linear-gradient(90deg, ${statusColor}, ${accent})`, width: `${pct}%`, transition: "width 0.5s ease" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font-syne)", fontSize: "18px", fontWeight: 800, color: pct === 100 ? "var(--green)" : statusColor }}>{pct}%</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {p.blockers?.trim() && (
                <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "2px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "var(--red)" }}>⚠ BLOCKED</span>
              )}
              <span style={{ fontSize: "9px", padding: "2px 8px", borderRadius: "2px", fontWeight: 700, fontFamily: "var(--font-jetbrains)", background: `${statusColor}15`, border: `1px solid ${statusColor}30`, color: statusColor }}>{p.status}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const STATUS_GROUPS = [
    { key: "launched", label: "LAUNCHED", color: "var(--green)" },
    { key: "building", label: "BUILDING", color: "var(--amber)" },
    { key: "concept", label: "CONCEPT", color: "var(--purple)" },
  ];

  const PRIORITY_GROUPS = [
    { key: "CRITICAL", color: "#ff3b5c" },
    { key: "HIGH", color: "#ff8c00" },
    { key: "NORMAL", color: "var(--cyan)" },
    { key: "BACKLOG", color: "#3d5572" },
  ];

  const AI_SUGGESTIONS = [
    "What should I focus on today?",
    "Which projects are at risk?",
    "Summarize my portfolio status",
    "What's blocking the most progress?",
  ];

  return (
    <>
      <GlobalNav breadcrumb="DASHBOARD" />

      <div style={{ display: "flex", minHeight: "calc(100vh - 56px)", position: "relative" }}>

        {/* SIDEBAR */}
        <nav className="dash-sidebar" style={{ width: "230px", minWidth: "230px", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", position: "sticky", top: "56px", height: "calc(100vh - 56px)", overflowY: "auto" }}>
          <div style={{ padding: "16px 16px 8px" }}>
            <span style={{ fontSize: "10px", letterSpacing: "2px", color: "var(--muted)", textTransform: "uppercase" }}>Projects</span>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {projects.map(p => {
              const pct = getPct(p);
              const accent = getPriorityColor(p.priority || "NORMAL");
              return (
                <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ padding: "9px 16px", display: "flex", alignItems: "center", gap: "8px", borderLeft: "2px solid transparent", transition: "all 0.15s" }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = "var(--surface2)"; el.style.borderLeftColor = accent; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = "transparent"; el.style.borderLeftColor = "transparent"; }}
                  >
                    <span style={{ fontSize: "12px", flexShrink: 0 }}>{getTypeIcon(p.project_type || "software")}</span>
                    <span style={{ fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>{p.name}</span>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: pct === 100 ? "var(--green)" : "var(--muted)", flexShrink: 0 }}>{pct}%</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* MAIN */}
        <main style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>

          {/* Toolbar */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", background: "var(--surface)" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..."
              style={{ flex: 1, minWidth: "160px", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "7px 12px", borderRadius: "4px", outline: "none" }}
              onFocus={e => (e.target as HTMLInputElement).style.borderColor = "rgba(0,212,255,0.4)"}
              onBlur={e => (e.target as HTMLInputElement).style.borderColor = "var(--border)"}
            />
            <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
              {([
                { v: "status" as ViewMode, label: "GROUP BY STATUS" },
                { v: "priority" as ViewMode, label: "PRIORITY" },
                { v: "grid" as ViewMode, label: "⊞" },
              ]).map(({ v, label }) => (
                <button key={v} onClick={() => setView(v)} style={{ padding: "7px 12px", border: "none", cursor: "pointer", fontFamily: "var(--font-jetbrains)", fontSize: "10px", letterSpacing: "0.5px", transition: "all 0.15s", background: view === v ? "rgba(0,212,255,0.1)" : "transparent", color: view === v ? "var(--cyan)" : "var(--muted)", borderRight: v !== "grid" ? "1px solid var(--border)" : "none" }}>{label}</button>
              ))}
            </div>
            <Link href="/projects/new" style={{ textDecoration: "none" }}>
              <div style={{ padding: "7px 16px", background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", letterSpacing: "1px", borderRadius: "4px", cursor: "pointer", whiteSpace: "nowrap" }}>+ NEW PROJECT</div>
            </Link>
          </div>

          <div style={{ padding: "20px" }}>

            {/* KPI STRIP */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "24px" }} className="kpi-grid">
              {[
                { label: "TOTAL", value: total, color: "var(--cyan)", sub: `${avgPct}% avg` },
                { label: "LAUNCHED", value: launched, color: "var(--green)", sub: "live" },
                { label: "BUILDING", value: building, color: "var(--amber)", sub: "in progress" },
                { label: "CONCEPT", value: concept, color: "var(--purple)", sub: "planned" },
                { label: "BLOCKED", value: blocked, color: "var(--red)", sub: "need attention" },
              ].map(kpi => (
                <div key={kpi.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "16px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "3px", background: kpi.color }} />
                  <div style={{ paddingLeft: "8px" }}>
                    <div style={{ fontSize: "9px", color: "var(--muted)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "6px" }}>{kpi.label}</div>
                    <div style={{ fontFamily: "var(--font-syne)", fontSize: "32px", fontWeight: 800, color: kpi.color, lineHeight: 1, marginBottom: "4px" }}>{kpi.value}</div>
                    <div style={{ fontSize: "10px", color: "var(--muted)" }}>{kpi.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* PROJECT VIEWS */}
            {filtered.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "300px", color: "var(--muted)", gap: "12px" }}>
                <div style={{ fontSize: "40px", opacity: 0.3 }}>📂</div>
                <p style={{ fontSize: "12px" }}>{search ? `No results for "${search}"` : "No projects yet."}</p>
              </div>
            ) : view === "status" ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }} className="status-grid">
                {STATUS_GROUPS.map(group => {
                  const groupProjects = filtered.filter(p => p.status === group.key);
                  return (
                    <div key={group.key}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "2px", color: group.color, fontFamily: "var(--font-jetbrains)" }}>{group.label}</span>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: group.color }}>{groupProjects.length}</span>
                        <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${group.color}44, transparent)` }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {groupProjects.map(p => <ProjectCard key={p.id} p={p} />)}
                        {groupProjects.length === 0 && (
                          <div style={{ padding: "20px", border: "1px dashed var(--border)", borderRadius: "6px", textAlign: "center", fontSize: "11px", color: "var(--muted)" }}>None</div>
                        )}
                        <Link href="/projects/new" style={{ textDecoration: "none" }}>
                          <div style={{ padding: "14px", border: "1px dashed var(--border)", borderRadius: "6px", textAlign: "center", fontSize: "11px", color: "var(--muted)", cursor: "pointer", transition: "all 0.15s" }}
                            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = group.color; el.style.color = group.color; }}
                            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.color = "var(--muted)"; }}
                          >+ Add project</div>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : view === "priority" ? (
              <div>
                {PRIORITY_GROUPS.map(group => {
                  const groupProjects = filtered.filter(p => (p.priority || "NORMAL") === group.key);
                  if (groupProjects.length === 0) return null;
                  return (
                    <div key={group.key} style={{ marginBottom: "24px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                        <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "2px", color: group.color, fontFamily: "var(--font-jetbrains)" }}>{group.key}</span>
                        <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${group.color}44, transparent)` }} />
                        <span style={{ fontSize: "10px", color: "var(--muted)" }}>{groupProjects.length}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
                        {groupProjects.map(p => <ProjectCard key={p.id} p={p} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
                {filtered.map(p => <ProjectCard key={p.id} p={p} />)}
              </div>
            )}

            {/* ANALYTICS STRIP */}
            <div style={{ marginTop: "32px", display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "12px" }} className="analytics-strip">

              {/* Completion over time */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontFamily: "var(--font-syne)", fontSize: "11px", fontWeight: 700, letterSpacing: "1px", color: "var(--muted)" }}>COMPLETION OVER TIME</span>
                  <Link href="/analytics" style={{ fontSize: "10px", color: "var(--cyan)", textDecoration: "none", fontFamily: "var(--font-jetbrains)" }}>Full report →</Link>
                </div>
                {aiInsight && (
                  <div style={{ marginBottom: "12px", padding: "8px 10px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "4px", fontSize: "10px", color: "#f59e0b", fontFamily: "var(--font-jetbrains)", lineHeight: 1.6 }}>
                    ◈ {aiInsight}
                  </div>
                )}
                <div style={{ height: "60px", display: "flex", alignItems: "flex-end", gap: "3px", marginBottom: "12px" }}>
                  {[20, 35, 28, 45, 52, 48, 60, 65, 58, 72, 78, avgPct].map((h, i) => (
                    <div key={i} style={{ flex: 1, background: i === 11 ? "var(--cyan)" : "rgba(0,212,255,0.2)", borderRadius: "2px 2px 0 0", height: `${h}%`, transition: "height 0.3s ease" }} />
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                  <Stat label="Total Tasks" value={totalTaskCount} color="var(--text)" />
                  <Stat label="Completed" value={doneTasks} color="var(--green)" />
                  <Stat label="Rate" value={`${taskCompletionPct}%`} color="var(--cyan)" />
                </div>
              </div>

              {/* Throughput */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "16px" }}>
                <div style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", marginBottom: "10px" }}>THROUGHPUT</div>
                <div style={{ fontFamily: "var(--font-syne)", fontSize: "36px", fontWeight: 800, color: "var(--cyan)", lineHeight: 1, marginBottom: "2px" }}>{taskCompletionPct}%</div>
                <div style={{ fontSize: "9px", color: "var(--muted)", marginBottom: "14px", letterSpacing: "1px" }}>TASK COMPLETION</div>
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <Stat label="Versions Active" value={versionsInProgress} color="var(--amber)" />
                  <Stat label="Avg Progress" value={`${avgPct}%`} color="var(--purple)" />
                </div>
              </div>

              {/* Status distribution */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "16px" }}>
                <div style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", marginBottom: "12px" }}>STATUS DISTRIBUTION</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { label: "Launched", value: launched, color: "var(--green)" },
                    { label: "Building", value: building, color: "var(--amber)" },
                    { label: "Concept", value: concept, color: "var(--purple)" },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontSize: "10px", color: "var(--muted)" }}>{s.label}</span>
                        <span style={{ fontSize: "10px", color: s.color, fontWeight: 700 }}>{s.value} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({total > 0 ? Math.round((s.value / total) * 100) : 0}%)</span></span>
                      </div>
                      <div style={{ height: "4px", background: "var(--surface3)", borderRadius: "2px", overflow: "hidden" }}>
                        <div style={{ height: "100%", background: s.color, width: total ? `${(s.value / total) * 100}%` : "0%", transition: "width 0.5s ease", borderRadius: "2px" }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: "12px", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                  <Stat label="On Track" value={`${onTrackPct}%`} color={onTrackPct >= 70 ? "var(--green)" : "var(--amber)"} />
                </div>
              </div>

              {/* Live Intel */}
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "16px" }}>
                <div style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", marginBottom: "12px" }}>LIVE INTEL</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ padding: "8px 10px", background: liveStats.openBugs > 0 ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.06)", border: `1px solid ${liveStats.openBugs > 0 ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`, borderRadius: "4px" }}>
                    <div style={{ fontFamily: "var(--font-syne)", fontSize: "22px", fontWeight: 800, color: liveStats.openBugs > 0 ? "var(--red)" : "var(--green)", lineHeight: 1, marginBottom: "2px" }}>
                      {!liveStats.loaded ? "—" : liveStats.openBugs}
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--muted)", letterSpacing: "1px" }}>
                      OPEN BUGS{liveStats.criticalBugs > 0 && <span style={{ color: "var(--red)" }}> · {liveStats.criticalBugs} CRITICAL</span>}
                    </div>
                  </div>
                  <div style={{ padding: "8px 10px", background: liveStats.overdueTasks > 0 ? "rgba(239,68,68,0.06)" : "rgba(0,212,255,0.06)", border: `1px solid ${liveStats.overdueTasks > 0 ? "rgba(239,68,68,0.2)" : "rgba(0,212,255,0.2)"}`, borderRadius: "4px" }}>
                    <div style={{ fontFamily: "var(--font-syne)", fontSize: "22px", fontWeight: 800, color: liveStats.overdueTasks > 0 ? "var(--red)" : "var(--cyan)", lineHeight: 1, marginBottom: "2px" }}>
                      {!liveStats.loaded ? "—" : liveStats.overdueTasks}
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--muted)", letterSpacing: "1px" }}>OVERDUE TASKS</div>
                  </div>
                  <div style={{ padding: "8px 10px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "4px" }}>
                    <div style={{ fontFamily: "var(--font-syne)", fontSize: "22px", fontWeight: 800, color: "var(--amber)", lineHeight: 1, marginBottom: "2px" }}>
                      {!liveStats.loaded ? "—" : liveStats.todayTasks}
                    </div>
                    <div style={{ fontSize: "9px", color: "var(--muted)", letterSpacing: "1px" }}>
                      DUE TODAY{liveStats.weekTasks > 0 && <span style={{ color: "var(--amber)" }}> · {liveStats.weekTasks} THIS WEEK</span>}
                    </div>
                  </div>
                  {blocked > 0 && projects.filter(p => p.blockers?.trim()).slice(0, 2).map(p => (
                    <Link key={p.id} href={`/projects/${p.id}`} style={{ textDecoration: "none" }}>
                      <div style={{ fontSize: "10px", color: "var(--red)", fontFamily: "var(--font-jetbrains)", padding: "2px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>⚠ {p.name}</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* ANALYTICS SHORTCUTS */}
            <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }} className="shortcuts-grid">
              {[
                { label: "Velocity Report", sub: `${avgPct}% avg completion`, icon: "▲", href: "/analytics", color: "var(--purple)" },
                { label: "Bug Analytics", sub: liveStats.loaded ? `${liveStats.openBugs} open bugs` : "Loading...", icon: "⚡", href: "/bugs", color: "var(--red)" },
                { label: "Calendar", sub: liveStats.loaded ? `${liveStats.todayTasks} due today` : "Loading...", icon: "◷", href: "/calendar", color: "var(--amber)" },
                { label: "Roadmap", sub: `${versionsInProgress} versions active`, icon: "◎", href: "/roadmap", color: "#3b82f6" },
                { label: "Project Health", sub: `${onTrackPct}% on track`, icon: "◈", href: "/analytics", color: "var(--green)" },
              ].map(s => (
                <Link key={s.label} href={s.href} style={{ textDecoration: "none" }}>
                  <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "14px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = s.color; el.style.background = `${s.color}08`; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "var(--border)"; el.style.background = "var(--surface)"; }}
                  >
                    <span style={{ fontSize: "16px", color: s.color, flexShrink: 0 }}>{s.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-syne)", fontSize: "11px", fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</div>
                      <div style={{ fontSize: "9px", color: "var(--muted)" }}>{s.sub}</div>
                    </div>
                    <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: "12px", flexShrink: 0 }}>→</span>
                  </div>
                </Link>
              ))}
            </div>

          </div>
        </main>
      </div>

      {/* AI TOGGLE BUTTON */}
      <button onClick={() => setAiOpen(o => !o)} style={{
        position: "fixed", bottom: "24px", right: aiOpen ? "328px" : "24px",
        width: "48px", height: "48px", borderRadius: "50%",
        background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)",
        color: "#f59e0b", cursor: "pointer", fontSize: "18px",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 300, transition: "right 0.3s ease",
        boxShadow: "0 0 20px rgba(245,158,11,0.3)",
      }}>◈</button>

      {/* AI PANEL */}
      <div style={{
        position: "fixed", top: "56px", right: 0, bottom: 0, width: "320px",
        background: "#060a10", borderLeft: "1px solid rgba(245,158,11,0.2)",
        zIndex: 200, transform: aiOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s ease", display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(245,158,11,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#f59e0b", fontSize: "14px" }}>◈</span>
            <span style={{ fontFamily: "var(--font-syne)", fontSize: "13px", fontWeight: 700, color: "#f59e0b", letterSpacing: "2px" }}>PORTFOLIO AI</span>
          </div>
          <button onClick={() => setAiOpen(false)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "16px" }}>✕</button>
        </div>
        <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--border)", background: "rgba(245,158,11,0.04)" }}>
          <div style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px" }}>
            <span style={{ color: "#f59e0b", fontWeight: 700 }}>{total}</span> PROJECTS · <span style={{ color: "#f59e0b", fontWeight: 700 }}>{avgPct}%</span> AVG · <span style={{ color: liveStats.openBugs > 0 ? "var(--red)" : "var(--green)", fontWeight: 700 }}>{liveStats.openBugs}</span> BUGS · <span style={{ color: liveStats.overdueTasks > 0 ? "var(--red)" : "var(--cyan)", fontWeight: 700 }}>{liveStats.overdueTasks}</span> OVERDUE
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          {aiMessages.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "11px", color: "var(--muted)", lineHeight: 1.6 }}>Ask me anything about your portfolio. Try:</div>
              {AI_SUGGESTIONS.map(suggestion => (
                <button key={suggestion} onClick={() => setAiInput(suggestion)}
                  style={{ padding: "8px 12px", background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: "4px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", cursor: "pointer", textAlign: "left", letterSpacing: "0.5px" }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(245,158,11,0.4)"; el.style.color = "#f59e0b"; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = "rgba(245,158,11,0.15)"; el.style.color = "var(--muted)"; }}
                >{suggestion}</button>
              ))}
            </div>
          )}
          {aiMessages.map((msg, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ fontSize: "9px", color: "var(--muted)", letterSpacing: "1px" }}>{msg.role === "user" ? "YOU" : "FORGE AI"}</div>
              <div style={{
                padding: "10px 12px", borderRadius: "4px", fontSize: "12px", lineHeight: 1.6, maxWidth: "85%",
                background: msg.role === "user" ? "rgba(245,158,11,0.1)" : "var(--surface2)",
                border: msg.role === "user" ? "1px solid rgba(245,158,11,0.2)" : "1px solid var(--border)",
                color: msg.role === "user" ? "#f59e0b" : "var(--text)",
                fontFamily: "var(--font-jetbrains)",
              }}>{msg.content}</div>
            </div>
          ))}
          {aiLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "4px", width: "fit-content" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b", animation: "blink 1s infinite" }} />
              <span style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)" }}>Thinking...</span>
            </div>
          )}
          <div ref={aiEndRef} />
        </div>
        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(245,158,11,0.15)" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={aiInput}
              onChange={e => setAiInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendAiMessage()}
              placeholder="Ask about your portfolio..."
              style={{ flex: 1, background: "var(--surface2)", border: "1px solid rgba(245,158,11,0.2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "9px 12px", borderRadius: "4px", outline: "none" }}
              onFocus={e => (e.target as HTMLInputElement).style.borderColor = "rgba(245,158,11,0.5)"}
              onBlur={e => (e.target as HTMLInputElement).style.borderColor = "rgba(245,158,11,0.2)"}
            />
            <button onClick={sendAiMessage} disabled={aiLoading || !aiInput.trim()}
              style={{ padding: "9px 14px", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", borderRadius: "4px", cursor: "pointer", fontSize: "12px", opacity: aiLoading || !aiInput.trim() ? 0.5 : 1 }}>→</button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @media (max-width: 768px) {
          .dash-sidebar { display: none !important; }
          .status-grid { grid-template-columns: 1fr !important; }
          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .analytics-strip { grid-template-columns: 1fr !important; }
          .shortcuts-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </>
  );
}