"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";

const BOOT_MESSAGES = [
  "Initializing FORGE kernel...",
  "Loading secure modules...",
  "Establishing encrypted connection...",
  "Verifying system integrity...",
  "Mounting project database...",
  "Calibrating AI inference engine...",
  "Running diagnostics...",
  "All systems nominal.",
  "FORGE ready.",
];

export default function SignIn() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [booting, setBooting] = useState(true);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootMessages, setBootMessages] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    if (!booting) return;

    const total = BOOT_MESSAGES.length;
    let step = 0;

    const interval = setInterval(() => {
      if (step >= total) {
        clearInterval(interval);
        setTimeout(() => setBooting(false), 400);
        return;
      }
      setBootMessages(prev => [...prev, BOOT_MESSAGES[step]]);
      setCurrentMessage(step);
      setBootProgress(Math.round(((step + 1) / total) * 100));
      step++;
    }, 300);

    return () => clearInterval(interval);
  }, [booting]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLocked) return;

    // Step 1 — check if IP is already locked before attempting login
    try {
      const res = await fetch("/api/auth/ip");
      const data = await res.json();

      if (data.locked) {
        setIsLocked(true);
        setError(`Too many failed attempts. Try again in ${data.mins} minute${data.mins === 1 ? "" : "s"}.`);
        return;
      }
    } catch {
      // fall through
    }

    // Step 2 — attempt login
    const result = await signIn("credentials", {
      password,
      redirect: false,
    });

    // Step 3 — report success or failure to lockout tracker
    try {
      await fetch("/api/auth/ip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: result?.ok ?? false }),
      });
    } catch {
      // fall through
    }

    if (result?.ok && !result?.error) {
  window.location.href = "/dashboard";
} else {
      // Step 4 — re-check lockout status after this attempt
      try {
        const res = await fetch("/api/auth/ip");
        const data = await res.json();
        if (data.locked) {
          setIsLocked(true);
          setError(`Too many failed attempts. Try again in ${data.mins} minute${data.mins === 1 ? "" : "s"}.`);
          return;
        }
      } catch {
        // fall through
      }
      setError("Invalid password. Access denied.");
    }
  }

  if (booting) {
    return (
      <main style={{
        minHeight: "100vh", background: "#060a10", display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-jetbrains)", padding: "40px",
      }}>
        <div style={{
          fontFamily: "var(--font-syne)", fontSize: "48px", fontWeight: 800,
          letterSpacing: "8px", color: "#00d4ff", marginBottom: "48px",
          textShadow: "0 0 30px rgba(0,212,255,0.5)",
        }}>
          FORGE
        </div>

        <div style={{
          width: "100%", maxWidth: "480px", marginBottom: "24px",
          height: "220px", overflow: "hidden", display: "flex",
          flexDirection: "column", justifyContent: "flex-end", gap: "4px",
        }}>
          {bootMessages.map((msg, i) => (
            <div key={i} style={{
              fontSize: "11px", letterSpacing: "0.5px", lineHeight: 1.6,
              color: i === bootMessages.length - 1 ? "#00d4ff" : "rgba(0,212,255,0.4)",
              transition: "color 0.3s",
            }}>
              <span style={{ color: "rgba(0,212,255,0.3)", marginRight: "8px" }}>›</span>
              {msg}
              {i === bootMessages.length - 1 && (
                <span style={{ animation: "blink 1s infinite", marginLeft: "4px" }}>_</span>
              )}
            </div>
          ))}
        </div>

        <div style={{ width: "100%", maxWidth: "480px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontSize: "10px", color: "rgba(0,212,255,0.4)", letterSpacing: "2px" }}>
              SYSTEM BOOT
            </span>
            <span style={{ fontSize: "10px", color: "#00d4ff", fontWeight: 700 }}>
              {bootProgress}%
            </span>
          </div>
          <div style={{ background: "rgba(0,212,255,0.1)", height: "2px", borderRadius: "1px", overflow: "hidden" }}>
            <div style={{
              height: "100%", background: "linear-gradient(90deg, #00d4ff, #8b5cf6)",
              width: `${bootProgress}%`, transition: "width 0.3s ease",
              boxShadow: "0 0 10px rgba(0,212,255,0.8)",
            }} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: "100vh", background: "#060a10", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-jetbrains)",
    }}>
      <div style={{
        fontFamily: "var(--font-syne)", fontSize: "48px", fontWeight: 800,
        letterSpacing: "8px", color: "#00d4ff", marginBottom: "8px",
        textShadow: "0 0 30px rgba(0,212,255,0.3)",
      }}>
        FORGE
      </div>
      <p style={{ fontSize: "11px", color: "rgba(0,212,255,0.4)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: "48px" }}>
        Authenticate to continue
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", width: "320px" }}>
        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          disabled={isLocked}
          style={{
            background: "#0b1118", border: `1px solid ${isLocked ? "rgba(239,68,68,0.3)" : "rgba(0,212,255,0.2)"}`,
            color: isLocked ? "rgba(255,255,255,0.3)" : "#fff", padding: "12px 16px", borderRadius: "2px",
            fontFamily: "var(--font-jetbrains)", fontSize: "13px", outline: "none",
            cursor: isLocked ? "not-allowed" : "text",
          }}
        />
        {error && (
          <p style={{ color: "#ef4444", fontSize: "11px", letterSpacing: "0.5px" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isLocked}
          style={{
            background: isLocked ? "rgba(239,68,68,0.05)" : "rgba(0,212,255,0.08)",
            border: `1px solid ${isLocked ? "rgba(239,68,68,0.3)" : "rgba(0,212,255,0.3)"}`,
            color: isLocked ? "#ef4444" : "#00d4ff",
            fontFamily: "var(--font-syne)", fontSize: "12px",
            fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase",
            padding: "12px", borderRadius: "2px",
            cursor: isLocked ? "not-allowed" : "pointer",
          }}
        >
          {isLocked ? "ACCESS LOCKED" : "ACCESS FORGE"}
        </button>
      </form>
    </main>
  );
}