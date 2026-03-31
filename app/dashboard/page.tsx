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
  const projects: Project[] = result.rows;

  return <DashboardClient projects={projects} />;
}