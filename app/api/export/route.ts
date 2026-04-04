import { Pool } from "pg";
import { NextResponse } from "next/server";

export async function GET() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const projects = await pool.query("SELECT * FROM projects ORDER BY created_at DESC");
    const features = await pool.query("SELECT * FROM features ORDER BY project_id");
    const phases = await pool.query("SELECT * FROM phases ORDER BY project_id");
    const blockers = await pool.query("SELECT * FROM blockers ORDER BY project_id");

    const data = {
      exported_at: new Date().toISOString(),
      projects: projects.rows,
      features: features.rows,
      phases: phases.rows,
      blockers: blockers.rows,
    };

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="forge-export-${Date.now()}.json"`,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  } finally {
    await pool.end();
  }
}