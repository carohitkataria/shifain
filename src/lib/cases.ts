import "server-only";
import crypto from "node:crypto";
import { getDb } from "./db";
import type { Plan } from "./ai/plan-schema";

export type CaseStatus = "new" | "planning" | "planned" | "plan-failed" | "confirmed" | "closed";

export type CaseReport = {
  /** Matches the stored file's id, so a coordinator can open it. */
  id?: string;
  filename: string;
  mediaType: string;
  bytes: number;
};

/** How the patient told us about their problem. */
export type IntakeRoute = "reports" | "description" | "questions";

/** Where the case came in. Separate from `referredBy`, which only holds a partner id. */
export type CaseSource = "website" | "web-chat" | "telegram" | "partner-portal" | "coordinator";

export type PatientCase = {
  _id: string;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string | null;
  locale: string;
  patient: { name: string; phone: string; country: string; email: string | null };
  statedNeed: string | null;
  intakeRoute: IntakeRoute;
  description: string | null;
  answers: Record<string, string> | null;
  reports: CaseReport[];
  /** When the stored files are removed automatically. */
  reportsExpireAt: string | null;
  plan: Plan | null;
  planError: string | null;
  /** Older cases predate this; see `sourceOf` in referrals. */
  source?: CaseSource;
  /** The partner user credited with this case, or null. Never a channel name. */
  referredBy: string | null;
  /** What the patient told us they want, by voice or chat, after the plan was made. */
  preferences?: PatientPreferences;
  /** Every change the patient made to their plan, so a coordinator can see what moved and when. */
  planEdits?: PlanEdit[];
  /** When the patient asked for the plan to be redone; limits how often that runs. */
  replans?: string[];
};

export type PatientPreferences = {
  city?: string | null;
  travel?: string | null;
  companions?: number | null;
  /** Package lines the patient switched on (true) or off (false); kept across a re-plan. */
  packages?: Record<string, boolean>;
  /** Medical details added after the case opened, newest last. */
  notes?: { at: string; text: string }[];
};

export type PlanEdit = { at: string; via: "voice" | "chat" | "portal"; change: string };

/**
 * The reference is also the only thing guarding the plan URL, which carries a
 * medical summary — so it is 96 bits of randomness, not a tidy short code.
 * Grouped in fours so a coordinator can still read it down a phone line.
 */
export function newReference(): string {
  const body = crypto.randomBytes(12).toString("base64url").toUpperCase().replace(/[-_]/g, "0");
  return `SH-${body.match(/.{1,4}/g)!.join("-")}`;
}

export async function createCase(
  input: Omit<PatientCase, "_id" | "createdAt" | "updatedAt" | "plan" | "planError" | "status"> & {
    status?: CaseStatus;
  },
): Promise<PatientCase> {
  const now = new Date().toISOString();
  const record: PatientCase = {
    _id: newReference(),
    status: input.status ?? "new",
    createdAt: now,
    updatedAt: now,
    locale: input.locale,
    patient: input.patient,
    statedNeed: input.statedNeed,
    intakeRoute: input.intakeRoute,
    description: input.description,
    answers: input.answers,
    reports: input.reports,
    reportsExpireAt: input.reportsExpireAt,
    plan: null,
    planError: null,
    source: input.source,
    referredBy: input.referredBy,
  };
  const db = await getDb();
  await db.collection<PatientCase>("cases").insertOne(record);
  return record;
}

export async function savePlan(reference: string, plan: Plan): Promise<void> {
  const db = await getDb();
  await db.collection<PatientCase>("cases").updateOne(
    { _id: reference },
    { $set: { plan, planError: null, status: "planned", updatedAt: new Date().toISOString() } },
  );
}

export async function savePlanFailure(reference: string, message: string): Promise<void> {
  const db = await getDb();
  await db.collection<PatientCase>("cases").updateOne(
    { _id: reference },
    { $set: { planError: message, status: "plan-failed", updatedAt: new Date().toISOString() } },
  );
}

export async function getCase(reference: string): Promise<PatientCase | null> {
  const db = await getDb();
  return db.collection<PatientCase>("cases").findOne({ _id: reference });
}

/** A patient's own cases, found by the phone number they gave us. */
export async function casesForPhone(digits: string, limit = 20): Promise<PatientCase[]> {
  if (digits.length < 6) return [];
  const db = await getDb();
  // Numbers are typed inconsistently, so match on the trailing digits rather
  // than on whatever spacing or country-code form was used on the day.
  const tail = digits.slice(-9).split("").join("[^0-9]*");
  return db
    .collection<PatientCase>("cases")
    .find({ "patient.phone": { $regex: `${tail}$` } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

/** A patient's own cases, found by the email they gave us. */
export async function casesForEmail(email: string, limit = 20): Promise<PatientCase[]> {
  const db = await getDb();
  return db
    .collection<PatientCase>("cases")
    .find({ "patient.email": email.toLowerCase() })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

/** The cases one partner doctor has referred, newest first. */
export async function casesReferredBy(partnerUserId: string, limit = 50): Promise<PatientCase[]> {
  const db = await getDb();
  return db
    .collection<PatientCase>("cases")
    .find({ referredBy: partnerUserId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

/** Records a patient's preference on their case, with a line in the edit history. */
export async function setPreference(
  reference: string,
  field: "city" | "travel" | "companions",
  value: string | number | null,
  edit: PlanEdit,
): Promise<void> {
  const db = await getDb();
  await db.collection<PatientCase>("cases").updateOne(
    { _id: reference },
    {
      $set: { [`preferences.${field}`]: value, updatedAt: edit.at },
      $push: { planEdits: edit },
    },
  );
}

/** Adds or removes one package line the patient chose for themselves. */
export async function editPackage(
  reference: string,
  service: string,
  include: boolean,
  edit: PlanEdit,
): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<PatientCase>("cases").updateOne(
    { _id: reference, plan: { $ne: null } },
    {
      ...(include
        ? { $addToSet: { "plan.suggestedPackage": service } }
        : { $pull: { "plan.suggestedPackage": service } }),
      $set: { [`preferences.packages.${service}`]: include, updatedAt: edit.at },
      $push: { planEdits: edit },
    } as never,
  );
  return result.matchedCount > 0;
}

/** New medical details from the patient, kept beside the original description. */
export async function addPatientNote(reference: string, text: string, edit: PlanEdit): Promise<void> {
  const db = await getDb();
  await db.collection<PatientCase>("cases").updateOne(
    { _id: reference },
    {
      $push: { "preferences.notes": { at: edit.at, text: text.slice(0, 2000) }, planEdits: edit },
      $set: { updatedAt: edit.at },
    } as never,
  );
}

export async function setPatientEmail(reference: string, email: string, edit: PlanEdit): Promise<void> {
  const db = await getDb();
  await db.collection<PatientCase>("cases").updateOne(
    { _id: reference },
    { $set: { "patient.email": email.toLowerCase(), updatedAt: edit.at }, $push: { planEdits: edit } },
  );
}
