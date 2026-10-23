import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";
import { hashPassword, verifyPassword } from "./password.mjs";

export const PARTNER_COOKIE = "shifain_partner";
const MAX_AGE_SECONDS = 60 * 60 * 12;

export type PartnerRole = "doctor" | "hospital" | "coordinator";

export type PartnerUser = {
  _id: string;
  email: string;
  name: string;
  role: PartnerRole;
  doctorId: string | null;
  hospitalId: string | null;
  /** Where they practise, and what they earn on a referral. */
  country?: string | null;
  city?: string | null;
  clinic?: string | null;
  specialty?: string | null;
  offerId?: string | null;
  payoutMethod?: string | null;
  payoutDetails?: string | null;
  /** Shareable code behind /r/CODE and the Telegram ?start=ref_CODE link. */
  referralCode?: string | null;
  referralStats?: { clicks?: number };
  /** The partner bot chat their referral updates go to. */
  telegramChatId?: number | null;
  /** How patients reach a coordinator. */
  phone?: string | null;
  telegram?: string | null;
  languages?: string[];
  passwordHash: string;
  status: "invited" | "active" | "suspended";
  createdAt: string;
  lastLoginAt: string | null;
};

/** The signed-in partner, as carried in the cookie. */
export type PartnerSession = { id: string; role: PartnerRole };

export { hashPassword, verifyPassword };

// ------------------------------------------------------------------- sessions

function secret(): string {
  const value = process.env.PARTNER_SECRET || process.env.ADMIN_SECRET;
  if (value && value.length >= 16) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PARTNER_SECRET must be set (at least 16 characters) in production.");
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

function createToken(user: PartnerUser): string {
  const payload = `${user._id}.${user.role}.${Date.now() + MAX_AGE_SECONDS * 1000}`;
  return `${payload}.${sign(payload)}`;
}

function readToken(token: string | undefined): PartnerSession | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [id, role, expires, signature] = parts;
  if (!safeEqual(signature, sign(`${id}.${role}.${expires}`))) return null;
  if (Number(expires) <= Date.now()) return null;
  if (role !== "doctor" && role !== "hospital" && role !== "coordinator") return null;
  return { id, role };
}

export async function startPartnerSession(user: PartnerUser): Promise<void> {
  const jar = await cookies();
  jar.set(PARTNER_COOKIE, createToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endPartnerSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(PARTNER_COOKIE);
}

export async function currentPartnerSession(): Promise<PartnerSession | null> {
  const jar = await cookies();
  return readToken(jar.get(PARTNER_COOKIE)?.value);
}

/**
 * The signed-in partner's record, re-read on every request. A login that has
 * since been suspended stops working immediately rather than at cookie expiry.
 */
export async function currentPartner(): Promise<PartnerUser | null> {
  const session = await currentPartnerSession();
  if (!session) return null;
  const db = await getDb();
  const user = await db.collection<PartnerUser>("partner_users").findOne({ _id: session.id });
  return user && user.status === "active" ? user : null;
}

// ------------------------------------------------------------------- sign-in

/**
 * Verifies a sign-in. Wrong address and wrong password are deliberately
 * indistinguishable, and an unknown address still costs a hash, so the
 * response time does not reveal who has an account.
 */
export async function authenticate(email: string, password: string): Promise<PartnerUser | null> {
  const db = await getDb();
  const user = await db
    .collection<PartnerUser>("partner_users")
    .findOne({ email: email.trim().toLowerCase() });

  if (!user) {
    verifyPassword(password, hashPassword("no-such-user"));
    return null;
  }
  if (!verifyPassword(password, user.passwordHash)) return null;
  if (user.status !== "active") return null;

  await db
    .collection<PartnerUser>("partner_users")
    .updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date().toISOString() } });
  return user;
}
