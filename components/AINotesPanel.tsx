"use client";

import { useState, useEffect } from "react";

interface Note {
  id: number;
  project_id: number;
  content: string;
  created_at: string;
}

export default function AINotesPanel({ projectId }: { projectId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetch(`/api/notes?projectId=${projectId}`)
      .then(r => r.json())
      .then(data => setNotes(Array.isArray(data) ? data : []));
  }, [projectId]);

  async function deleteNote(id: number) {
    await fetch("/api/notes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setNotes(prev => prev.filter(n => n.id !== id));
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    }) + " · " + d.toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit",
    });
  }

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "4px",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div
        onClick={() => setCollapsed(p => !p)}
        style={{
          padding: "14px 20px",
          borderBottom: collapsed ? "none" : "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ color: "var(--muted)", fontSize: "10px" }}>
            {collapsed ? "▶" : "▼"}
          </span>
          <span style={{
            fontFamily: "var(--font-syne)", fontSize: "12px",
            fontWeight: 700, letterSpacing: "1px", color: "var(--cyan)",
          }}>
            AI NOTES
          </span>
          {notes.length > 0 && (
            <span style={{ fontSize: "10px", color: "var(--muted)" }}>
              {notes.length}
            </span>
          )}
        </div>
        <span style={{
          fontSize: "9px", color: "var(--muted)",
          fontFamily: "var(--font-jetbrains)", letterSpacing: "1px",
        }}>
          via AI INTEL
        </span>
      </div>

      {/* Notes list */}
      {!collapsed && (
        <div style={{ padding: notes.length === 0 ? "20px" : "8px 0" }}>
          {notes.length === 0 ? (
            <div style={{
              fontSize: "12px", color: "var(--muted)",
              textAlign: "center", fontFamily: "var(--font-jetbrains)",
            }}>
              No AI notes yet — tell the AI to add a note.
            </div>
          ) : (
            notes.map(note => (
              <div
                key={note.id}
                style={{
                  padding: "12px 20px",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  gap: "12px",
                  alignItems: "flex-start",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = "var(--surface2)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: "12px", color: "var(--text)",
                    fontFamily: "var(--font-jetbrains)",
                    lineHeight: 1.6, marginBottom: "4px",
                  }}>
                    {note.content}
                  </div>
                  <div style={{
                    fontSize: "9px", color: "var(--muted)",
                    fontFamily: "var(--font-jetbrains)", letterSpacing: "0.5px",
                  }}>
                    {formatDate(note.created_at)}
                  </div>
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  style={{
                    background: "none", border: "none",
                    color: "var(--muted)", cursor: "pointer",
                    fontSize: "14px", padding: "0 4px",
                    minWidth: "24px", flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.color = "var(--red)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.color = "var(--muted)";
                  }}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}