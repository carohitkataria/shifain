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
  /** Whether a gentle outing is usually reasonable on this pathway. */
  tourFriendly?: boolean;
};

export type City = {
  _id: string;
  name: string;
  state: string | null;
  country: string;
  nearestAirportIata: string | null;
};

export type Attraction = {
  _id: string;
  city: string;
  name: string;
  kind: "heritage" | "spiritual" | "leisure";
  travelHours: number;
  halfDay: boolean;
  note: string;
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

/** The public summary of an accreditation, in the shape the hospitals validator accepts. */
export type AccreditationSummary = {
  body: "NABH" | "JCI" | "NABL" | "Other";
  /** The accreditation's own name when `body` is "Other" (ISO 9001, GHA…). */
  name?: string | null;
  reference: string | null;
  validUntil: string | null;
  verifiedAt: string | null;
};

/** Accreditations as words, whichever form the record holds them in. */
export const accreditationLabels = (hospital: Pick<Hospital, "accreditations">): string[] =>
  (hospital.accreditations ?? []).map((item) => (typeof item === "string" ? item : item.name || item.body));

export type Hospital = {
  _id: string;
  legacyId?: string;
  name: string;
  legalName: string | null;
  city: string;
  state: string | null;
  country: string;
  nearestAirportIata: string | null;
  hospitalType: string | null;
  beds: number | null;
  icuBeds: number | null;
  /** Only accreditations in force, summarised; the full records are `accreditationRecords`. */
  accreditations: (string | AccreditationSummary)[];
  specialtyCodes: string[];
  capabilities: string[];
  internationalDesk?: {
    exists: boolean | null;
    contactName: string | null;
    email: string | null;
    phone: string | null;
    languages: string[];
  };
  officialWebsite: string | null;
  about?: string | null;
  partnerStatus: string;
  publication: { state: string; publishedAt: string | null; tieupId: string | null };
} & HospitalOnboardingFields;

/** What onboarding adds to a hospital. All optional: research rows predate it. */
export type HospitalOnboardingFields = {
  slug?: string | null;
  groupId?: string | null;
  yearEstablished?: number | null;
  ownership?: string | null;
  assignedRm?: string | null;
  address?: string | null;
  pincode?: string | null;
  /** The hospital's public switchboard. */
  phone?: string | null;
  /** The 24×7 emergency line, shown to its admitted patients. */
  emergencyPhone?: string | null;
  lat?: number | null;
  lng?: number | null;
  nearestAirport?: string | null;
  airportDistanceKm?: number | null;
  aboutRu?: string | null;
  aboutUz?: string | null;
  usps?: string[];
  awards?: { title: string; awardingBody: string | null; year: number | null }[];
  campusAcres?: number | null;
  hduBeds?: number | null;
  otCount?: number | null;
  cathlabCount?: number | null;
  doctorCount?: number | null;
  nurseCount?: number | null;
  accreditationRecords?: import("./onboarding-rules").AccreditationRecord[];
  centres?: { id: string; name: string; description: string | null; specialtyCodes: string[] }[];
  facilities?: string[];
  languages?: string[];
  media?: { logoId: string | null; coverId: string | null; galleryIds: string[]; virtualTourUrl: string | null; videoUrl: string | null };
  kycVerified?: boolean;
  onboarding?: {
    status: import("./onboarding-rules").OnboardingStatus;
    submittedBy: string | null;
    reviewedBy: string | null;
    updatedAt: string;
    history: { at: string; status: import("./onboarding-rules").OnboardingStatus; by: string; note: string | null }[];
  };
};

export type Doctor = {
  _id: string;
  name: string;
  specialtyCode: string | null;
  specialtyLabelRaw: string | null;
  qualifications: string | null;
  registrationNumber: string | null;
  experienceYears: number | null;
  officialProfileUrl: string | null;
  about?: string | null;
  consentToList: boolean;
  partnerStatus: string;
  publication: { state: string; publishedAt: string | null; tieupId: string | null };
} & DoctorOnboardingFields;

export type DoctorOnboardingFields = {
  slug?: string | null;
  gender?: string | null;
  photoId?: string | null;
  registrationCouncil?: string | null;
  /** A person checked the number against the council's register. With both fields, the "verified" badge. */
  registrationChecked?: boolean;
  designation?: string | null;
  languages?: string[];
  /** First is primary. `specialtyCode` mirrors the primary for older readers. */
  specialties?: { code: string; subSpecialty: string | null }[];
  qualificationRecords?: { degree: string; institution: string | null; year: number | null }[];
  awards?: { title: string; awardingBody: string | null; year: number | null }[];
  memberships?: { body: string; membershipNo: string | null }[];
  experienceHistory?: { role: string; organization: string; fromYear: number | null; toYear: number | null }[];
  consultFee?: number | null;
  teleconsultFee?: number | null;
  currency?: string | null;
  onboardingStatus?: "draft" | "active" | "inactive";
};

/** A doctor whose registration we have checked carries a verified badge. */
export const isVerifiedDoctor = (doctor: Pick<Doctor, "registrationNumber"> & DoctorOnboardingFields) =>
  Boolean(doctor.registrationNumber && doctor.registrationCouncil && doctor.registrationChecked);

export type Category = { _id: string; name: L; tier: string; order: number };

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** When a doctor sits at a hospital. Everything but the two ids is optional. */
export type DoctorSchedule = {
  _id: string;
  doctorId: string;
  hospitalId: string;
  day: Weekday | null;
  from: string | null;
  to: string | null;
  slotMinutes: number | null;
  note: string | null;
  updatedAt: string | null;
  consultType?: "in_person" | "video" | "both" | null;
  validFrom?: string | null;
  validTo?: string | null;
};

export type HospitalDoctorLink = {
  _id: string;
  hospitalId: string;
  doctorId: string;
  specialtyCode: string | null;
  attachment: "primary" | "visiting" | "consultant";
  current: boolean;
  stale?: boolean;
  /** Title at this hospital, which can differ from one hospital to the next. */
  designation?: string | null;
  opdLocation?: string | null;
};

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

export type Specialty = { _id: string; name: L; categoryCode: string; order: number };

export async function listSpecialties(): Promise<Specialty[]> {
  return readOr<Specialty[]>([], async (db) =>
    db.collection<Specialty>("specialties").find({}).sort({ order: 1 }).toArray(),
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

export async function listCities(): Promise<City[]> {
  return readOr<City[]>([], async (db) =>
    db.collection<City>("cities").find({}).sort({ name: 1 }).toArray(),
  );
}

export async function attractionsFor(city: string | null): Promise<Attraction[]> {
  if (!city) return [];
  return readOr<Attraction[]>([], async (db) =>
    db.collection<Attraction>("attractions").find({ city }).sort({ travelHours: 1 }).toArray(),
  );
}

export async function schedulesForDoctor(doctorId: string): Promise<DoctorSchedule[]> {
  return readOr<DoctorSchedule[]>([], async (db) =>
    db.collection<DoctorSchedule>("doctor_schedules").find({ doctorId }).toArray(),
  );
}

export async function schedulesForHospital(hospitalId: string): Promise<DoctorSchedule[]> {
  return readOr<DoctorSchedule[]>([], async (db) =>
    db.collection<DoctorSchedule>("doctor_schedules").find({ hospitalId }).toArray(),
  );
}

/** Doctors the site may name: consented, published, and at a published hospital. */
export async function publishedDoctors(limit = 60): Promise<Doctor[]> {
  return readOr<Doctor[]>([], async (db) =>
    db
      .collection<Doctor>("doctors")
      .find({ consentToList: true, "publication.state": "published" })
      .sort({ name: 1 })
      .limit(limit)
      .toArray(),
  );
}

/** What the AI is allowed to choose from. Nothing outside this list is valid. */
export type Grounding = {
  diseases: Disease[];
  treatments: Treatment[];
  rules: MatchingRule[];
  cities: City[];
  /** How many hospitals we hold per city and specialty, to place a case. */
  coverage: { city: string; specialtyCode: string; hospitals: number }[];
};

export async function loadGrounding(): Promise<Grounding> {
  const db = await getDb();
  const [diseases, treatments, rules, cities, coverage] = await Promise.all([
    db.collection<Disease>("diseases").find({}).sort({ _id: 1 }).toArray(),
    db.collection<Treatment>("treatments").find({}).sort({ _id: 1 }).toArray(),
    db.collection<MatchingRule>("matching_rules").find({}).sort({ _id: 1 }).toArray(),
    db.collection<City>("cities").find({}).sort({ name: 1 }).toArray(),
    db
      .collection("hospitals")
      .aggregate<{ city: string; specialtyCode: string; hospitals: number }>([
        { $unwind: { path: "$specialtyCodes", preserveNullAndEmptyArrays: false } },
        { $group: { _id: { city: "$city", s: "$specialtyCodes" }, n: { $sum: 1 } } },
        { $project: { _id: 0, city: "$_id.city", specialtyCode: "$_id.s", hospitals: "$n" } },
      ])
      .toArray(),
  ]);
  return { diseases, treatments, rules, cities, coverage };
}
