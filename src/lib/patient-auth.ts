import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";
import type { PatientCase } from "./cases";

export const PATIENT_COOKIE = "shifain_patient";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function secret(): string {
  const value = process.env.PARTNER_SECRET || process.env.ADMIN_SECRET;
  if (value && value.length >= 16) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PARTNER_SECRET must be set (at least 16 characters) in production.");
  }
  return "shifain-development-secret-do-not-use-in-production";
}

const sign = (payload: string) =>
  crypto.createHmac("sha256", secret()).update(payload).digest("base64url");

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Digits only, so "+998 90 123" and "00998901 23" compare the same. */
export function normalisePhone(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^00/, "");
}

/**
 * A patient signs in with their case reference and the phone number they gave
 * us. There is no password to forget and no email to wait for, which matters
 * when someone is anxious and abroad — and the reference is 96 bits of
 * randomness, so it is not something anyone guesses their way into.
 */
export async function authenticatePatient(
  reference: string,
  phone: string,
): Promise<PatientCase | null> {
  const db = await getDb();
  const record = await db
    .collection<PatientCase>("cases")
    .findOne({ _id: reference.trim().toUpperCase() });
  if (!record) return null;

  const given = normalisePhone(phone);
  const known = normalisePhone(record.patient.phone);
  // The last nine digits: the country code is often typed inconsistently, the
  // subscriber number is not.
  if (given.length < 6 || !known.endsWith(given.slice(-9))) return null;
  return record;
}

export async function startPatientSession(phone: string): Promise<void> {
  const digits = normalisePhone(phone);
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${digits}.${expires}`;
  const jar = await cookies();
  jar.set(PATIENT_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endPatientSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(PATIENT_COOKIE);
}

/** The signed-in patient's phone number, or null. */
export async function currentPatientPhone(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(PATIENT_COOKIE)?.value;
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [digits, expires, signature] = parts;
  if (!safeEqual(signature, sign(`${digits}.${expires}`))) return null;
  if (Number(expires) <= Date.now()) return null;
  return digits;
}
