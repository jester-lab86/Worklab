import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET(req: NextRequest) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) return NextResponse.json([]);

  const result = await pool.query(
    "SELECT * FROM project_notes WHERE project_id = $1 ORDER BY created_at DESC",
    [projectId]
  );

  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { projectId, content } = await req.json();

  if (!projectId || !content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const result = await pool.query(
    "INSERT INTO project_notes (project_id, content) VALUES ($1, $2) RETURNING *",
    [projectId, content]
  );

  return NextResponse.json(result.rows[0]);
}

export async function DELETE(req: NextRequest) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { id } = await req.json();

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await pool.query("DELETE FROM project_notes WHERE id = $1", [id]);

  return NextResponse.json({ success: true });
}