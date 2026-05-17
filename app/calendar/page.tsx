"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GlobalNav from "@/components/GlobalNav";

interface CalendarTask {
  taskId: string;
  description: string;
  done: boolean;
  dueDate: string;
  projectId: number;
  projectName: string;
  projectColor: string;
  projectStatus: string;
  notes: string;
  isOverdue: boolean;
}

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const router = useRouter();

  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<
    "month" | "week" | "day"
  >("month");

  const [currentDate, setCurrentDate] =
    useState(new Date());

  const [selectedDay, setSelectedDay] =
    useState<string | null>(null);

  const today = new Date();
  const todayStr = toLocalDateStr(today);

  useEffect(() => {
    fetch("/api/calendar")
      .then((r) => r.json())
      .then((data) => {
        setTasks(data);
        setLoading(false);
      });
  }, []);

  function tasksByDate(dateStr: string) {
    return tasks.filter(
      (t) => t.dueDate === dateStr
    );
  }

  const totalScheduled = tasks.length;

  const overdue = tasks.filter(
    (t) => t.isOverdue
  ).length;

  const todayTasks = tasks.filter(
    (t) => t.dueDate === todayStr
  ).length;

  const done = tasks.filter(
    (t) => t.done
  ).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
      }}
    >
      <GlobalNav breadcrumb="CALENDAR" />

      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "20px 16px",
        }}
      >
        {/* KPI STRIP */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, 1fr)",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          {[
            {
              label: "Scheduled",
              value: totalScheduled,
              color: "var(--cyan)",
            },
            {
              label: "Due Today",
              value: todayTasks,
              color: "var(--amber)",
            },
            {
              label: "Overdue",
              value: overdue,
              color:
                overdue > 0
                  ? "var(--red)"
                  : "var(--muted)",
            },
            {
              label: "Complete",
              value: done,
              color: "var(--green)",
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              style={{
                background: "var(--surface)",
                border:
                  "1px solid var(--border)",
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
                  fontFamily:
                    "var(--font-jetbrains)",
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
    </div>
  );
}