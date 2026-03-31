import { Pool } from "pg";

// Pool manages our database connections efficiently
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export default pool;