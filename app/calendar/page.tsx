"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const today = new Date();
  const todayStr = toLocalDateStr(today);

  useEffect(() => {
    fetch("/api/calendar")
      .then(r => r.json())
      .then(data => { setTasks(data); setLoading(false); });
  }, []);

  function tasksByDate(dateStr: string) {
    return tasks.filter(t => t.dueDate === dateStr);
  }

  function navigate(dir: number) {
    const d = new Date(currentDate);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  }

  function getHeaderLabel() {
    if (view === "month") return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (view === "week") {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start); end.setDate(end.getDate() + 6);
      return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
    }
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
  }

  // --- MONTH VIEW ---
  function renderMonth() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div>
        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
          {DAYS.map(d => (
            <div key={d} style={{ padding: "8px 4px", textAlign: "center", fontSize: "9px", fontFamily: "var(--font-jetbrains)", letterSpacing: "1px", color: "var(--muted)", fontWeight: 700 }}>{d}</div>
          ))}
        </div>
        {/* Cells */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {cells.map((day, i) => {
            if (!day) return <div key={i} style={{ minHeight: "100px", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", background: "var(--surface)" }} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayTasks = tasksByDate(dateStr);
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDay;
            return (
              <div key={i} onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                style={{ minHeight: "100px", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "6px", cursor: "pointer", background: isSelected ? "var(--surface2)" : isToday ? "rgba(0,212,255,0.04)" : "var(--surface)", transition: "background 0.15s", position: "relative", overflow: "hidden" }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = isToday ? "rgba(0,212,255,0.04)" : "var(--surface)"; }}
              >
                {/* Today indicator */}
                {isToday && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "var(--cyan)" }} />}
                <div style={{ fontFamily: "var(--font-syne)", fontSize: "12px", fontWeight: isToday ? 800 : 600, color: isToday ? "var(--cyan)" : "var(--text)", marginBottom: "4px" }}>{day}</div>
                {/* Task pills */}
                {dayTasks.slice(0, 3).map(task => (
                  <div key={task.taskId} onClick={e => { e.stopPropagation(); router.push(`/projects/${task.projectId}`); }}
                    style={{ padding: "2px 5px", borderRadius: "2px", marginBottom: "2px", fontSize: "10px", fontFamily: "var(--font-jetbrains)", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", background: task.done ? "rgba(100,100,100,0.15)" : task.isOverdue ? "rgba(239,68,68,0.15)" : `${task.projectColor}18`, border: `1px solid ${task.done ? "rgba(100,100,100,0.2)" : task.isOverdue ? "rgba(239,68,68,0.3)" : `${task.projectColor}40`}`, color: task.done ? "var(--muted)" : task.isOverdue ? "var(--red)" : task.projectColor, textDecoration: task.done ? "line-through" : "none" }}>
                    {task.description}
                  </div>
                ))}
                {dayTasks.length > 3 && <div style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)" }}>+{dayTasks.length - 3} more</div>}
              </div>
            );
          })}
        </div>
        {/* Selected day panel */}
        {selectedDay && tasksByDate(selectedDay).length > 0 && (
          <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", background: "var(--surface2)" }}>
            <div style={{ fontSize: "10px", color: "var(--muted)", letterSpacing: "1px", fontFamily: "var(--font-jetbrains)", marginBottom: "10px", textTransform: "uppercase" }}>{selectedDay}</div>
            {tasksByDate(selectedDay).map(task => <TaskRow key={task.taskId} task={task} />)}
          </div>
        )}
      </div>
    );
  }

  // --- WEEK VIEW ---
  function renderWeek() {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start); d.setDate(d.getDate() + i);
      return d;
    });
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
          {days.map((d, i) => {
            const dateStr = toLocalDateStr(d);
            const isToday = dateStr === todayStr;
            return (
              <div key={i} style={{ padding: "12px 8px", borderRight: "1px solid var(--border)", textAlign: "center", background: isToday ? "rgba(0,212,255,0.04)" : "var(--surface)", position: "relative" }}>
                {isToday && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "var(--cyan)" }} />}
                <div style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", letterSpacing: "1px", marginBottom: "4px" }}>{DAYS[d.getDay()]}</div>
                <div style={{ fontFamily: "var(--font-syne)", fontSize: "18px", fontWeight: 800, color: isToday ? "var(--cyan)" : "var(--text)" }}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {days.map((d, i) => {
            const dateStr = toLocalDateStr(d);
            const dayTasks = tasksByDate(dateStr);
            const isToday = dateStr === todayStr;
            return (
              <div key={i} style={{ minHeight: "200px", borderRight: "1px solid var(--border)", padding: "8px", background: isToday ? "rgba(0,212,255,0.02)" : "var(--surface)" }}>
                {dayTasks.map(task => (
                  <div key={task.taskId} onClick={() => router.push(`/projects/${task.projectId}`)}
                    style={{ padding: "4px 6px", borderRadius: "2px", marginBottom: "4px", fontSize: "10px", fontFamily: "var(--font-jetbrains)", cursor: "pointer", background: task.done ? "rgba(100,100,100,0.1)" : task.isOverdue ? "rgba(239,68,68,0.12)" : `${task.projectColor}15`, border: `1px solid ${task.done ? "rgba(100,100,100,0.15)" : task.isOverdue ? "rgba(239,68,68,0.25)" : `${task.projectColor}35`}`, color: task.done ? "var(--muted)" : task.isOverdue ? "var(--red)" : task.projectColor, textDecoration: task.done ? "line-through" : "none", lineHeight: 1.4 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.description}</div>
                    <div style={{ fontSize: "9px", opacity: 0.7, marginTop: "2px" }}>{task.projectName}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- DAY VIEW ---
  function renderDay() {
    const dateStr = toLocalDateStr(currentDate);
    const dayTasks = tasksByDate(dateStr);
    const isToday = dateStr === todayStr;
    return (
      <div style={{ padding: "20px" }}>
        <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ fontFamily: "var(--font-syne)", fontSize: "32px", fontWeight: 800, color: isToday ? "var(--cyan)" : "var(--text)" }}>{currentDate.getDate()}</div>
          <div>
            <div style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)" }}>{DAYS[currentDate.getDay()]}</div>
            {isToday && <div style={{ fontSize: "10px", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", letterSpacing: "1px" }}>TODAY</div>}
          </div>
        </div>
        {dayTasks.length === 0 ? (
          <div style={{ fontSize: "13px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)" }}>No tasks due today.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {dayTasks.map(task => <TaskRow key={task.taskId} task={task} />)}
          </div>
        )}
      </div>
    );
  }

  function TaskRow({ task }: { task: CalendarTask }) {
    return (
      <div onClick={() => router.push(`/projects/${task.projectId}`)}
        style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "4px", cursor: "pointer", background: task.done ? "rgba(100,100,100,0.08)" : task.isOverdue ? "rgba(239,68,68,0.08)" : `${task.projectColor}10`, border: `1px solid ${task.done ? "rgba(100,100,100,0.15)" : task.isOverdue ? "rgba(239,68,68,0.25)" : `${task.projectColor}30`}`, transition: "opacity 0.15s" }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.8"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}
      >
        <div style={{ width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0, background: task.done ? "var(--muted)" : task.isOverdue ? "var(--red)" : task.projectColor, boxShadow: task.done ? "none" : `0 0 6px ${task.isOverdue ? "var(--red)" : task.projectColor}` }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "12px", fontFamily: "var(--font-jetbrains)", color: task.done ? "var(--muted)" : "var(--text)", textDecoration: task.done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.description}</div>
          <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>{task.projectName}</div>
        </div>
        {task.isOverdue && !task.done && <span style={{ fontSize: "9px", color: "var(--red)", fontFamily: "var(--font-jetbrains)", fontWeight: 700, letterSpacing: "1px", flexShrink: 0 }}>OVERDUE</span>}
        {task.done && <span style={{ fontSize: "9px", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", flexShrink: 0 }}>✓</span>}
      </div>
    );
  }

  // Stats
  const totalScheduled = tasks.length;
  const overdue = tasks.filter(t => t.isOverdue).length;
  const todayTasks = tasks.filter(t => t.dueDate === todayStr).length;
  const done = tasks.filter(t => t.done).length;

  return (
  <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
    <GlobalNav breadcrumb="CALENDAR" />

    <div
      style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "20px 16px",
      }}
    >
        {/* KPI STRIP */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
          {[
            { label: "Scheduled", value: totalScheduled, color: "var(--cyan)" },
            { label: "Due Today", value: todayTasks, color: "var(--amber)" },
            { label: "Overdue", value: overdue, color: overdue > 0 ? "var(--red)" : "var(--muted)" },
            { label: "Complete", value: done, color: "var(--green)" },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", padding: "14px 16px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${kpi.color}, transparent)` }} />
              <div style={{ fontSize: "9px", color: "var(--muted)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px", fontFamily: "var(--font-jetbrains)" }}>{kpi.label}</div>
              <div style={{ fontFamily: "var(--font-syne)", fontSize: "28px", fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* CALENDAR CARD */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
          {/* Calendar toolbar */}
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button onClick={() => navigate(-1)} style={{ background: "none", border: "1px solid var(--border2)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "14px", padding: "4px 10px", borderRadius: "2px", cursor: "pointer" }}>‹</button>
              <button onClick={() => setCurrentDate(new Date())} style={{ background: "var(--cyan-dim)", border: "1px solid rgba(0,212,255,0.3)", color: "var(--cyan)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", padding: "4px 10px", borderRadius: "2px", cursor: "pointer", letterSpacing: "1px" }}>TODAY</button>
              <button onClick={() => navigate(1)} style={{ background: "none", border: "1px solid var(--border2)", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "14px", padding: "4px 10px", borderRadius: "2px", cursor: "pointer" }}>›</button>
              <span style={{ fontFamily: "var(--font-syne)", fontSize: "14px", fontWeight: 700, color: "var(--text)" }}>{getHeaderLabel()}</span>
            </div>
            <div style={{ display: "flex", borderRadius: "2px", overflow: "hidden", border: "1px solid var(--border2)" }}>
              {(["month", "week", "day"] as const).map(v => (
                <button key={v} onClick={() => setView(v)} style={{ padding: "6px 14px", background: view === v ? "var(--cyan-dim)" : "transparent", border: "none", color: view === v ? "var(--cyan)" : "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "10px", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase" }}>{v}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)", fontFamily: "var(--font-jetbrains)", fontSize: "12px", letterSpacing: "2px" }}>LOADING...</div>
          ) : (
            <>
              {view === "month" && renderMonth()}
              {view === "week" && renderWeek()}
              {view === "day" && renderDay()}
            </>
          )}
        </div>
      </div>

      <style>{`
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
`}</style>
    </div>
);
}