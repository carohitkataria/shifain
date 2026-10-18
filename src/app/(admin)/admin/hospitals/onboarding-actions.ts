"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { Doctor, DoctorSchedule, Hospital, HospitalDoctorLink } from "@/lib/catalogue";
import {
  authoredProvenance,
  blankDoctor,
  count,
  decimal,
  isoDate,
  readRows,
  slug,
  text,
  uniqueDoctorId,
} from "@/lib/admin-records";
import {
  ACCREDITATION_MASTER,
  AGREEMENT_STATUSES,
  CURRENCIES,
  DOCTOR_STATUSES,
  FACILITIES,
  HOSPITAL_TYPES,
  LANGUAGES,
  OWNERSHIP,
  PACKAGE_STATUSES,
  ROOM_CATEGORIES,
  languageLabel,
} from "@/lib/onboarding-masters";
import { STEPS, blockers, isStep, type AccreditationRecord, type StepKey } from "@/lib/onboarding-rules";
import {
  accreditationSummary,
  currentActor,
  gateFor,
  loadHospitalOnboarding,
  loadMasters,
  noteEdit,
  procedureInScope,
  rememberActor,
  setStatus,
  statusOf,
  type HospitalPackage,
  type Tieup,
} from "@/lib/onboarding";
import { removeMedia, storeMedia } from "@/lib/media";

const PROVENANCE = "Shifain onboarding";

async function guard(): Promise<void> {
  if (!(await isAuthenticated())) redirect("/admin/login");
}

const pageOf = (id: string) => `/admin/hospitals/${encodeURIComponent(id)}`;
const fail = (id: string, step: string, message: string): never =>
  redirect(`${pageOf(id)}?step=${step}&error=${encodeURIComponent(message)}`);
const oneOf = <T extends { value: string }>(list: readonly T[], value: string | null) =>
  value && list.some((item) => item.value === value) ? value : null;
const url = (value: string | null) => (value && /^https?:\/\/\S+$/i.test(value) ? value : null);

// --------------------------------------------------------------- step saving

/** Saves one step. "Save draft" stays put; "Save and continue" moves on. */
export async function saveStepAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  const step = String(formData.get("step") ?? "");
  if (!id || !isStep(step)) redirect("/admin/hospitals");

  const db = await getDb();
  const hospital = await db.collection<Hospital>("hospitals").findOne({ _id: id });
  if (!hospital) redirect("/admin/hospitals");

  const save: Record<StepKey, ((hospital: Hospital, formData: FormData) => Promise<void>) | null> = {
    basics: saveBasics,
    infrastructure: saveInfrastructure,
    accreditations: saveAccreditations,
    specialties: saveSpecialties,
    facilities: saveFacilities,
    doctors: null,
    packages: savePackages,
    media: saveMedia,
    commercials: saveCommercials,
    review: null,
  };
  await save[step]?.(hospital, formData);
  if (save[step]) await noteEdit(hospital, STEPS.find((item) => item.key === step)!.short, await currentActor());

  revalidatePath("/admin/hospitals");
  if (hospital.publication?.state === "published") revalidatePath("/", "layout");
  const index = STEPS.findIndex((item) => item.key === step);
  const next = formData.get("intent") === "next" ? (STEPS[index + 1]?.key ?? step) : step;
  redirect(`${pageOf(id)}?step=${next}&saved=${step}`);
}

/** "Save and continue": the same save, then on to the next step. */
export async function saveStepAndContinueAction(formData: FormData) {
  formData.set("intent", "next");
  return saveStepAction(formData);
}

