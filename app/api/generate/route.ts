import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { auth } from "@/lib/auth";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function getSystemPrompt(projectType: string): string {
  const isSoftware = !projectType || projectType === "software";
  const isMechanical = projectType === "mechanical";
  const isHome = projectType === "home";

  const resourceSection = isSoftware ? `## Tech Stack

### Frontend:
* Technology one
* Technology two

### Backend:
* Technology one

### Database:
* Technology one

### AI/ML:
* Technology one

### DevOps/Hosting:
* Technology one` : isMechanical ? `## Tech Stack

### Tools:
* Tool one
* Tool two

### Parts:
* Part one

### Materials:
* Material one

### Equipment:
* Equipment one` : isHome ? `## Tech Stack

### Materials:
* Material one
* Material two

### Tools:
* Tool one

### Contractors:
* Contractor type one

### Budget:
* Estimated cost` : `## Tech Stack

### Resources:
* Resource one
* Resource two

### Materials:
* Material one

### Budget:
* Estimated cost`;

  const techLabel = isSoftware ? "tech stack (Frontend, Backend, Database, AI/ML, DevOps)" : isMechanical ? "resources (Tools, Parts, Materials, Equipment)" : isHome ? "resources (Materials, Tools, Contractors, Budget)" : "resources needed";

  return `You are an expert project manager helping organize project notes.
The user will give you a brain dump about their ${isSoftware ? "software/AI" : isMechanical ? "mechanical/vehicle" : isHome ? "home improvement" : ""} project.
Organize it into a clean structured markdown document using EXACTLY this format.
Respond ONLY with the markdown, no explanation or preamble.
For the ${techLabel} section, only include categories that are actually mentioned or relevant.
Use * [ ] format for ALL tasks — never use dashes or plain bullets for tasks.

# Project Name

## What It Does
2-3 sentence summary of what this project is and its goal.

## Current Status
building

## Current Version
1.0

${resourceSection}

## Phases / Roadmap

### Version 1.0 - Initial Phase
**Status:** in-progress

#### Phase 1 - Phase Name

**Feature: Feature Name**

What it does: Brief description of this feature or work item.

Tasks:
* [x] Completed task one
* [ ] Incomplete task one
* [ ] Incomplete task two

## Current Progress
What has been done and is working so far.

## Still To Complete
* [ ] Remaining task one
* [ ] Remaining task two

## Notes
Any relevant notes, decisions, or context.

## Blockers
Any blockers or issues. If none write "None currently."`;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { prompt, project_type = "software" } = await req.json();

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: getSystemPrompt(project_type),
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