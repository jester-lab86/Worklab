import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// PATCH — update a bug
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const {
    title,
    description,
    severity,
    status,
    reported_by,
  } = await req.json();

  const { rows } = await pool.query(
    `
    UPDATE bugs SET
      title = COALESCE($1, title),
      description = COALESCE($2, description),
      severity = COALESCE($3, severity),
      status = COALESCE($4, status),
      reported_by = COALESCE($5, reported_by),
      resolved_at = CASE
        WHEN $4 = 'resolved' THEN NOW()
        WHEN $4 = 'open' OR $4 = 'in-progress' THEN NULL
        ELSE resolved_at
      END
    WHERE id = $6
    RETURNING *
    `,
    [title, description, severity, status, reported_by, id]
  );

  return NextResponse.json(rows[0]);
}

// DELETE — delete a bug
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";

  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  await pool.query("DELETE FROM bugs WHERE id = $1", [id]);

  return NextResponse.json({ success: true });
}