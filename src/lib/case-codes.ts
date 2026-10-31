import "server-only";
import crypto from "node:crypto";
import { getDb } from "./db";
import { keyedHash, safeEqual } from "./patient-auth";
import { normalisePhone, phonesMatch } from "./access-rules";
import { isMailConfigured, send } from "./mailer";
import { isWhatsAppConfigured, sendWhatsAppCode } from "./whatsapp";
import { isTelegramConfigured, sendMessage } from "./telegram";
import type { TelegramContact } from "./crm-messages";
import type { PatientCase } from "./cases";
import { toUzCyrillic } from "./uz-cyrillic";

/**
 * Proof that the person asking is the patient: a one-time code sent to a
 * contact already on the case — the Telegram chat linked to it, WhatsApp on
 * the case's own number, or the case's email. Never to a number or address
 * typed in the conversation, so knowing someone's case number and phone is
 * not enough to get in. Kept as a keyed hash, ten minutes, five tries, one
 * code a minute per case.
 */
const TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_AFTER_MS = 60_000;

export type CodeChannel = "telegram" | "whatsapp" | "email";

type CaseCode = { _id: string; codeHash: string; attempts: number; via: CodeChannel; createdAt: Date; expiresAt: Date };

export type CaseCodeRequest =
  | { status: "sent"; via: CodeChannel }
  /** Too soon after the last one; that code still works. */
  | { status: "wait" }
  /** No contact on the case can receive a code; a coordinator has to help. */
  | { status: "none" }
  | { status: "failed" }
  /** Development only, with nothing to send through. */
  | { status: "dev"; via: CodeChannel; code: string };

const WORDS = {
  en: { text: "Your Shifain code for case {ref} is {code}. It works for 10 minutes. If you did not ask for it, ignore this message.", subject: "Your Shifain code" },
  ru: { text: "Ваш код Shifain для заявки {ref}: {code}. Он действует 10 минут. Если вы его не запрашивали, просто проигнорируйте это сообщение.", subject: "Ваш код Shifain" },
  uz: { text: "{ref} arizasi uchun Shifain kodingiz: {code}. U 10 daqiqa amal qiladi. Agar siz so'ramagan bo'lsangiz, bu xabarga e'tibor bermang.", subject: "Shifain kodingiz" },
} as const;

function wordsFor(locale: string | null | undefined, ref: string, code: string): { text: string; subject: string } {
  const lang = locale === "ru" ? "ru" : locale === "uz" || locale === "oz" ? "uz" : "en";
  const text = WORDS[lang].text.replace("{ref}", ref).replace("{code}", code);
  return locale === "oz" ? { text: toUzCyrillic(text), subject: toUzCyrillic(WORDS.uz.subject) } : { text, subject: WORDS[lang].subject };
}

/**
 * A Telegram chat whose number Telegram vouched for and which is the case's
 * own number. A chat merely linked to the case is not enough: the code proves
 * the phone, and the session it opens is the phone's.
 */
async function telegramChatFor(record: PatientCase): Promise<number | null> {
  if (!isTelegramConfigured("patient")) return null;
  const tail = normalisePhone(record.patient.phone).slice(-4);
  if (tail.length < 4) return null;
  const contacts = (await getDb()).collection<TelegramContact>("telegram_contacts");
  const candidates = await contacts.find({ botRole: "patient", phoneVerified: true, phone: { $regex: `${tail}$` } }).limit(20).toArray();
  return candidates.find((contact) => phonesMatch(contact.phone, record.patient.phone))?.telegramChatId ?? null;
}

const emailOf = (record: PatientCase) => record.patient.email || record.accountEmail || null;

