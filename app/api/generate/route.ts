import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { auth } from "@/lib/auth";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prompt } = await req.json();

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a senior technical project manager and AI engineer.
The user will give you a brain dump about their project.
Organize it into a clean structured markdown document using EXACTLY this format.
Respond ONLY with the markdown, no explanation or preamble.

# Project Name

## Description
2-3 sentence executive summary of what this project does.

## Status
concept

## Current Version
1.0

## Tech Stack

Frontend:
- Technology one
- Technology two

Backend:
- Technology one

Database:
- Technology one

AI/ML:
- Technology one

DevOps/Hosting:
- Technology one

## Versions & Roadmap

### Version 1.0 - MVP
Status: complete

Features:
- Feature name | status: complete | phase: Phase name
- Feature name | status: in-progress | phase: Phase name

Phases:
- [x] Completed phase name
- [ ] Incomplete phase name

### Version 2.0 - Feature Expansion
Status: planned

Features:
- Feature name | status: planned | phase: Phase name

Phases:
- [ ] Phase name

## Current Progress
What has been built and is working so far.

## Still To Complete
- [ ] Remaining task one
- [ ] Remaining task two

## Notes
Technical notes, architecture decisions, anything relevant.

## Blockers
Any blockers or issues. If none write "None currently."`,
        },
        {
          role: "user",
          content: `Here is my project brain dump. Please organize it:\n\n${prompt}`,
        },
      ],
    });

    const markdown = completion.choices[0]?.message?.content || "";
    return NextResponse.json({ markdown });
  } catch (error) {
    console.error("Groq error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}