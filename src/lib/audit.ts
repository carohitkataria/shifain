import "server-only";
import { getDb, readOr } from "./db";

/**
 * Who tried to sign in, and every action that needed a verified patient: when,
 * from which conversation or browser, how, on which case, and what happened.
 * Never the code, the password or anything clinical. Kept a year; the admin
 * console shows the latest fifty (Admin → Access → Sign-in log).
 */
export type AuditMethod =
  | "password"
  | "email-code"
  | "phone-code"
  | "case-code"
  | "telegram"
  | "google"
  | "chat-email-code"
  | "chat-case-code"
  | `action:${string}`;

export type AuditResult = "ok" | "failed" | "sent" | "limited" | "needs-code";

export type AuditEntry = {
  at: Date;
  /** The chat conversation, or "web" for a page form. */
  session: string;
  method: AuditMethod;
  /** The case concerned, when there is one. */
  reference: string | null;
  result: AuditResult;
  ip: string | null;
};

const KEEP_DAYS = 365;

/** Writes one line. An audit that cannot be written never blocks the patient. */
export async function audit(entry: Omit<AuditEntry, "at">): Promise<void> {
  try {
    const collection = (await getDb()).collection<AuditEntry>("audit_log");
    await collection.insertOne({ ...entry, at: new Date(), reference: entry.reference?.slice(0, 40) ?? null, ip: entry.ip?.slice(0, 64) ?? null });
    await collection.createIndex({ at: 1 }, { expireAfterSeconds: KEEP_DAYS * 86_400, name: "at_ttl" }).catch(() => undefined);
  } catch (error) {
    console.error("[shifain] audit line not written", error);
  }
}

export async function latestAudit(limit = 50): Promise<AuditEntry[]> {
  return readOr<AuditEntry[]>([], async (db) =>
    db.collection<AuditEntry>("audit_log").find({}, { projection: { _id: 0 } }).sort({ at: -1 }).limit(limit).toArray(),
  );
}
