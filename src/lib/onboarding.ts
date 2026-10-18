import "server-only";
import { cookies } from "next/headers";
import { getDb } from "./db";
import type {
  AccreditationSummary,
  Doctor,
  DoctorSchedule,
  Hospital,
  HospitalDoctorLink,
  Specialty,
  Treatment,
} from "./catalogue";
import { accreditationBody } from "./onboarding-masters";
import {
  accreditationStatus,
  inForce,
  reviewGate,
  type AccreditationRecord,
  type GateIssue,
  type OnboardingStatus,
} from "./onboarding-rules";

/**
 * Hospital onboarding, as Shifain staff do it: the records a hospital's
 * profile is built from, read and written in one place. Hospitals never log in
 * to this; their contacts are data on the record.
 */

export type HospitalGroup = { _id: string; name: string; website: string | null };
export type SubSpecialty = { _id: string; specialtyCode: string; name: string };
export type Capability = { _id: string; name: { en: string } };
export type TreatmentSpecialty = { _id: string; treatmentCode: string; specialtyCode: string; isPrimary?: boolean };
export type Category = { _id: string; name: { en: string }; order: number };

export type HospitalPackage = {
  _id: string;
  hospitalId: string;
  specialtyCode: string;
  treatmentCode: string;
  name: string;
  inclusions: string | null;
  exclusions: string | null;
  priceMin: number | null;
  priceMax: number | null;
  currency: string;
  stayDays: number | null;
  roomCategory: string | null;
  status: "draft" | "active" | "inactive";
  updatedAt: string;
};

export type Tieup = {
  _id: string;
  hospitalId: string;
  status: "draft" | "active" | "expired" | "terminated";
  agreementRef: string | null;
  contractStart: string | null;
  contractEnd: string | null;
  commissionPercent: number | null;
  priceGuaranteeAgreed?: boolean;
  coordinatorName?: string | null;
  deskLanguages?: string[];
  notes?: string | null;
  paymentTerms?: string | null;
  agreementFileId?: string | null;
};

export type ScheduleException = {
  _id: string;
  doctorId: string;
  hospitalId: string | null;
  date: string;
  available: boolean;
  reason: string | null;
};

export type Masters = {
  specialties: Specialty[];
  categories: Category[];
  treatments: Treatment[];
  capabilities: Capability[];
  groups: HospitalGroup[];
  subSpecialties: SubSpecialty[];
  /** Which specialties perform each procedure. */
  scope: Map<string, Set<string>>;
};

export async function loadMasters(): Promise<Masters> {
  const db = await getDb();
  const [specialties, categories, treatments, capabilities, groups, subSpecialties, links] = await Promise.all([
    db.collection<Specialty>("specialties").find({}).sort({ order: 1 }).toArray(),
    db.collection<Category>("categories").find({}).sort({ order: 1 }).toArray(),
    db.collection<Treatment>("treatments").find({}).sort({ _id: 1 }).toArray(),
    db.collection<Capability>("capabilities").find({}).sort({ _id: 1 }).toArray(),
    db.collection<HospitalGroup>("hospital_groups").find({}).sort({ name: 1 }).toArray(),
    db.collection<SubSpecialty>("sub_specialties").find({}).sort({ name: 1 }).toArray(),
    db.collection<TreatmentSpecialty>("treatment_specialty_map").find({}).toArray(),
  ]);
  const scope = new Map<string, Set<string>>();
  for (const treatment of treatments) scope.set(treatment._id, new Set([treatment.primarySpecialtyCode]));
  for (const link of links) scope.get(link.treatmentCode)?.add(link.specialtyCode);
  return { specialties, categories, treatments, capabilities, groups, subSpecialties, scope };
}

/** Whether a procedure belongs to one of these specialties — the integrity rule for packages and doctors. */
export const procedureInScope = (scope: Masters["scope"], treatmentCode: string, specialtyCodes: string[]) =>
  specialtyCodes.some((code) => scope.get(treatmentCode)?.has(code));

