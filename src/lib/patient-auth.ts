import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { send } from "./mailer";
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

// ------------------------------------------------------------ email sign-in

const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;

type SignInCode = {
  _id: string;
  email: string;
  codeHash: string;
  attempts: number;
  createdAt: Date;
  expiresAt: Date;
};

const hashCode = (email: string, code: string) =>
  crypto.createHmac("sha256", secret()).update(`${email.toLowerCase()}:${code}`).digest("base64url");

/**
 * Issues a six-digit code to an email that has a case against it.
 *
 * An address we have never seen gets the same answer as one we have — "check
 * your inbox" — so the page cannot be used to find out who is a patient here.
 */
export async function requestEmailCode(
  emailInput: string,
): Promise<{ delivered: boolean; codeForCoordinator: string | null }> {
  const email = emailInput.trim().toLowerCase();
  const db = await getDb();

  const known = await db.collection<PatientCase>("cases").findOne({ "patient.email": email });
  if (!known) return { delivered: false, codeForCoordinator: null };

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const now = new Date();

  await db.collection<SignInCode>("signin_codes").updateOne(
    { _id: email },
    {
      $set: {
        email,
        codeHash: hashCode(email, code),
        attempts: 0,
        createdAt: now,
        expiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000),
      },
    },
    { upsert: true },
  );
  await db
    .collection("signin_codes")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_ttl" })
    .catch(() => undefined);

  const delivered = await send(
    email,
    "Your ShifaIn sign-in code",
    `Your code is ${code}. It works for the next ${CODE_TTL_MINUTES} minutes.\n\nIf you did not ask for it, you can ignore this email.`,
  );

  // With no mail provider configured the code is still valid; a coordinator
  // reads it out. Better than a sign-in that silently cannot work.
  return { delivered, codeForCoordinator: delivered ? null : code };
}

export async function verifyEmailCode(emailInput: string, code: string): Promise<string | null> {
  const email = emailInput.trim().toLowerCase();
  const db = await getDb();
  const codes = db.collection<SignInCode>("signin_codes");

  const record = await codes.findOne({ _id: email });
  if (!record || record.expiresAt.getTime() < Date.now()) return null;

  if (record.attempts >= MAX_ATTEMPTS) {
    await codes.deleteOne({ _id: email });
    return null;
  }

  if (!safeEqual(record.codeHash, hashCode(email, code.trim()))) {
    await codes.updateOne({ _id: email }, { $inc: { attempts: 1 } });
    return null;
  }

  // One code, one sign-in.
  await codes.deleteOne({ _id: email });
  return email;
}

export async function startPatientEmailSession(email: string): Promise<void> {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `e:${email.toLowerCase()}.${expires}`;
  const jar = await cookies();
  jar.set(PATIENT_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** The signed-in patient, by whichever route they used. */
export type PatientIdentity = { kind: "phone"; digits: string } | { kind: "email"; email: string };

export async function currentPatient(): Promise<PatientIdentity | null> {
  const jar = await cookies();
  const token = jar.get(PATIENT_COOKIE)?.value;
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [subject, expires, signature] = parts;
  if (!safeEqual(signature, sign(`${subject}.${expires}`))) return null;
  if (Number(expires) <= Date.now()) return null;

  return subject.startsWith("e:")
    ? { kind: "email", email: subject.slice(2) }
    : { kind: "phone", digits: subject };
}
