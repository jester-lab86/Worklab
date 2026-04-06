import jsPDF from "jspdf";

function getPct(versions: any[]): number {
  if (!versions || versions.length === 0) return 0;
  const allPhases = versions.flatMap(v => v.phases || []);
  if (allPhases.length === 0) return 0;
  const done = allPhases.filter((p: any) => p.completed).length;
  return Math.round((done / allPhases.length) * 100);
}

export function exportProjectPdf(project: any) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const colors = {
    bg: [6, 10, 16] as [number, number, number],
    cyan: [0, 212, 255] as [number, number, number],
    text: [220, 230, 240] as [number, number, number],
    muted: [100, 120, 140] as [number, number, number],
    green: [16, 185, 129] as [number, number, number],
    purple: [139, 92, 246] as [number, number, number],
    amber: [245, 158, 11] as [number, number, number],
    red: [239, 68, 68] as [number, number, number],
    surface: [12, 18, 28] as [number, number, number],
    border: [30, 45, 65] as [number, number, number],
  };

  // Background
  doc.setFillColor(...colors.bg);
  doc.rect(0, 0, 210, 297, "F");

  // Helper functions
  function addText(text: string, x: number, yPos: number, size: number, color: [number, number, number], style: "normal" | "bold" = "normal") {
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.setFont("helvetica", style);
    doc.text(text, x, yPos);
  }

  function addLine(yPos: number, color: [number, number, number] = colors.border) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
  }

  function addSection(title: string, color: [number, number, number]) {
    y += 6;
    addText(title, margin, y, 8, color, "bold");
    y += 3;
    addLine(y, color);
    y += 5;
  }

  function checkPage() {
    if (y > 270) {
      doc.addPage();
      doc.setFillColor(...colors.bg);
      doc.rect(0, 0, 210, 297, "F");
      y = 20;
    }
  }

  function addWrappedText(text: string, x: number, maxWidth: number, size: number, color: [number, number, number]) {
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      checkPage();
      doc.text(line, x, y);
      y += size * 0.45;
    });
  }

  // HEADER
  doc.setFillColor(...colors.surface);
  doc.rect(0, 0, 210, 36, "F");
  doc.setDrawColor(...colors.cyan);
  doc.setLineWidth(0.5);
  doc.line(0, 36, 210, 36);

  addText("FORGE", margin, 14, 7, colors.cyan, "bold");
  addText("OPS CENTER — PROJECT REPORT", margin, 20, 6, colors.muted);
  addText(project.name.toUpperCase(), margin, 30, 14, colors.text, "bold");

  // Status and version top right
  addText(`v${project.version}`, pageWidth - margin - 30, 14, 8, colors.muted);
  const statusColor = project.status === "launched" ? colors.green : project.status === "building" ? colors.amber : colors.purple;
  addText(project.status.toUpperCase(), pageWidth - margin - 30, 22, 8, statusColor, "bold");

  const pct = getPct(project.versions || []);
  addText(`${pct}% COMPLETE`, pageWidth - margin - 30, 30, 8, colors.cyan, "bold");

  y = 46;

  // EXECUTIVE SUMMARY
  if (project.description) {
    addSection("EXECUTIVE SUMMARY", colors.cyan);
    addWrappedText(project.description, margin, contentWidth, 8, colors.text);
    y += 2;
  }

  // CURRENT PROGRESS
  if (project.current_progress) {
    checkPage();
    addSection("CURRENT PROGRESS", colors.green);
    addWrappedText(project.current_progress, margin, contentWidth, 8, colors.text);
    y += 2;
  }

  // TECH STACK
  if (project.tech_stack_grouped && project.tech_stack_grouped.length > 0) {
    checkPage();
    addSection("TECH STACK", colors.purple);
    project.tech_stack_grouped.forEach((cat: any) => {
      checkPage();
      addText(cat.category.toUpperCase(), margin, y, 7, colors.muted, "bold");
      y += 4;
      const itemText = cat.items.join("  ·  ");
      addWrappedText(itemText, margin + 4, contentWidth - 4, 7, colors.text);
      y += 2;
    });
  }

  // VERSIONS & ROADMAP
  if (project.versions && project.versions.length > 0) {
    checkPage();
    addSection("VERSIONS & ROADMAP", colors.cyan);
    project.versions.forEach((v: any) => {
      checkPage();
      const vPct = v.phases?.length > 0
        ? Math.round(v.phases.filter((p: any) => p.completed).length / v.phases.length * 100)
        : 0;
      const vColor = v.status === "complete" ? colors.green : v.status === "in-progress" ? colors.cyan : colors.muted;
      addText(`v${v.number} — ${v.title}`, margin, y, 9, vColor, "bold");
      addText(`${vPct}%  ${(v.status || "planned").toUpperCase()}`, pageWidth - margin - 40, y, 7, vColor);
      y += 5;

      if (v.phases && v.phases.length > 0) {
  v.phases.forEach((phase: any) => {
    checkPage();
    const marker = phase.completed ? "[x]" : "[ ]";
    const phaseColor = phase.completed ? colors.green : colors.muted;
    const title = (phase.title || "").replace(/[^\x00-\x7F]/g, "");
    addText(`  ${marker}  ${title}`, margin + 2, y, 7, phaseColor);
    y += 4;
  });
}
      y += 2;
    });
  }

  // NOTES
  if (project.notes && project.notes.trim().length > 0) {
    checkPage();
    addSection("NOTES", colors.amber);
    addWrappedText(project.notes, margin, contentWidth, 7, colors.text);
    y += 2;
  }

  // BLOCKERS
  if (project.blockers && project.blockers.trim().length > 0) {
    checkPage();
    addSection("BLOCKERS", colors.red);
    addWrappedText(project.blockers, margin, contentWidth, 7, colors.text);
    y += 2;
  }

  // FOOTER
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.3);
    doc.line(margin, 287, pageWidth - margin, 287);
    addText(`FORGE — ${project.name} — Generated ${new Date().toLocaleDateString()}`, margin, 292, 6, colors.muted);
    addText(`${i} / ${pageCount}`, pageWidth - margin - 10, 292, 6, colors.muted);
  }

  doc.save(`${project.name.replace(/\s+/g, "_")}_report.pdf`);
}