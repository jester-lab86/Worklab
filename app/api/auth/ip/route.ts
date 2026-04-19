import { NextResponse } from "next/server";

// Track failed attempts here since this route is called before every login
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

export async function GET(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record && now < record.lockedUntil) {
    const mins = Math.ceil((record.lockedUntil - now) / 60000);
    return NextResponse.json({ ip, locked: true, mins }, { status: 429 });
  }

  return NextResponse.json({ ip, locked: false });
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = await req.json();
  const now = Date.now();

  if (success) {
    loginAttempts.delete(ip);
    return NextResponse.json({ ok: true });
  }

  const record = loginAttempts.get(ip) ?? { count: 0, lockedUntil: 0 };
  record.count++;

  if (record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000;
    record.count = 0;
    console.warn(`[FORGE] IP ${ip} locked out`);
  }

  loginAttempts.set(ip, record);
  return NextResponse.json({ ok: true });
}