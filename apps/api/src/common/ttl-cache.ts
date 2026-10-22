/**
 * Tiny in-process cache for expensive, shared (not per-organisation) aggregates such as dashboard totals over the whole catalogue.
 * Concurrent callers share one in-flight computation, a failure is never remembered, and a write can drop a whole family of keys
 * (invalidate("regulatory:")) so a new recall or registration shows up straight away on the replica that took the write. Each API replica
 * has its own cache, so another replica can show older numbers for up to the TTL; keep TTLs short.
 */
const store = new Map<string, { at: number; value: Promise<unknown> }>();

export function cached<T>(key: string, ttlMs: number, compute: () => Promise<T>, now = Date.now()): Promise<T> {
  const hit = store.get(key);
  if (hit && now - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = compute();
  store.set(key, { at: now, value });
  value.catch(() => { if (store.get(key)?.value === value) store.delete(key); });
  return value;
}
export function invalidate(prefix: string): void { for (const k of [...store.keys()]) if (k.startsWith(prefix)) store.delete(k); }
export const clearCache = () => store.clear();
