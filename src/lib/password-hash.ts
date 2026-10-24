/**
 * Password hashing for patient accounts: scrypt, a fresh salt each time, the
 * parameters kept in the stored string so they can be raised later.
 * Pure, so it is tested without a database.
 */
import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt) as (password: string, salt: Buffer, keylen: number, options: crypto.ScryptOptions) => Promise<Buffer>;
const PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 32;
export const MIN_PASSWORD = 8;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH, PARAMS);
  return `scrypt$${PARAMS.N}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function passwordMatches(password: string, stored: string): Promise<boolean> {
  const [scheme, n, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const key = await scrypt(password, Buffer.from(salt, "base64url"), KEY_LENGTH, { ...PARAMS, N: Number(n) || PARAMS.N });
  const expected = Buffer.from(hash, "base64url");
  return expected.length === key.length && crypto.timingSafeEqual(key, expected);
}
