"use client";

import { useEffect, useState } from "react";

interface ActivityEntry {
  id: number;
  project_id: number;
  project_name: string;
  action: string;
  detail: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  "task_completed": "var(--green)",
  "task_uncompleted": "var(--muted)",
  "task_added": "var(--cyan)",
  "task_deleted": "var(--red)",
  "phase_completed": "var(--green)",
  "phase_uncompleted": "var(--muted)",
  "feature_updated": "var(--purple)",
  "status_changed": "var(--amber)",
  "notes_saved": "var(--cyan)",
  "project_created": "var(--green)",
  "project_deleted": "var(--red)",
  "version_updated": "var(--cyan)",
};

const ACTION_ICONS: Record<string, string> = {
  "task_completed": "✓",
  "task_uncompleted": "○",
  "task_added": "+",
  "task_deleted": "✕",
  "phase_completed": "✓",
  "phase_uncompleted": "○",
  "feature_updated": "◆",
  "status_changed": "◈",
  "notes_saved": "📝",
  "project_created": "🚀",
  "project_deleted": "🗑",
  "version_updated": "◈",
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function ActivityFeed({
  projectId,
  limit = 30,
  compact = false,
}: {
  projectId?: string | number;
  limit?: number;
  compact?: boolean;
}) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = projectId
      ? `/api/activity?project_id=${projectId}&limit=${limit}`
      : `/api/activity?limit=${limit}`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        setEntries(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId, limit]);

  if (loading) return (
    <div style={{ padding: "20px", fontSize: "11px", color: "var(--muted)", textAlign: "center" }}>
      Loading activity...
    </div>
  );

  if (entries.length === 0) return (
    <div style={{ padding: "20px", fontSize: "11px", color: "var(--muted)", textAlign: "center" }}>
      No activity yet.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {entries.map((entry, i) => {
        const color = ACTION_COLORS[entry.action] || "var(--cyan)";
        const icon = ACTION_ICONS[entry.action] || "·";
        return (
          <div key={entry.id} style={{
            display: "flex", alignItems: "flex-start", gap: "10px",
            padding: compact ? "8px 20px" : "10px 20px",
            borderBottom: i < entries.length - 1 ? "1px solid var(--border)" : "none",
            transition: "background 0.15s",
          }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface2)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
          >
            {/* Icon */}
            <div style={{
              width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
              background: `${color}18`, border: `1px solid ${color}40`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "9px", color, marginTop: "1px",
            }}>
              {icon}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {!projectId && (
                <span style={{ fontSize: "10px", color: "var(--cyan)", fontFamily: "var(--font-syne)", fontWeight: 700, marginRight: "6px" }}>
                  {entry.project_name}
                </span>
              )}
              <span style={{ fontSize: "11px", color: "var(--text)" }}>
                {entry.detail || entry.action.replace(/_/g, " ")}
              </span>
            </div>

            {/* Time */}
            <span style={{ fontSize: "10px", color: "var(--muted)", flexShrink: 0, fontFamily: "var(--font-jetbrains)" }}>
              {timeAgo(entry.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}