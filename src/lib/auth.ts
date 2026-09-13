import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "shifain_admin";
const MAX_AGE_SECONDS = 60 * 60 * 8;

function secret(): string {
  const value = process.env.ADMIN_SECRET;
  if (value && value.length >= 16) return value;
  // Dev fallback keeps local setup frictionless; production must set ADMIN_SECRET.
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_SECRET must be set (at least 16 characters) in production.");
  }
  return "shifain-development-secret-do-not-use-in-production";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    if (process.env.NODE_ENV === "production") return false;
    return safeEqual(candidate, "shifain-admin");
  }
  return safeEqual(candidate, expected);
}

export function createToken(): string {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `admin.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [subject, expires, signature] = parts;
  const payload = `${subject}.${expires}`;
  if (!safeEqual(signature, sign(payload))) return false;
  return Number(expires) > Date.now();
}

export async function startSession(): Promise<void> {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, createToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export async function isAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return verifyToken(jar.get(ADMIN_COOKIE)?.value);
}
