/**
 * A per-process sliding window: enough to stop one signed-in patient running
 * up a bill on the paid voice and translation services, without a database
 * round trip on every line.
 */
const buckets = new Map<string, number[]>();

export function allowHit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((at) => now - at < windowMs);
  if (hits.length >= limit) return false;
  hits.push(now);
  buckets.set(key, hits);
  return true;
}