export type DoctorAtHospital = {
  doctor: Doctor;
  link: HospitalDoctorLink;
  procedureCodes: string[];
  schedules: DoctorSchedule[];
};

export type HospitalOnboarding = {
  hospital: Hospital;
  doctors: DoctorAtHospital[];
  packages: HospitalPackage[];
  tieup: Tieup | null;
  coe: Set<string>;
  departmentBeds: Map<string, number>;
};

export async function loadHospitalOnboarding(id: string): Promise<HospitalOnboarding | null> {
  const db = await getDb();
  const hospital = await db.collection<Hospital>("hospitals").findOne({ _id: id });
  if (!hospital) return null;

  const [links, packages, tieup, specialtyRows] = await Promise.all([
    db.collection<HospitalDoctorLink>("hospital_doctor_map").find({ hospitalId: id, stale: { $ne: true } } as never).toArray(),
    db.collection<HospitalPackage>("hospital_packages").find({ hospitalId: id }).sort({ name: 1 }).toArray(),
    db.collection<Tieup>("tieups").findOne({ hospitalId: id }),
    db
      .collection<{ specialtyCode: string; isCentreOfExcellence: boolean; bedCount?: number | null }>("hospital_specialty_map")
      .find({ hospitalId: id })
      .toArray(),
  ]);
  const doctorIds = links.map((link) => link.doctorId);
  const [doctors, schedules, procedures] = doctorIds.length
    ? await Promise.all([
        db.collection<Doctor>("doctors").find({ _id: { $in: doctorIds } }).toArray(),
        db.collection<DoctorSchedule>("doctor_schedules").find({ hospitalId: id, doctorId: { $in: doctorIds } }).toArray(),
        db
          .collection<{ doctorId: string; treatmentCode: string }>("treatment_doctor_map")
          .find({ doctorId: { $in: doctorIds } })
          .toArray(),
      ])
    : [[], [], []];

  const byId = new Map(doctors.map((doctor) => [doctor._id, doctor]));
  return {
    hospital,
    doctors: links
      .filter((link) => byId.has(link.doctorId))
      .map((link) => ({
        doctor: byId.get(link.doctorId)!,
        link,
        procedureCodes: [...new Set(procedures.filter((row) => row.doctorId === link.doctorId).map((row) => row.treatmentCode))],
        schedules: schedules.filter((row) => row.doctorId === link.doctorId),
      }))
      .sort((a, b) => a.doctor.name.localeCompare(b.doctor.name)),
    packages,
    tieup,
    coe: new Set(specialtyRows.filter((row) => row.isCentreOfExcellence).map((row) => row.specialtyCode)),
    departmentBeds: new Map(specialtyRows.filter((row) => row.bedCount).map((row) => [row.specialtyCode, row.bedCount!])),
  };
}

/** A weekly row counts as a schedule only when it has a day, both times and a slot length. */
export const isBookableRow = (row: DoctorSchedule) => Boolean(row.day && row.from && row.to && row.slotMinutes);

export function gateFor(data: HospitalOnboarding, masters: Masters): GateIssue[] {
  const { hospital } = data;
  const treatmentName = (code: string) => masters.treatments.find((item) => item._id === code)?.name.en ?? code;
  return reviewGate({
    hospital: {
      name: hospital.name,
      city: hospital.city,
      country: hospital.country,
      hospitalType: hospital.hospitalType,
      specialtyCodes: hospital.specialtyCodes ?? [],
      accreditations: hospital.accreditationRecords ?? [],
    },
    doctors: data.doctors.map(({ doctor, procedureCodes, schedules }) => ({
      name: doctor.name,
      status: doctor.onboardingStatus ?? "draft",
      consentToList: doctor.consentToList,
      procedureCount: procedureCodes.length,
      scheduleCount: schedules.filter(isBookableRow).length,
    })),
    packages: data.packages
      .filter((item) => item.status !== "inactive")
      .map((item) => ({
        name: item.name,
        status: item.status,
        procedureInScope: procedureInScope(masters.scope, item.treatmentCode, hospital.specialtyCodes ?? []),
        procedureName: treatmentName(item.treatmentCode),
      })),
    commercial: { agreementActive: data.tieup?.status === "active", agreementRef: data.tieup?.agreementRef ?? null },
  });
}