async function saveBasics(hospital: Hospital, formData: FormData) {
  const id = hospital._id;
  const name = text(formData.get("name"));
  const city = text(formData.get("city"));
  if (!name || !city) fail(id, "basics", "Display name and city are required.");

  const db = await getDb();
  // Left empty, the slug follows the record's id, which is already unique.
  const typed = text(formData.get("slug"));
  const wantedSlug = typed ? slug(typed) : id.replace(/^h-/, "");
  if (await db.collection<Hospital>("hospitals").findOne({ slug: wantedSlug, _id: { $ne: id } })) {
    fail(id, "basics", `The slug “${wantedSlug}” is already used by another hospital.`);
  }

  let groupId = text(formData.get("groupId"));
  if (groupId === "__new") {
    const groupName = text(formData.get("newGroup"));
    if (!groupName) fail(id, "basics", "Name the new hospital group, or choose “No group”.");
    groupId = `g-${slug(groupName!)}`;
    await db.collection("hospital_groups").updateOne(
      { _id: groupId as never },
      { $set: { name: groupName, website: null, updatedAt: new Date().toISOString() } },
      { upsert: true },
    );
  }

  const year = count(formData.get("yearEstablished"), new Date().getFullYear());
  const iata = (text(formData.get("nearestAirportIata")) ?? "").toUpperCase();
  const desk = hospital.internationalDesk ?? { exists: null, contactName: null, email: null, phone: null, languages: [] };
  const deskName = text(formData.get("deskName"));
  const deskEmail = text(formData.get("deskEmail"));
  const deskPhone = text(formData.get("deskPhone"));
  if (deskEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(deskEmail)) fail(id, "basics", "The international desk email does not look right.");

  await db.collection<Hospital>("hospitals").updateOne({ _id: id }, {
    $set: {
      name,
      city,
      legalName: text(formData.get("legalName")),
      slug: wantedSlug,
      hospitalType: oneOf(HOSPITAL_TYPES, text(formData.get("hospitalType"))),
      groupId: groupId || null,
      yearEstablished: year && year >= 1800 ? year : null,
      ownership: oneOf(OWNERSHIP, text(formData.get("ownership"))),
      assignedRm: text(formData.get("assignedRm")),
      address: text(formData.get("address")),
      state: text(formData.get("state")),
      country: text(formData.get("country")) ?? "India",
      pincode: text(formData.get("pincode")),
      lat: decimal(formData.get("lat"), -90, 90),
      lng: decimal(formData.get("lng"), -180, 180),
      nearestAirport: text(formData.get("nearestAirport")),
      nearestAirportIata: /^[A-Z]{3}$/.test(iata) ? iata : null,
      airportDistanceKm: decimal(formData.get("airportDistanceKm"), 0, 2000),
      officialWebsite: url(text(formData.get("officialWebsite"))),
      about: text(formData.get("about")),
      aboutRu: text(formData.get("aboutRu")),
      aboutUz: text(formData.get("aboutUz")),
      usps: String(formData.get("usps") ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 8),
      internationalDesk: {
        ...desk,
        contactName: deskName,
        email: deskEmail,
        phone: deskPhone,
        exists: desk.exists || Boolean(deskName || deskEmail || deskPhone) || null,
      },
    },
  } as never);
}

async function saveInfrastructure(hospital: Hospital, formData: FormData) {
  const masters = await loadMasters();
  const known = new Set(masters.capabilities.map((item) => item._id));
  const db = await getDb();
  await db.collection<Hospital>("hospitals").updateOne({ _id: hospital._id }, {
    $set: {
      beds: count(formData.get("beds")),
      icuBeds: count(formData.get("icuBeds")),
      hduBeds: count(formData.get("hduBeds")),
      otCount: count(formData.get("otCount"), 500),
      cathlabCount: count(formData.get("cathlabCount"), 100),
      doctorCount: count(formData.get("doctorCount")),
      nurseCount: count(formData.get("nurseCount")),
      capabilities: formData.getAll("capabilities").map(String).filter((code) => known.has(code)),
    },
  } as never);
}

async function saveAccreditations(hospital: Hospital, formData: FormData) {
  const id = hospital._id;
  const previous = hospital.accreditationRecords ?? [];
  const ownFiles = new Set(previous.map((record) => record.fileId).filter(Boolean));
  const records: AccreditationRecord[] = [];

  for (const row of readRows(formData, "acc")) {
    const code = row.values.code;
    if (!ACCREDITATION_MASTER.some((item) => item.code === code)) fail(id, "accreditations", "Choose the accrediting body for every row.");
    const validFrom = isoDate(row.values.validFrom);
    const validTo = isoDate(row.values.validTo);
    if (!validFrom || !validTo) fail(id, "accreditations", `${code}: valid-from and valid-to dates are both required.`);
    if (validTo! < validFrom!) fail(id, "accreditations", `${code}: valid-to is before valid-from.`);
    const uploaded = await storeMedia(row.files.file, { type: "hospital", id }, "certificate");
    if (row.files.file && !uploaded) fail(id, "accreditations", `${code}: the certificate must be a PDF or image under 8 MB.`);
    const kept = row.values.fileId && ownFiles.has(row.values.fileId) ? row.values.fileId : null;
    records.push({
      id: row.values.id || crypto.randomBytes(5).toString("hex"),
      code,
      certificateNo: text(row.values.certificateNo),
      validFrom,
      validTo,
      fileId: uploaded ?? kept,
      revoked: row.values.revoked === "on",
    });
  }

  const db = await getDb();
  await db.collection<Hospital>("hospitals").updateOne({ _id: id }, {
    $set: { accreditationRecords: records, accreditations: accreditationSummary(records) },
  } as never);
  const stillUsed = new Set(records.map((record) => record.fileId));
  await removeMedia(previous.map((record) => record.fileId).filter((file) => !stillUsed.has(file)));
}

