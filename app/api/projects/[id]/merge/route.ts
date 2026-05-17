import { NextResponse } from "next/server";
import { Pool } from "pg";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { versions: incomingVersions } = await req.json();

  const { rows } = await pool.query("SELECT * FROM projects WHERE id = $1", [id]);
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const project = rows[0];
  const existing = typeof project.versions === "string"
    ? JSON.parse(project.versions)
    : (project.versions || []);

  const added = { versions: 0, features: 0, tasks: 0 };
  const skipped = { versions: 0, features: 0, tasks: 0 };
  const merged = [...existing];

  for (const inV of incomingVersions) {
    const existingV = merged.find(v =>
      v.number === inV.number || v.title?.toLowerCase() === inV.title?.toLowerCase()
    );

    if (!existingV) {
      merged.push(inV);
      added.versions++;
      added.features += (inV.features || []).length;
      added.tasks += (inV.phases || []).length;
    } else {
      for (const inF of inV.features || []) {
        const existingF = existingV.features?.find(
          (f: any) => f.name?.toLowerCase() === inF.name?.toLowerCase()
        );
        if (!existingF) {
          existingV.features = [...(existingV.features || []), inF];
          added.features++;
        } else {
          skipped.features++;
        }
      }
      for (const inP of inV.phases || []) {
        const existingP = existingV.phases?.find(
          (p: any) => p.title?.toLowerCase() === inP.title?.toLowerCase()
        );
        if (!existingP) {
          existingV.phases = [...(existingV.phases || []), inP];
          added.tasks++;
        } else {
          skipped.tasks++;
        }
      }
      skipped.versions++;
    }
  }

  await pool.query(
    "UPDATE projects SET versions = $1 WHERE id = $2",
    [JSON.stringify(merged), id]
  );

  return NextResponse.json({ success: true, added, skipped, merged });
}