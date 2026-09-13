import crypto from "node:crypto";

// Plain ESM rather than TypeScript so the seeding scripts and the app share
// one implementation. A hash written by the CLI must verify in the app.
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

/** `scrypt$<salt>$<hash>` — self-describing, so the format can move on later. */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, SCRYPT.keylen, SCRYPT);
  return `scrypt$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored).split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  if (expected.length !== SCRYPT.keylen) return false;
  const derived = crypto.scryptSync(password, Buffer.from(salt, "base64url"), expected.length, SCRYPT);
  return crypto.timingSafeEqual(expected, derived);
}
