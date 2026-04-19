// lib/rateLimit.ts
// A simple in-memory rate limiter.
// It tracks request counts per IP and rejects if they exceed the limit.
// Note: in-memory means it resets on every Vercel cold start — good enough for a private app.

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(ip: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }

  if (record.count >= limit) {
    return false; // blocked
  }

  record.count++;
  return true; // allowed
}