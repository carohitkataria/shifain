/**
 * A per-process sliding window: enough to stop one signed-in patient running
 * up a bill on the paid voice and translation services, without a database
 * round trip on every line.
 *
 * Keys can come from callers (a chat cookie anyone can change), so the map is
 * bounded: windows that have run out are swept regularly, and past a hard cap
 * the oldest keys go first.
 */
type Bucket = { hits: number[]; windowMs: number };

const buckets = new Map<string, Bucket>();
const SWEEP_EVERY = 1_000;
const MAX_KEYS = 50_000;
let calls = 0;

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    const last = bucket.hits[bucket.hits.length - 1] ?? 0;
    if (now - last >= bucket.windowMs) buckets.delete(key);
  }
  // Still too many live keys: drop the oldest (a Map keeps insertion order).
  for (const key of buckets.keys()) {
    if (buckets.size <= MAX_KEYS) break;
    buckets.delete(key);
  }
}

export function allowHit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (++calls % SWEEP_EVERY === 0 || buckets.size > MAX_KEYS) sweep(now);
  const hits = (buckets.get(key)?.hits ?? []).filter((at) => now - at < windowMs);
  if (hits.length >= limit) return false;
  hits.push(now);
  buckets.delete(key); // re-inserted last, so the cap drops idle keys first
  buckets.set(key, { hits, windowMs });
  return true;
}

/** How many keys are held; for tests. */
export const trackedKeys = () => buckets.size;
