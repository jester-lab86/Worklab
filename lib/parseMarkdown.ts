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
    const catMatch = trimmed.match(/^###\s+(.+)/);
    const itemMatch = trimmed.match(/^[-*]\s+(.+)/);
    if (catMatch) {
      if (current && current.items.length > 0) categories.push(current);
      current = { category: catMatch[1].trim(), items: [] };
    } else if (itemMatch && current) {
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

// Match task description to best-fitting feature by keyword overlap
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

// ── MAIN PARSER ──
// Handles 3 brain dump formats:
//
// Format A (Phase-nested): Phases/Roadmap section contains Phase blocks,
//   each with Feature: and Tasks: inside. This is the richest format.
//   Version X.0 — Title
//     Phase 1 — Name
//       Feature: Name
//       Tasks:
//         * [ ] task
//
// Format B (Version-grouped features): Features section has Version headers
//   with Feature: blocks underneath.
//   ## Features
//   Version 1.0 — Title
//     Feature: Name
//     * [ ] task
//
// Format C (Flat checkbox list): Simple flat list in ## Features section.
//   * [ ] Feature name | status: planned

function parseVersionsAndFeaturesAndTasks(md: string): {
  versions: Version[];
  tasks: Task[];
} {
  const versions: Version[] = [];
  const tasks: Task[] = [];
  const seenTasks = new Set<string>();

  // ── Get the roadmap section ──
  const roadmapMatch = md.match(
    /##\s+(?:Phases\s*\/\s*Roadmap|Roadmap|Phases)[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i
  );

  if (!roadmapMatch) {
    // No roadmap section — fall back to flat features only
    return { versions: [], tasks: [] };
  }

  const roadmapBlock = roadmapMatch[1];

  // Detect Format A: has "Phase N —" headers inside the roadmap block
  const hasPhaseBlocks = /^Phase\s+\d+\s*[—–-]/im.test(roadmapBlock);

  if (hasPhaseBlocks) {
    // ── FORMAT A: Phase-nested features ──
    // Split roadmap into version blocks
    const versionChunks = roadmapBlock
      .split(/(?=^Version\s+[\d.]+\s*[—–-])/im)
      .filter(c => c.trim());

    for (const vchunk of versionChunks) {
      const vHeaderMatch = vchunk.match(/^Version\s+([\d.]+)\s*[—–-]+\s*(.+)/im);
      if (!vHeaderMatch) continue;

      const vNumber = vHeaderMatch[1].trim();
      const vTitle = vHeaderMatch[2].split("\n")[0].trim();

      // Parse status from "Status: X" line if present
      const statusLine = vchunk.match(/^Status:\s*(.+)/im);
      let vStatus: Version["status"] = "planned";
      if (statusLine) {
        const s = statusLine[1].trim().toLowerCase();
        if (s === "complete") vStatus = "complete";
        else if (s === "in-progress") vStatus = "in-progress";
      }

      const features: Feature[] = [];
      const phases: Phase[] = [];

      // Split version chunk into phase blocks
      const phaseChunks = vchunk
        .split(/(?=^Phase\s+\d+\s*[—–-])/im)
        .filter(c => c.trim());

      for (const pchunk of phaseChunks) {
        const pHeaderMatch = pchunk.match(/^Phase\s+\d+\s*[—–-]+\s*(.+)/im);
        if (!pHeaderMatch) continue;

        const phaseTitle = pHeaderMatch[1].split("\n")[0].trim();

        // Determine phase completion from its tasks
        const phaseTasks = [...pchunk.matchAll(/^[-*]\s+\[([ xX])\]/gim)];
        const phaseCompleted =
          phaseTasks.length > 0 && phaseTasks.every(t => t[1].toLowerCase() === "x");

        phases.push({
          id: uid(),
          title: phaseTitle,
          completed: phaseCompleted,
        });

        // Extract Feature: blocks inside this phase
        const featureChunks = pchunk
          .split(/(?=^Feature:)/im)
          .filter(c => c.trim());

        for (const fchunk of featureChunks) {
          const fNameMatch = fchunk.match(/^Feature:\s*(.+)/im);
          if (!fNameMatch) continue;

          const featureName = fNameMatch[1].trim();

          // Determine feature status from task completion
          const fTasks = [...fchunk.matchAll(/^[-*]\s+\[([ xX])\]/gim)];
          const fDone = fTasks.filter(t => t[1].toLowerCase() === "x").length;
          let fStatus: Feature["status"] = "planned";
          if (fTasks.length > 0 && fDone === fTasks.length) fStatus = "complete";
          else if (fDone > 0) fStatus = "in-progress";

          const featureId = uid();
          features.push({ id: featureId, name: featureName, status: fStatus });

          // Extract tasks from this feature block
          // Tasks are under "Tasks:" header or just bullet checkboxes
          for (const line of fchunk.split("\n")) {
            const taskMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)/);
            if (!taskMatch) continue;

            const done = taskMatch[1].toLowerCase() === "x";
            const description = taskMatch[2].trim();

            if (seenTasks.has(description)) continue;
            seenTasks.add(description);

            tasks.push({
              id: uid(),
              description,
              featureId,
              done,
              notes: "",
            });
          }
        }
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
  } else {
    // ── FORMAT B/C: Standard version + phase blocks (no nested features) ──
    const versionChunks = roadmapBlock
      .split(/(?=###\s+Version\s)/i)
      .filter(c => c.trim());

    for (const vchunk of versionChunks) {
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
      const status: Version["status"] = allDone
        ? "complete"
        : anyDone
        ? "in-progress"
        : "planned";

      versions.push({ id: uid(), number: vNumber, title: vTitle, status, features: [], phases });
    }

    // Now parse features from ## Features section
    const featuresMatch = md.match(
      /##\s+Features[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i
    );

    if (featuresMatch && versions.length > 0) {
      const featuresBlock = featuresMatch[1];
      const hasVersionHeaders = /Version\s+[\d.]+/i.test(featuresBlock);
      const hasFeatureHeaders = /^Feature:/im.test(featuresBlock);

      if (hasVersionHeaders || hasFeatureHeaders) {
        // Format B: version-grouped feature blocks
        const vSections = featuresBlock
          .split(/(?=Version\s+[\d.]+\s*[—–-])/i)
          .filter(s => s.trim());

        for (const vsection of vSections) {
          const vhMatch = vsection.match(/Version\s+([\d.]+)\s*[—–-]/i);
          if (!vhMatch) continue;
          const vIdx = versions.findIndex(v => v.number === vhMatch[1].trim());
          if (vIdx === -1) continue;

          const fBlocks = vsection.split(/(?=^Feature:)/im).filter(b => b.trim());
          const features: Feature[] = [];

          for (const fblock of fBlocks) {
            const fnMatch = fblock.match(/^Feature:\s*(.+)/im);
            if (!fnMatch) continue;
            const name = fnMatch[1].trim();
            const fTasks = [...fblock.matchAll(/^[-*]\s+\[([ xX])\]/gim)];
            const fDone = fTasks.filter(t => t[1].toLowerCase() === "x").length;
            let status: Feature["status"] = "planned";
            if (fTasks.length > 0 && fDone === fTasks.length) status = "complete";
            else if (fDone > 0) status = "in-progress";
            features.push({ id: uid(), name, status });
          }

          versions[vIdx] = { ...versions[vIdx], features };
        }
      } else {
        // Format C: flat checkbox list
        const completed: Feature[] = [];
        const planned: Feature[] = [];

        for (const line of featuresBlock.split("\n")) {
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
            else featureStatus = "planned";
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
    }
  }

  return { versions, tasks };
}

// ── PARSE STILL TO COMPLETE ──
// Merges tasks from feature blocks (already parsed) with high-level tasks
// from the ## Still To Complete section
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

  // Parse versions, features, and tasks all in one pass
  const { versions, tasks: featureTasks } = parseVersionsAndFeaturesAndTasks(md);

  // Merge with Still To Complete section
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