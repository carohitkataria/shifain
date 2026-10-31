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

/** Forgets keys whose window has run out. O(keys), so only every SWEEP_EVERY calls. */
function dropExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    const last = bucket.hits[bucket.hits.length - 1] ?? 0;
    if (now - last >= bucket.windowMs) buckets.delete(key);
  }
}

/**
 * At the cap, drop the oldest tenth in one go (a Map keeps insertion order),
 * so a flood of new keys costs a trim every few thousand calls, not a scan
 * of every key on every call.
 */
function trimOldest(): void {
  const target = Math.floor(MAX_KEYS * 0.9);
  for (const key of buckets.keys()) {
    if (buckets.size <= target) break;
    buckets.delete(key);
  }
}

export function allowHit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (++calls % SWEEP_EVERY === 0) dropExpired(now);
  if (buckets.size >= MAX_KEYS && !buckets.has(key)) trimOldest();
  const hits = (buckets.get(key)?.hits ?? []).filter((at) => now - at < windowMs);
  if (hits.length >= limit) return false;
  hits.push(now);
  buckets.delete(key); // re-inserted last, so the cap drops idle keys first
  buckets.set(key, { hits, windowMs });
  return true;
}

/** How many keys are held; for tests. */
export const trackedKeys = () => buckets.size;
