import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * Small in-process, per-user limiter for the expensive endpoints (bulk import, exports). It is deliberately simple: each API replica counts
 * on its own, so the real ceiling is the limit times the number of replicas, which is still enough to stop a runaway script or a stuck
 * button. It is not a substitute for a gateway-level limit (Azure Front Door / API Management) once the platform holds real data.
 */
const hits = new Map<string, number[]>();

export function rateLimit(userId: string, key: string, max: number, windowMs: number, now = Date.now()): void {
  const k = `${key}:${userId}`;
  const recent = (hits.get(k) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(k, recent);
    const wait = Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000));
    throw new HttpException({ statusCode: 429, error: "Too Many Requests", message: `Too many requests. Please wait about ${wait < 90 ? `${wait} seconds` : `${Math.ceil(wait / 60)} minutes`} and try again.` }, HttpStatus.TOO_MANY_REQUESTS);
  }
  recent.push(now);
  hits.set(k, recent);
  if (hits.size > 5000) for (const [kk, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(kk);
}

export const resetRateLimits = () => hits.clear();
