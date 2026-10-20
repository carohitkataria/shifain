import "server-only";
import { readOr } from "./db";
import type { L } from "./content-types";
import type { Category, Disease, Doctor, DoctorSchedule, Hospital, HospitalDoctorLink, Specialty, Treatment } from "./catalogue";
import type { HospitalPackage } from "./onboarding";

/**
 * What the public directory may show, and how its pages link to each other:
 * hospital ↔ doctors, and both ↔ the conditions their specialties treat.
 * Every query applies the publication gate — a published, signed hospital,
 * and a doctor who is published and has agreed to be listed.
 */

const LISTED_DOCTOR = { consentToList: true, "publication.state": "published" } as const;
const LISTED_HOSPITAL = { "publication.state": "published" } as const;

export async function listedHospital(id: string): Promise<Hospital | null> {
  return readOr(null, (db) => db.collection<Hospital>("hospitals").findOne({ _id: id, ...LISTED_HOSPITAL }));
}

export async function listedDoctor(id: string): Promise<Doctor | null> {
  return readOr(null, (db) => db.collection<Doctor>("doctors").findOne({ _id: id, ...LISTED_DOCTOR }));
}

/** The specialties a doctor practises: the onboarding list, else the single code older records carry. */
export const doctorSpecialtyCodes = (doctor: Pick<Doctor, "specialtyCode" | "specialties">): string[] =>
  doctor.specialties?.length ? doctor.specialties.map((item) => item.code) : doctor.specialtyCode ? [doctor.specialtyCode] : [];

/** Conditions treated by any of these specialties, for linking to their pages. */
export async function conditionsFor(specialtyCodes: string[]): Promise<Disease[]> {
  if (specialtyCodes.length === 0) return [];
  return readOr<Disease[]>([], (db) =>
    db
      .collection<Disease>("diseases")
      .find({ $or: [{ specialtyCodes: { $in: specialtyCodes } }, { primarySpecialtyCode: { $in: specialtyCodes } }] })
      .sort({ categoryCode: 1, _id: 1 })
      .toArray(),
  );
}

/** Listed doctors at a hospital, with their link (designation, department, OPD) there. */
export async function doctorsAtHospital(hospitalId: string): Promise<{ doctor: Doctor; link: HospitalDoctorLink }[]> {
  return readOr([], async (db) => {
    const links = await db
      .collection<HospitalDoctorLink>("hospital_doctor_map")
      .find({ hospitalId, stale: { $ne: true } } as never)
      .toArray();
    if (links.length === 0) return [];
    const doctors = await db
      .collection<Doctor>("doctors")
      .find({ _id: { $in: links.map((link) => link.doctorId) }, ...LISTED_DOCTOR })
      .sort({ name: 1 })
      .toArray();
    return doctors.map((doctor) => ({ doctor, link: links.find((link) => link.doctorId === doctor._id)! }));
  });
}

/** Published hospitals a doctor works at, with their link and weekly rota there. */
export async function hospitalsForDoctor(
  doctorId: string,
): Promise<{ hospital: Hospital; link: HospitalDoctorLink; rota: DoctorSchedule[] }[]> {
  return readOr([], async (db) => {
    const [links, rota] = await Promise.all([
      db.collection<HospitalDoctorLink>("hospital_doctor_map").find({ doctorId }).toArray(),
      db.collection<DoctorSchedule>("doctor_schedules").find({ doctorId }).toArray(),
    ]);
    if (links.length === 0) return [];
    const hospitals = await db
      .collection<Hospital>("hospitals")
      .find({ _id: { $in: links.map((link) => link.hospitalId) }, ...LISTED_HOSPITAL })
      .toArray();
    return hospitals.map((hospital) => ({
      hospital,
      link: links.find((link) => link.hospitalId === hospital._id)!,
      rota: rota.filter((row) => row.hospitalId === hospital._id),
    }));
  });
}

/** Listed doctors who practise any of these specialties. */
export async function doctorsFor(specialtyCodes: string[], limit = 24): Promise<Doctor[]> {
  if (specialtyCodes.length === 0) return [];
  return readOr<Doctor[]>([], (db) =>
    db
      .collection<Doctor>("doctors")
      .find({
        ...LISTED_DOCTOR,
        $or: [{ "specialties.code": { $in: specialtyCodes } }, { specialtyCode: { $in: specialtyCodes } }],
      })
      .sort({ experienceYears: -1, name: 1 })
      .limit(limit)
      .toArray(),
  );
}

