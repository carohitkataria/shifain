"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { Doctor, DoctorSchedule, Hospital, HospitalDoctorLink } from "@/lib/catalogue";
import {
  authoredProvenance,
  blankDoctor,
  blankHospital,
  list as splitList,
  numberOrNull as num,
  parseCsv,
  pick,
  text,
  uniqueDoctorId,
  uniqueHospitalId,
} from "@/lib/admin-records";

const PARTNER_STATUS = ["prospect", "contacted", "negotiating", "signed", "suspended"];
const PUBLICATION = ["research", "verified", "published", "withdrawn"];

const list = splitList;
const numberOrNull = num;

export async function saveHospitalAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/hospitals");

  const db = await getDb();
  const hospitals = db.collection<Hospital>("hospitals");
  const current = await hospitals.findOne({ _id: id });
  if (!current) redirect("/admin/hospitals");

  const partnerStatus = String(formData.get("partnerStatus") ?? current.partnerStatus);
  const state = String(formData.get("publicationState") ?? current.publication.state);
  const tieupId = String(formData.get("tieupId") ?? "").trim() || null;

  if (!PARTNER_STATUS.includes(partnerStatus) || !PUBLICATION.includes(state)) {
    redirect(`/admin/hospitals/${id}?error=1`);
  }

  // The gate the whole catalogue rests on: nothing is published to patients
  // without a signed tie-up behind it.
  if (state === "published" && (!tieupId || partnerStatus !== "signed")) {
    redirect(`/admin/hospitals/${id}?error=tieup`);
  }

  await hospitals.updateOne(
    { _id: id },
    {
      $set: {
        legalName: String(formData.get("legalName") ?? "").trim() || null,
        hospitalType: String(formData.get("hospitalType") ?? "").trim() || null,
        beds: numberOrNull(formData.get("beds")),
        icuBeds: numberOrNull(formData.get("icuBeds")),
        accreditations: list(formData.get("accreditations")),
        specialtyCodes: list(formData.get("specialtyCodes")),
        capabilities: list(formData.get("capabilities")),
        officialWebsite: String(formData.get("officialWebsite") ?? "").trim() || null,
        about: String(formData.get("about") ?? "").trim() || null,
        internationalDesk: {
          exists: formData.get("deskExists") === "on",
          contactName: String(formData.get("deskName") ?? "").trim() || null,
          email: String(formData.get("deskEmail") ?? "").trim() || null,
          phone: String(formData.get("deskPhone") ?? "").trim() || null,
          languages: list(formData.get("deskLanguages")),
        },
        partnerStatus,
        publication: {
          state,
          publishedAt:
            state === "published"
              ? (current.publication.publishedAt ?? new Date().toISOString())
              : null,
          tieupId,
        },
      },
    },
  );

  revalidatePath("/admin/hospitals");
  revalidatePath("/", "layout");
  redirect(`/admin/hospitals/${id}?saved=1`);
}

// ------------------------------------------------------------ hospitals CRUD

export async function createHospitalAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  if (!name || !city) redirect("/admin/hospitals?error=name");

  const id = await uniqueHospitalId(name, city);
  const db = await getDb();
  await db.collection<Hospital>("hospitals").insertOne({
    ...blankHospital(id, name, city),
    state: text(formData.get("state")),
    provenance: authoredProvenance(),
  } as never);

  revalidatePath("/admin/hospitals");
  redirect(`/admin/hospitals/${id}?saved=created`);
}

export async function deleteHospitalAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/hospitals");

  const db = await getDb();
  // The mappings and rotas go with it; leaving them would strand rows that
  // point at a hospital nobody can open.
  await Promise.all([
    db.collection<Hospital>("hospitals").deleteOne({ _id: id }),
    db.collection<HospitalDoctorLink>("hospital_doctor_map").deleteMany({ hospitalId: id }),
    db.collection<DoctorSchedule>("doctor_schedules").deleteMany({ hospitalId: id }),
  ]);

  revalidatePath("/admin/hospitals");
  revalidatePath("/", "layout");
  redirect("/admin/hospitals?saved=deleted");
}

