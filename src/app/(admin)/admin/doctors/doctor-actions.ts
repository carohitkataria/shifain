"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { Doctor, DoctorSchedule, Hospital, HospitalDoctorLink } from "@/lib/catalogue";
import { authoredProvenance, count, decimal, hhmm, isoDate, readRows, slug, text } from "@/lib/admin-records";
import { CONSULT_TYPES, CURRENCIES, DESIGNATIONS, DOCTOR_STATUSES, GENDERS, LANGUAGES, SLOT_MINUTES } from "@/lib/onboarding-masters";
import { currentActor, loadMasters, noteDoctorEdit, procedureInScope, type ScheduleException } from "@/lib/onboarding";
import { removeMedia, storeMedia } from "@/lib/media";

const PROVENANCE = "Shifain onboarding";
const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const ATTACHMENTS = ["primary", "visiting", "consultant"] as const;
const PARTNER_STATUS = ["prospect", "contacted", "negotiating", "signed", "suspended"];
const PUBLICATION = ["research", "verified", "published", "withdrawn"];

type Context = { id: string; doctor: Doctor; tab: string; hospital: string | null };

async function context(formData: FormData, tab: string): Promise<Context> {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const id = String(formData.get("id") ?? "");
  const db = await getDb();
  const doctor = id ? await db.collection<Doctor>("doctors").findOne({ _id: id }) : null;
  if (!doctor) redirect("/admin/doctors");
  return { id, doctor: doctor!, tab, hospital: text(formData.get("hospital")) };
}

const pageOf = ({ id, tab, hospital }: Context, extra = "") =>
  `/admin/doctors/${encodeURIComponent(id)}?tab=${tab}${hospital ? `&hospital=${encodeURIComponent(hospital)}` : ""}${extra}`;
const fail = (ctx: Context, message: string): never => redirect(pageOf(ctx, `&error=${encodeURIComponent(message)}`));
const oneOf = <T extends { value: string }>(list: readonly T[], value: string | null) =>
  value && list.some((item) => item.value === value) ? value : null;
const year = (value: string | undefined) => {
  const parsed = count(value, new Date().getFullYear());
  return parsed && parsed >= 1940 ? parsed : null;
};

async function finish(ctx: Context, what: string, extra = ""): Promise<never> {
  await noteDoctorEdit(ctx.id, what, await currentActor());
  revalidatePath("/admin/doctors");
  if (ctx.hospital) revalidatePath(`/admin/hospitals/${ctx.hospital}`);
  if (ctx.doctor.publication?.state === "published") revalidatePath("/", "layout");
  redirect(pageOf(ctx, `&saved=1${extra}`));
}

// ----------------------------------------------------------------- 1. profile

export async function saveDoctorProfileAction(formData: FormData) {
  const ctx = await context(formData, "profile");
  const name = text(formData.get("name"));
  if (!name) fail(ctx, "The doctor's name is required.");

  const db = await getDb();
  const doctors = db.collection<Doctor>("doctors");
  // Left empty, the slug follows the record's id, which is already unique.
  const typed = text(formData.get("slug"));
  const wantedSlug = typed ? slug(typed) : ctx.id.replace(/^d-/, "");
  if (await doctors.findOne({ slug: wantedSlug, _id: { $ne: ctx.id } })) fail(ctx, `The slug “${wantedSlug}” is taken by another doctor.`);

  const consentToList = formData.get("consentToList") === "on";
  const state = String(formData.get("publicationState") ?? ctx.doctor.publication?.state ?? "research");
  const partnerStatus = String(formData.get("partnerStatus") ?? ctx.doctor.partnerStatus);
  if (!PUBLICATION.includes(state) || !PARTNER_STATUS.includes(partnerStatus)) fail(ctx, "That was not a valid stage.");
  // A doctor is never published without their own agreement to be listed.
  if (state === "published" && !consentToList) fail(ctx, "A doctor cannot be published until they have agreed to be listed. Tick consent first.");

  let photoId = ctx.doctor.photoId ?? null;
  const photo = formData.get("photo") as File | null;
  if (photo && typeof photo !== "string" && photo.size) {
    const stored = await storeMedia(photo, { type: "doctor", id: ctx.id }, "photo");
    if (!stored) fail(ctx, "The photo must be a PNG, JPEG, WebP or GIF under 8 MB.");
    await removeMedia([photoId]);
    photoId = stored;
  } else if (formData.get("removePhoto") === "on") {
    await removeMedia([photoId]);
    photoId = null;
  }

  const designation = text(formData.get("designation"));
  await doctors.updateOne({ _id: ctx.id }, {
    $set: {
      name,
      slug: wantedSlug,
      gender: oneOf(GENDERS, text(formData.get("gender"))),
      photoId,
      registrationNumber: text(formData.get("registrationNumber")),
      registrationCouncil: text(formData.get("registrationCouncil")),
      registrationChecked: formData.get("registrationChecked") === "on",
      designation: designation && DESIGNATIONS.includes(designation) ? designation : null,
      experienceYears: count(formData.get("experienceYears"), 70),
      about: text(formData.get("about")),
      languages: formData.getAll("languages").map(String).filter((value) => LANGUAGES.some((item) => item.value === value)),
      consultFee: decimal(formData.get("consultFee"), 0),
      teleconsultFee: decimal(formData.get("teleconsultFee"), 0),
      currency: oneOf(CURRENCIES, text(formData.get("currency"))) ?? "USD",
      onboardingStatus: oneOf(DOCTOR_STATUSES, text(formData.get("onboardingStatus"))) ?? "draft",
      officialProfileUrl: text(formData.get("officialProfileUrl")),
      consentToList,
      partnerStatus,
      publication: {
        state,
        publishedAt: state === "published" ? (ctx.doctor.publication?.publishedAt ?? new Date().toISOString()) : null,
        tieupId: text(formData.get("tieupId")),
      },
    },
  } as never);
  await finish(ctx, "Profile");
}

