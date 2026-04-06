"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Project, Version, Feature, TechCategory } from "@/types";
import ChatPanel from "@/components/ChatPanel";
import { exportProjectPdf } from "@/lib/exportPdf";

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

interface Task {
  id: string;
  description: string;
  featureId: string | null;
  done: boolean;
  notes?: string;
}

function normalizeTasks(raw: (string | Task)[]): Task[] {
  return raw.map(item => {
    if (typeof item === "string") {
      try {
        const parsed = JSON.parse(item);
        if (parsed && typeof parsed === "object" && "description" in parsed) {
          return { id: parsed.id || uid(), description: parsed.description, featureId: parsed.featureId ?? null, done: parsed.done ?? false, notes: parsed.notes || "" };
        }
      } catch {}
      const done = item.startsWith("✓ ");
      return { id: uid(), description: done ? item.slice(2) : item, featureId: null, done, notes: "" };
    }
    return item as Task;
  });
}

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
  concept: "var(--purple)", building: "var(--amber)", launched: "var(--green)",
};
const FEATURE_STATUS_COLORS: Record<string, string> = {
  complete: "var(--green)", "in-progress": "var(--cyan)", planned: "var(--muted)",
};
const VERSION_STATUS_COLORS: Record<string, string> = {
  complete: "var(--green)", "in-progress": "var(--cyan)", planned: "var(--muted)",
};

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: "4px", width: "100%", maxWidth: "480px", overflow: "hidden", animation: "slideUp 0.18s ease" }}>
        {children}
      </div>
      <style>{`
  @keyframes slideUp { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  @keyframes barBreathe { 0% { box-shadow: 0 0 6px 1px rgba(0,212,255,0.5), 0 0 14px 3px rgba(123,79,255,0.3); } 100% { box-shadow: 0 0 10px 3px rgba(0,212,255,0.8), 0 0 24px 6px rgba(123,79,255,0.5), 0 0 4px 1px rgba(0,212,255,1); } }
  @keyframes greenPulse { 0% { text-shadow: 0 0 5px rgba(16,185,129,0.7), 0 0 12px rgba(16,185,129,0.4); } 100% { text-shadow: 0 0 9px rgba(16,185,129,1), 0 0 22px rgba(16,185,129,0.8), 0 0 40px rgba(16,185,129,0.4); } }
  @keyframes yellowPulse { 0% { box-shadow: 0 0 5px 1px rgba(255,224,51,0.6), 0 0 12px 3px rgba(245,197,0,0.4); } 100% { box-shadow: 0 0 8px 2px rgba(255,224,51,1), 0 0 20px 5px rgba(245,197,0,0.7), 0 0 36px 10px rgba(212,152,0,0.4); } }
`}</style>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", background: "var(--surface3)", border: "1px solid var(--border2)",
  color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "12px",
  padding: "8px 12px", borderRadius: "2px", outline: "none",
};
const labelStyle: React.CSSProperties = {
  fontSize: "9px", letterSpacing: "1.5px", textTransform: "uppercase" as const,
  color: "var(--muted)", display: "block", marginBottom: "6px",
};

export default function ProjectDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [notes, setNotes] = useState("");
  const [blockers, setBlockers] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});
  const [addingFeature, setAddingFeature] = useState<string | null>(null);
  const [addingPhase, setAddingPhase] = useState<string | null>(null);
  const [newFeatureName, setNewFeatureName] = useState("");
  const [newFeatureStatus, setNewFeatureStatus] = useState<Feature["status"]>("planned");
  const [newPhaseName, setNewPhaseName] = useState("");
  const [addingVersion, setAddingVersion] = useState(false);
  const [newVersionNumber, setNewVersionNumber] = useState("");
  const [newVersionTitle, setNewVersionTitle] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskFeatureId, setNewTaskFeatureId] = useState<string>("unassigned");
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
  const [collapsedTaskGroups, setCollapsedTaskGroups] = useState<Record<string, boolean>>({});
  const [taskFilter, setTaskFilter] = useState<"all" | "incomplete">("incomplete");

  // Modal state
  const [versionModal, setVersionModal] = useState<Version | null>(null);
  const [featureModal, setFeatureModal] = useState<{ feature: Feature; versionId: string; versionLabel: string } | null>(null);
  const [taskModal, setTaskModal] = useState<Task | null>(null);
  const [modalVersionNumber, setModalVersionNumber] = useState("");
  const [modalVersionTitle, setModalVersionTitle] = useState("");
  const [modalVersionNotes, setModalVersionNotes] = useState("");
  const [modalVersionStatus, setModalVersionStatus] = useState<Version["status"]>("planned");
  const [modalFeatureName, setModalFeatureName] = useState("");
  const [modalFeatureNotes, setModalFeatureNotes] = useState("");
  const [modalFeatureStatus, setModalFeatureStatus] = useState<Feature["status"]>("planned");
  const [modalTaskDesc, setModalTaskDesc] = useState("");
  const [modalTaskNotes, setModalTaskNotes] = useState("");
  const [modalTaskFeatureId, setModalTaskFeatureId] = useState<string>("unassigned");
  const [modalTaskDone, setModalTaskDone] = useState(false);

  function openVersionModal(v: Version) {
    setVersionModal(v);
    setModalVersionNumber(v.number);
    setModalVersionTitle(v.title);
    setModalVersionNotes(v.notes || "");
    setModalVersionStatus(v.status);
  }

  function openFeatureModal(f: Feature, versionId: string, versionLabel: string) {
    setFeatureModal({ feature: f, versionId, versionLabel });
    setModalFeatureName(f.name);
    setModalFeatureNotes(f.notes || "");
    setModalFeatureStatus(f.status);
  }

  function openTaskModal(task: Task) {
    setTaskModal(task);
    setModalTaskDesc(task.description);
    setModalTaskNotes(task.notes || "");
    setModalTaskFeatureId(task.featureId ?? "unassigned");
    setModalTaskDone(task.done);
  }

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
        const raw = Array.isArray(data.still_to_complete) ? data.still_to_complete : [];
