import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminShell, Notice, SaveButton } from "@/components/admin/AdminShell";
import { isAuthenticated } from "@/lib/auth";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { WEEKDAYS, type Doctor, type DoctorSchedule, type Hospital, type HospitalDoctorLink } from "@/lib/catalogue";
import {
  addScheduleAction,
  deleteDoctorAction,
  linkDoctorAction,
  removeScheduleAction,
  saveDoctorAction,
  unlinkDoctorAction,
} from "../../hospitals/actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft";

const DAY_LABEL: Record<string, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};

export default async function DoctorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  if (!isDatabaseConfigured()) notFound();

  const { id } = await params;
  const { saved, error } = await searchParams;

  const db = await getDb();
  const doctor = await db.collection<Doctor>("doctors").findOne({ _id: id });
  if (!doctor) notFound();

  const [links, schedules, hospitals] = await Promise.all([
    db.collection<HospitalDoctorLink>("hospital_doctor_map").find({ doctorId: id }).toArray(),
    db.collection<DoctorSchedule>("doctor_schedules").find({ doctorId: id }).toArray(),
    db.collection<Hospital>("hospitals").find({}).project({ name: 1, city: 1 }).sort({ city: 1, name: 1 }).toArray(),
  ]);

  const hospitalById = new Map(hospitals.map((h) => [h._id, h]));
  const back = `/admin/doctors/${id}`;

  return (
    <AdminShell
      title={doctor.name}
      subtitle={doctor._id}
      action={<SaveButton form="doctor-form">Save doctor</SaveButton>}
    >
      <Link href="/admin/doctors" className="mb-6 inline-block text-sm font-bold text-brand hover:underline">
        &larr; All doctors
      </Link>

      {saved ? <Notice>Saved.</Notice> : null}
      {error === "consent" ? (
        <p role="alert" className="mb-6 rounded-lg bg-saffron/15 px-3 py-2.5 text-sm font-semibold text-ink">
          A doctor cannot be published until they have agreed to be listed. Tick consent first.
        </p>
      ) : null}

      <form id="doctor-form" action={saveDoctorAction} className="space-y-5">
        <input type="hidden" name="id" value={doctor._id} />

        <section className="card p-6">
          <h2 className="font-extrabold text-ink">Profile</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className={label}>Name</span>
              <input name="name" required defaultValue={doctor.name} className={field} />
            </label>
            <label className="block min-w-0">
              <span className={label}>Specialty code</span>
              <input name="specialtyCode" defaultValue={doctor.specialtyCode ?? ""} placeholder="cardiology" className={field} />
            </label>
            <label className="block min-w-0">
              <span className={label}>Specialty as written</span>
              <input name="specialtyLabelRaw" defaultValue={doctor.specialtyLabelRaw ?? ""} className={field} />
            </label>
            <label className="block min-w-0">
              <span className={label}>Qualifications</span>
              <input name="qualifications" defaultValue={doctor.qualifications ?? ""} placeholder="MBBS, MS, MCh" className={field} />
            </label>
            <label className="block min-w-0">
              <span className={label}>Registration number</span>
              <input name="registrationNumber" defaultValue={doctor.registrationNumber ?? ""} placeholder="State council / NMC" className={field} />
            </label>
            <label className="block min-w-0">
              <span className={label}>Years of experience</span>
              <input name="experienceYears" type="number" defaultValue={doctor.experienceYears ?? ""} className={field} />
            </label>
            <label className="block min-w-0 sm:col-span-2">
              <span className={label}>Official profile URL</span>
              <input name="officialProfileUrl" defaultValue={doctor.officialProfileUrl ?? ""} className={field} />
            </label>
            <label className="block min-w-0 sm:col-span-2">
              <span className={label}>About (shown on the public profile)</span>
              <textarea name="about" rows={4} defaultValue={doctor.about ?? ""} className={field} />
            </label>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-extrabold text-ink">Consent and stage</h2>
          <p className="mt-1 text-sm text-ink-soft">
            A doctor&apos;s name only reaches a patient once they have agreed to it.
          </p>
          <label className="mt-4 flex items-center gap-2.5">
            <input type="checkbox" name="consentToList" defaultChecked={doctor.consentToList} className="h-4 w-4 accent-brand" />
            <span className="text-sm font-semibold text-ink">They have agreed to be listed</span>
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block min-w-0">
              <span className={label}>Partner status</span>
              <select name="partnerStatus" defaultValue={doctor.partnerStatus} className={field}>
                {["prospect", "contacted", "negotiating", "signed", "suspended"].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="block min-w-0">
              <span className={label}>Publication</span>
              <select name="publicationState" defaultValue={doctor.publication?.state} className={field}>
                {["research", "verified", "published", "withdrawn"].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="block min-w-0">
              <span className={label}>Tie-up reference</span>
              <input name="tieupId" defaultValue={doctor.publication?.tieupId ?? ""} className={field} />
            </label>
          </div>
        </section>

        <div className="flex justify-end pt-2">
          <SaveButton form="doctor-form">Save doctor</SaveButton>
        </div>
      </form>

      <section className="card mt-10 p-6">
        <h2 className="font-extrabold text-ink">Hospitals and days</h2>
        <p className="mt-1 text-sm text-ink-soft">
          A doctor can sit at as many hospitals as they do. Days and times are optional — fill in
          what you know, and a plan can suggest an appointment that actually exists.
        </p>

        {links.length === 0 ? (
          <p className="mt-4 text-sm text-ink-soft">Not mapped to any hospital yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {links.map((link) => {
              const hospital = hospitalById.get(link.hospitalId);
              const rota = schedules.filter((row) => row.hospitalId === link.hospitalId);
              return (
                <li key={link._id} className="rounded-xl2 border border-line bg-surface-muted p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">
                        {hospital?.name ?? link.hospitalId}
                        {hospital?.city ? ` · ${hospital.city}` : ""}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-soft">
                        {link.attachment}
                        {link.specialtyCode ? ` · ${link.specialtyCode}` : ""}
                      </p>
                    </div>
                    <form action={unlinkDoctorAction}>
                      <input type="hidden" name="doctorId" value={doctor._id} />
                      <input type="hidden" name="hospitalId" value={link.hospitalId} />
                      <input type="hidden" name="back" value={back} />
                      <button type="submit" className="text-sm font-semibold text-red-600 hover:underline">
                        Remove
                      </button>
                    </form>
                  </div>

                  {rota.length > 0 ? (
                    <ul className="mt-3 space-y-1.5">
                      {rota.map((row) => (
                        <li key={row._id} className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="text-ink">
                            {row.day ? DAY_LABEL[row.day] : "Any day"}
                            {row.from || row.to ? ` · ${row.from ?? "?"}–${row.to ?? "?"}` : ""}
                            {row.slotMinutes ? ` · ${row.slotMinutes} min slots` : ""}
                            {row.note ? ` · ${row.note}` : ""}
                          </span>
                          <form action={removeScheduleAction}>
                            <input type="hidden" name="scheduleId" value={row._id} />
                            <input type="hidden" name="back" value={back} />
                            <button type="submit" className="text-xs font-semibold text-ink-muted hover:text-red-600 hover:underline">
                              remove
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <form action={addScheduleAction} className="mt-3 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="doctorId" value={doctor._id} />
                    <input type="hidden" name="hospitalId" value={link.hospitalId} />
                    <input type="hidden" name="back" value={back} />
                    <select name="day" defaultValue="" className={`${field} w-32`} aria-label="Day">
                      <option value="">Any day</option>
                      {WEEKDAYS.map((day) => (
                        <option key={day} value={day}>{DAY_LABEL[day]}</option>
                      ))}
                    </select>
                    <input name="from" type="time" className={`${field} w-28`} aria-label="From" />
                    <input name="to" type="time" className={`${field} w-28`} aria-label="To" />
                    <input name="slotMinutes" type="number" placeholder="slot min" className={`${field} w-24`} aria-label="Slot minutes" />
                    <input name="note" placeholder="note" className={`${field} w-40`} aria-label="Note" />
                    <button type="submit" className="btn btn-secondary !py-2 text-sm">Add day</button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}

        <form action={linkDoctorAction} className="mt-5 flex flex-wrap items-end gap-2 border-t border-line pt-5">
          <input type="hidden" name="doctorId" value={doctor._id} />
          <input type="hidden" name="back" value={back} />
          <label className="min-w-0 flex-1 basis-56">
            <span className={label}>Add a hospital</span>
            <select name="hospitalId" required defaultValue="" className={field}>
              <option value="" disabled>Choose a hospital</option>
              {hospitals.map((hospital) => (
                <option key={hospital._id} value={hospital._id}>
                  {hospital.name} — {hospital.city}
                </option>
              ))}
            </select>
          </label>
          <label className="basis-40">
            <span className={label}>Attachment</span>
            <select name="attachment" defaultValue="visiting" className={field}>
              {["primary", "visiting", "consultant"].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="btn btn-primary !py-2.5 text-sm">Map</button>
        </form>
      </section>

      <section className="card mt-6 flex flex-wrap items-center justify-between gap-4 p-6">
        <p className="text-sm text-ink-soft">
          Deleting removes the doctor, their hospital mappings and their rota. Cases are untouched.
        </p>
        <form action={deleteDoctorAction}>
          <input type="hidden" name="id" value={doctor._id} />
          <button type="submit" className="btn btn-secondary !py-2.5 text-sm !text-red-600">
            Delete doctor
          </button>
        </form>
      </section>
    </AdminShell>
  );
}
