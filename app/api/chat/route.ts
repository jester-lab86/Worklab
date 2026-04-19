import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(ip, 20, 60_000)) {
    return new Response("Too many requests", { status: 429 });
  }

  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { messages, project } = await req.json();

  const systemPrompt = `You are an AI assistant embedded inside FORGE, a personal ops dashboard for tracking AI projects. You are helping the operator manage a specific project. Here is the full context for this project:

PROJECT NAME: ${project.name}
STATUS: ${project.status}
VERSION: ${project.version}
DESCRIPTION: ${project.description || "No description provided."}

TECH STACK:
${(project.tech_stack || []).join(", ") || "Not specified."}

CURRENT PROGRESS:
${project.current_progress || "No progress notes."}

NOTES:
${project.notes || "No notes."}

BLOCKERS:
${project.blockers || "None."}

VERSIONS & PHASES:
${(project.versions || []).map((v: Record<string, unknown>) => {
  const phases = (v.phases as Record<string, unknown>[] || []);
  return `v${v.number} — ${v.title} (${v.status})\n${phases.map((p: Record<string, unknown>) => `  - ${p.title} [${p.completed ? "complete" : "incomplete"}]`).join("\n")}`;
}).join("\n\n")}

Your job is to help the operator think through decisions, suggest next steps, identify risks, answer questions about the project, and provide technical guidance. Be concise, direct, and practical. You are operating in a military-ops aesthetic dashboard — match that energy. Address the operator as if you are their mission intelligence officer.`;

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