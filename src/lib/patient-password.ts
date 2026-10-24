/**
 * Passwords for patient accounts. Optional: a patient can always sign in with
 * a one-time code instead, and sets (or resets) a password in Settings once
 * signed in. Stored as scrypt hashes — never the password itself.
 */
import "server-only";
import crypto from "node:crypto";
import { getDb } from "./db";
import { accountForPhone, normaliseEmail, normalisePhone, type PatientAccount } from "./patient-auth";
import { hashPassword, passwordMatches } from "./password-hash";

export { MIN_PASSWORD } from "./password-hash";

/** A hash to compare against when nobody matches, so a wrong address takes as long as a wrong password. */
let decoy: Promise<string> | null = null;

/**
 * The account for an email address or a mobile number, if its password is
 * this one. Unknown accounts, accounts without a password and wrong passwords
 * all answer null, in about the same time.
 */
export async function checkPassword(identifier: string, password: string): Promise<PatientAccount | null> {
  const value = identifier.trim();
  let account: PatientAccount | null = null;
  if (value.includes("@")) {
    account = await (await getDb()).collection<PatientAccount>("patient_accounts").findOne({ _id: normaliseEmail(value) });
  } else if (normalisePhone(value).length >= 6) {
    account = await accountForPhone(value);
  }
  if (!account?.passwordHash) {
    decoy ??= hashPassword(crypto.randomBytes(12).toString("hex"));
    await passwordMatches(password, await decoy);
    return null;
  }
  return (await passwordMatches(password, account.passwordHash)) ? account : null;
}

export async function setAccountPassword(email: string, password: string): Promise<void> {
  const now = new Date().toISOString();
  await (await getDb())
    .collection<PatientAccount>("patient_accounts")
    .updateOne({ _id: normaliseEmail(email) }, { $set: { passwordHash: await hashPassword(password), passwordSetAt: now, updatedAt: now } });
}