setTasks(normalizeTasks(raw));
if (data.versions?.length > 0) {
  const collapsed: Record<string, boolean> = {};
  data.versions.forEach((v: any) => { collapsed[v.number] = true; });
  setCollapsedTaskGroups(collapsed);
}
      });
  }, [id]);

  async function patchProject(updated: Project, updatedTasks?: Task[]) {
    const tasksToSave = updatedTasks !== undefined ? updatedTasks : tasks;
    setProject(updated);
    await fetch(`/api/projects/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updated, still_to_complete: tasksToSave, tech_stack_grouped: updated.tech_stack_grouped || [], versions: updated.versions || [], phases: updated.phases || [] }),
    });
  }

  async function saveTasks(updatedTasks: Task[]) {
    if (!project) return;
    const snapshot = project;
    setTasks(updatedTasks);
    await fetch(`/api/projects/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...snapshot, still_to_complete: updatedTasks, tech_stack_grouped: snapshot.tech_stack_grouped || [], versions: snapshot.versions || [], phases: snapshot.phases || [] }),
    });
  }

  async function saveVersionModal() {
    if (!project || !versionModal) return;
    const updated = { ...project, versions: project.versions.map(v => v.id === versionModal.id ? { ...v, number: modalVersionNumber, title: modalVersionTitle, notes: modalVersionNotes, status: modalVersionStatus } : v) };
    await patchProject(updated);
    setVersionModal(null);
  }

  async function saveFeatureModal() {
    if (!project || !featureModal) return;
    const updated = { ...project, versions: project.versions.map(v => v.id === featureModal.versionId ? { ...v, features: v.features.map(f => f.id === featureModal.feature.id ? { ...f, name: modalFeatureName, notes: modalFeatureNotes, status: modalFeatureStatus } : f) } : v) };
    await patchProject(updated);
    setFeatureModal(null);
  }

  async function saveTaskModal() {
    if (!taskModal) return;
    const fid = modalTaskFeatureId === "unassigned" ? null : modalTaskFeatureId;
    await saveTasks(tasks.map(t => t.id === taskModal.id ? { ...t, description: modalTaskDesc, notes: modalTaskNotes, featureId: fid, done: modalTaskDone } : t));
    setTaskModal(null);
  }

  async function saveNotes() {
    if (!project) return;
    setSaving(true);
    await patchProject({ ...project, notes, blockers });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleVersion(vid: string) { setExpandedVersions(prev => ({ ...prev, [vid]: !prev[vid] })); }

  async function togglePhase(vid: string, pid: string) {
    if (!project) return;
    await patchProject({ ...project, versions: project.versions.map(v => v.id === vid ? { ...v, phases: v.phases.map(p => p.id === pid ? { ...p, completed: !p.completed } : p) } : v) });
  }

  async function toggleFeatureStatus(vid: string, fid: string) {
    if (!project) return;
    const cycle: Feature["status"][] = ["planned", "in-progress", "complete"];
    await patchProject({ ...project, versions: project.versions.map(v => v.id === vid ? { ...v, features: v.features.map(f => f.id !== fid ? f : { ...f, status: cycle[(cycle.indexOf(f.status) + 1) % cycle.length] }) } : v) });
  }

  async function addFeature(vid: string) {
    if (!project || !newFeatureName.trim()) return;
    await patchProject({ ...project, versions: project.versions.map(v => v.id === vid ? { ...v, features: [...v.features, { id: uid(), name: newFeatureName.trim(), status: newFeatureStatus }] } : v) });
    setNewFeatureName(""); setNewFeatureStatus("planned"); setAddingFeature(null);
  }

  async function deleteFeature(vid: string, fid: string) {
    if (!project) return;
    const updatedTasks = tasks.map(t => t.featureId === fid ? { ...t, featureId: null } : t);
    await patchProject({ ...project, versions: project.versions.map(v => v.id === vid ? { ...v, features: v.features.filter(f => f.id !== fid) } : v) }, updatedTasks);
    setTasks(updatedTasks);
  }

  async function addPhase(vid: string) {
    if (!project || !newPhaseName.trim()) return;
    await patchProject({ ...project, versions: project.versions.map(v => v.id === vid ? { ...v, phases: [...v.phases, { id: uid(), title: newPhaseName.trim(), completed: false }] } : v) });
    setNewPhaseName(""); setAddingPhase(null);
  }

  async function deletePhase(vid: string, pid: string) {
    if (!project) return;
    await patchProject({ ...project, versions: project.versions.map(v => v.id === vid ? { ...v, phases: v.phases.filter(p => p.id !== pid) } : v) });
  }

  async function addVersion() {
    if (!project || !newVersionNumber.trim()) return;
    const newV = { id: uid(), number: newVersionNumber.trim(), title: newVersionTitle.trim() || `Version ${newVersionNumber.trim()}`, status: "planned" as const, features: [], phases: [], notes: "" };
    await patchProject({ ...project, versions: [...(project.versions || []), newV] });
    setNewVersionNumber(""); setNewVersionTitle(""); setAddingVersion(false);
    setExpandedVersions(prev => ({ ...prev, [newV.id]: true }));
  }

  async function addTask() {
    if (!newTaskDesc.trim()) return;
    const featureId = newTaskFeatureId === "unassigned" ? null : newTaskFeatureId;
    await saveTasks([...tasks, { id: uid(), description: newTaskDesc.trim(), featureId, done: false, notes: "" }]);
    setNewTaskDesc(""); setNewTaskFeatureId("unassigned"); setAddingTask(false);
  }

  async function toggleTask(taskId: string) { await saveTasks(tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)); }
  async function deleteTask(taskId: string) { await saveTasks(tasks.filter(t => t.id !== taskId)); }

  function handleDragStart(featureId: string | null, index: number) { dragItem.current = { featureId, index }; }
  function handleDragEnter(featureId: string | null, index: number) { dragOverItem.current = { featureId, index }; }

  async function handleDragEnd() {
    if (!dragItem.current || !dragOverItem.current) return;
    const { featureId: fromFeature, index: fromIndex } = dragItem.current;
    const { featureId: toFeature, index: toIndex } = dragOverItem.current;
    if (fromFeature !== toFeature) { dragItem.current = null; dragOverItem.current = null; return; }
    const groupTasks = tasks.filter(t => t.featureId === fromFeature);
    const reordered = [...groupTasks];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const allFeatureIds = [...new Set(tasks.map(t => t.featureId))];
    const newTasks: Task[] = [];
    for (const fid of allFeatureIds) newTasks.push(...(fid === fromFeature ? reordered : tasks.filter(t => t.featureId === fid)));
    dragItem.current = null; dragOverItem.current = null;
    await saveTasks(newTasks);
  }

  async function addTechItem() {
    if (!project || !newTechItem.trim() || !selectedCategory) return;
    const grouped = [...(project.tech_stack_grouped || [])];
    const idx = grouped.findIndex(c => c.category === selectedCategory);
    if (idx !== -1) grouped[idx] = { ...grouped[idx], items: [...grouped[idx].items, newTechItem.trim()] };
    else grouped.push({ category: selectedCategory, items: [newTechItem.trim()] });
    await patchProject({ ...project, tech_stack_grouped: grouped, tech_stack: grouped.flatMap(c => c.items) });
    setNewTechItem("");
  }

  async function addTechCategory() {
    if (!project || !newTechCategory.trim()) return;
    const grouped = [...(project.tech_stack_grouped || [])];
    if (!grouped.find(c => c.category === newTechCategory.trim())) { grouped.push({ category: newTechCategory.trim(), items: [] }); await patchProject({ ...project, tech_stack_grouped: grouped }); }
    setSelectedCategory(newTechCategory.trim()); setNewTechCategory("");
  }

  async function deleteTechItem(category: string, item: string) {
    if (!project) return;
    const grouped = project.tech_stack_grouped.map(c => c.category === category ? { ...c, items: c.items.filter(i => i !== item) } : c).filter(c => c.items.length > 0);
    await patchProject({ ...project, tech_stack_grouped: grouped, tech_stack: grouped.flatMap(c => c.items) });
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

  const groupedForDisplay: { versionNumber: string; versionTitle: string; features: { featureId: string | null; featureName: string; tasks: Task[] }[] }[] = [];
  for (const v of sortVersions(project.versions || [])) {
    const versionFeatures: { featureId: string | null; featureName: string; tasks: Task[] }[] = [];
    for (const f of v.features || []) {
      const featureTasks = tasks.filter(t => t.featureId === f.id);
      if (featureTasks.length > 0) versionFeatures.push({ featureId: f.id, featureName: f.name, tasks: featureTasks });
    }
    if (versionFeatures.length > 0) groupedForDisplay.push({ versionNumber: v.number, versionTitle: v.title, features: versionFeatures });
  }

  const unassignedTasks = tasks.filter(t => t.featureId === null);
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.done).length;

  const InfoIcon = ({ onClick, color = "var(--muted)" }: { onClick: (e: React.MouseEvent) => void; color?: string }) => (
    <button onClick={e => { e.stopPropagation(); onClick(e); }} style={{
      width: "16px", height: "16px", borderRadius: "50%", border: `1px solid ${color}50`,
      background: "none", color, cursor: "pointer", fontSize: "9px", fontStyle: "italic",
      fontFamily: "serif", display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, padding: 0, lineHeight: 1,
    }}>i</button>
  );

  const StatusPills = ({ value, onChange, colors }: { value: string; onChange: (s: any) => void; colors: Record<string, string> }) => (
    <div style={{ display: "flex", gap: "6px" }}>
      {Object.keys(colors).map(s => (
        <button key={s} onClick={() => onChange(s)} style={{
          padding: "5px 12px", borderRadius: "2px", fontSize: "9px", fontWeight: 700,
          letterSpacing: "1px", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--font-jetbrains)",
          background: value === s ? `${colors[s]}20` : "transparent",
          border: `1px solid ${value === s ? colors[s] : "var(--border2)"}`,
          color: value === s ? colors[s] : "var(--muted)",
        }}>{s}</button>
      ))}
    </div>
  );

  return (
    <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", background: "var(--bg)" }}>

      {/* VERSION MODAL */}
      {versionModal && (
        <Modal onClose={() => setVersionModal(null)}>
          <div style={{ height: "2px", background: "linear-gradient(90deg, var(--cyan), transparent)" }} />
          <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "9px", letterSpacing: "2px", color: "var(--muted)", textTransform: "uppercase", marginBottom: "4px" }}>Version</div>
              <div style={{ fontFamily: "var(--font-syne)", fontSize: "16px", fontWeight: 700 }}>v{versionModal.number} — {versionModal.title}</div>
            </div>
            <button onClick={() => setVersionModal(null)} style={{ background: "none", border: "1px solid var(--border2)", color: "var(--muted)", cursor: "pointer", width: "28px", height: "28px", borderRadius: "2px", fontSize: "14px" }}>✕</button>
          </div>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div><label style={labelStyle}>Version Number</label><input value={modalVersionNumber} onChange={e => setModalVersionNumber(e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Title</label><input value={modalVersionTitle} onChange={e => setModalVersionTitle(e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Notes / Description</label><textarea value={modalVersionNotes} onChange={e => setModalVersionNotes(e.target.value)} rows={4} placeholder="What does this version include? Goals, scope, context..." style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} /></div>
            <div><label style={labelStyle}>Status</label><StatusPills value={modalVersionStatus} onChange={setModalVersionStatus} colors={VERSION_STATUS_COLORS} /></div>
          </div>
          <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button onClick={() => setVersionModal(null)} style={{ padding: "7px 16px", background: "none", border: "1px solid var(--border2)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", cursor: "pointer", borderRadius: "2px" }}>CANCEL</button>
            <button onClick={saveVersionModal} style={{ padding: "7px 20px", background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", cursor: "pointer", borderRadius: "2px" }}>SAVE CHANGES</button>
          </div>
        </Modal>
      )}

      {/* FEATURE MODAL */}
      {featureModal && (
        <Modal onClose={() => setFeatureModal(null)}>
          <div style={{ height: "2px", background: "linear-gradient(90deg, var(--purple), transparent)" }} />
          <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "9px", letterSpacing: "2px", color: "var(--muted)", textTransform: "uppercase", marginBottom: "4px" }}>Feature</div>
              <div style={{ fontFamily: "var(--font-syne)", fontSize: "16px", fontWeight: 700 }}>{featureModal.feature.name}</div>
              <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>under <span style={{ color: "var(--cyan)" }}>{featureModal.versionLabel}</span></div>
            </div>
            <button onClick={() => setFeatureModal(null)} style={{ background: "none", border: "1px solid var(--border2)", color: "var(--muted)", cursor: "pointer", width: "28px", height: "28px", borderRadius: "2px", fontSize: "14px" }}>✕</button>
          </div>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div><label style={labelStyle}>Feature Name</label><input value={modalFeatureName} onChange={e => setModalFeatureName(e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Notes / Description</label><textarea value={modalFeatureNotes} onChange={e => setModalFeatureNotes(e.target.value)} rows={4} placeholder="What does this feature do? Technical notes, dependencies..." style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} /></div>
            <div><label style={labelStyle}>Status</label><StatusPills value={modalFeatureStatus} onChange={setModalFeatureStatus} colors={FEATURE_STATUS_COLORS} /></div>
          </div>
          <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button onClick={() => setFeatureModal(null)} style={{ padding: "7px 16px", background: "none", border: "1px solid var(--border2)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", cursor: "pointer", borderRadius: "2px" }}>CANCEL</button>
            <button onClick={saveFeatureModal} style={{ padding: "7px 20px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.3)", color: "var(--purple)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", cursor: "pointer", borderRadius: "2px" }}>SAVE CHANGES</button>
          </div>
        </Modal>
      )}

      {/* TASK MODAL */}
      {taskModal && project && (
        <Modal onClose={() => setTaskModal(null)}>
          <div style={{ height: "2px", background: "linear-gradient(90deg, var(--green), transparent)" }} />
          <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1, paddingRight: "12px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "2px", color: "var(--muted)", textTransform: "uppercase", marginBottom: "4px" }}>Task</div>
              <div style={{ fontFamily: "var(--font-syne)", fontSize: "15px", fontWeight: 700 }}>{taskModal.description}</div>
              {taskModal.featureId && (() => {
                const match = getAllFeatures(project.versions || []).find(f => f.featureId === taskModal.featureId);
                return match ? <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "4px" }}><span style={{ color: "var(--cyan)" }}>v{match.versionNumber}</span> › {match.featureName}</div> : null;
              })()}
            </div>
            <button onClick={() => setTaskModal(null)} style={{ background: "none", border: "1px solid var(--border2)", color: "var(--muted)", cursor: "pointer", width: "28px", height: "28px", borderRadius: "2px", fontSize: "14px", flexShrink: 0 }}>✕</button>
          </div>
          <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div><label style={labelStyle}>Task Name</label><input value={modalTaskDesc} onChange={e => setModalTaskDesc(e.target.value)} style={inputStyle} /></div>
            <div><label style={labelStyle}>Description / Notes</label><textarea value={modalTaskNotes} onChange={e => setModalTaskNotes(e.target.value)} rows={4} placeholder="Add details, context, acceptance criteria, links..." style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} /></div>
            <div>
              <label style={labelStyle}>Assigned Feature</label>
              <select value={modalTaskFeatureId} onChange={e => setModalTaskFeatureId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="unassigned">— Unassigned —</option>
                {sortVersions(project.versions || []).map(v => (
                  <optgroup key={v.id} label={`v${v.number} — ${v.title}`}>
                    {(v.features || []).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <div onClick={() => setModalTaskDone(d => !d)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "var(--surface3)", border: "1px solid var(--border2)", borderRadius: "2px", cursor: "pointer" }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "2px", flexShrink: 0, border: modalTaskDone ? "2px solid var(--cyan)" : "2px solid var(--border2)", background: modalTaskDone ? "var(--cyan)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "var(--bg)" }}>{modalTaskDone ? "✓" : ""}</div>
                <span style={{ fontSize: "11px", color: modalTaskDone ? "var(--cyan)" : "var(--muted)", fontFamily: "var(--font-jetbrains)" }}>{modalTaskDone ? "Marked complete" : "Mark as complete"}</span>
              </div>
            </div>
          </div>
          <div style={{ padding: "14px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button onClick={() => setTaskModal(null)} style={{ padding: "7px 16px", background: "none", border: "1px solid var(--border2)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", cursor: "pointer", borderRadius: "2px" }}>CANCEL</button>
            <button onClick={saveTaskModal} style={{ padding: "7px 20px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", color: "var(--green)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", cursor: "pointer", borderRadius: "2px" }}>SAVE CHANGES</button>
          </div>
        </Modal>
      )}

      {/* TOP BAR */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", height: "56px", borderBottom: "1px solid var(--border)", background: "rgba(6,10,16,0.9)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button onClick={() => router.push("/dashboard")} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontFamily: "var(--font-jetbrains)", fontSize: "11px", letterSpacing: "1px" }}>← ALL PROJECTS</button>
          <div style={{ width: "1px", height: "20px", background: "var(--border)" }} />
          {editingName ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input value={nameVal} onChange={e => setNameVal(e.target.value)} style={{ background: "var(--surface2)", border: "1px solid rgba(0,212,255,0.4)", color: "var(--text)", fontFamily: "var(--font-syne)", fontSize: "14px", fontWeight: 700, padding: "4px 8px", borderRadius: "2px", outline: "none" }} />
              <button onClick={async () => { await patchProject({ ...project, name: nameVal }); setEditingName(false); }} style={{ background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", padding: "4px 8px", borderRadius: "2px", cursor: "pointer" }}>SAVE</button>
              <button onClick={() => setEditingName(false)} style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", padding: "4px 8px", borderRadius: "2px", cursor: "pointer" }}>✕</button>
            
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
              <input value={versionVal} onChange={e => setVersionVal(e.target.value)} style={{ background: "var(--surface2)", border: "1px solid rgba(0,212,255,0.4)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "3px 8px", borderRadius: "2px", outline: "none", width: "80px" }} />
              <button onClick={async () => { await patchProject({ ...project, version: versionVal }); setEditingVersion(false); }} style={{ background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", padding: "3px 8px", borderRadius: "2px", cursor: "pointer" }}>SAVE</button>
              <button onClick={() => setEditingVersion(false)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "12px" }}>✕</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>v{project.version}</span>
              <button onClick={() => setEditingVersion(true)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "10px" }}>✎</button>
            </div>
          )}
          {/* PRIORITY SELECTOR */}
          {(() => {
            const priorityColors: Record<string, string> = { CRITICAL: "#ff3b5c", HIGH: "#ff8c00", NORMAL: "var(--cyan)", BACKLOG: "#3d5572" };
            const pc = priorityColors[project.priority || "NORMAL"];
            return (
              <div style={{ display: "flex", gap: "4px" }}>
                {["CRITICAL", "HIGH", "NORMAL", "BACKLOG"].map(p => (
                  <button key={p} onClick={() => patchProject({ ...project, priority: p })} style={{
                    padding: "4px 8px", borderRadius: "2px", fontSize: "9px", fontWeight: 700,
                    letterSpacing: "0.5px", fontFamily: "var(--font-jetbrains)", cursor: "pointer",
                    background: (project.priority || "NORMAL") === p ? `${priorityColors[p]}20` : "transparent",
                    border: `1px solid ${(project.priority || "NORMAL") === p ? priorityColors[p] : "var(--border)"}`,
                    color: (project.priority || "NORMAL") === p ? priorityColors[p] : "var(--muted)",
                    transition: "all 0.15s",
                  }}>{p}</button>
                ))}
              </div>
            );
          })()}
          <button
  onClick={() => exportProjectPdf(project)}
  style={{
    padding: "7px 16px",
    background: "transparent",
    border: "1px solid rgba(0,212,255,0.2)",
    color: "var(--muted)",
    fontFamily: "var(--font-jetbrains)",
    fontSize: "11px",
    letterSpacing: "1px",
    borderRadius: "2px",
    cursor: "pointer",
    transition: "all 0.15s",
  }}
  onMouseEnter={e => {
    e.currentTarget.style.borderColor = "rgba(0,212,255,0.4)";
    e.currentTarget.style.color = "var(--cyan)";
  }}
  onMouseLeave={e => {
    e.currentTarget.style.borderColor = "rgba(0,212,255,0.2)";
    e.currentTarget.style.color = "var(--muted)";
  }}
>
  ⬇ EXPORT PDF
</button>
          <button
  onClick={() => setChatOpen(true)}
  style={{
    padding: "7px 16px",
    background: "rgba(0,212,255,0.08)",
    border: "1px solid rgba(0,212,255,0.3)",
    color: "var(--cyan)",
    fontFamily: "var(--font-jetbrains)",
    fontSize: "11px",
    letterSpacing: "1px",
    borderRadius: "2px",
    cursor: "pointer",
    transition: "all 0.15s",
  }}
  onMouseEnter={e => e.currentTarget.style.background = "rgba(0,212,255,0.15)"}
  onMouseLeave={e => e.currentTarget.style.background = "rgba(0,212,255,0.08)"}
>
  ◈ AI INTEL
</button>
          <div style={{ position: "relative" }}>
            <button onClick={() => setEditingStatus(!editingStatus)} style={{ padding: "4px 12px", borderRadius: "2px", fontSize: "10px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", fontFamily: "var(--font-syne)", background: `${statusColor}18`, border: `1px solid ${statusColor}40`, color: statusColor, cursor: "pointer" }}>{project.status} ▾</button>
            {editingStatus && (
              <div style={{ position: "absolute", top: "32px", right: 0, background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: "4px", overflow: "hidden", zIndex: 200, minWidth: "140px" }}>
                {(["concept", "building", "launched"] as const).map(s => (
                  <button key={s} onClick={async () => { await patchProject({ ...project, status: s }); setEditingStatus(false); }} style={{ display: "block", width: "100%", padding: "10px 16px", textAlign: "left", background: project.status === s ? "var(--cyan-dim)" : "transparent", border: "none", color: project.status === s ? "var(--cyan)" : "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", cursor: "pointer" }}>{s}</button>
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
          <div style={{ background: "var(--surface3)", height: "6px", borderRadius: "3px", overflow: "visible" }}>
            <div style={{ height: "100%", background: "linear-gradient(90deg, var(--cyan), var(--purple))", width: `${pct}%`, transition: "width 0.5s ease", borderRadius: "3px", boxShadow: "0 0 8px 2px rgba(0,212,255,0.6), 0 0 18px 4px rgba(123,79,255,0.35), 0 0 4px 1px rgba(0,212,255,0.8)", animation: "barBreathe 2.6s ease-in-out infinite alternate" }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px" }}>

          {/* LEFT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* EXECUTIVE SUMMARY */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", color: "var(--cyan)" }}>EXECUTIVE SUMMARY</span>
                <button onClick={() => setEditingSummary(!editingSummary)} style={{ background: "none", border: "none", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", cursor: "pointer", letterSpacing: "1px" }}>{editingSummary ? "CANCEL" : "EDIT"}</button>
              </div>
              <div style={{ padding: "16px 20px" }}>
                {editingSummary ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={4} style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "2px", padding: "10px 12px", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "12px", outline: "none", resize: "vertical", lineHeight: 1.6 }} />
                    <button onClick={async () => { await patchProject({ ...project, description: summary }); setEditingSummary(false); }} style={{ alignSelf: "flex-start", padding: "6px 16px", background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", cursor: "pointer", borderRadius: "2px" }}>SAVE</button>
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
                <button onClick={() => setEditingTechStack(!editingTechStack)} style={{ background: "none", border: "none", color: "var(--purple)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", cursor: "pointer", letterSpacing: "1px" }}>{editingTechStack ? "DONE" : "EDIT"}</button>
              </div>
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {(project.tech_stack_grouped || []).map((cat, i) => (
                  <div key={i}>
                    <div style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>{cat.category}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {cat.items.map((item, j) => (
                        <span key={j} style={{ padding: "4px 10px", borderRadius: "2px", fontSize: "11px", background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", color: "var(--purple)", display: "flex", alignItems: "center", gap: "6px" }}>
                          {item}
                          {editingTechStack && <button onClick={() => deleteTechItem(cat.category, item)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "10px", padding: 0, lineHeight: 1 }}>✕</button>}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {editingTechStack && (
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "4px" }}>Add Technology</div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: selectedCategory ? "var(--text)" : "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 8px", borderRadius: "2px", outline: "none" }}>
                        <option value="">Select category</option>
                        {(project.tech_stack_grouped || []).map(c => <option key={c.category} value={c.category}>{c.category}</option>)}
                      </select>
                      <input value={newTechItem} onChange={e => setNewTechItem(e.target.value)} placeholder="Technology name" onKeyDown={e => e.key === "Enter" && addTechItem()} style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 10px", borderRadius: "2px", outline: "none", flex: 1 }} />
                      <button onClick={addTechItem} style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", color: "var(--purple)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 10px", borderRadius: "2px", cursor: "pointer" }}>Add</button>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <input value={newTechCategory} onChange={e => setNewTechCategory(e.target.value)} placeholder="Or add new category..." onKeyDown={e => e.key === "Enter" && addTechCategory()} style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 10px", borderRadius: "2px", outline: "none", flex: 1 }} />
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
                  <input value={newVersionNumber} onChange={e => setNewVersionNumber(e.target.value)} placeholder="e.g. 2.0" style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "12px", padding: "6px 10px", borderRadius: "2px", outline: "none", width: "80px" }} />
                  <input value={newVersionTitle} onChange={e => setNewVersionTitle(e.target.value)} placeholder="Title e.g. User Accounts" style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "12px", padding: "6px 10px", borderRadius: "2px", outline: "none", flex: 1 }} />
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
                    <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: "12px", background: expanded ? "var(--surface2)" : "transparent", transition: "background 0.2s" }}>
                      <span onClick={() => toggleVersion(v.id)} style={{ color: "var(--muted)", fontSize: "12px", cursor: "pointer" }}>{expanded ? "▼" : "▶"}</span>
                      <span onClick={() => toggleVersion(v.id)} style={{ fontFamily: "var(--font-syne)", fontSize: "14px", fontWeight: 700, color: "var(--text)", flex: 1, cursor: "pointer" }}>v{v.number} — {v.title}</span>
                      {v.notes && <span title="Has notes" style={{ fontSize: "9px", color: "var(--muted)" }}>📝</span>}
                      <span style={{ fontSize: "9px", padding: "2px 8px", borderRadius: "2px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", background: `${vColor}18`, border: `1px solid ${vColor}40`, color: vColor }}>{computedStatus}</span>
                      <span style={{ fontFamily: "var(--font-syne)", fontSize: "14px", fontWeight: 800, color: vColor, minWidth: "40px", textAlign: "right", ...(computedStatus === "complete" ? { textShadow: "0 0 8px rgba(16,185,129,0.9), 0 0 20px rgba(16,185,129,0.6), 0 0 36px rgba(16,185,129,0.3)", animation: "greenPulse 2.4s ease-in-out infinite alternate" } : {}) }}>{vPct}%</span>
                      <InfoIcon onClick={() => openVersionModal(v)} color="var(--cyan)" />
                    </div>

                    {expanded && (
                      <div style={{ padding: "0 20px 16px" }}>
                        <div style={{ marginTop: "12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <span style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase" }}>Features</span>
                            <button onClick={() => setAddingFeature(v.id)} style={{ background: "none", border: "none", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", cursor: "pointer", letterSpacing: "1px" }}>+ ADD</button>
                          </div>
                          {addingFeature === v.id && (
                            <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
                              <input value={newFeatureName} onChange={e => setNewFeatureName(e.target.value)} placeholder="Feature name" onKeyDown={e => e.key === "Enter" && addFeature(v.id)} style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "12px", padding: "6px 10px", borderRadius: "2px", outline: "none", flex: 1 }} />
                              <select value={newFeatureStatus} onChange={e => setNewFeatureStatus(e.target.value as Feature["status"])} style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 8px", borderRadius: "2px", outline: "none" }}>
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
                              <button onClick={() => toggleFeatureStatus(v.id, f.id)} style={{ fontSize: "9px", padding: "2px 8px", borderRadius: "2px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", cursor: "pointer", background: `${FEATURE_STATUS_COLORS[f.status]}18`, border: `1px solid ${FEATURE_STATUS_COLORS[f.status]}40`, color: FEATURE_STATUS_COLORS[f.status], fontFamily: "var(--font-jetbrains)", minWidth: "80px", textAlign: "center" }}>{f.status}</button>
                              <span style={{ fontSize: "12px", color: f.status === "complete" ? "var(--muted)" : "var(--text)", textDecoration: f.status === "complete" ? "line-through" : "none", flex: 1 }}>{f.name}</span>
                              {f.notes && <span title="Has notes" style={{ fontSize: "9px", color: "var(--muted)" }}>📝</span>}
                              <InfoIcon onClick={() => openFeatureModal(f, v.id, `v${v.number} — ${v.title}`)} color="var(--purple)" />
                              <button onClick={() => deleteFeature(v.id, f.id)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "12px", padding: "0 4px" }}>✕</button>
                            </div>
                          ))}
                        </div>

                        <div style={{ marginTop: "16px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <span style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase" }}>Phases</span>
                            <button onClick={() => setAddingPhase(v.id)} style={{ background: "none", border: "none", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", cursor: "pointer", letterSpacing: "1px" }}>+ ADD</button>
                          </div>
                          {addingPhase === v.id && (
                            <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
                              <input value={newPhaseName} onChange={e => setNewPhaseName(e.target.value)} placeholder="Phase name" onKeyDown={e => e.key === "Enter" && addPhase(v.id)} style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "12px", padding: "6px 10px", borderRadius: "2px", outline: "none", flex: 1 }} />
                              <button onClick={() => addPhase(v.id)} style={{ background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 10px", borderRadius: "2px", cursor: "pointer" }}>Add</button>
                              <button onClick={() => setAddingPhase(null)} style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 10px", borderRadius: "2px", cursor: "pointer" }}>✕</button>
                            </div>
                          )}
                          {v.phases?.map((phase, i) => (
                            <div key={phase.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                              <span style={{ fontSize: "10px", color: "var(--muted)", minWidth: "20px" }}>{String(i + 1).padStart(2, "0")}</span>
                              <div onClick={() => togglePhase(v.id, phase.id)} style={{ width: "18px", height: "18px", minWidth: "18px", borderRadius: "2px", border: phase.completed ? "2px solid var(--green)" : "2px solid var(--border2)", background: phase.completed ? "var(--green)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#fff", cursor: "pointer", transition: "all 0.2s" }}>{phase.completed ? "✓" : ""}</div>
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
                <button onClick={() => setEditingProgress(!editingProgress)} style={{ background: "none", border: "none", color: "var(--green)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", cursor: "pointer", letterSpacing: "1px" }}>{editingProgress ? "CANCEL" : "EDIT"}</button>
              </div>
              <div style={{ padding: "16px 20px" }}>
                {editingProgress ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <textarea value={progressVal} onChange={e => setProgressVal(e.target.value)} rows={5} style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "2px", padding: "10px 12px", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "12px", outline: "none", resize: "vertical", lineHeight: 1.6 }} />
                    <button onClick={async () => { await patchProject({ ...project, current_progress: progressVal }); setEditingProgress(false); }} style={{ alignSelf: "flex-start", padding: "6px 16px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "var(--green)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", cursor: "pointer", borderRadius: "2px" }}>SAVE</button>
                  </div>
                ) : (
                  <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.8 }}>{project.current_progress || "No progress notes yet. Click EDIT to add."}</p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* STILL TO COMPLETE */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: tasksCollapsed ? "none" : "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div onClick={() => setTasksCollapsed(p => !p)} style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", flex: 1 }}>
                  <span style={{ color: "var(--muted)", fontSize: "10px" }}>{tasksCollapsed ? "▶" : "▼"}</span>
                  <span style={{ fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 700, letterSpacing: "1px" }}>STILL TO COMPLETE</span>
                  {totalTasks > 0 && <span style={{ fontSize: "10px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)" }}>{doneTasks}/{totalTasks}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ display: "flex", borderRadius: "2px", overflow: "hidden", border: "1px solid var(--border2)" }}>
                    <button onClick={() => setTaskFilter("incomplete")} style={{ padding: "3px 8px", background: taskFilter === "incomplete" ? "var(--cyan-dim)" : "transparent", border: "none", color: taskFilter === "incomplete" ? "var(--cyan)" : "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "9px", cursor: "pointer", letterSpacing: "0.5px" }}>OPEN</button>
                    <button onClick={() => setTaskFilter("all")} style={{ padding: "3px 8px", background: taskFilter === "all" ? "var(--cyan-dim)" : "transparent", border: "none", color: taskFilter === "all" ? "var(--cyan)" : "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "9px", cursor: "pointer", letterSpacing: "0.5px" }}>ALL</button>
                  </div>
                  <button onClick={() => { setAddingTask(true); setNewTaskFeatureId("unassigned"); }} style={{ background: "none", border: "none", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", cursor: "pointer", letterSpacing: "1px" }}>+ ADD</button>
                </div>
              </div>

              {!tasksCollapsed && addingTask && (
                <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} onKeyDown={e => e.key === "Enter" && addTask()} placeholder="Task description..." autoFocus style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "12px", padding: "7px 10px", borderRadius: "2px", outline: "none" }} />
                  <select value={newTaskFeatureId} onChange={e => setNewTaskFeatureId(e.target.value)} style={{ background: "var(--surface3)", border: "1px solid var(--border2)", color: newTaskFeatureId !== "unassigned" ? "var(--text)" : "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "7px 8px", borderRadius: "2px", outline: "none" }}>
                    <option value="unassigned">— No feature (Unassigned) —</option>
                    {sortVersions(project.versions || []).map(v => (
                      <optgroup key={v.id} label={`v${v.number} — ${v.title}`}>
                        {(v.features || []).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={addTask} style={{ flex: 1, background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px", borderRadius: "2px", cursor: "pointer" }}>ADD</button>
                    <button onClick={() => { setAddingTask(false); setNewTaskDesc(""); }} style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 10px", borderRadius: "2px", cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              )}

              {!tasksCollapsed && <div style={{ padding: "8px 0" }}>
                {groupedForDisplay.map(vGroup => (
                  <div key={vGroup.versionNumber}>
                    <div onClick={() => setCollapsedTaskGroups(p => ({ ...p, [vGroup.versionNumber]: !p[vGroup.versionNumber] }))}
  style={{ padding: "8px 20px 4px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
  <span style={{ fontSize: "8px", color: "var(--muted)" }}>{collapsedTaskGroups[vGroup.versionNumber] ? "▶" : "▼"}</span>
  <span style={{ fontSize: "9px", fontFamily: "var(--font-jetbrains)", fontWeight: 700, letterSpacing: "1.5px", color: "var(--cyan)", textTransform: "uppercase" }}>v{vGroup.versionNumber}</span>
  <span style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)" }}>{vGroup.versionTitle}</span>
  <div style={{ flex: 1, height: "3px", background: "var(--border)", borderRadius: "2px", overflow: "visible", position: "relative" }}>
    <div style={{ position: "absolute", top: 0, left: 0, height: "3px", borderRadius: "2px", background: "linear-gradient(90deg, #d4a800, #ffe033, #fff176)", width: `${Math.round((vGroup.features.flatMap(f => f.tasks).filter(t => t.done).length / Math.max(vGroup.features.flatMap(f => f.tasks).length, 1)) * 100)}%`, boxShadow: "0 0 6px 1px rgba(255,224,51,0.8), 0 0 14px 3px rgba(245,197,0,0.55), 0 0 28px 6px rgba(212,152,0,0.3)", animation: "yellowPulse 2.2s ease-in-out infinite alternate" }} />
  </div>
</div>
                    {!collapsedTaskGroups[vGroup.versionNumber] && vGroup.features.map(fGroup => (
                      <div key={fGroup.featureId} style={{ marginBottom: "4px" }}>
                        <div style={{ padding: "5px 20px 4px 28px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", letterSpacing: "0.5px" }}>◆ {fGroup.featureName}</span>
                          <div style={{ flex: 1, height: "1px", background: "var(--border)", opacity: 0.5 }} />
                          <span style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)" }}>{fGroup.tasks.filter(t => t.done).length}/{fGroup.tasks.length}</span>
                        </div>
                        {fGroup.tasks.filter(t => taskFilter === "all" || !t.done).map((task, taskIdx) => (
                          <div key={task.id}>
                            <div draggable onDragStart={() => handleDragStart(fGroup.featureId, taskIdx)} onDragEnter={() => handleDragEnter(fGroup.featureId, taskIdx)} onDragEnd={handleDragEnd} onDragOver={e => e.preventDefault()}
                              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 20px 7px 28px", borderBottom: editingTaskId === task.id ? "none" : "1px solid var(--border)", cursor: "grab", transition: "background 0.15s" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                              <span style={{ color: "var(--border2)", fontSize: "10px", cursor: "grab", userSelect: "none", flexShrink: 0 }}>⠿</span>
                              <div onClick={() => toggleTask(task.id)} style={{ width: "15px", height: "15px", minWidth: "15px", borderRadius: "2px", border: task.done ? "2px solid var(--cyan)" : "2px solid var(--border2)", background: task.done ? "var(--cyan)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "var(--bg)", cursor: "pointer", transition: "all 0.2s" }}>{task.done ? "✓" : ""}</div>
                              <span style={{ fontSize: "12px", color: task.done ? "var(--muted)" : "var(--text)", textDecoration: task.done ? "line-through" : "none", flex: 1, lineHeight: 1.4 }}>{task.description}</span>
                              {task.notes && <span title="Has notes" style={{ fontSize: "9px", color: "var(--muted)" }}>📝</span>}
                              <InfoIcon onClick={() => openTaskModal(task)} color="var(--green)" />
                              <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "12px", padding: "0 4px", flexShrink: 0 }}>✕</button>
                            </div>
                            {editingTaskId === task.id && (
                              <div style={{ padding: "8px 20px 10px 28px", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", gap: "6px", alignItems: "center" }}>
                                <select value={task.featureId ?? "unassigned"} onChange={async e => { const fid = e.target.value === "unassigned" ? null : e.target.value; await saveTasks(tasks.map(t => t.id === task.id ? { ...t, featureId: fid } : t)); setEditingTaskId(null); }} style={{ flex: 1, background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 8px", borderRadius: "2px", outline: "none" }}>
                                  <option value="unassigned">— Unassigned —</option>
                                  {sortVersions(project.versions || []).map(v => (<optgroup key={v.id} label={`v${v.number} — ${v.title}`}>{(v.features || []).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</optgroup>))}
                                </select>
                                <button onClick={() => setEditingTaskId(null)} style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", padding: "5px 8px", borderRadius: "2px", cursor: "pointer" }}>✕</button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}

                {unassignedTasks.length > 0 && (
                  <div>
                    <div style={{ padding: "8px 20px 4px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "9px", fontFamily: "var(--font-jetbrains)", fontWeight: 700, letterSpacing: "1.5px", color: "var(--muted)", textTransform: "uppercase" }}>Unassigned</span>
                      <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
                    </div>
                    {unassignedTasks.filter(t => taskFilter === "all" || !t.done).map((task, taskIdx) => (
                      <div key={task.id}>
                        <div draggable onDragStart={() => handleDragStart(null, taskIdx)} onDragEnter={() => handleDragEnter(null, taskIdx)} onDragEnd={handleDragEnd} onDragOver={e => e.preventDefault()}
                          style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 20px", borderBottom: editingTaskId === task.id ? "none" : "1px solid var(--border)", cursor: "grab" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                          <span style={{ color: "var(--border2)", fontSize: "10px", cursor: "grab", userSelect: "none", flexShrink: 0 }}>⠿</span>
                          <div onClick={() => toggleTask(task.id)} style={{ width: "15px", height: "15px", minWidth: "15px", borderRadius: "2px", border: task.done ? "2px solid var(--cyan)" : "2px solid var(--border2)", background: task.done ? "var(--cyan)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "var(--bg)", cursor: "pointer", transition: "all 0.2s" }}>{task.done ? "✓" : ""}</div>
                          <span style={{ fontSize: "12px", color: task.done ? "var(--muted)" : "var(--text)", textDecoration: task.done ? "line-through" : "none", flex: 1, lineHeight: 1.4 }}>{task.description}</span>
                          {task.notes && <span title="Has notes" style={{ fontSize: "9px", color: "var(--muted)" }}>📝</span>}
                          <InfoIcon onClick={() => openTaskModal(task)} color="var(--green)" />
                          <button onClick={() => deleteTask(task.id)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", fontSize: "12px", padding: "0 4px", flexShrink: 0 }}>✕</button>
                        </div>
                        {editingTaskId === task.id && (
                          <div style={{ padding: "8px 20px 10px", borderBottom: "1px solid var(--border)", background: "var(--surface2)", display: "flex", gap: "6px", alignItems: "center" }}>
                            <select value={task.featureId ?? "unassigned"} onChange={async e => { const fid = e.target.value === "unassigned" ? null : e.target.value; await saveTasks(tasks.map(t => t.id === task.id ? { ...t, featureId: fid } : t)); setEditingTaskId(null); }} style={{ flex: 1, background: "var(--surface3)", border: "1px solid var(--border2)", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "11px", padding: "6px 8px", borderRadius: "2px", outline: "none" }}>
                              <option value="unassigned">— Unassigned —</option>
                              {sortVersions(project.versions || []).map(v => (<optgroup key={v.id} label={`v${v.number} — ${v.title}`}>{(v.features || []).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</optgroup>))}
                            </select>
                            <button onClick={() => setEditingTaskId(null)} style={{ background: "none", border: "1px solid var(--border)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", padding: "5px 8px", borderRadius: "2px", cursor: "pointer" }}>✕</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {totalTasks === 0 && <div style={{ padding: "20px", fontSize: "12px", color: "var(--muted)", textAlign: "center" }}>All tasks complete ✓</div>}
              </div>}
            </div>

            {/* NOTES */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 700, letterSpacing: "1px" }}>NOTES</div>
              <div style={{ padding: "16px 20px" }}>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5} style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "2px", padding: "10px 12px", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "12px", outline: "none", resize: "vertical", lineHeight: 1.6 }} placeholder="Technical notes, decisions, links..." />
              </div>
            </div>

            {/* BLOCKERS */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: 700, letterSpacing: "1px", color: "var(--red)" }}>BLOCKERS</div>
              <div style={{ padding: "16px 20px" }}>
                <textarea value={blockers} onChange={e => setBlockers(e.target.value)} rows={4} style={{ width: "100%", background: "var(--surface2)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "2px", padding: "10px 12px", color: "var(--text)", fontFamily: "var(--font-jetbrains)", fontSize: "12px", outline: "none", resize: "vertical", lineHeight: 1.6 }} placeholder="Any blockers or issues..." />
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

      {chatOpen && project && (
        <ChatPanel project={project} onClose={() => setChatOpen(false)} />
      )}

    </div>
  );
}