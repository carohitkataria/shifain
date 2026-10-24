import "server-only";
import crypto from "node:crypto";
import { getDb } from "./db";
import { accountForPhone, keyedHash, normalisePhone, safeEqual } from "./patient-auth";
import { isWhatsAppConfigured, sendWhatsAppCode } from "./whatsapp";
import type { PatientCase } from "./cases";

/**
 * One-time sign-in codes sent to a mobile number — today on WhatsApp. Kept as
 * a keyed hash, good for ten minutes and five tries, one per minute per number.
 * (Telegram needs no code: the bot confirms the number itself, see telegram-login.ts.)
 */
const TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_AFTER_MS = 60_000;

type PhoneCode = { _id: string; codeHash: string; attempts: number; channel: "whatsapp"; createdAt: Date; expiresAt: Date };

export type PhoneCodeRequest = { status: "sent" } | { status: "failed" } | { status: "invalid" } | { status: "dev"; code: string };

const tailOf = (digits: string) => digits.slice(-9);

/** Whether this number belongs to an account or a case — the only numbers we send codes to. */
async function isKnownPhone(digits: string): Promise<boolean> {
  if (await accountForPhone(digits).catch(() => null)) return true;
  const tail = tailOf(digits);
  const cases = await (await getDb())
    .collection<PatientCase>("cases")
    .find({ "patient.phone": { $regex: `${tail.slice(-4)}$` } }, { projection: { "patient.phone": 1 } })
    .limit(50)
    .toArray();
  return cases.some((record) => normalisePhone(record.patient.phone).endsWith(tail));
}

/**
 * Sends a code. An unknown number gets the same "sent" as a known one, so the
 * form cannot be used to find out who is a patient here.
 */
export async function requestPhoneCode(phoneInput: string): Promise<PhoneCodeRequest> {
  const digits = normalisePhone(phoneInput);
  if (digits.length < 8 || digits.length > 15) return { status: "invalid" };
  if (!(await isKnownPhone(digits))) return { status: "sent" };

  const now = new Date();
  const codes = (await getDb()).collection<PhoneCode>("phone_codes");
  const recent = await codes.findOne({ _id: digits }, { projection: { createdAt: 1 } });
  if (recent && now.getTime() - new Date(recent.createdAt).getTime() < RESEND_AFTER_MS) return { status: "sent" };

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await codes.updateOne(
    { _id: digits },
    { $set: { codeHash: keyedHash(`${digits}:${code}`), attempts: 0, channel: "whatsapp", createdAt: now, expiresAt: new Date(now.getTime() + TTL_MINUTES * 60_000) } },
    { upsert: true },
  );
  await codes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_ttl" }).catch(() => undefined);

  if (await sendWhatsAppCode(digits, code)) return { status: "sent" };
  if (process.env.NODE_ENV !== "production" && !isWhatsAppConfigured()) {
    console.info(`[shifain] no WhatsApp sender configured; sign-in code for ${digits}: ${code}`);
    return { status: "dev", code };
  }
  await codes.deleteOne({ _id: digits });
  return { status: "failed" };
}

/** Checks a code; the number's digits when it is right, otherwise null. One code, one sign-in. */
export async function verifyPhoneCode(phoneInput: string, code: string): Promise<string | null> {
  const digits = normalisePhone(phoneInput);
  const codes = (await getDb()).collection<PhoneCode>("phone_codes");
  const record = await codes.findOne({ _id: digits });
  if (!record || new Date(record.expiresAt).getTime() < Date.now()) return null;
  if (record.attempts >= MAX_ATTEMPTS) {
    await codes.deleteOne({ _id: digits });
    return null;
  }
  if (!safeEqual(record.codeHash, keyedHash(`${digits}:${code.replace(/\s/g, "")}`))) {
    await codes.updateOne({ _id: digits }, { $inc: { attempts: 1 } });
    return null;
  }
  await codes.deleteOne({ _id: digits });
  return digits;
}

/** Whether WhatsApp codes can be offered here: a sender is set up, or this is local development. */
export const canSendPhoneCodes = () => isWhatsAppConfigured() || process.env.NODE_ENV !== "production";
