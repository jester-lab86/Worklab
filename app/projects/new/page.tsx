"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { parseProjectMarkdown } from "@/lib/parseMarkdown";

const PROJECT_TYPES = [
  { value: "software", label: "💻 Software" },
  { value: "mechanical", label: "🔧 Mechanical" },
  { value: "home", label: "🏠 Home" },
  { value: "other", label: "⚙️ Other" },
];

const TEMPLATES: Record<string, { label: string; icon: string; markdown: string }> = {
  ai_saas: {
    label: "AI SaaS App",
    icon: "🤖",
    markdown: `# Project Name

## What It Does
An AI-powered SaaS application that solves [problem] for [target user]. Built with modern web stack and LLM integration.

## Current Status
concept

## Current Version
1.0

## Tech Stack

### Frontend:
* Next.js
* Tailwind CSS

### Backend:
* Next.js API Routes
* PostgreSQL

### AI/ML:
* OpenAI / Groq API

### DevOps/Hosting:
* Vercel
* Neon

## Phases / Roadmap

### Version 1.0 - Foundation
**Status:** planned

#### Phase 1 - Project Setup & Auth

**Feature: Core Infrastructure**

What it does: Sets up the project foundation including auth, database, and deployment.

Tasks:
* [ ] Initialize Next.js project
* [ ] Set up PostgreSQL database
* [ ] Implement authentication
* [ ] Deploy to Vercel

#### Phase 2 - Core AI Feature

**Feature: AI Integration**

What it does: Integrates the LLM API and builds the core AI-powered feature.

Tasks:
* [ ] Set up LLM API integration
* [ ] Build prompt engineering layer
* [ ] Implement streaming responses
* [ ] Build core UI for AI feature

#### Phase 3 - Dashboard & UX

**Feature: User Dashboard**

What it does: Gives users a central place to manage their usage and results.

Tasks:
* [ ] Build main dashboard layout
* [ ] Implement results history
* [ ] Add usage tracking
* [ ] Polish UI/UX

#### Phase 4 - Payments & Launch

**Feature: Monetization**

What it does: Adds payment processing and prepares for public launch.

Tasks:
* [ ] Integrate Stripe
* [ ] Build pricing page
* [ ] Set up subscription logic
* [ ] Launch prep and marketing

## Current Progress
Project is in planning phase. No code written yet.

## Still To Complete
* [ ] Complete all phases above

## Notes
None yet.

## Blockers
None currently.`,
  },
  web_app: {
    label: "Web App",
    icon: "🌐",
    markdown: `# Project Name

## What It Does
A web application that [does what] for [who]. Focused on [core value proposition].

## Current Status
concept

## Current Version
1.0

## Tech Stack

### Frontend:
* Next.js
* Tailwind CSS

### Backend:
* Next.js API Routes

### Database:
* PostgreSQL

### DevOps/Hosting:
* Vercel

## Phases / Roadmap

### Version 1.0 - MVP
**Status:** planned

#### Phase 1 - Setup & Auth

**Feature: Foundation**

What it does: Project setup, authentication, and core infrastructure.

Tasks:
* [ ] Initialize project
* [ ] Set up database schema
* [ ] Implement user auth
* [ ] Deploy to Vercel

#### Phase 2 - Core Features

**Feature: Main Functionality**

What it does: The primary features users come for.

Tasks:
* [ ] Build core feature one
* [ ] Build core feature two
* [ ] Build core feature three
* [ ] Wire up to database

#### Phase 3 - Polish & Launch

**Feature: Launch Ready**

What it does: Final polish, testing, and public launch.

Tasks:
* [ ] UI/UX polish pass
* [ ] Error handling
* [ ] Performance optimization
* [ ] Launch

## Current Progress
In planning phase.

## Still To Complete
* [ ] Complete all phases above

## Notes
None yet.

## Blockers
None currently.`,
  },
  api_service: {
    label: "API / Backend",
    icon: "⚙️",
    markdown: `# Project Name

## What It Does
A backend API service that provides [functionality] via REST/GraphQL endpoints. Designed for [use case].

## Current Status
concept

## Current Version
1.0

## Tech Stack

### Backend:
* Node.js / Python / Go

### Database:
* PostgreSQL / Redis

### Infrastructure:
* Docker
* Railway / Fly.io

### DevOps/Hosting:
* GitHub Actions CI/CD

## Phases / Roadmap

### Version 1.0 - Core API
**Status:** planned

#### Phase 1 - Architecture & Setup

**Feature: Foundation**

What it does: Sets up the project structure, database, and CI/CD pipeline.

Tasks:
* [ ] Define API schema and data models
* [ ] Set up database and migrations
* [ ] Configure CI/CD pipeline
* [ ] Set up local dev environment

#### Phase 2 - Core Endpoints

**Feature: API Routes**

What it does: Implements the core API endpoints.

Tasks:
* [ ] Implement auth endpoints
* [ ] Implement core resource endpoints
* [ ] Add request validation
* [ ] Write integration tests

#### Phase 3 - Security & Performance

**Feature: Production Ready**

What it does: Hardens the API for production use.

Tasks:
* [ ] Add rate limiting
* [ ] Implement caching layer
* [ ] Security audit
* [ ] Load testing and optimization

## Current Progress
In planning phase.

## Still To Complete
* [ ] Complete all phases above

## Notes
None yet.

## Blockers
None currently.`,
  },
  chrome_extension: {
    label: "Chrome Extension",
    icon: "🧩",
    markdown: `# Project Name

## What It Does
A Chrome extension that [does what] when browsing [type of site/content]. Helps users [benefit].

## Current Status
concept

## Current Version
1.0

## Tech Stack

### Frontend:
* HTML / CSS / JavaScript
* React (optional)

### APIs:
* Chrome Extension APIs
* External API (if needed)

### DevOps/Hosting:
* Chrome Web Store

## Phases / Roadmap

### Version 1.0 - Core Extension
**Status:** planned

#### Phase 1 - Setup & Manifest

**Feature: Extension Foundation**

What it does: Sets up the Chrome extension structure and manifest.

Tasks:
* [ ] Set up manifest.json v3
* [ ] Configure background service worker
* [ ] Set up content scripts
* [ ] Build popup UI skeleton

#### Phase 2 - Core Functionality

**Feature: Main Feature**

What it does: The core feature the extension provides.

Tasks:
* [ ] Implement content script logic
* [ ] Build popup interface
* [ ] Add Chrome storage for settings
* [ ] Handle permissions

#### Phase 3 - Polish & Publish

**Feature: Store Ready**

What it does: Prepares the extension for Chrome Web Store submission.

Tasks:
* [ ] Add options page
* [ ] Create store assets (icons, screenshots)
* [ ] Write store listing copy
* [ ] Submit to Chrome Web Store

## Current Progress
In planning phase.

## Still To Complete
* [ ] Complete all phases above

## Notes
None yet.

## Blockers
None currently.`,
  },
  mobile_app: {
    label: "Mobile App",
    icon: "📱",
    markdown: `# Project Name

## What It Does
A mobile application for [iOS/Android/both] that [does what] for [target users].

## Current Status
concept

## Current Version
1.0

## Tech Stack

### Frontend:
* React Native / Flutter / Expo

### Backend:
* Supabase / Firebase

### DevOps/Hosting:
* App Store / Google Play

## Phases / Roadmap

### Version 1.0 - MVP
**Status:** planned

#### Phase 1 - Setup & Navigation

**Feature: App Foundation**

What it does: Project setup, navigation structure, and auth.

Tasks:
* [ ] Initialize project with Expo / RN CLI
* [ ] Set up navigation structure
* [ ] Implement authentication
* [ ] Set up backend / database

#### Phase 2 - Core Screens

**Feature: Main App Screens**

What it does: Builds the primary screens and user flows.

Tasks:
* [ ] Build home / feed screen
* [ ] Build core feature screen
* [ ] Build profile / settings screen
* [ ] Connect to backend APIs

#### Phase 3 - Polish & Ship

**Feature: Store Submission**

What it does: Final polish and app store submission.

Tasks:
* [ ] UI polish and animations
* [ ] Push notifications
* [ ] App store assets
* [ ] Submit to stores

## Current Progress
In planning phase.

## Still To Complete
* [ ] Complete all phases above

## Notes
None yet.

## Blockers
None currently.`,
  },
};