// -------------------------------------------------------------- doctors CRUD

export async function saveDoctorAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(id ? `/admin/doctors/${id}?error=name` : "/admin/doctors?error=name");

  const db = await getDb();
  const doctors = db.collection<Doctor>("doctors");

  const consentToList = formData.get("consentToList") === "on";
  const state = String(formData.get("publicationState") ?? "research");

  // A doctor is never published without their own agreement to be listed.
  if (state === "published" && !consentToList) {
    redirect(`/admin/doctors/${id}?error=consent`);
  }

  const fields = {
    name,
    specialtyCode: text(formData.get("specialtyCode")),
    specialtyLabelRaw: text(formData.get("specialtyLabelRaw")),
    qualifications: text(formData.get("qualifications")),
    registrationNumber: text(formData.get("registrationNumber")),
    experienceYears: num(formData.get("experienceYears")),
    officialProfileUrl: text(formData.get("officialProfileUrl")),
    about: text(formData.get("about")),
    consentToList,
    partnerStatus: String(formData.get("partnerStatus") ?? "prospect"),
    publication: {
      state,
      publishedAt: state === "published" ? new Date().toISOString() : null,
      tieupId: text(formData.get("tieupId")),
    },
  };

  if (id) {
    await doctors.updateOne({ _id: id }, { $set: fields as never });
    revalidatePath("/admin/doctors");
    revalidatePath("/", "layout");
    redirect(`/admin/doctors/${id}?saved=1`);
  }

  const newId = await uniqueDoctorId(name);
  await doctors.insertOne({
    ...blankDoctor(newId, name),
    ...fields,
    provenance: authoredProvenance(),
  } as never);

  revalidatePath("/admin/doctors");
  redirect(`/admin/doctors/${newId}?saved=created`);
}

export async function deleteDoctorAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/doctors");

  const db = await getDb();
  await Promise.all([
    db.collection<Doctor>("doctors").deleteOne({ _id: id }),
    db.collection<HospitalDoctorLink>("hospital_doctor_map").deleteMany({ doctorId: id }),
    db.collection<DoctorSchedule>("doctor_schedules").deleteMany({ doctorId: id }),
  ]);

  revalidatePath("/admin/doctors");
  revalidatePath("/", "layout");
  redirect("/admin/doctors?saved=deleted");
}

// ------------------------------------------------------- mapping and rotas

/** A doctor can sit at any number of hospitals; this adds one of them. */
export async function linkDoctorAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const doctorId = String(formData.get("doctorId") ?? "");
  const hospitalId = String(formData.get("hospitalId") ?? "");
  const back = String(formData.get("back") ?? `/admin/doctors/${doctorId}`);
  if (!doctorId || !hospitalId) redirect(back);

  const db = await getDb();
  await db.collection<HospitalDoctorLink>("hospital_doctor_map").updateOne(
    { _id: `${hospitalId}__${doctorId}` },
    {
      $set: {
        hospitalId,
        doctorId,
        specialtyCode: text(formData.get("specialtyCode")),
        attachment: (String(formData.get("attachment") || "visiting")) as
          | "primary"
          | "visiting"
          | "consultant",
        current: true,
        stale: false,
        provenance: authoredProvenance(),
      } as never,
    },
    { upsert: true },
  );

  revalidatePath(back);
  redirect(`${back}?saved=linked`);
}

export async function unlinkDoctorAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const doctorId = String(formData.get("doctorId") ?? "");
  const hospitalId = String(formData.get("hospitalId") ?? "");
  const back = String(formData.get("back") ?? `/admin/doctors/${doctorId}`);

  const db = await getDb();
  await Promise.all([
    db.collection<HospitalDoctorLink>("hospital_doctor_map").deleteMany({ doctorId, hospitalId }),
    db.collection<DoctorSchedule>("doctor_schedules").deleteMany({ doctorId, hospitalId }),
  ]);

  revalidatePath(back);
  redirect(`${back}?saved=unlinked`);
}

