import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ---- In-memory fallback for local dev (single-process only) ----
const store = new Map<string, { count: number; resetAt: number }>();

function rateLimitInMemory(key: string, limit: number, windowMs: number): boolean {
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

// ---- Upstash (production, works across serverless instances) ----
const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`;
  if (!limiters.has(cacheKey)) {
    limiters.set(
      cacheKey,
      new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(limit, `${windowMs / 1000} s`),
        prefix: "@sway/rl",
      })
    );
  }
  return limiters.get(cacheKey)!;
}

const useUpstash = !!(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
);

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (!useUpstash) return rateLimitInMemory(key, limit, windowMs);
  const { success } = await getLimiter(limit, windowMs).limit(key);
  return success;
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