export default function NewProject() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragover, setDragover] = useState(false);
  const [projectType, setProjectType] = useState("software");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setLoading(true);
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, project_type: projectType }),
    });
    const data = await res.json();
    setMarkdown(data.markdown);
    setLoading(false);
  }

  async function handleSave() {
    if (!markdown.trim()) return;
    setSaving(true);
    const parsed = parseProjectMarkdown(markdown);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...parsed, project_type: projectType }),
    });
    if (res.ok) {
      router.push("/dashboard");
    } else {
      alert("Failed to save project.");
      setSaving(false);
    }
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setMarkdown(text);
      setPrompt("");
    };
    reader.readAsText(file);
  }

  function applyTemplate(key: string) {
    const template = TEMPLATES[key];
    if (!template) return;
    setMarkdown(template.markdown);
    setSelectedTemplate(key);
    setPrompt("");
    // scroll to preview
    setTimeout(() => {
      document.getElementById("markdown-preview")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  return (
    <>
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", background: "var(--bg)" }}>

        {/* TOP BAR */}
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px", height: "56px", borderBottom: "1px solid var(--border)",
          background: "var(--surface)", backdropFilter: "blur(12px)",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <div style={{ fontFamily: "var(--font-syne)", fontSize: "18px", fontWeight: 800, letterSpacing: "3px", color: "var(--cyan)", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "8px", height: "8px", background: "var(--cyan)", borderRadius: "50%", animation: "blink 2s infinite" }} />
            FORGE
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "11px", color: "var(--muted)", letterSpacing: "1px" }}>NEW PROJECT</span>
            <Link href="/dashboard" style={{
              padding: "6px 12px", border: "1px solid var(--border)", borderRadius: "2px",
              color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "11px",
              textDecoration: "none", letterSpacing: "1px",
            }}>← BACK</Link>
          </div>
        </header>

        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 16px" }}>

          <h1 style={{ fontFamily: "var(--font-syne)", fontSize: "24px", fontWeight: 800, color: "var(--text)", marginBottom: "8px" }}>
            Add Project
          </h1>
          <p style={{ fontSize: "12px", color: "var(--muted)", letterSpacing: "1px", marginBottom: "24px" }}>
            Drop a .md file, paste a brain dump, use AI, or start from a template.
          </p>

          {/* PROJECT TYPE SELECTOR */}
          <div style={{ marginBottom: "28px" }}>
            <label style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "10px" }}>
              Project Type
            </label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {PROJECT_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setProjectType(type.value)}
                  style={{
                    padding: "10px 18px",
                    background: projectType === type.value ? "var(--cyan-dim)" : "var(--surface)",
                    border: `1px solid ${projectType === type.value ? "rgba(0,212,255,0.5)" : "var(--border)"}`,
                    color: projectType === type.value ? "var(--cyan)" : "var(--muted)",
                    fontFamily: "var(--font-jetbrains)", fontSize: "12px",
                    borderRadius: "4px", cursor: "pointer", transition: "all 0.2s",
                    letterSpacing: "0.5px", minHeight: "44px",
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* TEMPLATES */}
          <div style={{ marginBottom: "28px" }}>
            <label style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "10px" }}>
              Start from a Template
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "8px" }}>
              {Object.entries(TEMPLATES).map(([key, t]) => (
                <button
                  key={key}
                  onClick={() => applyTemplate(key)}
                  style={{
                    padding: "12px 14px",
                    background: selectedTemplate === key ? "var(--cyan-dim)" : "var(--surface)",
                    border: `1px solid ${selectedTemplate === key ? "rgba(0,212,255,0.5)" : "var(--border)"}`,
                    color: selectedTemplate === key ? "var(--cyan)" : "var(--text)",
                    fontFamily: "var(--font-jetbrains)", fontSize: "11px",
                    borderRadius: "4px", cursor: "pointer", transition: "all 0.2s",
                    textAlign: "left", letterSpacing: "0.5px",
                    display: "flex", alignItems: "center", gap: "8px",
                    minHeight: "44px",
                  }}
                  onMouseEnter={e => {
                    if (selectedTemplate !== key) {
                      e.currentTarget.style.borderColor = "rgba(0,212,255,0.3)";
                      e.currentTarget.style.color = "var(--cyan)";
                    }
                  }}
                  onMouseLeave={e => {
                    if (selectedTemplate !== key) {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.color = "var(--text)";
                    }
                  }}
                >
                  <span style={{ fontSize: "16px" }}>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
            {selectedTemplate && (
              <div style={{ marginTop: "8px", fontSize: "11px", color: "var(--cyan)", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>✓ {TEMPLATES[selectedTemplate].label} template loaded — edit the markdown below then save</span>
                <button onClick={() => { setSelectedTemplate(null); setMarkdown(""); }} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "11px", fontFamily: "var(--font-jetbrains)" }}>clear ✕</button>
              </div>
            )}
          </div>

          {/* DROP ZONE */}
          <div
            onDragOver={e => { e.preventDefault(); setDragover(true); }}
            onDragLeave={() => setDragover(false)}
            onDrop={e => {
              e.preventDefault();
              setDragover(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            onClick={() => document.getElementById("mdFileInput")?.click()}
            style={{
              border: `2px dashed ${dragover ? "var(--cyan)" : "var(--border2)"}`,
              borderRadius: "6px", padding: "32px 20px", textAlign: "center",
              cursor: "pointer", marginBottom: "28px", transition: "all 0.2s",
              background: dragover ? "var(--cyan-dim)" : "transparent",
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📄</div>
            <div style={{ fontFamily: "var(--font-syne)", fontSize: "15px", fontWeight: 700, color: "var(--text)", marginBottom: "6px" }}>
              Drop your .md file here
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)" }}>
              or tap to browse · accepts .md and .txt files
            </div>
            <input
              id="mdFileInput"
              type="file"
              accept=".md,.txt"
              style={{ display: "none" }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>

          {/* DIVIDER */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            <span style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "2px" }}>OR BRAIN DUMP</span>
            <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          </div>

          {/* BRAIN DUMP */}
          <div style={{ marginBottom: "24px" }}>
            <label style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
              {selectedTemplate
  ? "Describe your project — AI will fill in the template details"
  : "Paste everything you know about the project"}
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder={`Dump everything here — messy is fine.\n\nProject: My App\nIt's an AI tool that does X...\nStack: Next.js, Python, Postgres\nDone so far: auth, dashboard\nStill need: payments, deployment\nBlocker: API costs too high`}
              rows={8}
              style={{
                width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "4px", padding: "14px 16px", color: "var(--text)",
                fontFamily: "var(--font-jetbrains)", fontSize: "12px", outline: "none",
                resize: "vertical", lineHeight: 1.7, boxSizing: "border-box",
              }}
            />
            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{
                marginTop: "10px", padding: "12px 20px", width: "100%",
                background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.3)",
                color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "12px",
                letterSpacing: "1px", cursor: "pointer", borderRadius: "2px",
                opacity: loading ? 0.5 : 1, minHeight: "44px",
              }}
            >
              {loading ? "Organizing..." : "Organize with AI →"}
            </button>
          </div>

          {/* MARKDOWN PREVIEW */}
          {markdown && (
            <div id="markdown-preview">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <label style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase" }}>
                  Markdown — review before saving
                </label>
                <button onClick={() => { setMarkdown(""); setSelectedTemplate(null); }} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "11px", cursor: "pointer", fontFamily: "var(--font-jetbrains)", padding: "4px 8px" }}>
                  Clear ✕
                </button>
              </div>
              <textarea
                value={markdown}
                onChange={e => setMarkdown(e.target.value)}
                rows={30}
                style={{
                  width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: "4px", padding: "14px 16px", color: "var(--text)",
                  fontFamily: "var(--font-jetbrains)", fontSize: "12px", outline: "none",
                  resize: "vertical", lineHeight: 1.7, marginBottom: "12px",
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  width: "100%", padding: "14px",
                  background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.3)",
                  color: "var(--cyan)", fontFamily: "var(--font-syne)", fontSize: "12px",
                  fontWeight: 700, letterSpacing: "2px", cursor: "pointer", borderRadius: "4px",
                  opacity: saving ? 0.5 : 1, minHeight: "48px",
                }}
              >
                {saving ? "SAVING..." : "SAVE TO FORGE"}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          textarea {
            font-size: 14px !important;
          }
        }
      `}</style>
    </>
  );
}