// ------------------------------------------------------------- 2. credentials

export async function saveDoctorCredentialsAction(formData: FormData) {
  const ctx = await context(formData, "credentials");
  const qualifications = readRows(formData, "qual").map((row) => {
    if (!row.values.degree) fail(ctx, "Every qualification needs the degree.");
    return { degree: row.values.degree, institution: text(row.values.institution), year: year(row.values.year) };
  });
  const experience = readRows(formData, "exp").map((row) => {
    if (!row.values.role || !row.values.organization) fail(ctx, "Every position needs a role and an organisation.");
    const fromYear = year(row.values.fromYear);
    const toYear = year(row.values.toYear);
    if (fromYear && toYear && toYear < fromYear) fail(ctx, `${row.values.role}: it ends before it starts.`);
    return { role: row.values.role, organization: row.values.organization, fromYear, toYear };
  });

  const db = await getDb();
  await db.collection<Doctor>("doctors").updateOne({ _id: ctx.id }, {
    $set: {
      qualificationRecords: qualifications,
      // The one-line form older pages show.
      qualifications: qualifications.map((item) => item.degree).join(", ") || null,
      experienceHistory: experience,
    },
  } as never);
  await finish(ctx, "Credentials");
}

// ------------------------------------------------ 3. specialties & procedures

export async function saveDoctorSpecialtiesAction(formData: FormData) {
  const ctx = await context(formData, "specialties");
  const masters = await loadMasters();
  const db = await getDb();

  const known = new Set(masters.specialties.map((item) => item._id));
  let codes = [...new Set(formData.getAll("specialties").map(String))].filter((code) => known.has(code));
  const primary = String(formData.get("primarySpecialty") ?? "");
  if (codes.includes(primary)) codes = [primary, ...codes.filter((code) => code !== primary)];

  const specialties: { code: string; subSpecialty: string | null }[] = [];
  for (const code of codes) {
    const choice = text(formData.get(`sub.${code}`));
    let subSpecialty: string | null = null;
    if (choice === "__new") {
      const name = text(formData.get(`subNew.${code}`));
      if (name) {
        await db.collection("sub_specialties").updateOne(
          { _id: `ss-${code}-${slug(name)}` as never },
          { $set: { specialtyCode: code, name } },
          { upsert: true },
        );
        subSpecialty = name;
      }
    } else if (choice) {
      if (!masters.subSpecialties.some((item) => item.specialtyCode === code && item.name === choice)) fail(ctx, "Choose a sub-specialty from the list.");
      subSpecialty = choice;
    }
    specialties.push({ code, subSpecialty });
  }

  // Category → doctor, the second way: what they perform, only within what they practise.
  const procedures = [...new Set(formData.getAll("procedures").map(String))];
  for (const code of procedures) {
    const treatment = masters.treatments.find((item) => item._id === code);
    if (!treatment || !procedureInScope(masters.scope, code, codes)) {
      fail(ctx, `${treatment?.name.en ?? code} is outside this doctor's specialties.`);
    }
  }

  await db.collection<Doctor>("doctors").updateOne({ _id: ctx.id }, {
    $set: { specialties, specialtyCode: codes[0] ?? null },
  } as never);
  await db.collection("treatment_doctor_map").deleteMany({ doctorId: ctx.id });
  if (procedures.length) {
    await db.collection("treatment_doctor_map").insertMany(
      procedures.map((code) => ({
        _id: `${code}__${ctx.id}`,
        treatmentCode: code,
        doctorId: ctx.id,
        hospitalId: null,
        role: "performs",
        provenance: authoredProvenance(PROVENANCE),
      })) as never,
    );
  }

  // Affiliations: designation, attachment, department and OPD per hospital; additions and removals.
  const links = db.collection<HospitalDoctorLink>("hospital_doctor_map");
  for (const row of readRows(formData, "aff")) {
    const hospitalId = row.values.hospitalId;
    if (!hospitalId) continue;
    if (row.values.remove === "on") {
      await Promise.all([
        links.deleteMany({ doctorId: ctx.id, hospitalId }),
        db.collection<DoctorSchedule>("doctor_schedules").deleteMany({ doctorId: ctx.id, hospitalId }),
        db.collection<ScheduleException>("schedule_exceptions").deleteMany({ doctorId: ctx.id, hospitalId }),
      ]);
      continue;
    }
    const attachment = ATTACHMENTS.find((item) => item === row.values.attachment) ?? "visiting";
    const department = known.has(row.values.department) ? row.values.department : null;
    const designation = DESIGNATIONS.includes(row.values.designation) ? row.values.designation : null;
    await links.updateOne(
      { doctorId: ctx.id, hospitalId },
      { $set: { attachment, specialtyCode: department, designation, opdLocation: text(row.values.opdLocation) } },
    );
  }
  const added = text(formData.get("addHospital"));
  if (added) {
    if (!(await db.collection<Hospital>("hospitals").findOne({ _id: added }, { projection: { _id: 1 } }))) fail(ctx, "That hospital no longer exists.");
    await links.updateOne(
      { _id: `${added}__${ctx.id}` },
      {
        $set: { hospitalId: added, doctorId: ctx.id, current: true, stale: false },
        $setOnInsert: {
          attachment: ATTACHMENTS.find((item) => item === formData.get("addAttachment")) ?? "visiting",
          specialtyCode: codes[0] ?? null,
          designation: null,
          opdLocation: null,
          provenance: authoredProvenance(PROVENANCE),
        },
      } as never,
      { upsert: true },
    );
  }
  await finish(ctx, "Specialties");
}

