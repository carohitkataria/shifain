import "server-only";
import crypto from "node:crypto";
import { getDb } from "./db";
import type { Plan } from "./ai/plan-schema";

export type CaseStatus = "new" | "planning" | "planned" | "plan-failed" | "confirmed" | "closed";

export type CaseReport = { filename: string; mediaType: string; bytes: number };

export type PatientCase = {
  _id: string;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string | null;
  locale: string;
  patient: { name: string; phone: string; country: string; email: string | null };
  statedNeed: string | null;
  reports: CaseReport[];
  plan: Plan | null;
  planError: string | null;
  referredBy: string | null;
};

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
    reports: input.reports,
    plan: null,
    planError: null,
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
