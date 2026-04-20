import { NextResponse } from "next/server";
import { Pool } from "pg";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// GET — fetch all dependencies for a project (both directions)
export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");
  if (!projectId) return NextResponse.json({ error: "Missing project_id" }, { status: 400 });

  // Fetch projects this one depends on
  const dependsOn = await pool.query(`
    SELECT pd.id, pd.notes, pd.dependency_type, pd.created_at,
           p.id as project_id, p.name, p.status, p.priority, p.version, p.blockers
    FROM project_dependencies pd
    JOIN projects p ON p.id = pd.to_project_id
    WHERE pd.from_project_id = $1
    ORDER BY p.name ASC
  `, [projectId]);

  // Fetch projects that depend on this one
  const dependedOnBy = await pool.query(`
    SELECT pd.id, pd.notes, pd.dependency_type, pd.created_at,
           p.id as project_id, p.name, p.status, p.priority, p.version, p.blockers
    FROM project_dependencies pd
    JOIN projects p ON p.id = pd.from_project_id
    WHERE pd.to_project_id = $1
    ORDER BY p.name ASC
  `, [projectId]);

  return NextResponse.json({
    depends_on: dependsOn.rows,
    depended_on_by: dependedOnBy.rows,
  });
}

// POST — create a new dependency link
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { from_project_id, to_project_id, notes } = await req.json();

  if (!from_project_id || !to_project_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (from_project_id === to_project_id) {
    return NextResponse.json({ error: "A project cannot depend on itself" }, { status: 400 });
  }

  try {
    const { rows } = await pool.query(`
      INSERT INTO project_dependencies (from_project_id, to_project_id, notes)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [from_project_id, to_project_id, notes ?? null]);

    return NextResponse.json(rows[0]);
  } catch (err: any) {
    if (err.code === "23505") {
      return NextResponse.json({ error: "Dependency already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE — remove a dependency link
export async function DELETE(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await pool.query("DELETE FROM project_dependencies WHERE id = $1", [id]);
  return NextResponse.json({ success: true });
}