// -------------------------------------------------------- 4. awards & bodies

export async function saveDoctorAwardsAction(formData: FormData) {
  const ctx = await context(formData, "awards");
  const awards = readRows(formData, "award").map((row) => {
    if (!row.values.title) fail(ctx, "Every award needs its title.");
    return { title: row.values.title, awardingBody: text(row.values.awardingBody), year: year(row.values.year) };
  });
  const memberships = readRows(formData, "member").map((row) => {
    if (!row.values.body) fail(ctx, "Every membership needs the body's name.");
    return { body: row.values.body, membershipNo: text(row.values.membershipNo) };
  });
  const db = await getDb();
  await db.collection<Doctor>("doctors").updateOne({ _id: ctx.id }, { $set: { awards, memberships } } as never);
  await finish(ctx, "Awards");
}

// ------------------------------------------------------------- 5. schedule

/**
 * One hospital's weekly template, plus the doctor's blackout dates. Each
 * working day is one row; slots are worked out from these, never stored.
 */
export async function saveDoctorScheduleAction(formData: FormData) {
  const ctx = await context(formData, "schedule");
  const hospitalId = String(formData.get("at") ?? "");
  const db = await getDb();
  const link = await db.collection<HospitalDoctorLink>("hospital_doctor_map").findOne({ doctorId: ctx.id, hospitalId });
  if (!link) fail(ctx, "Add the doctor to a hospital before setting a schedule there.");

  const validFrom = isoDate(text(formData.get("validFrom")));
  const validTo = isoDate(text(formData.get("validTo")));
  if (validFrom && validTo && validTo < validFrom) fail(ctx, "The schedule ends before it starts.");

  const now = new Date().toISOString();
  const rows: DoctorSchedule[] = [];
  for (const day of DAYS) {
    if (formData.get(`week.${day}.on`) !== "on") continue;
    const from = hhmm(text(formData.get(`week.${day}.from`)));
    const to = hhmm(text(formData.get(`week.${day}.to`)));
    const slotMinutes = Number(formData.get(`week.${day}.slotMinutes`));
    if (!from || !to || to <= from) fail(ctx, `${day.toUpperCase()}: the end time must be after the start time.`);
    if (!SLOT_MINUTES.includes(slotMinutes)) fail(ctx, `${day.toUpperCase()}: choose a slot length.`);
    const consultType = (oneOf(CONSULT_TYPES, text(formData.get(`week.${day}.consultType`))) ?? "in_person") as DoctorSchedule["consultType"];
    rows.push({
      _id: `${ctx.id}__${hospitalId}__${day}`,
      doctorId: ctx.id,
      hospitalId,
      day,
      from,
      to,
      slotMinutes,
      consultType,
      validFrom,
      validTo,
      note: null,
      updatedAt: now,
    });
  }

  const blackouts: ScheduleException[] = readRows(formData, "off").map((row, index) => {
    const date = isoDate(row.values.date);
    if (!date) fail(ctx, "Every blackout needs a date.");
    const scope = row.values.scope && row.values.scope !== "all" ? row.values.scope : null;
    return {
      _id: `${ctx.id}__${date}__${scope ?? "all"}__${index}`,
      doctorId: ctx.id,
      hospitalId: scope,
      date: date!,
      available: false,
      reason: text(row.values.reason),
    };
  });

  const schedules = db.collection<DoctorSchedule>("doctor_schedules");
  await schedules.deleteMany({ doctorId: ctx.id, hospitalId });
  if (rows.length) await schedules.insertMany(rows as never);
  const exceptions = db.collection<ScheduleException>("schedule_exceptions");
  await exceptions.deleteMany({ doctorId: ctx.id });
  if (blackouts.length) await exceptions.insertMany(blackouts);

  await finish(ctx, "Schedule", `&at=${encodeURIComponent(hospitalId)}`);
}
