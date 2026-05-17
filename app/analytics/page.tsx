import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import AnalyticsClient from "@/components/AnalyticsClient";
import { Project } from "@/types";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const { rows } = await pool.query(`
  SELECT
    p.*,
    COALESCE(
      json_agg(
        json_build_object(
          'id', b.id,
          'title', b.title,
          'severity', b.severity,
          'status', b.status
        )
      ) FILTER (WHERE b.id IS NOT NULL),
      '[]'
    ) AS bugs
  FROM projects p
  LEFT JOIN bugs b
    ON b.project_id = p.id
  GROUP BY p.id
  ORDER BY p.created_at DESC
`);

  const projects: Project[] = rows.map((r) => ({
  ...r,

  tech_stack: Array.isArray(r.tech_stack)
    ? r.tech_stack
    : [],

  phases: (() => {
    try {
      return typeof r.phases === "string"
        ? JSON.parse(r.phases)
        : (r.phases || []);
    } catch {
      return [];
    }
  })(),

  versions: (() => {
    try {
      return typeof r.versions === "string"
        ? JSON.parse(r.versions)
        : (r.versions || []);
    } catch {
      return [];
    }
  })(),

  still_to_complete: (() => {
    try {
      return typeof r.still_to_complete === "string"
        ? JSON.parse(r.still_to_complete)
        : (r.still_to_complete || []);
    } catch {
      return [];
    }
  })(),

  bugs: Array.isArray(r.bugs)
    ? r.bugs
    : [],
}));

  return <AnalyticsClient projects={projects} />;
}