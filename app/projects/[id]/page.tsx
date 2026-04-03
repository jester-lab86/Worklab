"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Project, Version, Feature, TechCategory } from "@/types";

function uid() { return Math.random().toString(36).slice(2, 9); }

function getPct(versions: Version[]): number {
  if (!versions || versions.length === 0) return 0;
  const allPhases = versions.flatMap(v => v.phases || []);
  if (allPhases.length === 0) return 0;
  const done = allPhases.filter(p => p.completed).length;
  return Math.round((done / allPhases.length) * 100);
}

function getVersionStatus(v: Version): Version["status"] {
  const allPhases = v.phases || [];
  const allFeatures = v.features || [];
  const total = allPhases.length + allFeatures.length;
  if (total === 0) return v.status;
  const donePhasesCount = allPhases.filter(p => p.completed).length;
  const doneFeaturesCount = allFeatures.filter(f => f.status === "complete").length;
  const done = donePhasesCount + doneFeaturesCount;
  if (done === 0) return "planned";
  if (done === total) return "complete";
  return "in-progress";
}

function sortVersions(versions: Version[]): Version[] {
  return [...versions].sort((a, b) => parseFloat(a.number) - parseFloat(b.number));
}

// A task object — replaces plain strings
interface Task {
  id: string;
  description: string;
  featureId: string | null; // null = unassigned
  done: boolean;
}

// Normalize still_to_complete: old plain strings → Task objects
function normalizeTasks(raw: (string | Task)[]): Task[] {
  return raw.map(item => {
    if (typeof item === "string") {
      // Try to parse strings that are actually serialized JSON objects
      try {
        const parsed = JSON.parse(item);
        if (parsed && typeof parsed === "object" && "description" in parsed) {
          return {
            id: parsed.id || uid(),
            description: parsed.description,
            featureId: parsed.featureId ?? null,
            done: parsed.done ?? false,
          };
        }
      } catch {}
      // Plain string (old format)
      const done = item.startsWith("✓ ");
      return { id: uid(), description: done ? item.slice(2) : item, featureId: null, done };
    }
    return item as Task;
  });
}

// Build a flat list of all features across all versions for the dropdown
function getAllFeatures(versions: Version[]): { versionNumber: string; versionTitle: string; featureId: string; featureName: string }[] {
  const result: { versionNumber: string; versionTitle: string; featureId: string; featureName: string }[] = [];
  for (const v of versions) {
    for (const f of v.features || []) {
      result.push({ versionNumber: v.number, versionTitle: v.title, featureId: f.id, featureName: f.name });
    }
  }
  return result;
}

const STATUS_COLORS: Record<string, string> = {
  concept: "var(--purple)",
  building: "var(--amber)",
  launched: "var(--green)",
};

const FEATURE_STATUS_COLORS: Record<string, string> = {
  complete: "var(--green)",
  "in-progress": "var(--cyan)",
  planned: "var(--muted)",
};

const VERSION_STATUS_COLORS: Record<string, string> = {
  complete: "var(--green)",
  "in-progress": "var(--cyan)",
  planned: "var(--muted)",
};

export default function ProjectDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [notes, setNotes] = useState("");
  const [blockers, setBlockers] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});
  const [addingFeature, setAddingFeature] = useState<string | null>(null);
  const [addingPhase, setAddingPhase] = useState<string | null>(null);
  const [newFeatureName, setNewFeatureName] = useState("");
  const [newFeatureStatus, setNewFeatureStatus] = useState<Feature["status"]>("planned");
  const [newPhaseName, setNewPhaseName] = useState("");
  const [addingVersion, setAddingVersion] = useState(false);
  const [newVersionNumber, setNewVersionNumber] = useState("");
  const [newVersionTitle, setNewVersionTitle] = useState("");

  // Task state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskFeatureId, setNewTaskFeatureId] = useState<string>("unassigned");

  // Drag state
  const dragItem = useRef<{ featureId: string | null; index: number } | null>(null);
  const dragOverItem = useRef<{ featureId: string | null; index: number } | null>(null);

  const [editingStatus, setEditingStatus] = useState(false);
  const [editingSummary, setEditingSummary] = useState(false);
  const [summary, setSummary] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editingVersion, setEditingVersion] = useState(false);
  const [editingProgress, setEditingProgress] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [versionVal, setVersionVal] = useState("");
  const [progressVal, setProgressVal] = useState("");
  const [newTechCategory, setNewTechCategory] = useState("");
  const [newTechItem, setNewTechItem] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
