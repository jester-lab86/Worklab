import { auth } from "@/lib/auth";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { messages, projects } = await req.json();

  const portfolioSummary = projects.map((p: any) => {
    const allPhases = (p.versions || []).flatMap((v: any) => v.phases || []);
    const pct = allPhases.length
      ? Math.round(allPhases.filter((ph: any) => ph.completed).length / allPhases.length * 100)
      : 0;
    const tasks = Array.isArray(p.still_to_complete)
      ? p.still_to_complete.filter((t: any) => t && typeof t === "object" && "description" in t)
      : [];
    const doneTasks = tasks.filter((t: any) => t.done).length;

    return `
PROJECT: ${p.name}
Status: ${p.status} | Priority: ${p.priority || "NORMAL"} | Version: ${p.version}
Completion: ${pct}% | Tasks: ${doneTasks}/${tasks.length} done
Blockers: ${p.blockers?.trim() || "None"}
Versions: ${(p.versions || []).map((v: any) => `v${v.number} (${v.status})`).join(", ")}
Progress: ${p.current_progress?.slice(0, 200) || "No notes"}
    `.trim();
  }).join("\n\n---\n\n");

  const systemPrompt = `You are FORGE's Portfolio Intelligence Officer — an AI analyst with full visibility across the operator's entire project portfolio. Your job is to provide sharp, actionable intelligence: identify which projects need attention, spot risks and bottlenecks, suggest prioritization, and help the operator make smart decisions about where to focus their energy.

Be direct, concise, and tactical. You are operating inside a military-ops aesthetic dashboard — match that energy. Never be vague. Always ground your analysis in the actual data provided.

CURRENT PORTFOLIO BRIEFING:

${portfolioSummary}

Total projects: ${projects.length}
Launched: ${projects.filter((p: any) => p.status === "launched").length}
Building: ${projects.filter((p: any) => p.status === "building").length}
Concept: ${projects.filter((p: any) => p.status === "concept").length}`;

  const stream = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    stream: true,
    max_tokens: 1024,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}