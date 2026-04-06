import { NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function GET() {
  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT * FROM projects
      ORDER BY
        CASE priority
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH'     THEN 2
          WHEN 'NORMAL'   THEN 3
          WHEN 'BACKLOG'  THEN 4
          ELSE 5
        END,
        created_at DESC
    `)
    return NextResponse.json(result.rows)
  } finally {
    client.release()
  }
}

export async function POST(req: Request) {
  const client = await pool.connect()
  try {
    const body = await req.json()
    const {
      name,
      description,
      status,
      version,
      tech_stack,
      features,
      roadmap,
      notes,
      blockers,
      priority = 'NORMAL',
    } = body

    const result = await client.query(
      `INSERT INTO projects
        (name, description, status, version, tech_stack, features, roadmap, notes, blockers, priority)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [name, description, status, version, tech_stack, features, roadmap, notes, blockers, priority]
    )
    return NextResponse.json(result.rows[0])
  } finally {
    client.release()
  }
}