async function saveSpecialties(hospital: Hospital, formData: FormData) {
  const id = hospital._id;
  const masters = await loadMasters();
  const known = new Set(masters.specialties.map((item) => item._id));
  const offered = [...new Set(formData.getAll("specialtyCodes").map(String))].filter((code) => known.has(code));
  const centres = readRows(formData, "centre").map((row) => {
    if (!row.values.name) fail(id, "specialties", "Every centre of excellence needs a name.");
    return {
      id: row.values.id || crypto.randomBytes(5).toString("hex"),
      name: row.values.name,
      description: text(row.values.description),
      specialtyCodes: (row.lists.specialtyCodes ?? []).filter((code) => offered.includes(code)),
    };
  });
  const coe = new Set([
    ...formData.getAll("coe").map(String).filter((code) => offered.includes(code)),
    ...centres.flatMap((centre) => centre.specialtyCodes),
  ]);

  const db = await getDb();
  await db.collection<Hospital>("hospitals").updateOne({ _id: id }, { $set: { specialtyCodes: offered, centres } } as never);
  await db.collection("hospital_specialty_map").deleteMany({ hospitalId: id });
  if (offered.length) {
    await db.collection("hospital_specialty_map").insertMany(
      offered.map((code) => ({
        _id: `${id}__${code}`,
        hospitalId: id,
        specialtyCode: code,
        departmentName: null,
        isCentreOfExcellence: coe.has(code),
        bedCount: count(formData.get(`beds.${code}`), 5000),
        provenance: authoredProvenance(PROVENANCE),
      })) as never,
    );
  }
}

async function saveFacilities(hospital: Hospital, formData: FormData) {
  const facilities = formData.getAll("facilities").map(String).filter((value) => FACILITIES.some((item) => item.value === value));
  const languages = formData.getAll("languages").map(String).filter((value) => LANGUAGES.some((item) => item.value === value));
  const desk = hospital.internationalDesk ?? { exists: null, contactName: null, email: null, phone: null, languages: [] };
  const db = await getDb();
  await db.collection<Hospital>("hospitals").updateOne({ _id: hospital._id }, {
    $set: {
      facilities,
      languages,
      internationalDesk: { ...desk, exists: facilities.includes("international-desk") || desk.exists, languages: languages.map(languageLabel) },
    },
  } as never);
}

