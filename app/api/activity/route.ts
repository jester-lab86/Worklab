import { NextResponse } from "next/server";
import { Pool } from "pg";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// GET — fetch recent activity, optionally filtered by project
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const query = projectId
    ? `SELECT * FROM activity_log WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2`
    : `SELECT * FROM activity_log ORDER BY created_at DESC LIMIT $1`;

  const params = projectId ? [projectId, limit] : [limit];
  const { rows } = await pool.query(query, params);

  return NextResponse.json(rows);
}

// POST — write a new activity entry
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { project_id, project_name, action, detail } = await req.json();

  if (!project_id || !project_name || !action) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `INSERT INTO activity_log (project_id, project_name, action, detail)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [project_id, project_name, action, detail ?? null]
  );

  return NextResponse.json(rows[0]);
}