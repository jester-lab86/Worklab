import { NextResponse } from "next/server";
import { Pool } from "pg";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// GET — fetch bugs (all or by project)
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");

  const query = projectId
    ? `SELECT b.*, p.name as project_name FROM bugs b JOIN projects p ON p.id = b.project_id WHERE b.project_id = $1 ORDER BY b.created_at DESC`
    : `SELECT b.*, p.name as project_name FROM bugs b JOIN projects p ON p.id = b.project_id ORDER BY b.created_at DESC`;

  const { rows } = await pool.query(query, projectId ? [projectId] : []);
  return NextResponse.json(rows);
}

// POST — create a bug
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { project_id, title, description, severity, reported_by } = await req.json();
  if (!project_id || !title?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { rows } = await pool.query(`
    INSERT INTO bugs (project_id, title, description, severity, status, reported_by)
    VALUES ($1, $2, $3, $4, 'open', $5)
    RETURNING *
  `, [project_id, title.trim(), description?.trim() || null, severity || "normal", reported_by || "self"]);

  return NextResponse.json(rows[0]);
}