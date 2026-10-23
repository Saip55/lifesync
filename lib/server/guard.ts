import "server-only";
import { createHash, randomBytes } from "node:crypto";

// Abuse protection for the one public endpoint that spends the Gemini key.

// Random per instance, so a stored hash cannot be reversed by trying every IPv4 address.
const SALT = randomBytes(16).toString("hex");

/**
 * True when a browser tells us the request came from another site. Browsers always send
 * Sec-Fetch-Site and Origin on a cross-site POST; tools such as curl send neither and fall
 * through to the rate limit instead.
 */
export function isCrossSite(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

/**
 * A short, salted hash of the caller's address. Raw IPs are never kept, even in memory.
 * On Vercel the platform overwrites x-forwarded-for, so its first entry is the real client.
 */
export function clientKey(req: Request): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(`${SALT}:${ip}`).digest("base64url").slice(0, 16);
}

export type RateDecision = { ok: true } | { ok: false; retryAfterSeconds: number };

/**
 * Sliding-window limiter held in memory. On serverless it limits per warm instance, which
 * stops a single client hammering the key; a shared store (for example Vercel WAF or Redis)
 * would be the next step for a multi-region deployment. The key count is capped so the map
 * itself cannot be used to exhaust memory.
 */
export function createRateLimiter({ limit, windowMs, maxKeys = 5_000 }: { limit: number; windowMs: number; maxKeys?: number }) {
  const hits = new Map<string, number[]>();

  return function check(key: string, now = Date.now()): RateDecision {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    hits.delete(key);
    if (recent.length >= limit) {
      hits.set(key, recent);
      const oldest = recent[0] ?? now;
      return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)) };
    }
    recent.push(now);
    hits.set(key, recent);
    // Maps keep insertion order, and active keys are re-inserted above, so the first key is the stalest.
    if (hits.size > maxKeys) {
      const stalest = hits.keys().next().value;
      if (stalest !== undefined) hits.delete(stalest);
    }
    return { ok: true };
  };
}
