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

  // Parse phases/roadmap section for version blocks
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

  // Parse features section and distribute into versions
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
      const name = match[2].trim();
      if (isDone) {
        completed.push({ id: uid(), name, status: "complete" });
      } else {
        planned.push({ id: uid(), name, status: "planned" });
      }
    }

    // Completed features → first version
    if (versions[0]) {
      versions[0] = { ...versions[0], features: completed };
    }

    // Planned features → distribute across remaining versions
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

function getStillToComplete(md: string): string[] {
  const block = getSection(md, "Still To Complete");
  return block
    .split("\n")
    .filter(l => l.match(/^[-*]\s+\[/))
    .map(l => l.replace(/^[-*]\s+\[[ xX]\]\s*/, "").trim())
    .filter(Boolean);
}

export function parseProjectMarkdown(md: string) {
  // Name
  const nameMatch = md.match(/^#\s+(.+)/m);
  const name = nameMatch
    ? nameMatch[1].replace(/\s*[—–-]+\s*Full Project Brain Dump.*/i, "").trim()
    : "Untitled Project";

  // Status
  const statusRaw = getSection(md, "Current Status").toLowerCase();
  const status = statusRaw.includes("launch")
    ? "launched"
    : statusRaw.includes("build") || statusRaw.includes("progress")
    ? "building"
    : "concept";

  // Version
  const versionRaw = getSection(md, "Current Version")
    .replace(/^v/i, "")
    .split("\n")[0]
    .trim();

  // Tech stack
  const tech_stack_grouped = parseTechStack(md);
  const tech_stack = tech_stack_grouped.flatMap(c => c.items);

  // Versions + features
  const versions = parseVersionsAndFeatures(md);

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
    still_to_complete: getStillToComplete(md),
    notes: getSection(md, "Notes"),
    blockers: getSection(md, "Blockers"),
  };
}