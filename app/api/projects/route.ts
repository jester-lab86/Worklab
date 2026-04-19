// v2
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
      tech_stack_grouped,
      features,
      phases,
      versions,
      current_progress,
      still_to_complete,
      notes,
      blockers,
      priority = 'NORMAL',
      project_type = 'software',
    } = body

    const result = await client.query(
      `INSERT INTO projects
        (name, description, status, version, tech_stack, tech_stack_grouped, features, phases, versions, current_progress, still_to_complete, notes, blockers, priority, project_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        name,
        description,
        status,
        version,
        Array.isArray(tech_stack) ? tech_stack : [],
        JSON.stringify(tech_stack_grouped ?? []),
        JSON.stringify(features ?? []),
        JSON.stringify(phases ?? []),
        JSON.stringify(versions ?? []),
        current_progress ?? '',
        JSON.stringify(still_to_complete ?? []),
        notes,
        blockers,
        priority,
        project_type,
      ]
    )
    return NextResponse.json(result.rows[0])
  } finally {
    client.release()
  }
}