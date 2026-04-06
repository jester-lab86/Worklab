import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import RoadmapClient from "@/components/RoadmapClient";
import { Project } from "@/types";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function RoadmapPage() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const { rows } = await pool.query(
    "SELECT * FROM projects ORDER BY created_at DESC"
  );

  const projects: Project[] = rows.map((r) => ({
    ...r,
    tech_stack: Array.isArray(r.tech_stack) ? r.tech_stack : [],
    phases: (() => { try { return typeof r.phases === "string" ? JSON.parse(r.phases) : (r.phases || []); } catch { return []; } })(),
    versions: (() => { try { return typeof r.versions === "string" ? JSON.parse(r.versions) : (r.versions || []); } catch { return []; } })(),
  }));

  return <RoadmapClient projects={projects} />;
}