/** One line of a rota. Every field but the two ids may be left blank. */
export async function addScheduleAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const doctorId = String(formData.get("doctorId") ?? "");
  const hospitalId = String(formData.get("hospitalId") ?? "");
  const back = String(formData.get("back") ?? `/admin/doctors/${doctorId}`);
  if (!doctorId || !hospitalId) redirect(back);

  const day = String(formData.get("day") ?? "");
  const db = await getDb();
  await db.collection<DoctorSchedule>("doctor_schedules").insertOne({
    _id: `${doctorId}__${hospitalId}__${day || "any"}__${Date.now().toString(36)}`,
    doctorId,
    hospitalId,
    day: (["mon", "tue", "wed", "thu", "fri", "sat", "sun"].includes(day) ? day : null) as never,
    from: text(formData.get("from")),
    to: text(formData.get("to")),
    slotMinutes: num(formData.get("slotMinutes")),
    note: text(formData.get("note")),
    updatedAt: new Date().toISOString(),
  } as never);

  revalidatePath(back);
  redirect(`${back}?saved=scheduled`);
}

export async function removeScheduleAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const id = String(formData.get("scheduleId") ?? "");
  const back = String(formData.get("back") ?? "/admin/doctors");
  if (id) {
    const db = await getDb();
    await db.collection<DoctorSchedule>("doctor_schedules").deleteOne({ _id: id });
  }

  revalidatePath(back);
  redirect(back);
}

// ------------------------------------------------------------- bulk import

type ImportResult = { created: number; updated: number; skipped: number };

/**
 * Takes a pasted sheet. Column names are matched loosely, because a sheet from
 * a hospital, a registry and a colleague will never agree on spelling, and a
 * failed import over a header row is a miserable way to spend an afternoon.
 */
