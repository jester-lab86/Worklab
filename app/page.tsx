"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function Home() {
  const router = useRouter();
  const [bootProgress, setBootProgress] = useState(0);
  const [bootMessages, setBootMessages] = useState<string[]>([]);

  useEffect(() => {
    const total = BOOT_MESSAGES.length;
    let step = 0;

    const interval = setInterval(() => {
      if (step >= total) {
        clearInterval(interval);
        setTimeout(() => router.push("/auth/signin"), 400);
        return;
      }
      setBootMessages(prev => [...prev, BOOT_MESSAGES[step]]);
      setBootProgress(Math.round(((step + 1) / total) * 100));
      step++;
    }, 300);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <main style={{
      minHeight: "100vh", background: "#060a10", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-jetbrains)", padding: "40px",
      position: "relative", zIndex: 1,
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
          <span style={{ fontSize: "10px", color: "rgba(0,212,255,0.4)", letterSpacing: "2px" }}>SYSTEM BOOT</span>
          <span style={{ fontSize: "10px", color: "#00d4ff", fontWeight: 700 }}>{bootProgress}%</span>
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