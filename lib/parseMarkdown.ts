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

function parseVersionsAndFeatures(md: string): Version[] {
  const versions: Version[] = [];

  const roadmapMatch = md.match(
    /##\s+(?:Phases\s*\/\s*Roadmap|Roadmap|Phases)[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i
  );

  if (roadmapMatch) {
    const block = roadmapMatch[1];
    const versionBlocks = block.split(/(?=###\s+Version\s)/i).filter(b => b.trim());

    for (const vblock of versionBlocks) {
      const headerMatch = vblock.match(/###\s+Version\s+([\d.]+)\s*[—–-]+\s*(.+)/i);
      if (!headerMatch) continue;

      const number = headerMatch[1].trim();
      const title = headerMatch[2].trim();
      const phases: Phase[] = [];

      for (const line of vblock.split("\n")) {
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

      versions.push({ id: uid(), number, title, status, features: [], phases });
    }
  }

  // Parse features — support both plain list and "name | status | phase" format
  const featuresMatch = md.match(
    /##\s+Features[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i
  );

  if (featuresMatch && versions.length > 0) {
    const block = featuresMatch[1];
    const completed: Feature[] = [];
    const planned: Feature[] = [];

    for (const line of block.split("\n")) {
      const match = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)/);
      if (!match) continue;
      const isDone = match[1].toLowerCase() === "x";
      const raw = match[2].trim();

      // Support "Feature name | status: X | phase: Y" format
      const parts = raw.split("|").map(p => p.trim());
      const name = parts[0].trim();

      // Parse optional status override
      let featureStatus: Feature["status"] = isDone ? "complete" : "planned";
      const statusPart = parts.find(p => p.toLowerCase().startsWith("status:"));
      if (statusPart) {
        const s = statusPart.replace(/status:/i, "").trim().toLowerCase();
        if (s === "in-progress") featureStatus = "in-progress";
        else if (s === "complete") featureStatus = "complete";
        else featureStatus = "planned";
      }

      const feature: Feature = { id: uid(), name, status: featureStatus };

      if (isDone || featureStatus === "complete") {
        completed.push(feature);
      } else {
        planned.push(feature);
      }
    }

    if (versions[0]) {
      versions[0] = { ...versions[0], features: completed };
    }

    const remaining = versions.slice(1);
    if (remaining.length > 0 && planned.length > 0) {
      const perV = Math.ceil(planned.length / remaining.length);
      remaining.forEach((v, i) => {
        const slice = planned.slice(i * perV, (i + 1) * perV);
        const idx = versions.findIndex(u => u.id === v.id);
        if (idx !== -1) versions[idx] = { ...versions[idx], features: slice };
      });
    } else if (planned.length > 0 && versions[0]) {
      versions[0] = {
        ...versions[0],
        features: [...versions[0].features, ...planned],
      };
    }
  }

  return versions;
}

interface Task {
  id: string;
  description: string;
  featureId: string | null;
  done: boolean;
  notes: string;
}

// Normalize a string for fuzzy matching — lowercase, strip punctuation
function normalizeStr(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

// Try to match a task description to a feature by keyword overlap
// Returns the featureId of the best match, or null if no good match found
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

    // Strong boost if feature name appears as substring in task description
    if (normalizeStr(description).includes(normalizeStr(feature.name))) {
      score += 3;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = feature.id;
    }
  }

  // Only return a match if at least 1 meaningful word overlaps
  return bestScore >= 1 ? bestMatch : null;
}

function getStillToComplete(md: string, versions: Version[]): Task[] {
  const block = getSection(md, "Still To Complete");

  // Flatten all features across all versions for matching
  const allFeatures = versions.flatMap(v =>
    (v.features || []).map(f => ({ id: f.id, name: f.name }))
  );

  return block
    .split("\n")
    .filter(l => l.match(/^[-*]\s+\[/))
    .map(l => {
      const done = /^[-*]\s+\[[xX]\]/.test(l);
      const description = l.replace(/^[-*]\s+\[[ xX]\]\s*/, "").trim();

      // Try to auto-match to a feature by keyword overlap
      const featureId =
        allFeatures.length > 0
          ? matchTaskToFeature(description, allFeatures)
          : null;

      return {
        id: uid(),
        description,
        featureId,
        done,
        notes: "",
      };
    })
    .filter(t => t.description.length > 0);
}

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

  // Parse versions first so tasks can be matched to features
  const versions = parseVersionsAndFeatures(md);
  const still_to_complete = getStillToComplete(md, versions);

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