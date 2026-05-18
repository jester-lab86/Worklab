import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Pool } from "pg";
import DashboardClient from "@/components/DashboardClient";
import { Project } from "@/types";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default async function Dashboard() {
  const session = await auth();
  if (!session) redirect("/auth/signin");

  const result = await pool.query("SELECT * FROM projects ORDER BY created_at DESC");
  const projects: Project[] = result.rows.map(row => ({
  ...row,
  still_to_complete: (() => {
    try {
      let val = row.still_to_complete;
      if (!val) return [];
      // Handle multiple levels of stringification
      while (typeof val === "string") {
        val = JSON.parse(val);
      }
      return Array.isArray(val) ? val : [];
    } catch {
      return [];
    }
  })(),
  versions: (() => {
    try {
      let val = row.versions;
      if (!val) return [];
      while (typeof val === "string") val = JSON.parse(val);
      return Array.isArray(val) ? val : [];
    } catch { return []; }
  })(),
  tech_stack_grouped: (() => {
    try {
      let val = row.tech_stack_grouped;
      if (!val) return [];
      while (typeof val === "string") val = JSON.parse(val);
      return Array.isArray(val) ? val : [];
    } catch { return []; }
  })(),
}));

  return <DashboardClient projects={projects} />;
}