async function savePackages(hospital: Hospital, formData: FormData) {
  const id = hospital._id;
  const masters = await loadMasters();
  const offered = hospital.specialtyCodes ?? [];
  const now = new Date().toISOString();
  const packages: HospitalPackage[] = readRows(formData, "pkg").map((row) => {
    const v = row.values;
    const label = v.name || "A package";
    if (!v.name) fail(id, "packages", "Every package needs a name.");
    if (!offered.includes(v.specialtyCode)) fail(id, "packages", `“${label}”: choose one of this hospital's specialties (map them in step 4 first).`);
    const treatment = masters.treatments.find((item) => item._id === v.treatmentCode);
    if (!treatment) fail(id, "packages", `“${label}”: choose the procedure.`);
    if (!procedureInScope(masters.scope, v.treatmentCode, [v.specialtyCode])) {
      fail(id, "packages", `“${label}”: ${treatment!.name.en} is not a procedure of the chosen specialty.`);
    }
    const priceMin = decimal(v.priceMin, 0);
    const priceMax = decimal(v.priceMax, 0);
    if (priceMin !== null && priceMax !== null && priceMin > priceMax) fail(id, "packages", `“${label}”: the lowest price is above the highest.`);
    return {
      _id: v.id || `pkg-${crypto.randomBytes(5).toString("hex")}`,
      hospitalId: id,
      specialtyCode: v.specialtyCode,
      treatmentCode: v.treatmentCode,
      name: v.name,
      inclusions: text(v.inclusions),
      exclusions: text(v.exclusions),
      priceMin,
      priceMax,
      currency: oneOf(CURRENCIES, v.currency) ?? "USD",
      stayDays: count(v.stayDays, 365),
      roomCategory: oneOf(ROOM_CATEGORIES, v.roomCategory),
      status: (oneOf(PACKAGE_STATUSES, v.status) ?? "draft") as HospitalPackage["status"],
      updatedAt: now,
    };
  });

  const db = await getDb();
  const collection = db.collection<HospitalPackage>("hospital_packages");
  await collection.deleteMany({ hospitalId: id, _id: { $nin: packages.map((item) => item._id) } });
  for (const item of packages) {
    const { _id, ...rest } = item;
    await collection.updateOne({ _id, hospitalId: id }, { $set: rest }, { upsert: true });
  }
  // Where a treatment can be done: active packages say so, confirmed by the hospital.
  await db.collection("treatment_hospital_map").deleteMany({ hospitalId: id, "provenance.source": PROVENANCE });
  const active = [...new Set(packages.filter((item) => item.status === "active").map((item) => item.treatmentCode))];
  if (active.length) {
    await db.collection("treatment_hospital_map").insertMany(
      active.map((code) => ({
        _id: `${code}__${id}`,
        treatmentCode: code,
        hospitalId: id,
        annualVolume: null,
        confirmedByHospital: true,
        provenance: authoredProvenance(PROVENANCE),
      })) as never,
      { ordered: false },
    ).catch(() => undefined);
  }
}

async function saveMedia(hospital: Hospital, formData: FormData) {
  const id = hospital._id;
  const owner = { type: "hospital" as const, id };
  const media = hospital.media ?? { logoId: null, coverId: null, galleryIds: [], virtualTourUrl: null, videoUrl: null };
  const stale: (string | null)[] = [];

  const replace = async (field: "logo" | "cover", current: string | null) => {
    const file = formData.get(field) as File | null;
    if (file && typeof file !== "string" && file.size) {
      const stored = await storeMedia(file, owner, field);
      if (!stored) fail(id, "media", `The ${field} must be a PNG, JPEG, WebP or GIF under 8 MB.`);
      stale.push(current);
      return stored;
    }
    if (formData.get(`remove-${field}`) === "on") {
      stale.push(current);
      return null;
    }
    return current;
  };
  const logoId = await replace("logo", media.logoId);
  const coverId = await replace("cover", media.coverId);

  const removing = new Set(formData.getAll("removeGallery").map(String));
  const galleryIds = media.galleryIds.filter((item) => !removing.has(item));
  stale.push(...media.galleryIds.filter((item) => removing.has(item)));
  for (const file of formData.getAll("gallery")) {
    if (typeof file === "string" || !file.size) continue;
    if (galleryIds.length >= 24) break;
    const stored = await storeMedia(file, owner, "gallery");
    if (!stored) fail(id, "media", `“${file.name}” is not a PNG, JPEG, WebP or GIF under 8 MB.`);
    galleryIds.push(stored!);
  }

  const tour = text(formData.get("virtualTourUrl"));
  const video = text(formData.get("videoUrl"));
  if ((tour && !url(tour)) || (video && !url(video))) fail(id, "media", "Links must start with https://");

  const db = await getDb();
  await db.collection<Hospital>("hospitals").updateOne({ _id: id }, {
    $set: { media: { logoId, coverId, galleryIds, virtualTourUrl: url(tour), videoUrl: url(video) } },
  } as never);
  await removeMedia(stale);
}

