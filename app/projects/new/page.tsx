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

export default function NewProject() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragover, setDragover] = useState(false);
  const [projectType, setProjectType] = useState("software");

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

  return (
    <>
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", background: "var(--bg)" }}>

        {/* TOP BAR */}
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px", height: "56px", borderBottom: "1px solid var(--border)",
          background: "rgba(6,10,16,0.9)", backdropFilter: "blur(12px)",
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
            Drop a .md file, paste a brain dump, or use AI to organize your notes.
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
              Paste everything you know about the project
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
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <label style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase" }}>
                  Markdown — review before saving
                </label>
                <button onClick={() => setMarkdown("")} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "11px", cursor: "pointer", fontFamily: "var(--font-jetbrains)", padding: "4px 8px" }}>
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