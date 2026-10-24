import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { isMailConfigured, send } from "./mailer";
import { emailMatcher, type PatientCase } from "./cases";

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

/** The same keyed hash, for one-time codes kept by sibling modules (phone codes). */
export const keyedHash = (value: string) => sign(`code:${value}`);

export function safeEqual(a: string, b: string): boolean {
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

/** Without "remember me": the cookie ends with the browser, and the session within half a day regardless. */
const SHORT_SESSION_SECONDS = 60 * 60 * 12;

export type SessionOptions = { remember?: boolean };

async function setSession(subject: string, { remember = true }: SessionOptions): Promise<void> {
  const expires = Date.now() + (remember ? MAX_AGE_SECONDS : SHORT_SESSION_SECONDS) * 1000;
  const payload = `${subject}.${expires}`;
  const jar = await cookies();
  jar.set(PATIENT_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge: MAX_AGE_SECONDS } : {}),
  });
}

export async function startPatientSession(phone: string, options: SessionOptions = {}): Promise<void> {
  await setSession(normalisePhone(phone), options);
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

  const identity = readToken(token);
  return identity?.kind === "phone" ? identity.digits : null;
}

// ------------------------------------------------------------ email sign-in

const CODE_TTL_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const RESEND_AFTER_MS = 60 * 1000;

/** What a patient gives us to open an account, before any case exists. */
export type SignUpDetails = {
  firstName: string;
  lastName: string;
  country: string;
  dial: string;
  phone: string;
  locale: string;
  /** How they want to be reached, chosen at sign-up (Telegram or WhatsApp suggested by country). */
  channels?: import("./journey-rules").ContactChannel[];
  mainChannel?: import("./journey-rules").ContactChannel;
  /** Optional; the translator speaks the patient's words in a voice of this gender. */
  gender?: "male" | "female";
};

/**
 * A patient's account: who they are, verified by a code sent to their email.
 * Cases attach to it by that email, so it can exist long before the first case.
 */
export type PatientAccount = SignUpDetails & {
  _id: string; // the email, lower-cased
  email: string;
  /** scrypt hash of the password, once the patient has set one (see patient-password.ts). */
  passwordHash?: string;
  passwordSetAt?: string;
  createdAt: string;
  updatedAt: string;
};

type SignInCode = {
  _id: string;
  email: string;
  codeHash: string;
  attempts: number;
  createdAt: Date;
  expiresAt: Date;
  /** Present when the code finishes a sign-up; the account is created only once the code is entered. */
  signUp?: SignUpDetails | null;
};

const hashCode = (email: string, code: string) =>
  crypto.createHmac("sha256", secret()).update(`${email.toLowerCase()}:${code}`).digest("base64url");

export const normaliseEmail = (value: string) => value.trim().toLowerCase();

export async function getPatientAccount(email: string): Promise<PatientAccount | null> {
  const db = await getDb();
  return db.collection<PatientAccount>("patient_accounts").findOne({ _id: normaliseEmail(email) });
}

/** The account whose phone number this is, if one has it (matched on the last nine digits, as cases are). */
export async function accountForPhone(digits: string): Promise<PatientAccount | null> {
  const tail = normalisePhone(digits).slice(-9);
  if (tail.length < 6) return null;
  const db = await getDb();
  const candidates = await db
    .collection<PatientAccount>("patient_accounts")
    .find({ phone: { $regex: `${tail.slice(-4)}$` } })
    .limit(50)
    .toArray();
  return candidates.find((account) => normalisePhone(`${account.dial}${account.phone}`).endsWith(tail)) ?? null;
}

/** Whether this address may sign in: it has an account, or a case was opened with it. */
async function isKnownEmail(email: string): Promise<boolean> {
  const db = await getDb();
  const [account, record] = await Promise.all([
    db.collection<PatientAccount>("patient_accounts").findOne({ _id: email }, { projection: { _id: 1 } }),
    db.collection<PatientCase>("cases").findOne(
      { $or: [{ "patient.email": emailMatcher(email) }, { accountEmail: emailMatcher(email) }] },
      { projection: { _id: 1 } },
    ),
  ]);
  return Boolean(account || record);
}