/** Where a code for this case would go, in order of preference, without sending anything. */
async function channelsFor(record: PatientCase): Promise<{ via: CodeChannel; send: (code: string) => Promise<boolean> }[]> {
  const out: { via: CodeChannel; send: (code: string) => Promise<boolean> }[] = [];
  const chat = await telegramChatFor(record).catch(() => null);
  if (chat) {
    out.push({
      via: "telegram",
      send: async (code) => {
        await sendMessage("patient", { chatId: chat, text: wordsFor(record.locale, record._id, code).text });
        return true;
      },
    });
  }
  if (isWhatsAppConfigured() && normalisePhone(record.patient.phone).length >= 9) {
    out.push({ via: "whatsapp", send: (code) => sendWhatsAppCode(normalisePhone(record.patient.phone), code) });
  }
  const email = emailOf(record);
  if (email && isMailConfigured()) {
    out.push({
      via: "email",
      send: (code) => {
        const words = wordsFor(record.locale, record._id, code);
        return send(email, words.subject, words.text);
      },
    });
  }
  return out;
}

/** Sends a code for this case through the first channel that takes it. */
export async function sendCaseCode(record: PatientCase): Promise<CaseCodeRequest> {
  const codes = (await getDb()).collection<CaseCode>("case_codes");
  const now = new Date();
  const recent = await codes.findOne({ _id: record._id }, { projection: { createdAt: 1 } });
  if (recent && now.getTime() - new Date(recent.createdAt).getTime() < RESEND_AFTER_MS) return { status: "wait" };

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const save = (via: CodeChannel) =>
    codes.updateOne(
      { _id: record._id },
      { $set: { codeHash: keyedHash(`case:${record._id}:${code}`), attempts: 0, via, createdAt: now, expiresAt: new Date(now.getTime() + TTL_MINUTES * 60_000) } },
      { upsert: true },
    );
  await codes.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_ttl" }).catch(() => undefined);

  const channels = await channelsFor(record);
  for (const channel of channels) {
    await save(channel.via);
    const sent = await channel.send(code).catch((error) => {
      console.error(`[shifain] case code by ${channel.via} failed`, error);
      return false;
    });
    if (sent) return { status: "sent", via: channel.via };
  }
  if (process.env.NODE_ENV !== "production") {
    const via: CodeChannel = emailOf(record) ? "email" : "whatsapp";
    await save(via);
    console.info(`[shifain] nothing to send through; code for case ${record._id}: ${code}`);
    return { status: "dev", via, code };
  }
  await codes.deleteOne({ _id: record._id });
  return channels.length ? { status: "failed" } : { status: "none" };
}

/** Checks a code. One code, one sign-in. */
export async function verifyCaseCode(reference: string, code: string): Promise<{ record: PatientCase; via: CodeChannel } | null> {
  const db = await getDb();
  const codes = db.collection<CaseCode>("case_codes");
  const id = reference.trim().toUpperCase();
  const stored = await codes.findOne({ _id: id });
  if (!stored || new Date(stored.expiresAt).getTime() < Date.now()) return null;
  if (stored.attempts >= MAX_ATTEMPTS) {
    await codes.deleteOne({ _id: id });
    return null;
  }
  if (!safeEqual(stored.codeHash, keyedHash(`case:${id}:${code.replace(/\s/g, "")}`))) {
    await codes.updateOne({ _id: id }, { $inc: { attempts: 1 } });
    return null;
  }
  await codes.deleteOne({ _id: id });
  const record = await db.collection<PatientCase>("cases").findOne({ _id: id });
  return record ? { record, via: stored.via } : null;
}

/**
 * What the code proved, as a session subject: a code that reached the case's
 * email proves that inbox; one that reached its phone (WhatsApp or the
 * Telegram chat verified with that number) proves the number.
 */
export function provenIdentity(record: PatientCase, via: CodeChannel): { kind: "email"; email: string } | { kind: "phone"; digits: string } | null {
  if (via === "email") {
    const email = emailOf(record);
    return email ? { kind: "email", email } : null;
  }
  const digits = normalisePhone(record.patient.phone);
  return digits.length >= 9 ? { kind: "phone", digits } : null;
}