export async function importAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const kind = String(formData.get("kind") ?? "");
  const csv = String(formData.get("csv") ?? "").trim();
  if (!csv) redirect("/admin/import?error=empty");

  const rows = parseCsv(csv);
  if (rows.length === 0) redirect("/admin/import?error=parse");

  const db = await getDb();
  const result: ImportResult = { created: 0, updated: 0, skipped: 0 };

  if (kind === "hospitals") {
    const hospitals = db.collection<Hospital>("hospitals");
    for (const row of rows) {
      const name = pick(row, "name", "hospital", "hospitalname");
      const city = pick(row, "city", "location");
      if (!name || !city) {
        result.skipped += 1;
        continue;
      }
      const existing = await hospitals.findOne({ name, city });
      const fields = {
        state: pick(row, "state") || null,
        hospitalType: pick(row, "type", "hospitaltype") || null,
        beds: num(pick(row, "beds")),
        icuBeds: num(pick(row, "icubeds", "icu")),
        accreditations: splitList(pick(row, "accreditations", "accreditation")),
        specialtyCodes: splitList(pick(row, "specialtycodes", "specialties", "specialty")),
        capabilities: splitList(pick(row, "capabilities")),
        officialWebsite: pick(row, "website", "officialwebsite", "url") || null,
        about: pick(row, "about", "description") || null,
      };

      if (existing) {
        await hospitals.updateOne({ _id: existing._id }, { $set: fields as never });
        result.updated += 1;
      } else {
        const id = await uniqueHospitalId(name, city);
        await hospitals.insertOne({
          ...blankHospital(id, name, city),
          ...fields,
          provenance: authoredProvenance("Bulk import"),
        } as never);
        result.created += 1;
      }
    }
  } else if (kind === "doctors") {
    const doctors = db.collection<Doctor>("doctors");
    for (const row of rows) {
      const name = pick(row, "name", "doctor", "doctorname");
      if (!name) {
        result.skipped += 1;
        continue;
      }
      const existing = await doctors.findOne({ name });
      const fields = {
        specialtyCode: pick(row, "specialtycode") || null,
        specialtyLabelRaw: pick(row, "specialty", "speciality", "department") || null,
        qualifications: pick(row, "qualifications", "degrees") || null,
        registrationNumber: pick(row, "registrationnumber", "registration", "nmcnumber") || null,
        experienceYears: num(pick(row, "experienceyears", "experience", "years")),
        officialProfileUrl: pick(row, "profileurl", "url", "officialprofileurl") || null,
      };

      let doctorId: string;
      if (existing) {
        await doctors.updateOne({ _id: existing._id }, { $set: fields as never });
        doctorId = existing._id;
        result.updated += 1;
      } else {
        doctorId = await uniqueDoctorId(name);
        await doctors.insertOne({
          ...blankDoctor(doctorId, name),
          ...fields,
          provenance: authoredProvenance("Bulk import"),
        } as never);
        result.created += 1;
      }

      // A hospital column on the same row maps the doctor straight away, which
      // is how these sheets always arrive.
      const hospitalName = pick(row, "hospital", "hospitalname");
      const hospitalCity = pick(row, "hospitalcity", "city");
      if (hospitalName) {
        const hospital = await db
          .collection<Hospital>("hospitals")
          .findOne(hospitalCity ? { name: hospitalName, city: hospitalCity } : { name: hospitalName });
        if (hospital) {
          await db.collection<HospitalDoctorLink>("hospital_doctor_map").updateOne(
            { _id: `${hospital._id}__${doctorId}` },
            {
              $set: {
                hospitalId: hospital._id,
                doctorId,
                specialtyCode: fields.specialtyCode,
                attachment: "visiting",
                current: true,
                stale: false,
                provenance: authoredProvenance("Bulk import"),
              } as never,
            },
            { upsert: true },
          );
        }
      }
    }
  } else if (kind === "mappings") {
    for (const row of rows) {
      const doctorName = pick(row, "doctor", "doctorname", "name");
      const hospitalName = pick(row, "hospital", "hospitalname");
      const hospitalCity = pick(row, "city", "hospitalcity");
      if (!doctorName || !hospitalName) {
        result.skipped += 1;
        continue;
      }

      const [doctor, hospital] = await Promise.all([
        db.collection<Doctor>("doctors").findOne({ name: doctorName }),
        db
          .collection<Hospital>("hospitals")
          .findOne(hospitalCity ? { name: hospitalName, city: hospitalCity } : { name: hospitalName }),
      ]);
      if (!doctor || !hospital) {
        result.skipped += 1;
        continue;
      }

      await db.collection<HospitalDoctorLink>("hospital_doctor_map").updateOne(
        { _id: `${hospital._id}__${doctor._id}` },
        {
          $set: {
            hospitalId: hospital._id,
            doctorId: doctor._id,
            specialtyCode: pick(row, "specialtycode") || null,
            attachment: (pick(row, "attachment") || "visiting") as never,
            current: true,
            stale: false,
            provenance: authoredProvenance("Bulk import"),
          } as never,
        },
        { upsert: true },
      );
      result.updated += 1;

      const day = pick(row, "day").slice(0, 3).toLowerCase();
      const from = pick(row, "from", "starttime", "start");
      if (day || from) {
        await db.collection<DoctorSchedule>("doctor_schedules").updateOne(
          { _id: `${doctor._id}__${hospital._id}__${day || "any"}` },
          {
            $set: {
              doctorId: doctor._id,
              hospitalId: hospital._id,
              day: (["mon", "tue", "wed", "thu", "fri", "sat", "sun"].includes(day)
                ? day
                : null) as never,
              from: from || null,
              to: pick(row, "to", "endtime", "end") || null,
              slotMinutes: num(pick(row, "slotminutes", "slot")),
              note: pick(row, "note", "notes") || null,
              updatedAt: new Date().toISOString(),
            } as never,
          },
          { upsert: true },
        );
      }
    }
  } else {
    redirect("/admin/import?error=kind");
  }

  revalidatePath("/admin/hospitals");
  revalidatePath("/admin/doctors");
  redirect(
    `/admin/import?created=${result.created}&updated=${result.updated}&skipped=${result.skipped}`,
  );
}