async function saveCommercials(hospital: Hospital, formData: FormData) {
  const id = hospital._id;
  const status = AGREEMENT_STATUSES.find((item) => item.value === formData.get("agreementStatus")) ?? AGREEMENT_STATUSES[0];
  const agreementRef = text(formData.get("agreementRef"));
  if (status.value === "signed" && !agreementRef) fail(id, "commercials", "A signed agreement needs its reference (the tie-up number).");
  const commission = decimal(formData.get("commissionPercent"), 0, 100);
  if (String(formData.get("commissionPercent") ?? "").trim() && commission === null) fail(id, "commercials", "Commission is a percentage between 0 and 100.");
  const contractStart = isoDate(text(formData.get("contractStart")));
  const contractEnd = isoDate(text(formData.get("contractEnd")));
  if (contractStart && contractEnd && contractEnd < contractStart) fail(id, "commercials", "The contract ends before it starts.");

  const db = await getDb();
  const tieups = db.collection<Tieup>("tieups");
  const current = await tieups.findOne({ hospitalId: id });
  const file = formData.get("agreement") as File | null;
  let agreementFileId = current?.agreementFileId ?? null;
  if (file && typeof file !== "string" && file.size) {
    const stored = await storeMedia(file, { type: "hospital", id }, "agreement");
    if (!stored) fail(id, "commercials", "The agreement must be a PDF or image under 8 MB.");
    await removeMedia([agreementFileId]);
    agreementFileId = stored;
  }

  await tieups.updateOne(
    { _id: current?._id ?? `tie-${id}` },
    {
      $set: {
        hospitalId: id,
        status: status.tieup,
        agreementRef,
        contractStart,
        contractEnd,
        commissionPercent: commission,
        priceGuaranteeAgreed: formData.get("priceGuarantee") === "on",
        coordinatorName: hospital.internationalDesk?.contactName ?? null,
        deskLanguages: hospital.internationalDesk?.languages ?? [],
        paymentTerms: text(formData.get("paymentTerms")),
        agreementFileId,
        notes: null,
      },
    },
    { upsert: true },
  );

  // The partner status follows the paper: signed is signed, and nothing else is.
  const partnerStatus =
    hospital.partnerStatus === "suspended" ? "suspended" : status.value === "signed" ? "signed" : hospital.partnerStatus === "signed" ? "negotiating" : hospital.partnerStatus;
  await db.collection<Hospital>("hospitals").updateOne({ _id: id }, {
    $set: { kycVerified: formData.get("kycVerified") === "on", partnerStatus },
  } as never);
}

// --------------------------------------------------------------- doctors step

/** Adds a new doctor at this hospital and opens their editor. */
export async function addDoctorToHospitalAction(formData: FormData) {
  await guard();
  const hospitalId = String(formData.get("hospitalId") ?? "");
  const name = text(formData.get("name"));
  if (!hospitalId) redirect("/admin/hospitals");
  if (!name) fail(hospitalId, "doctors", "Give the doctor's full name.");

  const masters = await loadMasters();
  const specialty = text(formData.get("specialtyCode"));
  const code = specialty && masters.specialties.some((item) => item._id === specialty) ? specialty : null;
  const doctorId = await uniqueDoctorId(name!);
  const db = await getDb();
  await db.collection<Doctor>("doctors").insertOne({
    ...blankDoctor(doctorId, name!),
    specialtyCode: code,
    specialties: code ? [{ code, subSpecialty: null }] : [],
    slug: doctorId.replace(/^d-/, ""),
    onboardingStatus: "draft",
    provenance: authoredProvenance(PROVENANCE),
  } as never);
  await linkDoctor(hospitalId, doctorId, code);
  await touchHospital(hospitalId, "Doctors");
  redirect(`/admin/doctors/${encodeURIComponent(doctorId)}?hospital=${encodeURIComponent(hospitalId)}&saved=created`);
}

/** Puts a doctor already on record at this hospital too: one doctor, many hospitals. */
export async function linkExistingDoctorAction(formData: FormData) {
  await guard();
  const hospitalId = String(formData.get("hospitalId") ?? "");
  const doctorId = String(formData.get("doctorId") ?? "");
  const db = await getDb();
  const doctor = doctorId ? await db.collection<Doctor>("doctors").findOne({ _id: doctorId }) : null;
  if (!doctor) fail(hospitalId, "doctors", "Choose a doctor from the list.");
  await linkDoctor(hospitalId, doctorId, doctor!.specialtyCode);
  await touchHospital(hospitalId, "Doctors");
  revalidatePath(pageOf(hospitalId));
  redirect(`${pageOf(hospitalId)}?step=doctors&saved=doctors`);
}

async function linkDoctor(hospitalId: string, doctorId: string, specialtyCode: string | null) {
  const db = await getDb();
  await db.collection<HospitalDoctorLink>("hospital_doctor_map").updateOne(
    { _id: `${hospitalId}__${doctorId}` },
    {
      $set: { hospitalId, doctorId, current: true, stale: false },
      $setOnInsert: { specialtyCode, attachment: "primary", designation: null, opdLocation: null, provenance: authoredProvenance(PROVENANCE) },
    } as never,
    { upsert: true },
  );
}

