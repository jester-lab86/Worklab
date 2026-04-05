import { Feature, Phase, Version, TechCategory } from "@/types";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function getSection(md: string, heading: string): string {
  const regex = new RegExp(
    `##\\s+${heading}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`,
    "i"
  );
  const match = md.match(regex);
  return match ? match[1].trim().replace(/\n?---\s*$/gm, "").trim() : "";
}

// ── TECH STACK ──
// Handles both ### Category: and **Category:** formats
function parseTechStack(md: string): TechCategory[] {
  const categories: TechCategory[] = [];
  const techMatch = md.match(
    /##\s+Tech Stack[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i
  );
  if (!techMatch) return [];

  const lines = techMatch[1].split("\n");
  let current: TechCategory | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "---") continue;

    // Match ### Category or **Category:** or Category:
    const catMatch =
      trimmed.match(/^###\s+(.+?)[:：]?\s*$/) ||
      trimmed.match(/^\*\*(.+?)[:：]\*\*\s*$/) ||
      trimmed.match(/^\*\*(.+?)\*\*\s*$/) ||
      trimmed.match(/^(.+?)[:：]\s*$/);

    // Match - item or * item
    const itemMatch = trimmed.match(/^[-*]\s+(.+)/);

    if (catMatch) {
      const catName = catMatch[1].trim();
      // Only treat as category if it looks like a category name (not a long sentence)
      if (catName.length < 40 && !catName.includes("[")) {
        if (current && current.items.length > 0) categories.push(current);
        current = { category: catName, items: [] };
        continue;
      }
    }

    if (itemMatch && current) {
      current.items.push(itemMatch[1].trim());
    }
  }
  if (current && current.items.length > 0) categories.push(current);
  return categories;
}

// ── TASK INTERFACE ──
interface Task {
  id: string;
  description: string;
  featureId: string | null;
  done: boolean;
  notes: string;
}

// Normalize string for fuzzy matching
function normalizeStr(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

// Match task to best-fitting feature by keyword overlap
function matchTaskToFeature(
  description: string,
  allFeatures: { id: string; name: string }[]
): string | null {
  const taskWords = new Set(
    normalizeStr(description).split(" ").filter(w => w.length > 3)
  );

  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const feature of allFeatures) {
    const featureWords = normalizeStr(feature.name).split(" ").filter(w => w.length > 3);
    let score = 0;
    for (const word of featureWords) {
      if (taskWords.has(word)) score++;
    }
    if (normalizeStr(description).includes(normalizeStr(feature.name))) {
      score += 3;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = feature.id;
    }
  }

  return bestScore >= 1 ? bestMatch : null;
}

