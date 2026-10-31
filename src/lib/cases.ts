import "server-only";
import crypto from "node:crypto";
import { getDb } from "./db";
import { caseNumber, countryCodeFor, MIN_PHONE_DIGITS, phonesMatch } from "./access-rules";
import type { Plan } from "./ai/plan-schema";

export type CaseStatus = "new" | "planning" | "planned" | "plan-failed" | "confirmed" | "closed";

export type CaseReport = {
  /** Matches the stored file's id, so a coordinator can open it. */
  id?: string;
  filename: string;
  mediaType: string;
  bytes: number;
  /** Who added it: the patient (the default, for older files), the hospital or the Shifain desk. */
  source?: "patient" | "hospital" | "shifain";
  kind?: "report" | "prescription" | "bill" | "document";
  /** For a document, which checklist line it answers. */
  docKey?: import("./journey-rules").DocKey;
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
  /** Set when the uploaded files could not be stored, so nobody tells the patient they were kept. */
  reportsNotStored?: boolean;
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
  /** The signed-in account that opened this case, when its contact email is someone else's. */
  accountEmail?: string | null;
  /** The hospital or doctor page the patient asked from, when they did. */
  requested?: CaseRequest | null;
};

export type CaseRequest = {
  hospitalId: string | null;
  hospitalName: string | null;
  doctorId: string | null;
  doctorName: string | null;
};

/** One sentence for the planner and the coordinator: who the patient asked for. */
export const describeRequest = (request: CaseRequest | null | undefined): string | null =>
  request && (request.hospitalName || request.doctorName)
    ? [request.doctorName, request.hospitalName].filter(Boolean).join(" at ")
    : null;

export type PatientPreferences = {
  city?: string | null;
  travel?: string | null;
  companions?: number | null;
  /** Package lines the patient switched on (true) or off (false); kept across a re-plan. */
  packages?: Record<string, boolean>;
  /** Medical details added after the case opened, newest last. */
  notes?: { at: string; text: string }[];
  /** How the patient wants to be reached; the main one first. */
  channels?: import("./journey-rules").ContactChannel[];
  mainChannel?: import("./journey-rules").ContactChannel;
  /** Whether others from home, here at the same time, may see them in Companions. */
  companionsVisible?: boolean;
  /** Someone at home to call in an emergency. */
  homeContact?: { name: string; phone: string; relation: string | null } | null;
};

export type PlanEdit = { at: string; via: "voice" | "chat" | "portal" | "coordinator"; change: string };

/**
 * A case number a patient can read down a phone line: their country code and
 * five digits (UZ48213). It finds a case and nothing more — the plan page and
 * every account screen need a signed-in patient, so guessing a number shows
 * nobody anything.
 */
export function newReference(patient: { country?: string | null; phone?: string | null } = {}): string {
  return caseNumber(countryCodeFor(patient.country, patient.phone), () => crypto.randomInt(0, 100_000) / 100_000);
}

const isDuplicateKey = (error: unknown) => (error as { code?: number } | null)?.code === 11000;

export async function createCase(
  input: Omit<PatientCase, "_id" | "createdAt" | "updatedAt" | "plan" | "planError" | "status"> & {
    status?: CaseStatus;
  },
): Promise<PatientCase> {
  const now = new Date().toISOString();
  const record: PatientCase = {
    _id: newReference(input.patient),
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
    ...(input.requested ? { requested: input.requested } : {}),
  };
  const db = await getDb();
  // Five digits per country: on the rare clash, draw again.
  for (let attempt = 0; ; attempt++) {
    try {
      await db.collection<PatientCase>("cases").insertOne(record);
      return record;
    } catch (error) {
      if (!isDuplicateKey(error) || attempt >= 20) throw error;
      record._id = newReference(input.patient);
    }
  }
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

/** Candidates whose stored number ends like this one; callers confirm each with phonesMatch. */
const tailPattern = (digits: string) => `${digits.slice(-MIN_PHONE_DIGITS).split("").join("[^0-9]*")}$`;

/**
 * A patient's own cases: those where this is the patient's number. A family
 * member's number never finds a case here — family see a case only through
 * the patient's invite (familyCasesFor).
 */
export async function casesForPhone(digits: string, limit = 20): Promise<PatientCase[]> {
  if (digits.replace(/\D/g, "").length < MIN_PHONE_DIGITS) return [];
  const db = await getDb();
  const found = await db
    .collection<PatientCase>("cases")
    .find({ "patient.phone": { $regex: tailPattern(digits) } } as never)
    .sort({ createdAt: -1 })
    .limit(limit * 2)
    .toArray();
  return found.filter((record) => phonesMatch(record.patient.phone, digits)).slice(0, limit);
}

/** Cases where the patient invited this person as family, with something to see. */
export async function familyCasesFor(identity: { kind: "phone"; digits: string } | { kind: "email"; email: string }, limit = 20): Promise<PatientCase[]> {
  const db = await getDb();
  const filter =
    identity.kind === "email"
      ? { family: { $elemMatch: { email: emailMatcher(identity.email), "access.0": { $exists: true } } } }
      : identity.digits.replace(/\D/g, "").length >= MIN_PHONE_DIGITS
        ? { family: { $elemMatch: { phone: { $regex: tailPattern(identity.digits) }, "access.0": { $exists: true } } } }
        : null;
  if (!filter) return [];
  return db.collection<PatientCase>("cases").find(filter as never).sort({ createdAt: -1 }).limit(limit).toArray();
}

/** The whole address, ignoring case: older cases kept it as typed ("Name@Gmail.com"). */
export const emailMatcher = (email: string) =>
  new RegExp(`^${email.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

/** A patient's own cases, found by the email they gave us or the account that opened them. */
export async function casesForEmail(email: string, limit = 20): Promise<PatientCase[]> {
  const db = await getDb();
  const address = emailMatcher(email);
  return db
    .collection<PatientCase>("cases")
    .find({ $or: [{ "patient.email": address }, { accountEmail: address }] } as never)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

/** Ties a case to the signed-in account that opened it. */
export async function linkCaseToAccount(reference: string, email: string): Promise<void> {
  const db = await getDb();
  await db.collection<PatientCase>("cases").updateOne({ _id: reference }, { $set: { accountEmail: email.toLowerCase() } });
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
