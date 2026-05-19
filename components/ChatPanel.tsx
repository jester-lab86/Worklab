"use client";

import { useState, useRef, useEffect } from "react";
import { Project } from "@/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  action?: ActionPayload | null;
}

interface ActionPayload {
  action: "CREATE_TASK" | "ADD_NOTE" | "UPDATE_STATUS" | null;
  confirmed: boolean;
  reply: string;
  data: any;
}

export default function ChatPanel({
  project,
  onClose,
  onTaskCreated,
  onNoteAdded,
  onStatusUpdated,
}: {
  project: Project;
  onClose: () => void;
  onTaskCreated?: (task: { description: string; featureId: string | null }) => void;
  onNoteAdded?: (note: string) => void;
  onStatusUpdated?: (target: string, targetId: string | null, newStatus: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `FORGE AI online. I have full context on **${project.name}**. What do you need, operator?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    const userInput = input.trim();
    setInput("");
    setLoading(true);

    try {
      // Check for action intent first
      const actionRes = await fetch("/api/chat/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput, project }),
      });
      const actionData = await actionRes.json();

      if (actionData.action) {
        // Action detected — show confirmation card
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: actionData.reply,
            action: actionData,
          },
        ]);
        setLoading(false);
        return;
      }

      // No action — normal chat flow
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          project,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantText };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠ Connection lost. Try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function confirmAction(msgIndex: number, payload: ActionPayload) {
    const { action, data } = payload;

    if (action === "CREATE_TASK" && onTaskCreated) {
      onTaskCreated({ description: data.description, featureId: data.featureId ?? null });
    }
    if (action === "ADD_NOTE" && onNoteAdded) {
      onNoteAdded(data.note);
    }
    if (action === "UPDATE_STATUS" && onStatusUpdated) {
      onStatusUpdated(data.target, data.targetId ?? null, data.newStatus);
    }

    // Mark as confirmed in chat
    setMessages((prev) =>
      prev.map((m, i) =>
        i === msgIndex
          ? { ...m, action: { ...payload, confirmed: true } }
          : m
      )
    );
  }

  function cancelAction(msgIndex: number, payload: ActionPayload) {
    setMessages((prev) =>
      prev.map((m, i) =>
        i === msgIndex
          ? { ...m, action: null, content: "Action cancelled." }
          : m
      )
    );
  }

  function renderActionCard(payload: ActionPayload, msgIndex: number) {
    const { action, data, confirmed } = payload;

    const cardColor =
      action === "CREATE_TASK" ? "var(--green)" :
      action === "ADD_NOTE" ? "var(--cyan)" :
      "var(--purple)";

    const label =
      action === "CREATE_TASK" ? "CREATE TASK" :
      action === "ADD_NOTE" ? "ADD NOTE" :
      "UPDATE STATUS";

    const preview =
      action === "CREATE_TASK" ? data.description :
      action === "ADD_NOTE" ? data.note :
      `Set ${data.target} status → ${data.newStatus}`;

    if (confirmed) {
      return (
        <div style={{
          marginTop: "8px", padding: "10px 12px",
          background: "rgba(16,185,129,0.08)",
          border: "1px solid rgba(16,185,129,0.3)",
          borderRadius: "4px", fontSize: "11px",
          color: "var(--green)", fontFamily: "var(--font-jetbrains)",
        }}>
          ✓ {label} — done
        </div>
      );
    }

    return (
      <div style={{
        marginTop: "8px", padding: "12px 14px",
        background: `rgba(0,0,0,0.3)`,
        border: `1px solid ${cardColor}40`,
        borderRadius: "4px",
      }}>
        <div style={{
          fontSize: "9px", letterSpacing: "1.5px", textTransform: "uppercase",
          color: cardColor, fontFamily: "var(--font-jetbrains)",
          marginBottom: "6px", fontWeight: 700,
        }}>
          {label}
        </div>
        <div style={{
          fontSize: "12px", color: "var(--text)",
          fontFamily: "var(--font-jetbrains)", lineHeight: 1.5,
          marginBottom: "10px",
        }}>
          {preview}
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            onClick={() => confirmAction(msgIndex, payload)}
            style={{
              padding: "6px 14px", background: `${cardColor}18`,
              border: `1px solid ${cardColor}50`, color: cardColor,
              fontFamily: "var(--font-jetbrains)", fontSize: "10px",
              letterSpacing: "1px", cursor: "pointer", borderRadius: "2px",
            }}
          >
            CONFIRM
          </button>
          <button
            onClick={() => cancelAction(msgIndex, payload)}
            style={{
              padding: "6px 14px", background: "transparent",
              border: "1px solid var(--border2)", color: "var(--muted)",
              fontFamily: "var(--font-jetbrains)", fontSize: "10px",
              letterSpacing: "1px", cursor: "pointer", borderRadius: "2px",
            }}
          >
            CANCEL
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)",
        }}
      />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "420px", zIndex: 201,
        background: "#080c14",
        borderLeft: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        animation: "slideIn 0.2s ease",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(0,212,255,0.03)",
        }}>
          <div>
            <div style={{
              fontFamily: "var(--font-syne)", fontSize: "13px",
              fontWeight: 800, color: "var(--cyan)", letterSpacing: "2px",
            }}>
              ◈ AI INTEL
            </div>
            <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
              {project.name}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "1px solid var(--border)",
              color: "var(--muted)", cursor: "pointer", padding: "4px 10px",
              fontFamily: "var(--font-jetbrains)", fontSize: "11px",
              borderRadius: "2px",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--red)"; e.currentTarget.style.color = "var(--red)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "20px",
          display: "flex", flexDirection: "column", gap: "12px",
        }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            }}>
              <div style={{
                maxWidth: "85%", padding: "10px 14px", borderRadius: "4px",
                fontSize: "12px", lineHeight: 1.7,
                fontFamily: "var(--font-jetbrains)",
                background: msg.role === "user" ? "rgba(0,212,255,0.1)" : "var(--surface)",
                border: msg.role === "user" ? "1px solid rgba(0,212,255,0.25)" : "1px solid var(--border)",
                color: msg.role === "user" ? "var(--cyan)" : "var(--text)",
                whiteSpace: "pre-wrap",
              }}>
                {msg.content || <span style={{ opacity: 0.4 }}>▊</span>}
                {msg.action && renderActionCard(msg.action, i)}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "16px 20px", borderTop: "1px solid var(--border)",
          display: "flex", gap: "8px", background: "rgba(0,0,0,0.3)",
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask or give a command..."
            disabled={loading}
            style={{
              flex: 1, background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)", fontFamily: "var(--font-jetbrains)",
              fontSize: "11px", padding: "8px 12px",
              borderRadius: "2px", outline: "none",
              opacity: loading ? 0.6 : 1,
            }}
            onFocus={e => e.target.style.borderColor = "rgba(0,212,255,0.4)"}
            onBlur={e => e.target.style.borderColor = "var(--border)"}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              padding: "8px 16px", background: loading ? "transparent" : "var(--cyan-dim)",
              border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)",
              fontFamily: "var(--font-jetbrains)", fontSize: "11px",
              letterSpacing: "1px", borderRadius: "2px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading || !input.trim() ? 0.5 : 1,
            }}
          >
            {loading ? "..." : "SEND"}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}