/** Set status, assign a department, or remove from this hospital, for every ticked doctor. */
export async function bulkDoctorsAction(formData: FormData) {
  await guard();
  const hospitalId = String(formData.get("hospitalId") ?? "");
  const ids = [...new Set(formData.getAll("ids").map(String))];
  const op = String(formData.get("op") ?? "");
  if (!hospitalId) redirect("/admin/hospitals");
  if (ids.length === 0) fail(hospitalId, "doctors", "Tick at least one doctor first.");

  const db = await getDb();
  const linked = await db.collection<HospitalDoctorLink>("hospital_doctor_map").find({ hospitalId, doctorId: { $in: ids } }).toArray();
  const doctorIds = linked.map((link) => link.doctorId);
  const [kind, value] = op.split(":");

  if (kind === "status" && DOCTOR_STATUSES.some((item) => item.value === value)) {
    await db.collection<Doctor>("doctors").updateMany({ _id: { $in: doctorIds } }, { $set: { onboardingStatus: value } } as never);
  } else if (kind === "department") {
    const masters = await loadMasters();
    if (!masters.specialties.some((item) => item._id === value)) fail(hospitalId, "doctors", "Choose a department.");
    await db.collection<HospitalDoctorLink>("hospital_doctor_map").updateMany({ hospitalId, doctorId: { $in: doctorIds } }, { $set: { specialtyCode: value } });
  } else if (kind === "remove") {
    await Promise.all([
      db.collection<HospitalDoctorLink>("hospital_doctor_map").deleteMany({ hospitalId, doctorId: { $in: doctorIds } }),
      db.collection<DoctorSchedule>("doctor_schedules").deleteMany({ hospitalId, doctorId: { $in: doctorIds } }),
      db.collection("schedule_exceptions").deleteMany({ hospitalId, doctorId: { $in: doctorIds } }),
    ]);
  } else {
    fail(hospitalId, "doctors", "Choose what to do with the ticked doctors.");
  }

  await touchHospital(hospitalId, "Doctors");
  revalidatePath(pageOf(hospitalId));
  redirect(`${pageOf(hospitalId)}?step=doctors&saved=bulk&count=${doctorIds.length}`);
}

async function touchHospital(hospitalId: string, step: string) {
  const db = await getDb();
  const hospital = await db.collection<Hospital>("hospitals").findOne({ _id: hospitalId });
  if (hospital) await noteEdit(hospital, step, await currentActor());
}

// ------------------------------------------------------------------ lifecycle

/** Who is acting. The one shared login cannot tell maker from checker by itself. */
export async function setActorAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  const name = text(formData.get("actor"));
  if (name) await rememberActor(name);
  redirect(`${pageOf(id)}?step=review`);
}

async function lifecycleContext(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  const [data, masters, actor] = await Promise.all([loadHospitalOnboarding(id), loadMasters(), currentActor()]);
  if (!data) redirect("/admin/hospitals");
  if (!actor) fail(id, "review", "Enter your name first, so the history shows who did what.");
  return { id, data: data!, masters, actor, status: statusOf(data!.hospital), note: text(formData.get("note")) };
}

const sameName = (a: string | null | undefined, b: string | null | undefined) => Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());

export async function submitForReviewAction(formData: FormData) {
  const { id, data, masters, actor, status, note } = await lifecycleContext(formData);
  if (status !== "draft") fail(id, "review", "Only a draft can be submitted.");
  const blocking = blockers(gateFor(data, masters), "submit");
  if (blocking.length) fail(id, "review", `Fix ${blocking.length} blocking ${blocking.length === 1 ? "issue" : "issues"} before submitting.`);
  await setStatus(data.hospital, "submitted", actor, note);
  done(id);
}

export async function startReviewAction(formData: FormData) {
  const { id, data, actor, status, note } = await lifecycleContext(formData);
  if (status !== "submitted") fail(id, "review", "Only a submitted hospital can be taken into review.");
  if (sameName(actor, data.hospital.onboarding?.submittedBy)) fail(id, "review", "The reviewer must be someone other than the person who submitted it.");
  await setStatus(data.hospital, "under_review", actor, note);
  done(id);
}

