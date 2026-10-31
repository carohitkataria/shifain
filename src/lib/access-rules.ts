/**
 * Who may see what, decided in code. Pure functions only — no database, no
 * cookies — so the rules can be tested on their own and read the same in the
 * portal, the chat, the plan page and the Telegram bot.
 */
import { COUNTRIES } from "./countries";
import type { FamilyAccess, FamilyMember } from "./journey-rules";

// ---------------------------------------------------------------- phone numbers

/** Digits only, so "+998 90 123" and "00998901 23" compare the same. */
export function normalisePhone(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^00/, "");
}

/** The fewest digits that count as a whole number: a subscriber number without its country code. */
export const MIN_PHONE_DIGITS = 9;

/**
 * The same number, written with or without its country code. The shorter one
 * must still be a whole subscriber number (nine digits or more) and the end of
 * the longer one — so a six-digit tail, or the same tail behind a different
 * country code, is not a match.
 */
export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = normalisePhone(a ?? "");
  const y = normalisePhone(b ?? "");
  const [shorter, longer] = x.length <= y.length ? [x, y] : [y, x];
  return shorter.length >= MIN_PHONE_DIGITS && longer.endsWith(shorter);
}

// ---------------------------------------------------------------- case numbers

/** A case number: the patient's country code and five digits, e.g. UZ48213. */
export const CASE_NUMBER = /^[A-Z]{2}\d{5}$/;
/** The older, long references (SH-XXXX-XXXX-XXXX[-XXXX]); they stay valid. */
export const LEGACY_REFERENCE = /^SH-[A-Z0-9]{4}(-[A-Z0-9]{4}){2,3}$/;

export const isCaseReference = (value: string) => CASE_NUMBER.test(value) || LEGACY_REFERENCE.test(value);

/** The two letters a case number starts with: the country they live in, else their phone's, else XX. */
export function countryCodeFor(country: string | null | undefined, phone?: string | null): string {
  const name = (country ?? "").trim().toLowerCase();
  const byName = COUNTRIES.find((item) => item.name.toLowerCase() === name || item.code.toLowerCase() === name);
  if (byName) return byName.code;
  const digits = normalisePhone(phone ?? "");
  const byDial = COUNTRIES.filter((item) => digits.startsWith(item.dial));
  const longest = Math.max(0, ...byDial.map((item) => item.dial.length));
  const best = byDial.filter((item) => item.dial.length === longest);
  // +7 is both Russia and Kazakhstan: no guess.
  return best.length === 1 ? best[0].code : "XX";
}

/** A new case number. The number only finds a case; it never proves who someone is. */
export function caseNumber(code: string, random: () => number = Math.random): string {
  const prefix = /^[A-Z]{2}$/.test(code) ? code : "XX";
  return `${prefix}${String(Math.floor(random() * 100_000)).padStart(5, "0")}`;
}

// ---------------------------------------------------------------- who is looking

export type Identity = { kind: "phone"; digits: string } | { kind: "email"; email: string };

/** Who is looking: the patient, or a family member the patient invited (with what they may see). */
export type Viewer = { role: "patient" } | { role: "family"; member: FamilyMember };

type CaseOwner = {
  patient: { phone: string; email?: string | null };
  accountEmail?: string | null;
  family?: FamilyMember[];
};

const sameEmail = (a: string | null | undefined, b: string) => (a ?? "").trim().toLowerCase() === b.trim().toLowerCase() && b.trim() !== "";

/** The person the case is about, by their own number or email. */
export function isPatientOf(identity: Identity, record: CaseOwner): boolean {
  if (identity.kind === "email") return sameEmail(record.patient.email, identity.email) || sameEmail(record.accountEmail, identity.email);
  return phonesMatch(record.patient.phone, identity.digits);
}

/**
 * A family member the patient added, and gave at least one part to see. A
 * number or email on the family list with nothing granted is not an invite.
 */
export function invitedMember(identity: Identity, record: CaseOwner): FamilyMember | null {
  const member = (record.family ?? []).find((item) =>
    identity.kind === "email" ? sameEmail(item.email, identity.email) : phonesMatch(item.phone, identity.digits),
  );
  return member && member.access.length > 0 ? member : null;
}

/** Who this signed-in person is on this case, if anyone. */
export function viewerOf(identity: Identity, record: CaseOwner): Viewer | null {
  if (isPatientOf(identity, record)) return { role: "patient" };
  const member = invitedMember(identity, record);
  return member ? { role: "family", member } : null;
}

/** Whether this viewer may see one part of the case. The patient sees everything. */
export const canSee = (viewer: Viewer | null, part: FamilyAccess) =>
  viewer?.role === "patient" || (viewer?.role === "family" && viewer.member.access.includes(part));

/**
 * The plan page carries a medical summary: it opens for the patient, a family
 * member allowed to see reports, the team, the partner who referred the case,
 * or the browser that has just opened it — never for a case number alone.
 */
export function mayViewPlan(input: { viewer: Viewer | null; team: boolean; referrer: boolean; openedHere: boolean }): boolean {
  return input.team || input.referrer || input.openedHere || canSee(input.viewer, "reports");
}

// ---------------------------------------------------------------- where a code may go

export type CodeDestination = { via: "telegram" | "whatsapp" | "email"; to: string };

/**
 * Where a one-time code for a case may be sent: only to contacts already on
 * the case — never to a number or address typed in the conversation, which is
 * not even an input here. A Telegram chat counts only when the number Telegram
 * vouched for is the case's own.
 */
export function codeDestinations(
  record: { patient: { phone: string; email?: string | null }; accountEmail?: string | null },
  available: { telegramVerifiedPhones: string[]; whatsapp: boolean; email: boolean },
): CodeDestination[] {
  const out: CodeDestination[] = [];
  const phone = normalisePhone(record.patient.phone);
  if (phone.length >= MIN_PHONE_DIGITS && available.telegramVerifiedPhones.some((verified) => phonesMatch(verified, phone))) out.push({ via: "telegram", to: phone });
  if (available.whatsapp && phone.length >= MIN_PHONE_DIGITS) out.push({ via: "whatsapp", to: phone });
  const email = record.patient.email || record.accountEmail || null;
  if (available.email && email) out.push({ via: "email", to: email });
  return out;
}