const [editingTechStack, setEditingTechStack] = useState(false);
const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
const [tasksCollapsed, setTasksCollapsed] = useState(false);
const [taskFilter, setTaskFilter] = useState<"all" | "incomplete">("incomplete");

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => r.json())
      .then(data => {
        if (typeof data.versions === "string") data.versions = JSON.parse(data.versions);
        if (typeof data.tech_stack_grouped === "string") data.tech_stack_grouped = JSON.parse(data.tech_stack_grouped);
        if (typeof data.phases === "string") data.phases = JSON.parse(data.phases);
        setProject(data);
        setNotes(data.notes || "");
        setBlockers(data.blockers || "");
        setSummary(data.description || "");
        setNameVal(data.name || "");
        setVersionVal(data.version || "");
        setProgressVal(data.current_progress || "");
        // Normalize tasks from DB
        const raw = Array.isArray(data.still_to_complete) ? data.still_to_complete : [];
        setTasks(normalizeTasks(raw));
        if (data.versions?.length > 0) {
          setExpandedVersions({ [data.versions[0].id]: true });
        }
      });
  }, [id]);

  async function patchProject(updated: Project, updatedTasks?: Task[]) {
    const tasksToSave = updatedTasks !== undefined ? updatedTasks : tasks;
    const projectWithTasks = {
      ...updated,
      still_to_complete: tasksToSave,
      tech_stack_grouped: updated.tech_stack_grouped || [],
      versions: updated.versions || [],
      phases: updated.phases || [],
    };
    setProject(updated);
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectWithTasks),
    });
  }

 async function saveTasks(updatedTasks: Task[]) {
    if (!project) return;
    const snapshot = project;
    setTasks(updatedTasks);
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...snapshot,
        still_to_complete: updatedTasks,
        tech_stack_grouped: snapshot.tech_stack_grouped || [],
        versions: snapshot.versions || [],
        phases: snapshot.phases || [],
      }),
    });
  }

  async function saveNotes() {
    if (!project) return;
    setSaving(true);
    await patchProject({ ...project, notes, blockers });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleVersion(vid: string) {
    setExpandedVersions(prev => ({ ...prev, [vid]: !prev[vid] }));
  }

  async function togglePhase(vid: string, pid: string) {
    if (!project) return;
    const updated = {
      ...project,
      versions: project.versions.map(v =>
        v.id === vid ? { ...v, phases: v.phases.map(p => p.id === pid ? { ...p, completed: !p.completed } : p) } : v
      ),
    };
    await patchProject(updated);
  }

  async function toggleFeatureStatus(vid: string, fid: string) {
    if (!project) return;
    const cycle: Feature["status"][] = ["planned", "in-progress", "complete"];
    const updated = {
      ...project,
      versions: project.versions.map(v =>
        v.id === vid ? {
          ...v, features: v.features.map(f => {
            if (f.id !== fid) return f;
            return { ...f, status: cycle[(cycle.indexOf(f.status) + 1) % cycle.length] };
          })
        } : v
      ),
    };
    await patchProject(updated);
  }

  async function addFeature(vid: string) {
    if (!project || !newFeatureName.trim()) return;
    const updated = {
      ...project,
      versions: project.versions.map(v =>
        v.id === vid ? { ...v, features: [...v.features, { id: uid(), name: newFeatureName.trim(), status: newFeatureStatus }] } : v
      ),
    };
    await patchProject(updated);
    setNewFeatureName(""); setNewFeatureStatus("planned"); setAddingFeature(null);
  }

  async function deleteFeature(vid: string, fid: string) {
    if (!project) return;
    // Also unassign tasks linked to this feature
    const updatedTasks = tasks.map(t => t.featureId === fid ? { ...t, featureId: null } : t);
    await patchProject({ ...project, versions: project.versions.map(v => v.id === vid ? { ...v, features: v.features.filter(f => f.id !== fid) } : v) }, updatedTasks);
    setTasks(updatedTasks);
  }

  async function addPhase(vid: string) {
    if (!project || !newPhaseName.trim()) return;
    const updated = {
      ...project,
      versions: project.versions.map(v =>
        v.id === vid ? { ...v, phases: [...v.phases, { id: uid(), title: newPhaseName.trim(), completed: false }] } : v
      ),
    };
    await patchProject(updated);
    setNewPhaseName(""); setAddingPhase(null);
  }

  async function deletePhase(vid: string, pid: string) {
    if (!project) return;
    await patchProject({ ...project, versions: project.versions.map(v => v.id === vid ? { ...v, phases: v.phases.filter(p => p.id !== pid) } : v) });
  }

  async function addVersion() {
    if (!project || !newVersionNumber.trim()) return;
    const newV = { id: uid(), number: newVersionNumber.trim(), title: newVersionTitle.trim() || `Version ${newVersionNumber.trim()}`, status: "planned" as const, features: [], phases: [] };
    const updated = { ...project, versions: [...(project.versions || []), newV] };
    await patchProject(updated);
    setNewVersionNumber(""); setNewVersionTitle(""); setAddingVersion(false);
    setExpandedVersions(prev => ({ ...prev, [newV.id]: true }));
  }

  async function addTask() {
    if (!newTaskDesc.trim()) return;
    const featureId = newTaskFeatureId === "unassigned" ? null : newTaskFeatureId;
    const newTask: Task = { id: uid(), description: newTaskDesc.trim(), featureId, done: false };
    const updated = [...tasks, newTask];
    await saveTasks(updated);
    setNewTaskDesc(""); setNewTaskFeatureId("unassigned"); setAddingTask(false);
  }

  async function toggleTask(taskId: string) {
    const updated = tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t);
    await saveTasks(updated);
  }

  async function deleteTask(taskId: string) {
    const updated = tasks.filter(t => t.id !== taskId);
    await saveTasks(updated);
  }

  // Drag handlers — reorder within a feature group
  function handleDragStart(featureId: string | null, index: number) {
    dragItem.current = { featureId, index };
  }

  function handleDragEnter(featureId: string | null, index: number) {
    dragOverItem.current = { featureId, index };
  }

  async function handleDragEnd() {
    if (!dragItem.current || !dragOverItem.current) return;
    const { featureId: fromFeature, index: fromIndex } = dragItem.current;
    const { featureId: toFeature, index: toIndex } = dragOverItem.current;

    // Only reorder within the same group
    if (fromFeature !== toFeature) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    // Get tasks for this group, reorder, then reassemble full list
    const groupTasks = tasks.filter(t => t.featureId === fromFeature);
    const otherTasks = tasks.filter(t => t.featureId !== fromFeature);
    const reordered = [...groupTasks];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    // Reassemble: keep non-group tasks in their original relative positions
    // We rebuild the full array maintaining order of groups
    const allFeatureIds = [...new Set(tasks.map(t => t.featureId))];
    const newTasks: Task[] = [];
    for (const fid of allFeatureIds) {
      if (fid === fromFeature) {
        newTasks.push(...reordered);
      } else {
        newTasks.push(...tasks.filter(t => t.featureId === fid));
      }
    }

    dragItem.current = null;
    dragOverItem.current = null;
    await saveTasks(newTasks);
  }

  async function addTechItem() {
    if (!project || !newTechItem.trim() || !selectedCategory) return;
    const grouped = [...(project.tech_stack_grouped || [])];
    const idx = grouped.findIndex(c => c.category === selectedCategory);
    if (idx !== -1) {
      grouped[idx] = { ...grouped[idx], items: [...grouped[idx].items, newTechItem.trim()] };
    } else {
      grouped.push({ category: selectedCategory, items: [newTechItem.trim()] });
    }
    const flat = grouped.flatMap(c => c.items);
    await patchProject({ ...project, tech_stack_grouped: grouped, tech_stack: flat });
    setNewTechItem("");
  }

  async function addTechCategory() {
    if (!project || !newTechCategory.trim()) return;
    const grouped = [...(project.tech_stack_grouped || [])];
    if (!grouped.find(c => c.category === newTechCategory.trim())) {
      grouped.push({ category: newTechCategory.trim(), items: [] });
      await patchProject({ ...project, tech_stack_grouped: grouped });
    }
    setSelectedCategory(newTechCategory.trim());
    setNewTechCategory("");
  }

  async function deleteTechItem(category: string, item: string) {
    if (!project) return;
    const grouped = project.tech_stack_grouped.map(c =>
      c.category === category ? { ...c, items: c.items.filter(i => i !== item) } : c
    ).filter(c => c.items.length > 0);
    const flat = grouped.flatMap(c => c.items);
    await patchProject({ ...project, tech_stack_grouped: grouped, tech_stack: flat });
  }

  if (!project) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--muted)", letterSpacing: "2px", fontSize: "12px" }}>LOADING...</div>
    </div>
  );

  const pct = getPct(project.versions || []);
  const allPhases = (project.versions || []).flatMap(v => v.phases || []);
  const completedPhases = allPhases.filter(p => p.completed).length;
  const allFeatures = (project.versions || []).flatMap(v => v.features || []);
  const completedFeatures = allFeatures.filter(f => f.status === "complete").length;
  const statusColor = STATUS_COLORS[project.status] || "var(--cyan)";

  // Build grouped task view: Version → Features → Tasks
  // Structure: { versionId, versionNumber, versionTitle, features: [{ featureId, featureName, tasks }] }
  const allFeaturesFlat = getAllFeatures(project.versions || []);

  // Build groups for display
  const groupedForDisplay: {
    versionNumber: string;
    versionTitle: string;
    features: { featureId: string | null; featureName: string; tasks: Task[] }[];
  }[] = [];

  for (const v of sortVersions(project.versions || [])) {
    const versionFeatures: { featureId: string | null; featureName: string; tasks: Task[] }[] = [];
    for (const f of v.features || []) {
      const featureTasks = tasks.filter(t => t.featureId === f.id);
      if (featureTasks.length > 0) {
        versionFeatures.push({ featureId: f.id, featureName: f.name, tasks: featureTasks });
      }
    }
    if (versionFeatures.length > 0) {
      groupedForDisplay.push({ versionNumber: v.number, versionTitle: v.title, features: versionFeatures });
    }
  }

  // Unassigned tasks
  const unassignedTasks = tasks.filter(t => t.featureId === null);
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.done).length;

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", background: "var(--bg)" }}>

      {/* TOP BAR */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", height: "56px", borderBottom: "1px solid var(--border)",
        background: "rgba(6,10,16,0.9)", backdropFilter: "blur(12px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontFamily: "var(--font-jetbrains)", fontSize: "11px", letterSpacing: "1px" }}>
            ← ALL PROJECTS
          </button>
          <div style={{ width: "1px", height: "20px", background: "var(--border)" }} />
          {editingName ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input value={nameVal} onChange={e => setNameVal(e.target.value)}
                style={{ background: "var(--surface2)", border: "1px solid rgba(0,212,255,0.4)", color: "var(--text)", fontFamily: "var(--font-syne)", fontSize: "14px", fontWeight: 700, padding: "4px 8px", borderRadius: "2px", outline: "none" }} />
              <button onClick={async () => { await patchProject({ ...project, name: nameVal }); setEditingName(false); }}
                style={{ background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", padding: "4px 8px", borderRadius: "2px", cursor: "pointer" }}>SAVE</button>
              <button onClick={() => setEditingName(false)}
                style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", padding: "4px 8px", borderRadius: "2px", cursor: "pointer" }}>✕</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontFamily: "var(--font-syne)", fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>{project.name}</span>
              <button onClick={() => setEditingName(true)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "10px", fontFamily: "var(--font-jetbrains)" }}>✎</button>
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {editingVersion ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <input value={versionVal} onChange={e => setVersionVal(e.target.value)}
                style={{ background: "var(--surface2)", border: "1px solid rgba(0,212,255,0.4)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "3px 8px", borderRadius: "2px", outline: "none", width: "80px" }} />
              <button onClick={async () => { await patchProject({ ...project, version: versionVal }); setEditingVersion(false); }}
                style={{ background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", padding: "3px 8px", borderRadius: "2px", cursor: "pointer" }}>SAVE</button>
              <button onClick={() => setEditingVersion(false)}
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "12px" }}>✕</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>v{project.version}</span>
              <button onClick={() => setEditingVersion(true)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "10px" }}>✎</button>
            </div>
          )}
          <div style={{ position: "relative" }}>
            <button onClick={() => setEditingStatus(!editingStatus)} style={{
              padding: "4px 12px", borderRadius: "2px", fontSize: "10px", fontWeight: 700,
              letterSpacing: "1px", textTransform: "uppercase", fontFamily: "var(--font-syne)",
              background: `${statusColor}18`, border: `1px solid ${statusColor}40`, color: statusColor, cursor: "pointer",
            }}>
              {project.status} ▾
            </button>
            {editingStatus && (
              <div style={{ position: "absolute", top: "32px", right: 0, background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: "4px", overflow: "hidden", zIndex: 200, minWidth: "140px" }}>
                {(["concept", "building", "launched"] as const).map(s => (
                  <button key={s} onClick={async () => { await patchProject({ ...project, status: s }); setEditingStatus(false); }}
                    style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", background: project.status === s ? "var(--cyan-dim)" : "transparent", border: "none", color: project.status === s ? "var(--cyan)" : "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", cursor: "pointer" }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>

        {/* KPI ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
          {[
            { label: "Overall Progress", value: `${pct}%`, color: "var(--cyan)", sub: `${completedPhases} of ${allPhases.length} phases` },
            { label: "Features Complete", value: `${completedFeatures}/${allFeatures.length}`, color: "var(--green)", sub: "across all versions" },
            { label: "Versions", value: project.versions?.length || 0, color: "var(--purple)", sub: "milestones" },
            { label: "Tech Stack", value: project.tech_stack?.length || 0, color: "var(--amber)", sub: "technologies" },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", padding: "20px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${kpi.color}, transparent)` }} />
              <div style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>{kpi.label}</div>
              <div style={{ fontFamily: "var(--font-syne)", fontSize: "32px", fontWeight: 800, color: kpi.color, lineHeight: 1, marginBottom: "4px" }}>{kpi.value}</div>
              <div style={{ fontSize: "10px", color: "var(--muted)" }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* PROGRESS BAR */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", padding: "20px", marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{ fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 700, letterSpacing: "1px" }}>OVERALL PROGRESS</span>
            <span style={{ fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 800, color: "var(--cyan)" }}>{pct}%</span>
          </div>
          <div style={{ background: "var(--surface3)", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
            <div style={{ height: "100%", background: "linear-gradient(90deg, var(--cyan), var(--purple))", width: `${pct}%`, transition: "width 0.5s ease", borderRadius: "3px" }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px" }}>

          {/* LEFT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* EXECUTIVE SUMMARY */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", color: "var(--cyan)" }}>EXECUTIVE SUMMARY</span>
                <button onClick={() => setEditingSummary(!editingSummary)} style={{ background: "none", border: "none", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", cursor: "pointer", letterSpacing: "1px" }}>
                  {editingSummary ? "CANCEL" : "EDIT"}
                </button>
              </div>
              <div style={{ padding: "16px 20px" }}>
                {editingSummary ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={4}
                      style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "2px", padding: "10px 12px", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "12px", outline: "none", resize: "vertical", lineHeight: 1.6 }} />
                    <button onClick={async () => { await patchProject({ ...project, description: summary }); setEditingSummary(false); }}
                      style={{ alignSelf: "flex-start", padding: "6px 16px", background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", cursor: "pointer", borderRadius: "2px" }}>SAVE</button>
                  </div>
                ) : (
                  <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.8 }}>{project.description || "No description yet."}</p>
                )}
              </div>
            </div>

            {/* TECH STACK */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", color: "var(--purple)" }}>TECH STACK</span>
                <button onClick={() => setEditingTechStack(!editingTechStack)} style={{ background: "none", border: "none", color: "var(--purple)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", cursor: "pointer", letterSpacing: "1px" }}>
                  {editingTechStack ? "DONE" : "EDIT"}
                </button>
              </div>
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {(project.tech_stack_grouped || []).map((cat, i) => (
                  <div key={i}>
                    <div style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>{cat.category}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {cat.items.map((item, j) => (
                        <span key={j} style={{ padding: "4px 10px", borderRadius: "2px", fontSize: "11px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", color: "var(--purple)", display: "flex", alignItems: "center", gap: "6px" }}>
                          {item}
                          {editingTechStack && (
                            <button onClick={() => deleteTechItem(cat.category, item)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "10px", padding: 0, lineHeight: 1 }}>✕</button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {editingTechStack && (
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "4px" }}>Add Technology</div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
                        style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: selectedCategory ? "var(--text)" : "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 8px", borderRadius: "2px", outline: "none" }}>
                        <option value="">Select category</option>
                        {(project.tech_stack_grouped || []).map(c => <option key={c.category} value={c.category}>{c.category}</option>)}
                      </select>
                      <input value={newTechItem} onChange={e => setNewTechItem(e.target.value)} placeholder="Technology name"
                        onKeyDown={e => e.key === "Enter" && addTechItem()}
                        style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 10px", borderRadius: "2px", outline: "none", flex: 1 }} />
                      <button onClick={addTechItem} style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", color: "var(--purple)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 10px", borderRadius: "2px", cursor: "pointer" }}>Add</button>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input value={newTechCategory} onChange={e => setNewTechCategory(e.target.value)} placeholder="Or add new category..."
                        onKeyDown={e => e.key === "Enter" && addTechCategory()}
                        style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 10px", borderRadius: "2px", outline: "none", flex: 1 }} />
                      <button onClick={addTechCategory} style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 10px", borderRadius: "2px", cursor: "pointer" }}>+ Category</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* VERSIONS & ROADMAP */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", color: "var(--cyan)" }}>VERSIONS & ROADMAP</span>
                <button onClick={() => setAddingVersion(true)} style={{ background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.2)", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", letterSpacing: "1px", padding: "4px 10px", borderRadius: "2px", cursor: "pointer" }}>+ VERSION</button>
              </div>

              {addingVersion && (
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <input value={newVersionNumber} onChange={e => setNewVersionNumber(e.target.value)} placeholder="e.g. 2.0"
                    style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "12px", padding: "6px 10px", borderRadius: "2px", outline: "none", width: "80px" }} />
                  <input value={newVersionTitle} onChange={e => setNewVersionTitle(e.target.value)} placeholder="Title e.g. User Accounts"
                    style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "12px", padding: "6px 10px", borderRadius: "2px", outline: "none", flex: 1 }} />
                  <button onClick={addVersion} style={{ background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 12px", borderRadius: "2px", cursor: "pointer" }}>Add</button>
                  <button onClick={() => setAddingVersion(false)} style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 12px", borderRadius: "2px", cursor: "pointer" }}>Cancel</button>
                </div>
              )}

              {sortVersions(project.versions || []).map(v => {
                const expanded = expandedVersions[v.id];
                const computedStatus = getVersionStatus(v);
                const vPct = v.phases?.length > 0 ? Math.round(v.phases.filter(p => p.completed).length / v.phases.length * 100) : 0;
                const vColor = VERSION_STATUS_COLORS[computedStatus] || "var(--muted)";
                return (
                  <div key={v.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <div onClick={() => toggleVersion(v.id)} style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", background: expanded ? "var(--surface2)" : "transparent", transition: "background 0.2s" }}>
                      <span style={{ color: "var(--muted)", fontSize: "12px" }}>{expanded ? "▼" : "▶"}</span>
                      <span style={{ fontFamily: "var(--font-syne)", fontSize: "14px", fontWeight: 700, color: "var(--text)", flex: 1 }}>v{v.number} — {v.title}</span>
                      <span style={{ fontSize: "9px", padding: "2px 8px", borderRadius: "2px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", background: `${vColor}18`, border: `1px solid ${vColor}40`, color: vColor }}>{computedStatus}</span>
                      <span style={{ fontFamily: "var(--font-syne)", fontSize: "14px", fontWeight: 800, color: vColor, minWidth: "40px", textAlign: "right" }}>{vPct}%</span>
                    </div>

                    {expanded && (
                      <div style={{ padding: "0 20px 16px" }}>
                        {/* Features */}
                        <div style={{ marginTop: "12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <span style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase" }}>Features</span>
                            <button onClick={() => setAddingFeature(v.id)} style={{ background: "none", border: "none", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", cursor: "pointer", letterSpacing: "1px" }}>+ ADD</button>
                          </div>
                          {addingFeature === v.id && (
                            <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
                              <input value={newFeatureName} onChange={e => setNewFeatureName(e.target.value)} placeholder="Feature name" onKeyDown={e => e.key === "Enter" && addFeature(v.id)}
                                style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "12px", padding: "6px 10px", borderRadius: "2px", outline: "none", flex: 1 }} />
                              <select value={newFeatureStatus} onChange={e => setNewFeatureStatus(e.target.value as Feature["status"])}
                                style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 8px", borderRadius: "2px", outline: "none" }}>
                                <option value="planned">Planned</option>
                                <option value="in-progress">In Progress</option>
                                <option value="complete">Complete</option>
                              </select>
                              <button onClick={() => addFeature(v.id)} style={{ background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 10px", borderRadius: "2px", cursor: "pointer" }}>Add</button>
                              <button onClick={() => setAddingFeature(null)} style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 10px", borderRadius: "2px", cursor: "pointer" }}>✕</button>
                            </div>
                          )}
                          {v.features?.map(f => (
                            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                              <button onClick={() => toggleFeatureStatus(v.id, f.id)} style={{ fontSize: "9px", padding: "2px 8px", borderRadius: "2px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", cursor: "pointer", background: `${FEATURE_STATUS_COLORS[f.status]}18`, border: `1px solid ${FEATURE_STATUS_COLORS[f.status]}40`, color: FEATURE_STATUS_COLORS[f.status], fontFamily: "var(--font-jetbrains)", minWidth: "80px", textAlign: "center" }}>
                                {f.status}
                              </button>
                              <span style={{ fontSize: "12px", color: f.status === "complete" ? "var(--muted)" : "var(--text)", textDecoration: f.status === "complete" ? "line-through" : "none", flex: 1 }}>{f.name}</span>
                              <button onClick={() => deleteFeature(v.id, f.id)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "12px", padding: "0 4px" }}>✕</button>
                            </div>
                          ))}
                        </div>

                        {/* Phases */}
                        <div style={{ marginTop: "16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <span style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase" }}>Phases</span>
                            <button onClick={() => setAddingPhase(v.id)} style={{ background: "none", border: "none", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", cursor: "pointer", letterSpacing: "1px" }}>+ ADD</button>
                          </div>
                          {addingPhase === v.id && (
                            <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                              <input value={newPhaseName} onChange={e => setNewPhaseName(e.target.value)} placeholder="Phase name" onKeyDown={e => e.key === "Enter" && addPhase(v.id)}
                                style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "12px", padding: "6px 10px", borderRadius: "2px", outline: "none", flex: 1 }} />
                              <button onClick={() => addPhase(v.id)} style={{ background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 10px", borderRadius: "2px", cursor: "pointer" }}>Add</button>
                              <button onClick={() => setAddingPhase(null)} style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 10px", borderRadius: "2px", cursor: "pointer" }}>✕</button>
                            </div>
                          )}
                          {v.phases?.map((phase, i) => (
                            <div key={phase.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                              <span style={{ fontSize: "10px", color: "var(--muted)", minWidth: "20px" }}>{String(i + 1).padStart(2, "0")}</span>
                              <div onClick={() => togglePhase(v.id, phase.id)} style={{ width: "18px", height: "18px", minWidth: "18px", borderRadius: "2px", border: phase.completed ? "2px solid var(--green)" : "2px solid var(--border2)", background: phase.completed ? "var(--green)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#fff", cursor: "pointer", transition: "all 0.2s" }}>
                                {phase.completed ? "✓" : ""}
                              </div>
                              <span style={{ fontSize: "12px", fontFamily: "var(--font-syne)", fontWeight: 600, flex: 1, color: phase.completed ? "var(--muted)" : "var(--text)", textDecoration: phase.completed ? "line-through" : "none" }}>{phase.title}</span>
                              <button onClick={() => deletePhase(v.id, phase.id)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "12px", padding: "0 4px" }}>✕</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* CURRENT PROGRESS */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", color: "var(--green)" }}>CURRENT PROGRESS</span>
                <button onClick={() => setEditingProgress(!editingProgress)} style={{ background: "none", border: "none", color: "var(--green)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", cursor: "pointer", letterSpacing: "1px" }}>
                  {editingProgress ? "CANCEL" : "EDIT"}
                </button>
              </div>
              <div style={{ padding: "16px 20px" }}>
                {editingProgress ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <textarea value={progressVal} onChange={e => setProgressVal(e.target.value)} rows={5}
                      style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "2px", padding: "10px 12px", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "12px", outline: "none", resize: "vertical", lineHeight: 1.6 }} />
                    <button onClick={async () => { await patchProject({ ...project, current_progress: progressVal }); setEditingProgress(false); }}
                      style={{ alignSelf: "flex-start", padding: "6px 16px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "var(--green)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", cursor: "pointer", borderRadius: "2px" }}>SAVE</button>
                  </div>
                ) : (
                  <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.8 }}>
                    {project.current_progress || "No progress notes yet. Click EDIT to add."}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* ── STILL TO COMPLETE ── */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>

              {/* Header */}
              <div style={{ padding: "14px 20px", borderBottom: tasksCollapsed ? "none" : "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div onClick={() => setTasksCollapsed(p => !p)} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", flex: 1 }}>
                  <span style={{ color: "var(--muted)", fontSize: "10px" }}>{tasksCollapsed ? "▶" : "▼"}</span>
                  <span style={{ fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 700, letterSpacing: "1px" }}>STILL TO COMPLETE</span>
                  {totalTasks > 0 && (
                    <span style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)" }}>{doneTasks}/{totalTasks}</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {/* Filter toggle */}
                  <div style={{ display: "flex", borderRadius: "2px", overflow: "hidden", border: "1px solid var(--border2)" }}>
                    <button onClick={() => setTaskFilter("incomplete")} style={{ padding: "3px 8px", background: taskFilter === "incomplete" ? "var(--cyan-dim)" : "transparent", border: "none", color: taskFilter === "incomplete" ? "var(--cyan)" : "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "9px", cursor: "pointer", letterSpacing: "0.5px" }}>OPEN</button>
                    <button onClick={() => setTaskFilter("all")} style={{ padding: "3px 8px", background: taskFilter === "all" ? "var(--cyan-dim)" : "transparent", border: "none", color: taskFilter === "all" ? "var(--cyan)" : "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "9px", cursor: "pointer", letterSpacing: "0.5px" }}>ALL</button>
                  </div>
                  <button onClick={() => { setAddingTask(true); setNewTaskFeatureId("unassigned"); }}
                    style={{ background: "none", border: "none", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", cursor: "pointer", letterSpacing: "1px" }}>
                    + ADD
                  </button>
                </div>
              </div>

             {/* Add Task Form */}
              {!tasksCollapsed && addingTask && (
                <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input
                    value={newTaskDesc}
                    onChange={e => setNewTaskDesc(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addTask()}
                    placeholder="Task description..."
                    autoFocus
                    style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "12px", padding: "7px 10px", borderRadius: "2px", outline: "none" }}
                  />
                  <select
                    value={newTaskFeatureId}
                    onChange={e => setNewTaskFeatureId(e.target.value)}
                    style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: newTaskFeatureId !== "unassigned" ? "var(--text)" : "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "7px 8px", borderRadius: "2px", outline: "none" }}
                  >
                    <option value="unassigned">— No feature (Unassigned) —</option>
                    {sortVersions(project.versions || []).map(v => (
                      <optgroup key={v.id} label={`v${v.number} — ${v.title}`}>
                        {(v.features || []).map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={addTask} style={{ flex: 1, background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px", borderRadius: "2px", cursor: "pointer" }}>ADD</button>
                    <button onClick={() => { setAddingTask(false); setNewTaskDesc(""); }} style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 10px", borderRadius: "2px", cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              )}

              {/* Task Groups */}
              {!tasksCollapsed && <div style={{ padding: "8px 0" }}>

                {/* Version-grouped features */}
                {groupedForDisplay.map(vGroup => (
                  <div key={vGroup.versionNumber}>
                    {/* Version header */}
                    <div style={{ padding: "8px 20px 4px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "9px", fontFamily: "var(--font-jetbrains)", fontWeight: 700, letterSpacing: "1.5px", color: "var(--cyan)", textTransform: "uppercase" }}>v{vGroup.versionNumber}</span>
                      <span style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)" }}>{vGroup.versionTitle}</span>
                      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                    </div>

                    {vGroup.features.map(fGroup => (
                      <div key={fGroup.featureId} style={{ marginBottom: "4px" }}>
                        {/* Feature sub-header */}
                        <div style={{ padding: "5px 20px 4px 28px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", letterSpacing: "0.5px" }}>◆ {fGroup.featureName}</span>
                          <div style={{ flex: 1, height: "1px", background: "var(--border)", opacity: 0.5 }} />
                          <span style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)" }}>{fGroup.tasks.filter(t => t.done).length}/{fGroup.tasks.length}</span>
                        </div>

                        {/* Tasks in this feature group */}
                        {fGroup.tasks.filter(t => taskFilter === "all" || !t.done).map((task, taskIdx) => (
                          <div key={task.id}>
  <div
    draggable
    onDragStart={() => handleDragStart(fGroup.featureId, taskIdx)}
    onDragEnter={() => handleDragEnter(fGroup.featureId, taskIdx)}
    onDragEnd={handleDragEnd}
    onDragOver={e => e.preventDefault()}
    style={{
      display: "flex", alignItems: "center", gap: "8px",
      padding: "7px 20px 7px 28px",
      borderBottom: editingTaskId === task.id ? "none" : "1px solid var(--border)",
      cursor: "grab",
      transition: "background 0.15s",
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
  >
    <span style={{ color: "var(--border2)", fontSize: "10px", cursor: "grab", userSelect: "none", flexShrink: 0 }}>⠿</span>
    <div
      onClick={() => toggleTask(task.id)}
      style={{
        width: "15px", height: "15px", minWidth: "15px", borderRadius: "2px",
        border: task.done ? "2px solid var(--cyan)" : "2px solid var(--border2)",
        background: task.done ? "var(--cyan)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "9px", color: "var(--bg)", cursor: "pointer", transition: "all 0.2s",
      }}
    >
      {task.done ? "✓" : ""}
    </div>
    <span style={{ fontSize: "12px", color: task.done ? "var(--muted)" : "var(--text)", textDecoration: task.done ? "line-through" : "none", flex: 1, lineHeight: 1.4 }}>
      {task.description}
    </span>
    <button onClick={() => setEditingTaskId(editingTaskId === task.id ? null : task.id)}
      style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "10px", padding: "0 3px", flexShrink: 0 }}>✎</button>
    <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "12px", padding: "0 4px", flexShrink: 0 }}>✕</button>
  </div>
  {/* Inline reassign panel */}
  {editingTaskId === task.id && (
    <div style={{ padding: "8px 20px 10px 28px", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", gap: "6px", alignItems: "center" }}>
      <select
        value={task.featureId ?? "unassigned"}
                onChange={async e => {
          const fid = e.target.value === "unassigned" ? null : e.target.value;
          const updated = tasks.map(t => t.id === task.id ? { ...t, featureId: fid } : t);
          await saveTasks(updated);
          setEditingTaskId(null);
        }}
        style={{ flex: 1, background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 8px", borderRadius: "2px", outline: "none" }}
      >
        <option value="unassigned">— Unassigned —</option>
        {sortVersions(project.versions || []).map(v => (
          <optgroup key={v.id} label={`v${v.number} — ${v.title}`}>
            {(v.features || []).map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <button onClick={() => setEditingTaskId(null)}
        style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", padding: "5px 8px", borderRadius: "2px", cursor: "pointer" }}>✕</button>
    </div>
  )}
</div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}

                {/* Unassigned tasks */}
                {unassignedTasks.length > 0 && (
                  <div>
                    <div style={{ padding: "8px 20px 4px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "9px", fontFamily: "var(--font-jetbrains)", fontWeight: 700, letterSpacing: "1.5px", color: "var(--muted)", textTransform: "uppercase" }}>Unassigned</span>
                      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                    </div>
{unassignedTasks.filter(t => taskFilter === "all" || !t.done).map((task, taskIdx) => (                      <div key={task.id}>
  <div
    draggable
    onDragStart={() => handleDragStart(null, taskIdx)}
    onDragEnter={() => handleDragEnter(null, taskIdx)}
    onDragEnd={handleDragEnd}
    onDragOver={e => e.preventDefault()}
    style={{
      display: "flex", alignItems: "center", gap: "8px",
      padding: "7px 20px",
      borderBottom: editingTaskId === task.id ? "none" : "1px solid var(--border)",
      cursor: "grab",
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
  >
    <span style={{ color: "var(--border2)", fontSize: "10px", cursor: "grab", userSelect: "none", flexShrink: 0 }}>⠿</span>
    <div
      onClick={() => toggleTask(task.id)}
      style={{
        width: "15px", height: "15px", minWidth: "15px", borderRadius: "2px",
        border: task.done ? "2px solid var(--cyan)" : "2px solid var(--border2)",
        background: task.done ? "var(--cyan)" : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "9px", color: "var(--bg)", cursor: "pointer", transition: "all 0.2s",
      }}
    >
      {task.done ? "✓" : ""}
    </div>
    <span style={{ fontSize: "12px", color: task.done ? "var(--muted)" : "var(--text)", textDecoration: task.done ? "line-through" : "none", flex: 1, lineHeight: 1.4 }}>
      {task.description}
    </span>
    <button onClick={() => setEditingTaskId(editingTaskId === task.id ? null : task.id)}
      style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "10px", padding: "0 3px", flexShrink: 0 }}>✎</button>
    <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "12px", padding: "0 4px", flexShrink: 0 }}>✕</button>
  </div>
  {editingTaskId === task.id && (
    <div style={{ padding: "8px 20px 10px", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", gap: "6px", alignItems: "center" }}>
      <select
        value={task.featureId ?? "unassigned"}
                onChange={async e => {
          const fid = e.target.value === "unassigned" ? null : e.target.value;
          const updated = tasks.map(t => t.id === task.id ? { ...t, featureId: fid } : t);
          await saveTasks(updated);
          setEditingTaskId(null);
        }}
        style={{ flex: 1, background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 8px", borderRadius: "2px", outline: "none" }}
      >
        <option value="unassigned">— Unassigned —</option>
        {sortVersions(project.versions || []).map(v => (
          <optgroup key={v.id} label={`v${v.number} — ${v.title}`}>
            {(v.features || []).map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <button onClick={() => setEditingTaskId(null)}
        style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", padding: "5px 8px", borderRadius: "2px", cursor: "pointer" }}>✕</button>
    </div>
  )}
</div>
                ))}
                  </div>
                )}

                {/* Empty state */}
                {totalTasks === 0 && (
                  <div style={{ padding: "20px", fontSize: "12px", color: "var(--muted)", textAlign: "center" }}>
                    All tasks complete ✓
                  </div>
                )}
             </div>}
            </div>

            {/* NOTES */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 700, letterSpacing: "1px" }}>NOTES</div>
              <div style={{ padding: "16px 20px" }}>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5}
                  style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "2px", padding: "10px 12px", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "12px", outline: "none", resize: "vertical", lineHeight: 1.6 }} placeholder="Technical notes, decisions, links..." />
              </div>
            </div>

            {/* BLOCKERS */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", color: "var(--red)" }}>BLOCKERS</div>
              <div style={{ padding: "16px 20px" }}>
                <textarea value={blockers} onChange={e => setBlockers(e.target.value)} rows={4}
                  style={{ width: "100%", background: "var(--surface2)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "2px", padding: "10px 12px", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "12px", outline: "none", resize: "vertical", lineHeight: 1.6 }} placeholder="Any blockers or issues..." />
              </div>
            </div>

            <button onClick={saveNotes} disabled={saving} style={{ padding: "10px", background: saved ? "rgba(16,185,129,0.1)" : "var(--cyan-dim)", border: `1px solid ${saved ? "rgba(16,185,129,0.3)" : "rgba(0,212,255,0.3)"}`, color: saved ? "var(--green)" : "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", letterSpacing: "1px", cursor: "pointer", borderRadius: "2px", transition: "all 0.2s", width: "100%" }}>
              {saving ? "SAVING..." : saved ? "✓ SAVED" : "SAVE NOTES & BLOCKERS"}
            </button>

            <button onClick={async () => {
              if (!confirm("Delete this project? This cannot be undone.")) return;
              await fetch(`/api/projects/${id}`, { method: "DELETE" });
              router.push("/dashboard");
            }} style={{ padding: "10px", background: "transparent", border: "1px solid rgba(239,68,68,0.2)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", letterSpacing: "1px", cursor: "pointer", borderRadius: "2px", transition: "all 0.2s", width: "100%" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--red)"; e.currentTarget.style.color = "var(--red)"; e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; e.currentTarget.style.color = "var(--muted)"; e.currentTarget.style.background = "transparent"; }}>
              DELETE PROJECT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}