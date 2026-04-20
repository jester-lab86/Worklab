"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DependencyProject {
  id: number;
  project_id: number;
  name: string;
  status: string;
  priority: string;
  version: string;
  blockers: string | null;
  notes: string | null;
}

interface Props {
  projectId: string | number;
  allProjects: { id: number; name: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  launched: "var(--green)",
  building: "var(--amber)",
  concept: "var(--purple)",
};

export default function DependenciesPanel({ projectId, allProjects }: Props) {
  const [dependsOn, setDependsOn] = useState<DependencyProject[]>([]);
  const [dependedOnBy, setDependedOnBy] = useState<DependencyProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [depNotes, setDepNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/dependencies?project_id=${projectId}`);
    const data = await res.json();
    setDependsOn(data.depends_on || []);
    setDependedOnBy(data.depended_on_by || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [projectId]);

  async function addDependency() {
    if (!selectedProject) return;
    setSaving(true);
    await fetch("/api/dependencies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from_project_id: Number(projectId),
        to_project_id: Number(selectedProject),
        notes: depNotes.trim() || null,
      }),
    });
    setSelectedProject(""); setDepNotes(""); setAdding(false); setSaving(false);
    load();
  }

  async function removeDependency(id: number) {
    await fetch(`/api/dependencies?id=${id}`, { method: "DELETE" });
    load();
  }

  const availableProjects = allProjects.filter(p =>
    p.id !== Number(projectId) &&
    !dependsOn.find(d => d.project_id === p.id)
  );

  const ProjectRow = ({ dep, showRemove }: { dep: DependencyProject; showRemove: boolean }) => {
    const statusColor = STATUS_COLORS[dep.status] || "var(--cyan)";
    const isBlocked = dep.blockers && dep.blockers.trim().length > 0;
    return (
      <div style={{
        padding: "10px 20px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: "10px",
        transition: "background 0.15s",
      }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
      >
        {/* Status dot */}
        <div style={{
          width: "8px", height: "8px", borderRadius: "50%",
          background: statusColor, flexShrink: 0,
          boxShadow: `0 0 6px ${statusColor}`,
        }} />

        {/* Project info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={`/projects/${dep.project_id}`} style={{ textDecoration: "none" }}>
            <div style={{
              fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 700,
              color: "var(--text)", marginBottom: "2px",
              transition: "color 0.15s", cursor: "pointer",
            }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--cyan)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text)"}
            >
              {dep.name}
            </div>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{
              fontSize: "9px", padding: "1px 6px", borderRadius: "2px",
              background: `${statusColor}18`, border: `1px solid ${statusColor}40`,
              color: statusColor, fontWeight: 700, letterSpacing: "0.5px",
            }}>{dep.status.toUpperCase()}</span>
            <span style={{ fontSize: "10px", color: "var(--muted)" }}>v{dep.version}</span>
            {isBlocked && (
              <span style={{
                fontSize: "9px", padding: "1px 6px", borderRadius: "2px",
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                color: "var(--red)", fontWeight: 700,
              }}>⚠ BLOCKED</span>
            )}
            {dep.notes && (
              <span style={{ fontSize: "10px", color: "var(--muted)", fontStyle: "italic" }}>
                {dep.notes}
              </span>
            )}
          </div>
        </div>

        {/* Remove */}
        {showRemove && (
          <button onClick={() => removeDependency(dep.id)} style={{
            background: "none", border: "none", color: "var(--muted)",
            cursor: "pointer", fontSize: "14px", padding: "0 4px", flexShrink: 0,
          }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--red)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
          >✕</button>
        )}
      </div>
    );
  };

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", color: "var(--cyan)" }}>
            DEPENDENCIES
          </span>
          {(dependsOn.length + dependedOnBy.length) > 0 && (
            <span style={{ fontSize: "10px", color: "var(--muted)" }}>
              {dependsOn.length + dependedOnBy.length} linked
            </span>
          )}
        </div>
        <button onClick={() => setAdding(a => !a)} style={{
          background: "none", border: "1px solid rgba(0,212,255,0.2)",
          color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "10px",
          letterSpacing: "1px", padding: "4px 10px", borderRadius: "2px", cursor: "pointer",
        }}>
          {adding ? "CANCEL" : "+ LINK"}
        </button>
      </div>

      {/* Add dependency form */}
      {adding && (
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", fontFamily: "var(--font-jetbrains)" }}>
            This project depends on →
          </div>
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: selectedProject ? "var(--text)" : "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "8px", borderRadius: "2px", outline: "none" }}
          >
            <option value="">— Select a project —</option>
            {availableProjects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input
            value={depNotes}
            onChange={e => setDepNotes(e.target.value)}
            placeholder="Optional note (e.g. needs auth API from this project)"
            style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "8px 10px", borderRadius: "2px", outline: "none" }}
          />
          <div style={{ display: "flex", gap: "6px" }}>
            <button onClick={addDependency} disabled={!selectedProject || saving} style={{ flex: 1, background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "8px", borderRadius: "2px", cursor: "pointer", opacity: (!selectedProject || saving) ? 0.5 : 1 }}>
              {saving ? "LINKING..." : "LINK PROJECT"}
            </button>
            <button onClick={() => { setAdding(false); setSelectedProject(""); setDepNotes(""); }} style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "8px 12px", borderRadius: "2px", cursor: "pointer" }}>✕</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: "20px", fontSize: "11px", color: "var(--muted)", textAlign: "center" }}>Loading...</div>
      ) : (dependsOn.length === 0 && dependedOnBy.length === 0) ? (
        <div style={{ padding: "20px", fontSize: "11px", color: "var(--muted)", textAlign: "center" }}>
          No dependencies linked. Hit + LINK to connect projects.
        </div>
      ) : (
        <div>
          {/* Depends on */}
          {dependsOn.length > 0 && (
            <div>
              <div style={{ padding: "8px 20px 4px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "9px", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontWeight: 700, letterSpacing: "1.5px" }}>THIS DEPENDS ON</span>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              </div>
              {dependsOn.map(dep => <ProjectRow key={dep.id} dep={dep} showRemove={true} />)}
            </div>
          )}

          {/* Depended on by */}
          {dependedOnBy.length > 0 && (
            <div>
              <div style={{ padding: "8px 20px 4px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "9px", color: "var(--purple)", fontFamily: "var(--font-jetbrains)", fontWeight: 700, letterSpacing: "1.5px" }}>REQUIRED BY</span>
                <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              </div>
              {dependedOnBy.map(dep => <ProjectRow key={dep.id} dep={dep} showRemove={false} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}