export async function approveAction(formData: FormData) {
  const { id, data, masters, actor, status, note } = await lifecycleContext(formData);
  if (status !== "under_review") fail(id, "review", "Take the hospital into review before approving it.");
  if (sameName(actor, data.hospital.onboarding?.submittedBy)) fail(id, "review", "You submitted this hospital, so someone else has to approve it.");
  const blocking = blockers(gateFor(data, masters), "submit");
  if (blocking.length) fail(id, "review", "It cannot be approved while blocking issues remain.");
  await setStatus(data.hospital, "approved", actor, note);
  done(id);
}

export async function sendBackAction(formData: FormData) {
  const { id, data, actor, status, note } = await lifecycleContext(formData);
  if (!["submitted", "under_review", "approved"].includes(status)) fail(id, "review", "Nothing to send back.");
  if (!note) fail(id, "review", "Say what needs changing, so the person who drafted it knows.");
  await setStatus(data.hospital, "draft", actor, note);
  done(id);
}

/**
 * Publishing is where the gate is absolute: approved, nothing blocking, and a
 * signed agreement. Doctors who are active and have agreed to be listed go live
 * with the hospital, under the same tie-up.
 */
export async function publishAction(formData: FormData) {
  const { id, data, masters, actor, status, note } = await lifecycleContext(formData);
  if (status !== "approved") fail(id, "review", "Only an approved hospital can be published.");
  const blocking = blockers(gateFor(data, masters), "publish");
  if (blocking.length) fail(id, "review", blocking[0].message);

  const tieupId = data.tieup!.agreementRef!;
  const now = new Date().toISOString();
  await setStatus(data.hospital, "published", actor, note, {
    partnerStatus: "signed",
    accreditations: accreditationSummary(data.hospital.accreditationRecords ?? []),
    publication: { state: "published", publishedAt: data.hospital.publication?.publishedAt ?? now, tieupId },
  });

  const db = await getDb();
  const listable = data.doctors
    .filter(({ doctor }) => doctor.consentToList && (doctor.onboardingStatus ?? "draft") === "active")
    .map(({ doctor }) => doctor._id);
  if (listable.length) {
    await db.collection<Doctor>("doctors").updateMany(
      { _id: { $in: listable }, "publication.state": { $ne: "published" } },
      { $set: { partnerStatus: "signed", publication: { state: "published", publishedAt: now, tieupId } } },
    );
  }
  revalidatePath("/", "layout");
  done(id);
}

export async function suspendAction(formData: FormData) {
  const { id, data, actor, status, note } = await lifecycleContext(formData);
  if (status !== "published") fail(id, "review", "Only a published hospital can be suspended.");
  if (!note) fail(id, "review", "Give the reason for suspending.");
  await setStatus(data.hospital, "suspended", actor, note, {
    partnerStatus: "suspended",
    publication: { state: "withdrawn", publishedAt: null, tieupId: data.hospital.publication?.tieupId ?? null },
  });

  // A doctor listed only through this hospital comes down with it.
  const db = await getDb();
  for (const { doctor } of data.doctors) {
    if (doctor.publication?.state !== "published") continue;
    const others = await db
      .collection<HospitalDoctorLink>("hospital_doctor_map")
      .find({ doctorId: doctor._id, hospitalId: { $ne: id } })
      .toArray();
    const livesElsewhere = others.length
      ? await db.collection<Hospital>("hospitals").countDocuments({ _id: { $in: others.map((link) => link.hospitalId) }, "publication.state": "published" })
      : 0;
    if (!livesElsewhere) {
      await db.collection<Doctor>("doctors").updateOne({ _id: doctor._id }, { $set: { "publication.state": "withdrawn", "publication.publishedAt": null } });
    }
  }
  revalidatePath("/", "layout");
  done(id);
}

export async function reinstateAction(formData: FormData) {
  const { id, data, actor, status, note } = await lifecycleContext(formData);
  if (status !== "suspended") fail(id, "review", "Only a suspended hospital can be reinstated.");
  await setStatus(data.hospital, "approved", actor, note ?? "Reinstated — publish again when ready", { partnerStatus: data.tieup?.status === "active" ? "signed" : "negotiating" });
  done(id);
}

function done(id: string): never {
  revalidatePath("/admin/hospitals");
  redirect(`${pageOf(id)}?step=review&saved=status`);
}