/** Published hospitals that offer any of these specialties. */
export async function hospitalsFor(specialtyCodes: string[], limit = 12): Promise<Hospital[]> {
  if (specialtyCodes.length === 0) return [];
  return readOr<Hospital[]>([], (db) =>
    db
      .collection<Hospital>("hospitals")
      .find({ ...LISTED_HOSPITAL, specialtyCodes: { $in: specialtyCodes } })
      .sort({ name: 1 })
      .limit(limit)
      .toArray(),
  );
}

/** Procedures a doctor performs, by name. */
export async function proceduresFor(doctorId: string): Promise<Treatment[]> {
  return readOr<Treatment[]>([], async (db) => {
    const rows = await db.collection<{ treatmentCode: string }>("treatment_doctor_map").find({ doctorId }).toArray();
    if (rows.length === 0) return [];
    return db
      .collection<Treatment>("treatments")
      .find({ _id: { $in: rows.map((row) => row.treatmentCode) } })
      .sort({ _id: 1 })
      .toArray();
  });
}

/** A hospital's active packages, the only ones a patient sees. */
export async function activePackages(hospitalId: string): Promise<HospitalPackage[]> {
  return readOr<HospitalPackage[]>([], (db) =>
    db.collection<HospitalPackage>("hospital_packages").find({ hospitalId, status: "active" }).sort({ name: 1 }).toArray(),
  );
}

export async function centresOfExcellence(hospitalId: string): Promise<Set<string>> {
  return readOr(new Set<string>(), async (db) => {
    const rows = await db
      .collection<{ specialtyCode: string; isCentreOfExcellence: boolean }>("hospital_specialty_map")
      .find({ hospitalId, isCentreOfExcellence: true })
      .toArray();
    return new Set(rows.map((row) => row.specialtyCode));
  });
}

export async function groupName(groupId: string | null | undefined): Promise<string | null> {
  if (!groupId) return null;
  return readOr(null, async (db) => (await db.collection<{ _id: string; name: string }>("hospital_groups").findOne({ _id: groupId }))?.name ?? null);
}

export async function capabilityNames(): Promise<Map<string, L>> {
  return readOr(new Map(), async (db) => {
    const rows = await db.collection<{ _id: string; name: L }>("capabilities").find({}).toArray();
    return new Map(rows.map((row) => [row._id, row.name]));
  });
}

/** Specialty codes under one homepage category (the treatment pages' slugs map to categories). */
export function specialtiesInCategory(specialties: Specialty[], categoryCode: string): string[] {
  return specialties.filter((item) => item.categoryCode === categoryCode).map((item) => item._id);
}

export type { Category };

/** Every listed doctor, optionally in one specialty, with the published hospitals they work at. */
export async function listedDoctors(specialtyCode?: string | null): Promise<{ doctor: Doctor; hospitals: Hospital[] }[]> {
  return readOr([], async (db) => {
    const doctors = await db
      .collection<Doctor>("doctors")
      .find({
        ...LISTED_DOCTOR,
        ...(specialtyCode ? { $or: [{ "specialties.code": specialtyCode }, { specialtyCode }] } : {}),
      })
      .sort({ name: 1 })
      .limit(500)
      .toArray();
    if (doctors.length === 0) return [];
    const links = await db
      .collection<HospitalDoctorLink>("hospital_doctor_map")
      .find({ doctorId: { $in: doctors.map((doctor) => doctor._id) } })
      .toArray();
    const hospitals = links.length
      ? await db
          .collection<Hospital>("hospitals")
          .find({ _id: { $in: [...new Set(links.map((link) => link.hospitalId))] }, ...LISTED_HOSPITAL }, { projection: { name: 1, city: 1 } })
          .toArray()
      : [];
    return doctors.map((doctor) => ({
      doctor,
      hospitals: hospitals.filter((hospital) => links.some((link) => link.doctorId === doctor._id && link.hospitalId === hospital._id)),
    }));
  });
}
