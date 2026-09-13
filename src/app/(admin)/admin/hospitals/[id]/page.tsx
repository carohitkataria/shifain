import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminShell, Notice, SaveButton } from "@/components/admin/AdminShell";
import { isAuthenticated } from "@/lib/auth";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import type { Doctor, Hospital } from "@/lib/catalogue";
import { saveHospitalAction } from "../actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft";

export default async function HospitalPage({
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
  const hospital = await db.collection<Hospital>("hospitals").findOne({ _id: id });
  if (!hospital) notFound();

  const links = await db
    .collection<{ doctorId: string }>("hospital_doctor_map")
    .find({ hospitalId: id, stale: { $ne: true } } as never)
    .toArray();
  const doctors = links.length
    ? await db
        .collection<Doctor>("doctors")
        .find({ _id: { $in: links.map((link) => link.doctorId) } })
        .toArray()
    : [];

  return (
    <AdminShell
      title={hospital.name}
      subtitle={`${hospital.city}${hospital.state ? `, ${hospital.state}` : ""} · ${hospital._id}`}
      action={<SaveButton form="hospital-form">Save hospital</SaveButton>}
    >
      <Link href="/admin/hospitals" className="mb-6 inline-block text-sm font-bold text-brand hover:underline">
        &larr; All hospitals
      </Link>

      {saved ? <Notice>Saved.</Notice> : null}
      {error === "tieup" ? (
        <p role="alert" className="mb-6 rounded-lg bg-saffron/15 px-3 py-2.5 text-sm font-semibold text-ink">
          To publish a hospital its partner status must be <strong>signed</strong> and it must carry
          a tie-up reference. That is the rule the whole catalogue rests on — we list only where we
          have an agreement.
        </p>
      ) : null}
      {error === "1" ? (
        <p role="alert" className="mb-6 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700">
          That was not a valid stage.
        </p>
      ) : null}

      <form id="hospital-form" action={saveHospitalAction} className="space-y-5">
        <input type="hidden" name="id" value={hospital._id} />

        <section className="card p-6">
          <h2 className="font-extrabold text-ink">Commercial stage</h2>
          <p className="mt-1 text-sm text-ink-soft">
            What we may show a patient. Nothing reaches the public site until this says published.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block min-w-0">
              <span className={label}>Partner status</span>
              <select name="partnerStatus" defaultValue={hospital.partnerStatus} className={field}>
                {["prospect", "contacted", "negotiating", "signed", "suspended"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0">
              <span className={label}>Publication</span>
              <select name="publicationState" defaultValue={hospital.publication?.state} className={field}>
                {["research", "verified", "published", "withdrawn"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0">
              <span className={label}>Tie-up reference</span>
              <input
                name="tieupId"
                defaultValue={hospital.publication?.tieupId ?? ""}
                placeholder="e.g. TIE-2026-014"
                className={field}
              />
            </label>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-extrabold text-ink">Profile</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className={label}>Legal name</span>
              <input name="legalName" defaultValue={hospital.legalName ?? ""} className={field} />
            </label>
            <label className="block min-w-0">
              <span className={label}>Type</span>
              <input
                name="hospitalType"
                defaultValue={hospital.hospitalType ?? ""}
                placeholder="Multi-speciality, Cancer centre…"
                className={field}
              />
            </label>
            <label className="block min-w-0">
              <span className={label}>Beds</span>
              <input name="beds" type="number" defaultValue={hospital.beds ?? ""} className={field} />
            </label>
            <label className="block min-w-0">
              <span className={label}>ICU beds</span>
              <input name="icuBeds" type="number" defaultValue={hospital.icuBeds ?? ""} className={field} />
            </label>
            <label className="block min-w-0 sm:col-span-2">
              <span className={label}>Website</span>
              <input name="officialWebsite" defaultValue={hospital.officialWebsite ?? ""} className={field} />
            </label>
            <label className="block min-w-0 sm:col-span-2">
              <span className={label}>About (shown on the public profile)</span>
              <textarea name="about" rows={4} defaultValue={hospital.about ?? ""} className={field} />
            </label>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-extrabold text-ink">What they can treat</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Comma separated codes. Specialties and capabilities are what the planner matches a case
            against, so these decide where a patient can be placed.
          </p>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className={label}>Accreditations</span>
              <input
                name="accreditations"
                defaultValue={(hospital.accreditations ?? []).join(", ")}
                placeholder="JCI, NABH"
                className={field}
              />
            </label>
            <label className="block">
              <span className={label}>Specialty codes</span>
              <input
                name="specialtyCodes"
                defaultValue={(hospital.specialtyCodes ?? []).join(", ")}
                placeholder="cardiology, orthopaedics"
                className={field}
              />
            </label>
            <label className="block">
              <span className={label}>Capabilities</span>
              <input
                name="capabilities"
                defaultValue={(hospital.capabilities ?? []).join(", ")}
                placeholder="cath-lab, cardiac-icu, blood-bank"
                className={field}
              />
            </label>
          </div>
        </section>

        <section className="card p-6">
          <h2 className="font-extrabold text-ink">International desk</h2>
          <label className="mt-4 flex items-center gap-2.5">
            <input
              type="checkbox"
              name="deskExists"
              defaultChecked={hospital.internationalDesk?.exists === true}
              className="h-4 w-4 accent-brand"
            />
            <span className="text-sm font-semibold text-ink">They have one</span>
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className={label}>Contact</span>
              <input name="deskName" defaultValue={hospital.internationalDesk?.contactName ?? ""} className={field} />
            </label>
            <label className="block min-w-0">
              <span className={label}>Email</span>
              <input name="deskEmail" defaultValue={hospital.internationalDesk?.email ?? ""} className={field} />
            </label>
            <label className="block min-w-0">
              <span className={label}>Phone</span>
              <input name="deskPhone" defaultValue={hospital.internationalDesk?.phone ?? ""} className={field} />
            </label>
            <label className="block min-w-0">
              <span className={label}>Languages</span>
              <input
                name="deskLanguages"
                defaultValue={(hospital.internationalDesk?.languages ?? []).join(", ")}
                placeholder="English, Arabic, Russian"
                className={field}
              />
            </label>
          </div>
        </section>

        <div className="flex justify-end pt-2">
          <SaveButton form="hospital-form">Save hospital</SaveButton>
        </div>
      </form>

      <section className="mt-10">
        <h2 className="font-extrabold text-ink">Doctors on record here</h2>
        {doctors.length === 0 ? (
          <p className="card mt-3 p-5 text-sm text-ink-soft">
            None mapped yet. Doctor records are added as the partnership progresses.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {doctors.map((doctor) => (
              <li key={doctor._id} className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                <span className="min-w-0 flex-1 basis-48">
                  <span className="block font-semibold text-ink">{doctor.name}</span>
                  <span className="mt-0.5 block text-sm text-ink-soft">
                    {doctor.specialtyLabelRaw ?? doctor.specialtyCode ?? "Specialty not mapped"}
                    {doctor.experienceYears ? ` · ${doctor.experienceYears} years` : ""}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold text-ink-soft">
                  {doctor.consentToList ? "consented" : "no consent yet"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}
