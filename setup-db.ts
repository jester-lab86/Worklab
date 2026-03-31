import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function setup() {
  await pool.query(`
    ALTER TABLE projects
      ADD COLUMN IF NOT EXISTS tech_stack_grouped JSONB,
      ADD COLUMN IF NOT EXISTS versions JSONB;
  `);
  console.log("✅ Database schema updated.");
  await pool.end();
}

setup().catch(console.error);