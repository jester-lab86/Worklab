import { Pool } from "pg";
import { NextResponse } from "next/server";

export async function GET() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const projects = await pool.query("SELECT * FROM projects ORDER BY created_at DESC");

    const data = {
      exported_at: new Date().toISOString(),
      projects: projects.rows,
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