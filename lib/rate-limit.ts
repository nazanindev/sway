// Simple in-memory rate limiter. Works for a single-instance deployment.
// For multi-instance, swap the Map for Redis / Upstash.
const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count++;
  return true;
}

// Return the client IP from Next.js request headers.
// On Vercel, x-real-ip is set by the edge and cannot be spoofed.
// Fall back to the *last* entry in x-forwarded-for (also Vercel-appended),
// never the first (which is user-controlled).
export function getIp(req: Request): string {
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ??
    "unknown"
  );
}
