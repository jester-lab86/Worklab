import { NextResponse } from "next/server";
import { Pool } from "pg";
import { auth } from "@/lib/auth";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await pool.query("SELECT * FROM projects ORDER BY created_at DESC");
  return NextResponse.json(result.rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  console.log("POST versions length:", body.versions?.length);
  console.log("POST tech_stack_grouped length:", body.tech_stack_grouped?.length);

  const {
    name, description, status, version,
    tech_stack, tech_stack_grouped,
    features, phases, versions,
    current_progress, still_to_complete,
    notes, blockers
  } = body;

  const result = await pool.query(
    `INSERT INTO projects (
      name, description, status, version,
      tech_stack, tech_stack_grouped,
      features, phases, versions,
      current_progress, still_to_complete,
      notes, blockers
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    RETURNING *`,
    [
      name, description, status, version,
      tech_stack, JSON.stringify(tech_stack_grouped),
      features, JSON.stringify(phases), JSON.stringify(versions),
      current_progress, JSON.stringify(still_to_complete),
notes, blockers
    ]
  );

  return NextResponse.json(result.rows[0], { status: 201 });
}