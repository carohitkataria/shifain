import "server-only";
import crypto from "node:crypto";
import { getDb } from "./db";
import { getMe, isTelegramConfigured } from "./telegram";

/**
 * Sign-in with Telegram, for patients who live in it and never open email.
 *
 * The browser asks for a one-time token and opens t.me/<bot>?start=login_<token>.
 * In the bot, the patient taps "Share my phone number"; Telegram vouches that
 * the number is the sender's own (the contact carries their user id), and the
 * token is marked confirmed with it. The browser that started — and only that
 * browser, which holds the token in a cookie — is then signed in.
 */
export const TG_LOGIN_COOKIE = "shifain_tg_login";
const TTL_MS = 10 * 60_000;

export type TelegramLogin = {
  _id: string;
  status: "pending" | "confirmed" | "used";
  digits: string | null;
  telegramUserId: number | null;
  name: string | null;
  createdAt: string;
  expiresAt: Date;
};

const logins = async () => (await getDb()).collection<TelegramLogin>("telegram_logins");

export async function createTelegramLogin(): Promise<string> {
  const token = crypto.randomBytes(18).toString("base64url");
  const collection = await logins();
  await collection.insertOne({ _id: token, status: "pending", digits: null, telegramUserId: null, name: null, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + TTL_MS) });
  await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_ttl" }).catch(() => undefined);
  return token;
}

export async function pendingTelegramLogin(token: string): Promise<TelegramLogin | null> {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(token)) return null;
  const login = await (await logins()).findOne({ _id: token, status: "pending" });
  return login && login.expiresAt > new Date() ? login : null;
}

/** The bot vouches for the phone number: the token becomes good for one sign-in. */
export async function confirmTelegramLogin(token: string, input: { digits: string; telegramUserId: number; name: string | null }): Promise<boolean> {
  const result = await (await logins()).updateOne({ _id: token, status: "pending", expiresAt: { $gt: new Date() } }, { $set: { status: "confirmed", ...input } });
  return result.modifiedCount === 1;
}

export async function readTelegramLogin(token: string): Promise<TelegramLogin | null> {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(token)) return null;
  return (await logins()).findOne({ _id: token });
}

/** Spends a confirmed token; true only the first time. */
export async function spendTelegramLogin(token: string): Promise<boolean> {
  const result = await (await logins()).updateOne({ _id: token, status: "confirmed", expiresAt: { $gt: new Date() } }, { $set: { status: "used" } });
  return result.modifiedCount === 1;
}

let cachedUsername: string | null = null;

/** The patient bot's @name, for t.me links: from the environment, else asked of Telegram once. */
export async function botUsername(): Promise<string | null> {
  const fromEnv = process.env.TELEGRAM_PATIENT_BOT_USERNAME?.trim().replace(/^@/, "");
  if (fromEnv) return fromEnv;
  if (cachedUsername) return cachedUsername;
  if (!isTelegramConfigured("patient")) return null;
  try {
    cachedUsername = (await getMe("patient")).username ?? null;
  } catch {
    cachedUsername = null;
  }
  return cachedUsername;
}

/** A t.me link to the patient bot, with an optional start payload. */
export async function botLink(start?: string): Promise<string | null> {
  const name = await botUsername();
  if (!name) return null;
  return `https://t.me/${name}${start ? `?start=${encodeURIComponent(start)}` : ""}`;
}