// ── MAIN VERSION/FEATURE/TASK PARSER ──
// Handles the exact format:
//   ### Version X.0 — Title
//   **Status:** planned
//   #### Phase N — Title
//   **Feature: Name**
//   Tasks:
//   - [ ] task
function parseVersionsAndFeaturesAndTasks(md: string): {
  versions: Version[];
  tasks: Task[];
} {
  const versions: Version[] = [];
  const tasks: Task[] = [];
  const seenTasks = new Set<string>();

  // Get the roadmap section
  const roadmapMatch = md.match(
    /##\s+(?:Phases\s*\/\s*Roadmap|Roadmap|Phases)[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i
  );

  if (!roadmapMatch) return { versions: [], tasks: [] };

  const roadmapBlock = roadmapMatch[1];

  // Split into version chunks by ### Version X.0
  const versionChunks = roadmapBlock
    .split(/(?=^###\s+Version\s+[\d.]+)/im)
    .filter(c => c.trim());

  for (const vchunk of versionChunks) {
    // Match ### Version X.0 — Title
    const vHeaderMatch = vchunk.match(/^###\s+Version\s+([\d.]+)\s*[—–-]+\s*(.+)/im);
    if (!vHeaderMatch) continue;

    const vNumber = vHeaderMatch[1].trim();
    const vTitle = vHeaderMatch[2].split("\n")[0].trim();

    // Parse **Status:** line
    const statusLine = vchunk.match(/\*\*Status[:：]\*\*\s*(.+)/i);
    let vStatus: Version["status"] = "planned";
    if (statusLine) {
      const s = statusLine[1].trim().toLowerCase();
      if (s === "complete") vStatus = "complete";
      else if (s === "in-progress" || s === "in progress") vStatus = "in-progress";
    }

    const features: Feature[] = [];
    const phases: Phase[] = [];

    // Split into phase chunks by #### Phase N
    const phaseChunks = vchunk
      .split(/(?=^####\s+Phase\s+\d+)/im)
      .filter(c => c.trim());

    for (const pchunk of phaseChunks) {
      // Match #### Phase N — Title
      const pHeaderMatch = pchunk.match(/^####\s+Phase\s+\d+\s*[—–-]+\s*(.+)/im);
      if (!pHeaderMatch) continue;

      const phaseTitle = pHeaderMatch[1].split("\n")[0].trim();

      // Collect all features inside this phase chunk
      // Features are marked as **Feature: Name** (bold)
      const phaseFeatures: Feature[] = [];

      // Split phase into feature sub-blocks by **Feature:
      const featureSubBlocks = pchunk
        .split(/(?=^\*\*Feature:)/im)
        .filter(b => b.trim());

      for (const fblock of featureSubBlocks) {
        // Match **Feature: Name** or **Feature: Name**\n
        const fNameMatch = fblock.match(/^\*\*Feature:\s*(.+?)\*\*/im);
        if (!fNameMatch) continue;

        const featureName = fNameMatch[1].trim();
        const featureId = uid();

        // Extract tasks (- [ ] or * [ ] lines)
        const featureTasks: Task[] = [];
        for (const line of fblock.split("\n")) {
          const taskMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)/);
          if (!taskMatch) continue;

          const done = taskMatch[1].toLowerCase() === "x";
          const description = taskMatch[2].trim();

          if (seenTasks.has(description)) continue;
          seenTasks.add(description);

          featureTasks.push({ id: uid(), description, featureId, done, notes: "" });
        }

        tasks.push(...featureTasks);

        // Determine feature status from task completion
        const total = featureTasks.length;
        const done = featureTasks.filter(t => t.done).length;
        let fStatus: Feature["status"] = "planned";
        if (total > 0 && done === total) fStatus = "complete";
        else if (done > 0) fStatus = "in-progress";

        phaseFeatures.push({ id: featureId, name: featureName, status: fStatus });
      }

      features.push(...phaseFeatures);

      // Phase is complete if all its tasks are done
      const phaseTasks = tasks.filter(t =>
        phaseFeatures.some(f => f.id === t.featureId)
      );
      const phaseCompleted =
        phaseTasks.length > 0 && phaseTasks.every(t => t.done);

      phases.push({ id: uid(), title: phaseTitle, completed: phaseCompleted });
    }

    // Recalculate version status from phases
    const allDone = phases.length > 0 && phases.every(p => p.completed);
    const anyDone = phases.some(p => p.completed);
    const computedStatus: Version["status"] = allDone
      ? "complete"
      : anyDone
      ? "in-progress"
      : vStatus;

    versions.push({
      id: uid(),
      number: vNumber,
      title: vTitle,
      status: computedStatus,
      features,
      phases,
    });
  }

  // ── FALLBACK: if no version chunks found, try flat ### Version format ──
  if (versions.length === 0) {
    const flatVersionChunks = roadmapBlock
      .split(/(?=###\s+Version\s)/i)
      .filter(c => c.trim());

    for (const vchunk of flatVersionChunks) {
      const vHeaderMatch = vchunk.match(/###\s+Version\s+([\d.]+)\s*[—–-]+\s*(.+)/i);
      if (!vHeaderMatch) continue;

      const vNumber = vHeaderMatch[1].trim();
      const vTitle = vHeaderMatch[2].trim();
      const phases: Phase[] = [];

      for (const line of vchunk.split("\n")) {
        const phaseMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)/);
        if (!phaseMatch) continue;
        phases.push({
          id: uid(),
          title: phaseMatch[2].trim(),
          completed: phaseMatch[1].toLowerCase() === "x",
        });
      }

      const allDone = phases.length > 0 && phases.every(p => p.completed);
      const anyDone = phases.some(p => p.completed);
      const status: Version["status"] = allDone ? "complete" : anyDone ? "in-progress" : "planned";

      versions.push({ id: uid(), number: vNumber, title: vTitle, status, features: [], phases });
    }
  }

  return { versions, tasks };
}

// ── PARSE ## Features SECTION (fallback for flat feature lists) ──
function parseFlatFeaturesSection(md: string, versions: Version[]): void {
  const featuresMatch = md.match(
    /##\s+Features[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i
  );
  if (!featuresMatch || versions.length === 0) return;

  // Only use this if versions have no features yet
  const hasFeatures = versions.some(v => v.features.length > 0);
  if (hasFeatures) return;

  const block = featuresMatch[1];
  const completed: Feature[] = [];
  const planned: Feature[] = [];

  for (const line of block.split("\n")) {
    const match = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)/);
    if (!match) continue;
    const isDone = match[1].toLowerCase() === "x";
    const parts = match[2].trim().split("|").map(p => p.trim());
    const name = parts[0];
    let featureStatus: Feature["status"] = isDone ? "complete" : "planned";
    const sp = parts.find(p => p.toLowerCase().startsWith("status:"));
    if (sp) {
      const s = sp.replace(/status:/i, "").trim().toLowerCase();
      if (s === "in-progress") featureStatus = "in-progress";
      else if (s === "complete") featureStatus = "complete";
    }
    const f = { id: uid(), name, status: featureStatus };
    if (isDone || featureStatus === "complete") completed.push(f);
    else planned.push(f);
  }

  if (versions[0]) versions[0] = { ...versions[0], features: completed };
  const remaining = versions.slice(1);
  if (remaining.length > 0 && planned.length > 0) {
    const perV = Math.ceil(planned.length / remaining.length);
    remaining.forEach((v, i) => {
      const slice = planned.slice(i * perV, (i + 1) * perV);
      const idx = versions.findIndex(u => u.id === v.id);
      if (idx !== -1) versions[idx] = { ...versions[idx], features: slice };
    });
  } else if (planned.length > 0 && versions[0]) {
    versions[0] = { ...versions[0], features: [...versions[0].features, ...planned] };
  }
}

// ── PARSE STILL TO COMPLETE ──
// Merges feature-linked tasks with high-level tasks from ## Still To Complete
function getStillToComplete(
  md: string,
  versions: Version[],
  existingTasks: Task[]
): Task[] {
  const allFeatures = versions.flatMap(v =>
    (v.features || []).map(f => ({ id: f.id, name: f.name }))
  );

  const seenDescriptions = new Set(existingTasks.map(t => t.description));
  const tasks = [...existingTasks];

  const block = getSection(md, "Still To Complete");

  for (const line of block.split("\n")) {
    if (!line.match(/^[-*]\s+\[/)) continue;

    const done = /^[-*]\s+\[[xX]\]/.test(line);
    const description = line.replace(/^[-*]\s+\[[ xX]\]\s*/, "").trim();

    if (!description || seenDescriptions.has(description)) continue;
    seenDescriptions.add(description);

    const featureId = allFeatures.length > 0
      ? matchTaskToFeature(description, allFeatures)
      : null;

    tasks.push({ id: uid(), description, featureId, done, notes: "" });
  }

  return tasks;
}

// ── MAIN EXPORT ──
export function parseProjectMarkdown(md: string) {
  const nameMatch = md.match(/^#\s+(.+)/m);
  const name = nameMatch
    ? nameMatch[1].replace(/\s*[—–-]+\s*Full Project Brain Dump.*/i, "").trim()
    : "Untitled Project";

  const statusRaw = getSection(md, "Current Status").toLowerCase();
  const status = statusRaw.includes("launch")
    ? "launched"
    : statusRaw.includes("build") || statusRaw.includes("progress")
    ? "building"
    : "concept";

  const versionRaw = getSection(md, "Current Version")
    .replace(/^v/i, "")
    .split("\n")[0]
    .trim();

  const tech_stack_grouped = parseTechStack(md);
  const tech_stack = tech_stack_grouped.flatMap(c => c.items);

  // Parse versions, features, tasks all in one pass
  const { versions, tasks: featureTasks } = parseVersionsAndFeaturesAndTasks(md);

  // Fallback: parse flat ## Features section if versions have no features
  parseFlatFeaturesSection(md, versions);

  // Merge with ## Still To Complete section
  const still_to_complete = getStillToComplete(md, versions, featureTasks);

  return {
    name,
    description: getSection(md, "What It Does"),
    status: status as "concept" | "building" | "launched",
    version: versionRaw || "0.1",
    tech_stack,
    tech_stack_grouped,
    features: [],
    phases: [],
    versions,
    current_progress: getSection(md, "Current Progress"),
    still_to_complete,
    notes: getSection(md, "Notes"),
    blockers: getSection(md, "Blockers"),
  };
}