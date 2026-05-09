import { NextResponse } from "next/server";
import { Pool } from "pg";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const PROJECT_COLORS = [
  "#00d4ff", "#7b4fff", "#10b981", "#f59e0b",
  "#ff3b5c", "#06b6d4", "#8b5cf6", "#f97316",
  "#84cc16", "#ec4899", "#14b8a6", "#f43f5e",
];

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await pool.query(`
    SELECT id, name, still_to_complete, status
    FROM projects
    ORDER BY name ASC
  `);

  const calendarTasks: {
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
  }[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  rows.forEach((project, projectIndex) => {
    const color = PROJECT_COLORS[projectIndex % PROJECT_COLORS.length];
    let tasks: any[] = [];

    try {
      const raw = typeof project.still_to_complete === "string"
        ? JSON.parse(project.still_to_complete)
        : project.still_to_complete;
      tasks = Array.isArray(raw) ? raw : [];
    } catch { tasks = []; }

    tasks.forEach((task: any) => {
      if (!task.dueDate) return;
      const due = new Date(task.dueDate);
      due.setHours(0, 0, 0, 0);
      calendarTasks.push({
        taskId: task.id,
        description: task.description,
        done: task.done ?? false,
        dueDate: task.dueDate,
        projectId: project.id,
        projectName: project.name,
        projectColor: color,
        projectStatus: project.status,
        notes: task.notes || "",
        isOverdue: !task.done && due < today,
      });
    });
  });

  return NextResponse.json(calendarTasks);
}