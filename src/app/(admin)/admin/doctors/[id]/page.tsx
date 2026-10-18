import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminShell, Notice } from "@/components/admin/AdminShell";
import { Warn, adminField, adminLabel } from "@/components/admin/Panel";
import { AreaField, CheckGrid, FieldGroup, SelectField, TextField, grid6 } from "@/components/admin/onboarding/Fields";
import { RowsEditor } from "@/components/admin/onboarding/RowsEditor";
import { SpecialtyPicker } from "@/components/admin/onboarding/SpecialtyPicker";
import { WeekBuilder, type Week } from "@/components/admin/onboarding/WeekBuilder";
import { isAuthenticated } from "@/lib/auth";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { isVerifiedDoctor, type Doctor, type DoctorSchedule, type Hospital, type HospitalDoctorLink } from "@/lib/catalogue";
import { loadMasters, type ScheduleException } from "@/lib/onboarding";
import { CURRENCIES, DESIGNATIONS, DOCTOR_STATUSES, GENDERS, LANGUAGES, SLOT_MINUTES } from "@/lib/onboarding-masters";
import { computeSlots, type BookedSlot } from "@/lib/onboarding-rules";
import { mediaInfo, mediaUrl } from "@/lib/media";
import { deleteDoctorAction } from "../../hospitals/actions";
import {
  saveDoctorAwardsAction,
  saveDoctorCredentialsAction,
  saveDoctorProfileAction,
  saveDoctorScheduleAction,
  saveDoctorSpecialtiesAction,
} from "../doctor-actions";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "profile", label: "Profile" },
  { key: "credentials", label: "Credentials" },
  { key: "specialties", label: "Specialties & procedures" },
  { key: "awards", label: "Awards & memberships" },
  { key: "schedule", label: "Schedule & slots" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const fileInput =
  "block w-full text-sm text-ink file:mr-3 file:min-h-10 file:rounded-full file:border-0 file:bg-brand-tint file:px-4 file:font-semibold file:text-brand-deep";

export default async function DoctorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; hospital?: string; at?: string; saved?: string; error?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  if (!isDatabaseConfigured()) notFound();

  const { id } = await params;
  const query = await searchParams;
  const tab: Tab = TABS.some((item) => item.key === query.tab) ? (query.tab as Tab) : "profile";

  const db = await getDb();
  const doctor = await db.collection<Doctor>("doctors").findOne({ _id: id });
  if (!doctor) notFound();

  const [masters, links, procedures, hospitals] = await Promise.all([
    loadMasters(),
    db.collection<HospitalDoctorLink>("hospital_doctor_map").find({ doctorId: id }).toArray(),
    db.collection<{ treatmentCode: string }>("treatment_doctor_map").find({ doctorId: id }).toArray(),
    db.collection<Hospital>("hospitals").find({}, { projection: { name: 1, city: 1 } }).sort({ city: 1, name: 1 }).toArray(),
  ]);
  const hospitalName = (hospitalId: string) => {
    const found = hospitals.find((item) => item._id === hospitalId);
    return found ? `${found.name} · ${found.city}` : hospitalId;
  };
  const context = query.hospital && links.some((link) => link.hospitalId === query.hospital) ? query.hospital : null;
  const tabHref = (key: string) =>
    `/admin/doctors/${encodeURIComponent(id)}?tab=${key}${context ? `&hospital=${encodeURIComponent(context)}` : ""}`;
  const hidden = (
    <>
      <input type="hidden" name="id" value={id} />
      {context ? <input type="hidden" name="hospital" value={context} /> : null}
    </>
  );
  const save = (label = "Save") => (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex justify-end gap-2 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
      <button type="submit" className="btn btn-primary min-h-11 !py-2.5 text-sm">
        {label}
      </button>
    </div>
  );

  const verified = isVerifiedDoctor(doctor);
  const primary = doctor.specialties?.[0]?.code ?? doctor.specialtyCode;

  return (
    <AdminShell
      title={doctor.name}
      subtitle={[
        doctor.designation,
        masters.specialties.find((item) => item._id === primary)?.name.en,
        doctor.experienceYears ? `${doctor.experienceYears} years` : null,
      ]
        .filter(Boolean)
        .join(" · ") || "Profile not filled in yet"}
      action={
        <span className="flex flex-wrap gap-2">
          {verified ? <span className="rounded-full bg-leaf/10 px-3 py-1 text-sm font-bold text-leaf">Verified</span> : null}
          <span className="rounded-full bg-surface-muted px-3 py-1 text-sm font-bold text-ink-soft ring-1 ring-line">
            {DOCTOR_STATUSES.find((item) => item.value === (doctor.onboardingStatus ?? "draft"))?.label}
          </span>
        </span>
      }
      fullWidth
    >
      <Link
        href={context ? `/admin/hospitals/${encodeURIComponent(context)}?step=doctors` : "/admin/doctors"}
        className="mb-5 inline-block text-sm font-bold text-brand hover:underline"
      >
        &larr; {context ? `Back to ${hospitalName(context).split(" · ")[0]} onboarding` : "All doctors"}
      </Link>

      <nav aria-label="Doctor sections" className="mb-6 overflow-x-auto">
        <ol className="flex min-w-max gap-1 rounded-2xl bg-white p-1 ring-1 ring-line">
          {TABS.map((item, index) => (
            <li key={item.key}>
              <Link
                href={tabHref(item.key)}
                aria-current={tab === item.key ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                  tab === item.key ? "bg-brand text-white" : "text-ink-soft hover:bg-surface-muted hover:text-ink"
                }`}
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${tab === item.key ? "bg-white/20" : "bg-surface-muted"}`}>{index + 1}</span>
                {item.label}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      {query.saved === "created" ? <Notice>Doctor added. Fill in the profile, then work through the tabs.</Notice> : query.saved ? <Notice>Saved.</Notice> : null}
      {query.error ? <Warn>{query.error}</Warn> : null}

      {tab === "profile" ? <ProfileTab doctor={doctor} hidden={hidden} save={save()} /> : null}

      {tab === "credentials" ? (
        <form action={saveDoctorCredentialsAction} className="space-y-5">
          {hidden}
          <FieldGroup title="Qualifications" hint="Degree, institution and year — MBBS, MD, DM, MCh, fellowships such as FRCS.">
            <RowsEditor
              name="qual"
              itemLabel="Qualification"
              addLabel="Add a qualification"
              empty="None added."
              initial={(doctor.qualificationRecords ?? (doctor.qualifications ? doctor.qualifications.split(/,\s*/).map((degree) => ({ degree, institution: null, year: null })) : [])).map((item) => ({
                degree: item.degree,
                institution: item.institution ?? "",
                year: item.year?.toString() ?? "",
              }))}
              fields={[
                { key: "degree", label: "Degree", type: "text", span: 2, required: true, placeholder: "MCh (Cardiothoracic)" },
                { key: "institution", label: "Institution", type: "text", span: 3, placeholder: "AIIMS, New Delhi" },
                { key: "year", label: "Year", type: "number", span: 1, min: 1940, max: new Date().getFullYear() },
              ]}
            />
          </FieldGroup>
          <FieldGroup title="Work experience">
            <RowsEditor
              name="exp"
              itemLabel="Position"
              addLabel="Add a position"
              empty="None added."
              initial={(doctor.experienceHistory ?? []).map((item) => ({
                role: item.role,
                organization: item.organization,
                fromYear: item.fromYear?.toString() ?? "",
                toYear: item.toYear?.toString() ?? "",
              }))}
              fields={[
                { key: "role", label: "Role", type: "text", span: 2, required: true, placeholder: "Senior Consultant" },
                { key: "organization", label: "Organisation", type: "text", span: 2, required: true },
                { key: "fromYear", label: "From", type: "number", span: 1, min: 1940 },
                { key: "toYear", label: "To", type: "number", span: 1, min: 1940, placeholder: "Now" },
              ]}
            />
          </FieldGroup>
          {save()}
        </form>
      ) : null}

      {tab === "specialties" ? (
        <form action={saveDoctorSpecialtiesAction} className="space-y-5">
          {hidden}
          <FieldGroup title="Specialties and procedures" hint="This is how patients find a doctor: by specialty, and by the procedure they need. A procedure can only be mapped within the doctor's specialties.">
            <SpecialtyPicker
              specialties={masters.specialties.map((item) => ({
                code: item._id,
                name: item.name.en,
                group: masters.categories.find((category) => category._id === item.categoryCode)?.name.en ?? "Other",
              }))}
              subSpecialties={masters.subSpecialties.map((item) => ({ id: item._id, specialtyCode: item.specialtyCode, name: item.name }))}
              procedures={masters.treatments.map((item) => ({ code: item._id, name: item.name.en, specialties: [...(masters.scope.get(item._id) ?? [])] }))}
              initialSpecialties={doctor.specialties ?? (doctor.specialtyCode ? [{ code: doctor.specialtyCode, subSpecialty: null }] : [])}
              initialProcedures={procedures.map((item) => item.treatmentCode)}
            />
          </FieldGroup>

          <FieldGroup title="Hospital affiliations" hint="A doctor can work at more than one hospital, with a different title and department at each.">
            {links.length === 0 ? <p className="mb-3 text-sm text-ink-soft">Not at any hospital yet.</p> : null}
            <ul className="space-y-3">
              {links.map((link, index) => (
                <li key={link._id} className="rounded-xl border border-line bg-surface-muted/60 p-4">
                  <input type="hidden" name={`aff.${index}.hospitalId`} value={link.hospitalId} />
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/admin/hospitals/${encodeURIComponent(link.hospitalId)}?step=doctors`} className="font-semibold text-ink hover:text-brand hover:underline">
                      {hospitalName(link.hospitalId)}
                    </Link>
                    <label className="flex min-h-9 items-center gap-2 text-sm font-semibold text-red-700">
                      <input type="checkbox" name={`aff.${index}.remove`} className="h-4 w-4 accent-red-600" />
                      Remove from this hospital
                    </label>
                  </div>
                  <div className={grid6}>
                    <label className="min-w-0 sm:col-span-2">
                      <span className={adminLabel}>Designation here</span>
                      <select name={`aff.${index}.designation`} defaultValue={link.designation ?? ""} className={adminField}>
                        <option value="">—</option>
                        {DESIGNATIONS.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="min-w-0 sm:col-span-1">
                      <span className={adminLabel}>Attachment</span>
                      <select name={`aff.${index}.attachment`} defaultValue={link.attachment} className={adminField}>
                        {["primary", "visiting", "consultant"].map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="min-w-0 sm:col-span-1">
                      <span className={adminLabel}>Department</span>
                      <select name={`aff.${index}.department`} defaultValue={link.specialtyCode ?? ""} className={adminField}>
                        <option value="">—</option>
                        {masters.specialties.map((item) => (
                          <option key={item._id} value={item._id}>
                            {item.name.en}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="min-w-0 sm:col-span-2">
                      <span className={adminLabel}>OPD location</span>
                      <input name={`aff.${index}.opdLocation`} defaultValue={link.opdLocation ?? ""} placeholder="Block B, 2nd floor" className={adminField} />
                    </label>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-6">
              <label className="min-w-0 sm:col-span-4">
                <span className={adminLabel}>Add another hospital</span>
                <select name="addHospital" defaultValue="" className={adminField}>
                  <option value="">—</option>
                  {hospitals
                    .filter((item) => !links.some((link) => link.hospitalId === item._id))
                    .map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name} — {item.city}
                      </option>
                    ))}
                </select>
              </label>
              <label className="min-w-0 sm:col-span-2">
                <span className={adminLabel}>Attachment</span>
                <select name="addAttachment" defaultValue="visiting" className={adminField}>
                  {["primary", "visiting", "consultant"].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </FieldGroup>
          {save()}
        </form>
      ) : null}

      {tab === "awards" ? (
        <form action={saveDoctorAwardsAction} className="space-y-5">
          {hidden}
          <FieldGroup title="Awards and achievements">
            <RowsEditor
              name="award"
              itemLabel="Award"
              addLabel="Add an award"
              empty="None added."
              initial={(doctor.awards ?? []).map((item) => ({ title: item.title, awardingBody: item.awardingBody ?? "", year: item.year?.toString() ?? "" }))}
              fields={[
                { key: "title", label: "Title", type: "text", span: 3, required: true, placeholder: "Padma Shri" },
                { key: "awardingBody", label: "Awarded by", type: "text", span: 2 },
                { key: "year", label: "Year", type: "number", span: 1, min: 1940 },
              ]}
            />
          </FieldGroup>
          <FieldGroup title="Professional memberships" hint="Colleges, societies and councils, e.g. FRCP, Cardiological Society of India.">
            <RowsEditor
              name="member"
              itemLabel="Membership"
              addLabel="Add a membership"
              empty="None added."
              initial={(doctor.memberships ?? []).map((item) => ({ body: item.body, membershipNo: item.membershipNo ?? "" }))}
              fields={[
                { key: "body", label: "Body", type: "text", span: 4, required: true },
                { key: "membershipNo", label: "Membership no.", type: "text", span: 2 },
              ]}
            />
          </FieldGroup>
          {save()}
        </form>
      ) : null}

      {tab === "schedule" ? (
        <ScheduleTab
          doctor={doctor}
          links={links}
          hospitalName={hospitalName}
          at={query.at}
          hidden={hidden}
          save={save("Save schedule")}
        />
      ) : null}

      {tab === "profile" ? (
        <section className="card mt-8 flex flex-wrap items-center justify-between gap-4 p-6">
          <p className="text-sm text-ink-soft">Deleting removes the doctor, their hospital mappings and their schedule. Cases are untouched.</p>
          <form action={deleteDoctorAction}>
            <input type="hidden" name="id" value={doctor._id} />
            <button type="submit" className="btn btn-secondary min-h-11 !py-2.5 text-sm !text-red-600">
              Delete doctor
            </button>
          </form>
        </section>
      ) : null}
    </AdminShell>
  );
}

async function ProfileTab({ doctor, hidden, save }: { doctor: Doctor; hidden: React.ReactNode; save: React.ReactNode }) {
  const [photo] = doctor.photoId ? await mediaInfo([doctor.photoId]) : [];
  return (
    <form action={saveDoctorProfileAction} className="space-y-5">
      {hidden}
      <FieldGroup title="Identity">
        <div className={grid6}>
          <TextField label="Full name" name="name" required span={3} defaultValue={doctor.name} />
          <SelectField label="Gender" name="gender" span={1} defaultValue={doctor.gender} options={GENDERS} />
          <TextField label="Slug" name="slug" span={2} defaultValue={doctor.slug} placeholder="Made from the name" />
          <div className="sm:col-span-6">
            <span className={adminLabel}>Photo</span>
            <div className="flex flex-wrap items-center gap-4">
              {photo ? (
                <figure className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of a stored upload */}
                  <img src={mediaUrl(photo._id)} alt="" className="h-16 w-16 rounded-full object-cover ring-1 ring-line" />
                  <label className="flex items-center gap-1.5 text-sm font-semibold text-red-700">
                    <input type="checkbox" name="removePhoto" className="h-4 w-4 accent-red-600" />
                    Remove
                  </label>
                </figure>
              ) : null}
              <input type="file" name="photo" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Photo" className={`${fileInput} max-w-sm`} />
            </div>
          </div>
        </div>
      </FieldGroup>

      <FieldGroup title="Registration" hint="Number, council and a check against the council's register together give the “Verified” badge.">
        <div className={grid6}>
          <TextField label="Registration number" name="registrationNumber" span={2} defaultValue={doctor.registrationNumber} />
          <TextField label="Council" name="registrationCouncil" span={2} defaultValue={doctor.registrationCouncil} placeholder="National Medical Commission" />
          <label className="flex min-h-11 items-center gap-2.5 self-end sm:col-span-2">
            <input type="checkbox" name="registrationChecked" defaultChecked={doctor.registrationChecked ?? false} className="h-5 w-5 accent-brand" />
            <span className="text-sm font-semibold text-ink">Checked on the register</span>
          </label>
        </div>
      </FieldGroup>

      <FieldGroup title="Practice">
        <div className={grid6}>
          <SelectField label="Designation" name="designation" span={2} defaultValue={doctor.designation} options={DESIGNATIONS.map((item) => ({ value: item, label: item }))} />
          <TextField label="Years of experience" name="experienceYears" type="number" min={0} max={70} span={2} defaultValue={doctor.experienceYears} />
          <SelectField label="Status" name="onboardingStatus" span={2} defaultValue={doctor.onboardingStatus ?? "draft"} options={DOCTOR_STATUSES} placeholder="Draft" />
          <TextField label="In-person fee" name="consultFee" type="number" min={0} step="1" span={2} defaultValue={doctor.consultFee} />
          <TextField label="Video fee" name="teleconsultFee" type="number" min={0} step="1" span={2} defaultValue={doctor.teleconsultFee} />
          <SelectField label="Currency" name="currency" span={2} defaultValue={doctor.currency ?? "USD"} options={CURRENCIES} />
          <AreaField label="About" name="about" defaultValue={doctor.about} hint="Shown on the public profile once published." />
          <TextField label="Official profile link" name="officialProfileUrl" type="url" span={6} defaultValue={doctor.officialProfileUrl} placeholder="https://" />
        </div>
        <div className="mt-4">
          <CheckGrid legend="Languages spoken" name="languages" options={LANGUAGES} checked={doctor.languages ?? []} columns="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" />
        </div>
      </FieldGroup>

      <FieldGroup title="Listing" hint="A doctor's name reaches patients only with their consent. Publishing a hospital also lists its active, consenting doctors.">
        <label className="mb-4 flex min-h-11 items-center gap-2.5">
          <input type="checkbox" name="consentToList" defaultChecked={doctor.consentToList} className="h-5 w-5 accent-brand" />
          <span className="text-sm font-semibold text-ink">They have agreed to be listed</span>
        </label>
        <div className={grid6}>
          <SelectField
            label="Partner status"
            name="partnerStatus"
            span={2}
            defaultValue={doctor.partnerStatus}
            options={["prospect", "contacted", "negotiating", "signed", "suspended"].map((value) => ({ value, label: value }))}
          />
          <SelectField
            label="Publication"
            name="publicationState"
            span={2}
            defaultValue={doctor.publication?.state}
            options={["research", "verified", "published", "withdrawn"].map((value) => ({ value, label: value }))}
          />
          <TextField label="Tie-up reference" name="tieupId" span={2} defaultValue={doctor.publication?.tieupId} />
        </div>
      </FieldGroup>
      {save}
    </form>
  );
}

async function ScheduleTab({
  doctor,
  links,
  hospitalName,
  at,
  hidden,
  save,
}: {
  doctor: Doctor;
  links: HospitalDoctorLink[];
  hospitalName: (id: string) => string;
  at?: string;
  hidden: React.ReactNode;
  save: React.ReactNode;
}) {
  if (links.length === 0) {
    return <p className="card p-6 text-ink-soft">Add the doctor to a hospital (Specialties & procedures tab) before setting a schedule.</p>;
  }
  const hospitalId = links.some((link) => link.hospitalId === at) ? at! : links[0].hospitalId;
  const db = await getDb();
  const [rows, blackouts, booked] = await Promise.all([
    db.collection<DoctorSchedule>("doctor_schedules").find({ doctorId: doctor._id }).toArray(),
    db.collection<ScheduleException>("schedule_exceptions").find({ doctorId: doctor._id }).sort({ date: 1 }).toArray(),
    db.collection<BookedSlot & { doctorId: string }>("doctor_appointments").find({ doctorId: doctor._id }).toArray(),
  ]);
  const here = rows.filter((row) => row.hospitalId === hospitalId);
  const week: Week = Object.fromEntries(
    here
      .filter((row) => row.day)
      .map((row) => [row.day, { on: true, from: row.from ?? "09:00", to: row.to ?? "13:00", slotMinutes: row.slotMinutes ?? 20, consultType: row.consultType ?? "in_person" }]),
  );
  const today = new Date().toISOString().slice(0, 10);
  const slots = computeSlots({
    schedules: here.map((row) => ({ ...row, day: row.day })),
    blackouts,
    booked,
    from: today,
    days: 14,
  });
  const byDate = new Map<string, typeof slots>();
  for (const slot of slots) byDate.set(slot.date, [...(byDate.get(slot.date) ?? []), slot]);
  const base = `/admin/doctors/${encodeURIComponent(doctor._id)}?tab=schedule`;

  return (
    <form action={saveDoctorScheduleAction} className="space-y-5">
      {hidden}
      <input type="hidden" name="at" value={hospitalId} />
      {links.length > 1 ? (
        <nav aria-label="Hospital" className="flex flex-wrap gap-2">
          {links.map((link) => (
            <Link
              key={link.hospitalId}
              href={`${base}&at=${encodeURIComponent(link.hospitalId)}`}
              aria-current={link.hospitalId === hospitalId ? "page" : undefined}
              className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ring-1 ${
                link.hospitalId === hospitalId ? "bg-brand-tint text-brand-deep ring-brand/30" : "bg-white text-ink-soft ring-line hover:text-ink"
              }`}
            >
              {hospitalName(link.hospitalId)}
            </Link>
          ))}
        </nav>
      ) : null}

      <FieldGroup title={`Weekly availability · ${hospitalName(hospitalId)}`} hint="Tick the days the doctor sees patients here. Slots are generated from these hours; nothing is pre-booked.">
        <WeekBuilder initial={week} slotOptions={SLOT_MINUTES} />
        <div className={`${grid6} mt-4`}>
          <TextField label="Valid from" name="validFrom" type="date" span={2} defaultValue={here[0]?.validFrom} hint="Leave empty to start now." />
          <TextField label="Valid to" name="validTo" type="date" span={2} defaultValue={here[0]?.validTo} hint="Leave empty for no end." />
        </div>
      </FieldGroup>

      <FieldGroup title="Blackout dates" hint="Leave, conferences, holidays. No slots are offered on these days.">
        <RowsEditor
          name="off"
          itemLabel="Blackout"
          addLabel="Add a blackout date"
          empty="None."
          initial={blackouts.map((item) => ({ date: item.date, reason: item.reason ?? "", scope: item.hospitalId ?? "all" }))}
          fields={[
            { key: "date", label: "Date", type: "date", span: 2, required: true },
            {
              key: "scope",
              label: "Where",
              type: "select",
              span: 2,
              options: [{ value: "all", label: "All hospitals" }, ...links.map((link) => ({ value: link.hospitalId, label: hospitalName(link.hospitalId) }))],
            },
            { key: "reason", label: "Reason", type: "text", span: 2, placeholder: "Conference" },
          ]}
        />
      </FieldGroup>

      <section className="card p-5 sm:p-6" aria-labelledby="slots-title">
        <h3 id="slots-title" className="font-extrabold text-ink">
          Bookable in the next 14 days
        </h3>
        <p className="mt-1 text-sm text-ink-soft">Worked out from the saved schedule, less blackout dates and existing bookings.</p>
        {slots.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-soft">No slots yet — save a schedule first.</p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {[...byDate.entries()].map(([date, list]) => (
              <li key={date} className="rounded-xl bg-surface-muted px-3 py-2.5 text-sm">
                <span className="font-semibold text-ink">
                  {new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}
                </span>
                <span className="text-ink-soft">
                  {" "}
                  · {list.length} slots · {list[0].start}–{list[list.length - 1].end}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      {save}
    </form>
  );
}
