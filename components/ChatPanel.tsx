"use client";

import { useState, useRef, useEffect } from "react";
import { Project } from "@/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPanel({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
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
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
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
          updated[updated.length - 1] = {
            role: "assistant",
            content: assistantText,
          };
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

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)",
        }}
      />

      {/* Panel */}
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
              borderRadius: "2px", transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--red)";
              e.currentTarget.style.color = "var(--red)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--muted)";
            }}
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
                maxWidth: "85%",
                padding: "10px 14px",
                borderRadius: "4px",
                fontSize: "12px",
                lineHeight: 1.7,
                fontFamily: "var(--font-jetbrains)",
                background: msg.role === "user"
                  ? "rgba(0,212,255,0.1)"
                  : "var(--surface)",
                border: msg.role === "user"
                  ? "1px solid rgba(0,212,255,0.25)"
                  : "1px solid var(--border)",
                color: msg.role === "user" ? "var(--cyan)" : "var(--text)",
                whiteSpace: "pre-wrap",
              }}>
                {msg.content || (
                  <span style={{ opacity: 0.4 }}>▊</span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "16px 20px",
          borderTop: "1px solid var(--border)",
          display: "flex", gap: "8px",
          background: "rgba(0,0,0,0.3)",
        }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Ask about this project..."
            disabled={loading}
            style={{
              flex: 1, background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)", fontFamily: "var(--font-jetbrains)",
              fontSize: "11px", padding: "8px 12px",
              borderRadius: "2px", outline: "none",
              transition: "border-color 0.2s",
              opacity: loading ? 0.6 : 1,
            }}
            onFocus={e => e.target.style.borderColor = "rgba(0,212,255,0.4)"}
            onBlur={e => e.target.style.borderColor = "var(--border)"}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{
              padding: "8px 16px",
              background: loading ? "transparent" : "var(--cyan-dim)",
              border: "1px solid rgba(0,212,255,0.3)",
              color: "var(--cyan)", fontFamily: "var(--font-jetbrains)",
              fontSize: "11px", letterSpacing: "1px",
              borderRadius: "2px", cursor: loading ? "not-allowed" : "pointer",
              opacity: loading || !input.trim() ? 0.5 : 1,
              transition: "all 0.15s",
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