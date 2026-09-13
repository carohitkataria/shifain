import "server-only";
import type { L } from "./content-types";
import { getDb, readOr } from "./db";

export type Range = { min: number; max: number };

export type Disease = {
  _id: string;
  name: L;
  icd10: string | null;
  primarySpecialtyCode: string;
  specialtyCodes: string[];
  categoryCode: string;
};

export type Treatment = {
  _id: string;
  name: L;
  type: string;
  primarySpecialtyCode: string;
  categoryCode: string;
  inpatientNights: Range;
  daysInCountry: Range;
  requiredCapabilities: string[];
};

export type MatchingRule = {
  _id: string;
  diseaseCode: string;
  treatmentCode: string;
  specialtyCode: string;
  requiredCapabilities: string[];
  inpatientNights: Range;
  daysInCountry: Range;
};

export type PriceBand = {
  _id: string;
  treatmentCode: string;
  currency: string;
  min: number;
  max: number;
  basis: "indicative-research" | "negotiated-average";
  inclusions?: string[];
  exclusions?: string[];
};

export type Hospital = {
  _id: string;
  name: string;
  city: string;
  state: string | null;
  accreditations: string[];
  specialtyCodes: string[];
  capabilities: string[];
};

export type Category = { _id: string; name: L; tier: string; order: number };

/**
 * The publication gate, in one place. A provider record is only ever shown to
 * a patient once it is published against a signed tie-up — research rows exist
 * so the team has someone to call, not so the site can list them.
 */
const PUBLISHED = { "publication.state": "published" } as const;

export async function listCategories(): Promise<Category[]> {
  return readOr<Category[]>([], async (db) =>
    db.collection<Category>("categories").find({}).sort({ order: 1 }).toArray(),
  );
}

export async function listDiseases(): Promise<Disease[]> {
  return readOr<Disease[]>([], async (db) =>
    db.collection<Disease>("diseases").find({}).sort({ _id: 1 }).toArray(),
  );
}

export async function listTreatments(): Promise<Treatment[]> {
  return readOr<Treatment[]>([], async (db) =>
    db.collection<Treatment>("treatments").find({}).sort({ _id: 1 }).toArray(),
  );
}

export async function listMatchingRules(): Promise<MatchingRule[]> {
  return readOr<MatchingRule[]>([], async (db) =>
    db.collection<MatchingRule>("matching_rules").find({}).sort({ _id: 1 }).toArray(),
  );
}

export async function priceBandsFor(treatmentCodes: string[]): Promise<PriceBand[]> {
  if (treatmentCodes.length === 0) return [];
  return readOr<PriceBand[]>([], async (db) =>
    db.collection<PriceBand>("price_bands").find({ treatmentCode: { $in: treatmentCodes } }).toArray(),
  );
}

/**
 * Hospitals the site may name. Empty until the first tie-up is signed, which
 * is the intended behaviour — a plan then describes the type of centre rather
 * than naming one we have no agreement with.
 */
export async function publishedHospitals(filter: {
  specialtyCode?: string;
  capabilities?: string[];
  limit?: number;
} = {}): Promise<Hospital[]> {
  return readOr<Hospital[]>([], async (db) => {
    const query: Record<string, unknown> = { ...PUBLISHED };
    if (filter.specialtyCode) query.specialtyCodes = filter.specialtyCode;
    if (filter.capabilities?.length) query.capabilities = { $all: filter.capabilities };
    return db
      .collection<Hospital>("hospitals")
      .find(query)
      .limit(filter.limit ?? 12)
      .toArray();
  });
}

/** What the AI is allowed to choose from. Nothing outside this list is valid. */
export type Grounding = {
  diseases: Disease[];
  treatments: Treatment[];
  rules: MatchingRule[];
};

export async function loadGrounding(): Promise<Grounding> {
  const db = await getDb();
  const [diseases, treatments, rules] = await Promise.all([
    db.collection<Disease>("diseases").find({}).sort({ _id: 1 }).toArray(),
    db.collection<Treatment>("treatments").find({}).sort({ _id: 1 }).toArray(),
    db.collection<MatchingRule>("matching_rules").find({}).sort({ _id: 1 }).toArray(),
  ]);
  return { diseases, treatments, rules };
}
