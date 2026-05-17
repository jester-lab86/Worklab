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
        {/* CALENDAR CARD */}
<div
  style={{
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "4px",
    overflow: "hidden",
  }}
>
  {/* Calendar toolbar */}
  <div
    style={{
      padding: "14px 20px",
      borderBottom: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "10px",
    }}
  >
    <span
      style={{
        fontFamily: "var(--font-syne)",
        fontSize: "14px",
        fontWeight: 700,
        color: "var(--text)",
      }}
    >
      {MONTHS[currentDate.getMonth()]}{" "}
      {currentDate.getFullYear()}
    </span>

    <div
      style={{
        display: "flex",
        borderRadius: "2px",
        overflow: "hidden",
        border: "1px solid var(--border2)",
      }}
    >
      {(["month", "week", "day"] as const).map(
        (v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: "6px 14px",
              background:
                view === v
                  ? "var(--cyan-dim)"
                  : "transparent",
              border: "none",
              color:
                view === v
                  ? "var(--cyan)"
                  : "var(--muted)",
              fontFamily:
                "var(--font-jetbrains)",
              fontSize: "10px",
              cursor: "pointer",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            {v}
          </button>
        )
      )}
    </div>
  </div>

{loading ? (
  <div
    style={{
      padding: "40px",
      textAlign: "center",
      color: "var(--muted)",
      fontFamily: "var(--font-jetbrains)",
      fontSize: "12px",
      letterSpacing: "2px",
    }}
  >
    LOADING...
  </div>
) : (
  <div>
    {/* DAYS HEADER */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {DAYS.map((day) => (
        <div
          key={day}
          style={{
            padding: "12px",
            textAlign: "center",
            fontSize: "10px",
            letterSpacing: "1px",
            color: "var(--muted)",
            borderRight: "1px solid var(--border)",
          }}
        >
          {day}
        </div>
      ))}
    </div>

    {/* CALENDAR GRID */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
      }}
    >
      {Array.from({
        length: new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0
        ).getDate(),
      }).map((_, i) => {
        const day = i + 1;

        const date = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          day
        );

        const dateStr = toLocalDateStr(date);

        const dayTasks = tasksByDate(dateStr);

        const isToday = dateStr === todayStr;

        return (
          <div
            key={dateStr}
            onClick={() =>
              setSelectedDay(dateStr)
            }
            style={{
              minHeight: "140px",
              borderRight:
                "1px solid var(--border)",
              borderBottom:
                "1px solid var(--border)",
              padding: "10px",
              cursor: "pointer",
              background: isToday
                ? "rgba(0,212,255,0.04)"
                : "transparent",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 700,
                marginBottom: "8px",
                color: isToday
                  ? "var(--cyan)"
                  : "var(--text)",
              }}
            >
              {day}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {dayTasks
                .slice(0, 4)
                .map((task) => (
                  <div
                    key={task.taskId}
                    style={{
                      background:
                        task.done
                          ? "rgba(16,185,129,0.12)"
                          : task.isOverdue
                          ? "rgba(255,59,92,0.12)"
                          : "rgba(0,212,255,0.08)",
                      border: task.done
                        ? "1px solid rgba(16,185,129,0.2)"
                        : task.isOverdue
                        ? "1px solid rgba(255,59,92,0.2)"
                        : "1px solid rgba(0,212,255,0.15)",
                      borderRadius: "2px",
                      padding: "5px 6px",
                      fontSize: "10px",
                      lineHeight: 1.4,
                      color: task.done
                        ? "var(--green)"
                        : task.isOverdue
                        ? "#ff3b5c"
                        : "var(--cyan)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {task.description}
                  </div>
                ))}

              {dayTasks.length > 4 && (
                <div
                  style={{
                    fontSize: "9px",
                    color: "var(--muted)",
                  }}
                >
                  +{dayTasks.length - 4} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
)}
</div>
      </div>
    </div>
  );
}