import { NextResponse } from "next/server";
import { Pool } from "pg";
import { auth } from "@/lib/auth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await props.params;
  const result = await pool.query("SELECT * FROM projects WHERE id = $1", [id]);
  if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(result.rows[0]);
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await props.params;
  const body = await req.json();
  const {
    name, description, status, version,
    tech_stack, tech_stack_grouped,
    features, phases, versions,
    current_progress, still_to_complete,
    notes, blockers
  } = body;

  const result = await pool.query(
    `UPDATE projects SET
      name=$1, description=$2, status=$3, version=$4,
      tech_stack=$5, tech_stack_grouped=$6,
      features=$7, phases=$8, versions=$9,
      current_progress=$10, still_to_complete=$11,
      notes=$12, blockers=$13, updated_at=NOW()
    WHERE id=$14 RETURNING *`,
    [
      name, description, status, version,
      tech_stack, JSON.stringify(tech_stack_grouped),
      features, JSON.stringify(phases), JSON.stringify(versions),
      current_progress, still_to_complete,
      notes, blockers, id
    ]
  );

  return NextResponse.json(result.rows[0]);
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await props.params;
  await pool.query("DELETE FROM projects WHERE id = $1", [id]);
  return NextResponse.json({ success: true });
}