import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  const { message, project } = await req.json();

  const systemPrompt = `You are an AI assistant for FORGE, a project management dashboard.
The user is managing a project called "${project.name}".

Your job is to detect if the user's message contains one of these action intents:
1. CREATE_TASK — user wants to add a task
2. ADD_NOTE — user wants to add a note
3. UPDATE_STATUS — user wants to change the project status, or a version/feature status

Respond ONLY with a valid JSON object. No markdown, no explanation, no backticks.

If you detect an action, respond with:
{
  "action": "CREATE_TASK" | "ADD_NOTE" | "UPDATE_STATUS",
  "confirmed": false,
  "reply": "a short conversational confirmation message explaining what you're about to do",
  "data": {
    // for CREATE_TASK:
    "description": "the task text",
    "featureId": null,
    "versionNumber": null,

    // for ADD_NOTE:
    "note": "the note text",

    // for UPDATE_STATUS:
    "target": "project" | "version" | "feature",
    "targetId": null,
    "newStatus": "concept" | "building" | "launched" | "planned" | "in-progress" | "complete"
  }
}

If no action is detected, respond with:
{
  "action": null,
  "reply": null,
  "data": null
}

Project context:
- Status: ${project.status}
- Version: ${project.version}
- Versions: ${JSON.stringify((project.versions || []).map((v: any) => ({ id: v.id, number: v.number, title: v.title, status: v.status, features: (v.features || []).map((f: any) => ({ id: f.id, name: f.name, status: f.status })) })))}
`;

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ],
    max_tokens: 500,
    temperature: 0.1,
  });

  const raw = completion.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(raw);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ action: null, reply: null, data: null });
  }
}