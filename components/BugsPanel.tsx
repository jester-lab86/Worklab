"use client";

import { useEffect, useState } from "react";

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

interface Props {
  projectId: string | number;
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

export default function BugsPanel({ projectId }: Props) {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedBug, setExpandedBug] = useState<number | null>(null);
  const [editingBug, setEditingBug] = useState<Bug | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newSeverity, setNewSeverity] = useState("normal");
  const [newReportedBy, setNewReportedBy] = useState("self");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch(`/api/bugs?project_id=${projectId}`);
    const data = await res.json();
    setBugs(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [projectId]);

  async function addBug() {
    if (!newTitle.trim()) return;
    setSaving(true);
    await fetch("/api/bugs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: Number(projectId),
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        severity: newSeverity,
        reported_by: newReportedBy,
      }),
    });
    setNewTitle(""); setNewDesc(""); setNewSeverity("normal"); setNewReportedBy("self");
    setAdding(false); setSaving(false);
    load();
  }

  async function updateStatus(bug: Bug, status: string) {
    await fetch(`/api/bugs/${bug.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function saveBugEdit() {
    if (!editingBug) return;
    setSaving(true);
    await fetch(`/api/bugs/${editingBug.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editingBug.title,
        description: editingBug.description,
        severity: editingBug.severity,
        reported_by: editingBug.reported_by,
      }),
    });
    setSaving(false); setEditingBug(null);
    load();
  }

  async function deleteBug(id: number) {
    if (!confirm("Delete this bug? This cannot be undone.")) return;
    await fetch(`/api/bugs/${id}`, { method: "DELETE" });
    load();
  }

  const openBugs = bugs.filter(b => b.status !== "resolved");
  const resolvedBugs = bugs.filter(b => b.status === "resolved");

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--surface3)", border: "1px solid var(--border2)",
    color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "11px",
    padding: "8px 10px", borderRadius: "2px", outline: "none", boxSizing: "border-box",
  };

  const SeverityDot = ({ severity }: { severity: string }) => (
    <div style={{
      width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
      background: SEVERITY_COLORS[severity] || "var(--muted)",
      boxShadow: `0 0 5px ${SEVERITY_COLORS[severity] || "var(--muted)"}`,
    }} />
  );

  const BugRow = ({ bug }: { bug: Bug }) => {
    const isExpanded = expandedBug === bug.id;
    const isEditing = editingBug?.id === bug.id;
    const statusColor = STATUS_COLORS[bug.status] || "var(--muted)";
    const severityColor = SEVERITY_COLORS[bug.severity] || "var(--muted)";

    return (
      <div style={{ borderBottom: "1px solid var(--border)" }}>
        {/* Bug header row */}
        <div
          onClick={() => setExpandedBug(isExpanded ? null : bug.id)}
          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 20px", cursor: "pointer", transition: "background 0.15s" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
        >
          <SeverityDot severity={bug.severity} />
          <span style={{ fontSize: "12px", color: bug.status === "resolved" ? "var(--muted)" : "var(--text)", flex: 1, lineHeight: 1.4, textDecoration: bug.status === "resolved" ? "line-through" : "none" }}>
            {bug.title}
          </span>
          <span style={{ fontSize: "8px", padding: "2px 6px", borderRadius: "2px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", fontFamily: "var(--font-jetbrains)", background: `${severityColor}15`, border: `1px solid ${severityColor}40`, color: severityColor, whiteSpace: "nowrap" }}>
            {bug.severity}
          </span>
          <span style={{ fontSize: "8px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", flexShrink: 0 }}>{isExpanded ? "▼" : "▶"}</span>
        </div>

        {/* Expanded detail */}
        {isExpanded && (
          <div style={{ padding: "0 20px 14px", background: "var(--surface2)" }}>
            {isEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingTop: "8px" }}>
                <input value={editingBug.title} onChange={e => setEditingBug({ ...editingBug, title: e.target.value })} style={inputStyle} />
                <textarea value={editingBug.description || ""} onChange={e => setEditingBug({ ...editingBug, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} placeholder="Description..." />
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {["critical", "high", "normal", "low"].map(s => (
                    <button key={s} onClick={() => setEditingBug({ ...editingBug, severity: s })} style={{ padding: "4px 10px", borderRadius: "2px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--font-jetbrains)", background: editingBug.severity === s ? `${SEVERITY_COLORS[s]}20` : "transparent", border: `1px solid ${editingBug.severity === s ? SEVERITY_COLORS[s] : "var(--border2)"}`, color: editingBug.severity === s ? SEVERITY_COLORS[s] : "var(--muted)" }}>{s}</button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <select value={editingBug.reported_by} onChange={e => setEditingBug({ ...editingBug, reported_by: e.target.value })} style={{ ...inputStyle, flex: 1 }}>
                    <option value="self">Reported by: Me</option>
                    <option value="user">Reported by: User</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={saveBugEdit} disabled={saving} style={{ flex: 1, padding: "7px", background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", cursor: "pointer", borderRadius: "2px" }}>SAVE</button>
                  <button onClick={() => setEditingBug(null)} style={{ padding: "7px 12px", background: "none", border: "1px solid var(--border2)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", cursor: "pointer", borderRadius: "2px" }}>CANCEL</button>
                </div>
              </div>
            ) : (
              <div style={{ paddingTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {/* Meta */}
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: "9px", padding: "2px 7px", borderRadius: "2px", fontWeight: 700, background: `${statusColor}15`, border: `1px solid ${statusColor}40`, color: statusColor, fontFamily: "var(--font-jetbrains)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{bug.status}</span>
                  <span style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)" }}>
                    {bug.reported_by === "user" ? "👤 User reported" : "🔧 Self reported"}
                  </span>
                  <span style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)" }}>
                    {new Date(bug.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>

                {/* Description */}
                {bug.description && (
                  <p style={{ fontSize: "11px", color: "var(--muted)", lineHeight: 1.7, margin: 0 }}>{bug.description}</p>
                )}

                {/* Status cycle */}
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  {["open", "in-progress", "resolved"].map(s => (
                    <button key={s} onClick={() => updateStatus(bug, s)} style={{ padding: "4px 10px", borderRadius: "2px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--font-jetbrains)", background: bug.status === s ? `${STATUS_COLORS[s]}20` : "transparent", border: `1px solid ${bug.status === s ? STATUS_COLORS[s] : "var(--border2)"}`, color: bug.status === s ? STATUS_COLORS[s] : "var(--muted)" }}>{s}</button>
                  ))}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setEditingBug(bug)} style={{ fontSize: "10px", color: "var(--cyan)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-jetbrains)", padding: 0 }}>✎ EDIT</button>
                  <button onClick={() => deleteBug(bug.id)} style={{ fontSize: "10px", color: "var(--muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-jetbrains)", padding: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--red)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--muted)"}
                  >✕ DELETE</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: collapsed ? "none" : "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div onClick={() => setCollapsed(c => !c)} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
          <span style={{ color: "var(--muted)", fontSize: "10px" }}>{collapsed ? "▶" : "▼"}</span>
          <span style={{ fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", color: "#ff3b5c" }}>BUGS</span>
          {openBugs.length > 0 && (
            <span style={{ fontSize: "10px", padding: "1px 7px", borderRadius: "2px", background: "rgba(255,59,92,0.1)", border: "1px solid rgba(255,59,92,0.25)", color: "#ff3b5c", fontFamily: "var(--font-jetbrains)", fontWeight: 700 }}>{openBugs.length} open</span>
          )}
        </div>
        {!collapsed && (
          <button onClick={() => { setAdding(a => !a); }} style={{ background: "none", border: "1px solid rgba(255,59,92,0.3)", color: "#ff3b5c", fontFamily: "var(--font-jetbrains)", fontSize: "10px", letterSpacing: "1px", padding: "4px 10px", borderRadius: "2px", cursor: "pointer" }}>
            {adding ? "CANCEL" : "+ BUG"}
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          {/* Add bug form */}
          {adding && (
            <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", flexDirection: "column", gap: "8px" }}>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Bug title..." autoFocus style={inputStyle} />
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Description (optional)..." rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />

              {/* Severity */}
              <div style={{ fontSize: "9px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "2px" }}>Severity</div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {["critical", "high", "normal", "low"].map(s => (
                  <button key={s} onClick={() => setNewSeverity(s)} style={{ padding: "5px 10px", borderRadius: "2px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--font-jetbrains)", background: newSeverity === s ? `${SEVERITY_COLORS[s]}20` : "transparent", border: `1px solid ${newSeverity === s ? SEVERITY_COLORS[s] : "var(--border2)"}`, color: newSeverity === s ? SEVERITY_COLORS[s] : "var(--muted)" }}>{s}</button>
                ))}
              </div>

              {/* Reported by */}
              <div style={{ fontSize: "9px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "2px" }}>Reported by</div>
              <div style={{ display: "flex", borderRadius: "2px", overflow: "hidden", border: "1px solid var(--border2)" }}>
                <button onClick={() => setNewReportedBy("self")} style={{ flex: 1, padding: "6px", background: newReportedBy === "self" ? "var(--cyan-dim)" : "transparent", border: "none", color: newReportedBy === "self" ? "var(--cyan)" : "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", cursor: "pointer" }}>🔧 Me</button>
                <button onClick={() => setNewReportedBy("user")} style={{ flex: 1, padding: "6px", background: newReportedBy === "user" ? "var(--cyan-dim)" : "transparent", border: "none", color: newReportedBy === "user" ? "var(--cyan)" : "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", cursor: "pointer" }}>👤 User</button>
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={addBug} disabled={!newTitle.trim() || saving} style={{ flex: 1, padding: "8px", background: "rgba(255,59,92,0.1)", border: "1px solid rgba(255,59,92,0.3)", color: "#ff3b5c", fontFamily: "var(--font-jetbrains)", fontSize: "11px", cursor: "pointer", borderRadius: "2px", opacity: (!newTitle.trim() || saving) ? 0.5 : 1 }}>
                  {saving ? "SAVING..." : "LOG BUG"}
                </button>
                <button onClick={() => { setAdding(false); setNewTitle(""); setNewDesc(""); }} style={{ padding: "8px 12px", background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", cursor: "pointer", borderRadius: "2px" }}>✕</button>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ padding: "20px", textAlign: "center", fontSize: "11px", color: "var(--muted)" }}>Loading...</div>
          ) : bugs.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", fontSize: "11px", color: "var(--muted)" }}>No bugs logged. Hit + BUG to report one.</div>
          ) : (
            <div>
              {/* Open bugs */}
              {openBugs.length > 0 && openBugs.map(bug => <BugRow key={bug.id} bug={bug} />)}

              {/* Resolved bugs — collapsed by default */}
              {resolvedBugs.length > 0 && (
                <ResolvedSection bugs={resolvedBugs} BugRow={BugRow} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ResolvedSection({ bugs, BugRow }: { bugs: Bug[]; BugRow: React.ComponentType<{ bug: Bug }> }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div onClick={() => setOpen(o => !o)} style={{ padding: "8px 20px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", borderTop: "1px solid var(--border)" }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
      >
        <span style={{ fontSize: "8px", color: "var(--muted)" }}>{open ? "▼" : "▶"}</span>
        <span style={{ fontSize: "9px", color: "var(--green)", fontFamily: "var(--font-jetbrains)", fontWeight: 700, letterSpacing: "1px" }}>RESOLVED</span>
        <span style={{ fontSize: "9px", color: "var(--muted)" }}>{bugs.length}</span>
      </div>
      {open && bugs.map(bug => <BugRow key={bug.id} bug={bug} />)}
    </div>
  );
}