/** The public summary: accreditations in force today, in the validator's shape. */
export function accreditationSummary(records: AccreditationRecord[]): AccreditationSummary[] {
  return records
    .filter((record) => inForce(accreditationStatus(record)))
    .map((record) => {
      const body = accreditationBody(record.code);
      return {
        body: body?.schemaBody ?? "Other",
        name: body?.name ?? record.code,
        reference: record.certificateNo,
        validUntil: record.validTo,
        verifiedAt: null,
      };
    });
}

// ------------------------------------------------------------ who is acting

const ACTOR_COOKIE = "shifain_admin_name";

/**
 * The console has one shared login, so maker and checker say who they are.
 * The name rides on each history line and keeps the approver from being the
 * person who submitted.
 */
export async function currentActor(): Promise<string> {
  const jar = await cookies();
  return (jar.get(ACTOR_COOKIE)?.value ?? "").slice(0, 60);
}

export async function rememberActor(name: string): Promise<void> {
  const jar = await cookies();
  jar.set(ACTOR_COOKIE, name.trim().slice(0, 60), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 60 * 60 * 24 * 90,
  });
}

/** The onboarding block for a record that has none yet: research rows start as drafts. */
export const statusOf = (hospital: Hospital): OnboardingStatus =>
  hospital.onboarding?.status ?? (hospital.publication?.state === "published" ? "published" : "draft");

/** Moves a hospital through its lifecycle and writes the line that says who did it. */
export async function setStatus(
  hospital: Hospital,
  status: OnboardingStatus,
  by: string,
  note: string | null,
  extra: Record<string, unknown> = {},
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  const previous = hospital.onboarding;
  await db.collection<Hospital>("hospitals").updateOne({ _id: hospital._id }, {
    $set: {
      onboarding: {
        status,
        submittedBy: status === "submitted" ? by : status === "draft" ? null : (previous?.submittedBy ?? null),
        reviewedBy: status === "approved" ? by : status === "draft" || status === "submitted" ? null : (previous?.reviewedBy ?? null),
        updatedAt: now,
        history: [...(previous?.history ?? []), { at: now, status, by: by || "Admin", note }].slice(-50),
      },
      ...extra,
    },
  } as never);
}

/**
 * Editing a record that is waiting on a checker sends it back to draft: what
 * was reviewed is no longer what is there. A published hospital stays live.
 */
export async function noteEdit(hospital: Hospital, step: string, by: string): Promise<void> {
  const status = statusOf(hospital);
  if (status === "submitted" || status === "under_review" || status === "approved") {
    await setStatus(hospital, "draft", by, `Edited (${step}) after submission — back to draft`);
  } else if (!hospital.onboarding) {
    await setStatus(hospital, status, by, "Onboarding started");
  } else {
    const db = await getDb();
    await db.collection<Hospital>("hospitals").updateOne({ _id: hospital._id }, { $set: { "onboarding.updatedAt": new Date().toISOString() } } as never);
  }
}

/** A doctor's change is a change to every hospital they sit at, for the reviewer's sake. */
export async function noteDoctorEdit(doctorId: string, what: string, by: string): Promise<void> {
  const db = await getDb();
  const links = await db.collection<HospitalDoctorLink>("hospital_doctor_map").find({ doctorId }).toArray();
  if (links.length === 0) return;
  const hospitals = await db.collection<Hospital>("hospitals").find({ _id: { $in: links.map((link) => link.hospitalId) } }).toArray();
  for (const hospital of hospitals) {
    const status = statusOf(hospital);
    if (status === "submitted" || status === "under_review" || status === "approved") await noteEdit(hospital, `Doctors · ${what}`, by);
  }
}
