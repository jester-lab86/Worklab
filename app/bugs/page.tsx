"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GlobalNav from "@/components/GlobalNav";

interface Bug {
  id: number;
  project_id: number;
  project_name: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  reported_by: string;
  created_at: string;
  resolved_at: string | null;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ff3b5c",
  high: "#ff8c00",
  normal: "var(--cyan)",
  low: "var(--muted)",
};

const STATUS_COLORS: Record<string, string> = {
  open: "var(--red)",
  "in-progress": "var(--amber)",
  resolved: "var(--green)",
};

export default function BugsPage() {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("open");
  const [expandedBug, setExpandedBug] = useState<number | null>(null);

  async function load() {
    const res = await fetch("/api/bugs");
    const data = await res.json();
    setBugs(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(bug: Bug, status: string) {
    await fetch(`/api/bugs/${bug.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    load();
  }

  async function deleteBug(id: number) {
    if (!confirm("Delete this bug?")) return;

    await fetch(`/api/bugs/${id}`, {
      method: "DELETE",
    });

    load();
  }

  const projects = [
    ...new Map(
      bugs.map((b) => [b.project_id, b.project_name])
    ).entries(),
  ];

  const filtered = bugs.filter((b) => {
    if (
      projectFilter !== "all" &&
      String(b.project_id) !== projectFilter
    )
      return false;

    if (
      severityFilter !== "all" &&
      b.severity !== severityFilter
    )
      return false;

    if (
      statusFilter !== "all" &&
      b.status !== statusFilter
    )
      return false;

    return true;
  });

  const total = bugs.length;
  const open = bugs.filter(
    (b) => b.status === "open"
  ).length;

  const inProgress = bugs.filter(
    (b) => b.status === "in-progress"
  ).length;

  const critical = bugs.filter(
    (b) =>
      b.severity === "critical" &&
      b.status !== "resolved"
  ).length;

  const resolved = bugs.filter(
    (b) => b.status === "resolved"
  ).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
      }}
    >
      <GlobalNav breadcrumb="BUGS" />

      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "20px 16px",
        }}
      >
        {/* KPI STRIP */}
        <div
          className="bugs-kpi-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          {[
            {
              label: "Total Bugs",
              value: total,
              color: "var(--muted)",
            },
            {
              label: "Open",
              value: open,
              color: "var(--red)",
            },
            {
              label: "In Progress",
              value: inProgress,
              color: "var(--amber)",
            },
            {
              label: "Critical",
              value: critical,
              color: "#ff3b5c",
            },
            {
              label: "Resolved",
              value: resolved,
              color: "var(--green)",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                padding: "14px 16px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: `linear-gradient(90deg, ${kpi.color}, transparent)`,
                }}
              />

              <div
                style={{
                  fontSize: "9px",
                  color: "var(--muted)",
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  marginBottom: "6px",
                  fontFamily: "var(--font-jetbrains)",
                }}
              >
                {kpi.label}
              </div>

              <div
                style={{
                  fontFamily: "var(--font-syne)",
                  fontSize: "28px",
                  fontWeight: 800,
                  color: kpi.color,
                }}
              >
                {kpi.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .bugs-kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}