function codeEmail(code: string, signUp: boolean): { subject: string; text: string; html: string } {
  const subject = signUp ? "Your Shifain verification code" : "Your Shifain sign-in code";
  const lead = signUp ? "Use this code to finish creating your Shifain account:" : "Use this code to sign in to Shifain:";
  const text = `${lead}\n\n${code}\n\nIt works for the next ${CODE_TTL_MINUTES} minutes. If you did not ask for it, you can ignore this email.`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#0a1a47;max-width:480px;margin:0 auto;padding:24px">
<p style="font-size:20px;font-weight:700;color:#722be4;margin:0 0 16px">Shifain</p>
<p style="font-size:16px;margin:0 0 16px">${lead}</p>
<p style="font-size:32px;font-weight:700;letter-spacing:8px;background:#f4ecff;color:#722be4;text-align:center;border-radius:12px;padding:16px;margin:0 0 16px">${code}</p>
<p style="font-size:14px;color:#3f4a69;margin:0">It works for the next ${CODE_TTL_MINUTES} minutes. If you did not ask for it, you can ignore this email.</p>
</div>`;
  return { subject, text, html };
}

export type CodeRequest =
  /** A code was emailed, or the address is unknown and nothing was sent; the page says the same either way. */
  | { status: "sent" }
  /** The code could not be emailed. It is never shown on the page instead: that would let anyone sign in as anyone. */
  | { status: "mail-failed" }
  /** Development only, with no mail provider: the code, so the flow can be tried locally. */
  | { status: "dev"; code: string };

/**
 * Issues a six-digit code by email, to sign in or to finish signing up.
 *
 * For sign-in, an address we have never seen gets the same answer as one we
 * have — "check your inbox" — so the page cannot be used to find out who is a
 * patient here. A sign-up always gets a code; the account exists only once the
 * code comes back.
 */
export async function requestEmailCode(emailInput: string, signUp: SignUpDetails | null = null): Promise<CodeRequest> {
  const email = normaliseEmail(emailInput);
  if (!signUp && !(await isKnownEmail(email))) return { status: "sent" };

  const now = new Date();
  const db = await getDb();
  // One email a minute per address, so the form cannot be used to flood someone's inbox.
  const recent = await db.collection<SignInCode>("signin_codes").findOne({ _id: email }, { projection: { createdAt: 1 } });
  if (recent && now.getTime() - new Date(recent.createdAt).getTime() < RESEND_AFTER_MS) return { status: "sent" };

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

  await db.collection<SignInCode>("signin_codes").updateOne(
    { _id: email },
    {
      $set: {
        email,
        codeHash: hashCode(email, code),
        attempts: 0,
        createdAt: now,
        expiresAt: new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000),
        signUp,
      },
    },
    { upsert: true },
  );
  await db
    .collection("signin_codes")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_ttl" })
    .catch(() => undefined);

  const message = codeEmail(code, Boolean(signUp));
  if (await send(email, message.subject, message.text, message.html)) return { status: "sent" };

  if (process.env.NODE_ENV !== "production" && !isMailConfigured()) {
    console.info(`[shifain] no mailer configured; sign-in code for ${email}: ${code}`);
    return { status: "dev", code };
  }
  await db.collection<SignInCode>("signin_codes").deleteOne({ _id: email });
  return { status: "mail-failed" };
}

/** Checks a code. For a sign-up, this is when the account is created. Returns the email, or null. */
export async function verifyEmailCode(emailInput: string, code: string): Promise<string | null> {
  const email = normaliseEmail(emailInput);
  const db = await getDb();
  const codes = db.collection<SignInCode>("signin_codes");

  const record = await codes.findOne({ _id: email });
  if (!record || new Date(record.expiresAt).getTime() < Date.now()) return null;

  if (record.attempts >= MAX_ATTEMPTS) {
    await codes.deleteOne({ _id: email });
    return null;
  }

  if (!safeEqual(record.codeHash, hashCode(email, code.replace(/\s/g, "")))) {
    await codes.updateOne({ _id: email }, { $inc: { attempts: 1 } });
    return null;
  }

  // One code, one sign-in.
  await codes.deleteOne({ _id: email });
  if (record.signUp) await saveAccount(email, record.signUp);
  return email;
}

/** Creates the account, or brings an existing one's details up to date. */
async function saveAccount(email: string, details: SignUpDetails): Promise<void> {
  const now = new Date().toISOString();
  const db = await getDb();
  await db.collection<PatientAccount>("patient_accounts").updateOne(
    { _id: email },
    { $set: { ...details, email, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
}

/** A patient signing in with Google has proved the address; give them an account if they have none. */
export async function ensureAccount(email: string, name: string, locale: string, from: { country?: string; phone?: string } = {}): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const [firstName = "", ...rest] = name.trim().split(/\s+/);
  await db.collection<PatientAccount>("patient_accounts").updateOne(
    { _id: normaliseEmail(email) },
    {
      $setOnInsert: {
        email: normaliseEmail(email),
        firstName,
        lastName: rest.join(" "),
        country: from.country ?? "",
        dial: "",
        // A case keeps the number whole ("+998 90 …"); accountForPhone reads dial + phone together.
        phone: from.phone ?? "",
        locale,
        createdAt: now,
        updatedAt: now,
      },
    },
    { upsert: true },
  );
}

export async function startPatientEmailSession(email: string, options: SessionOptions = {}): Promise<void> {
  await setSession(`e:${normaliseEmail(email)}`, options);
}

/** The signed-in patient, by whichever route they used. */
export type PatientIdentity = { kind: "phone"; digits: string } | { kind: "email"; email: string };

export async function currentPatient(): Promise<PatientIdentity | null> {
  const jar = await cookies();
  const token = jar.get(PATIENT_COOKIE)?.value;
  if (!token) return null;

  return readToken(token);
}

/**
 * Reads "<subject>.<expires>.<signature>". The subject of an email session is
 * the address itself, which has dots of its own ("name@gmail.com"), so the
 * token is split from the right: the last two dots are ours.
 */
function readToken(token: string): PatientIdentity | null {
  const signatureAt = token.lastIndexOf(".");
  const expiresAt = token.lastIndexOf(".", signatureAt - 1);
  if (signatureAt <= 0 || expiresAt <= 0) return null;
  const subject = token.slice(0, expiresAt);
  const expires = token.slice(expiresAt + 1, signatureAt);
  const signature = token.slice(signatureAt + 1);
  if (!safeEqual(signature, sign(`${subject}.${expires}`))) return null;
  if (!(Number(expires) > Date.now())) return null;

  return subject.startsWith("e:")
    ? { kind: "email", email: subject.slice(2) }
    : { kind: "phone", digits: subject };
}
