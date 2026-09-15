import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell, Notice } from "@/components/admin/AdminShell";
import { saveDoctorAction } from "../hospitals/actions";
import { isDatabaseConfigured, readOr } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import type { Doctor } from "@/lib/catalogue";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint";

export default async function DoctorsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { saved } = await searchParams;

  const doctors = await readOr<Doctor[]>([], (db) =>
    db.collection<Doctor>("doctors").find({}).sort({ name: 1 }).limit(300).toArray(),
  );

  return (
    <AdminShell
      title="Doctors"
      subtitle="Doctor records gathered while researching partners. A doctor is never shown to a patient until they have agreed to be listed and their hospital is published."
    >
      {!isDatabaseConfigured() && (
        <p className="mb-6 rounded-lg bg-saffron/15 px-3 py-2 text-sm font-semibold text-ink">
          MONGODB_URI is not set on this deployment, so the catalogue cannot be read yet.
        </p>
      )}

      {saved ? <Notice>Doctor {saved === "deleted" ? "deleted" : "saved"}.</Notice> : null}

      <p className="mb-6 rounded-lg bg-surface-muted px-3.5 py-2.5 text-sm leading-relaxed text-ink-soft">
        Ratings gathered during research are kept out of sight on purpose — they are someone
        else&apos;s numbers, not ours, and they are never shown on the public site.
      </p>

      <form action={saveDoctorAction} className="card mb-6 flex flex-wrap items-end gap-3 p-5">
        <label className="min-w-0 flex-1 basis-56">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
            Add a doctor
          </span>
          <input name="name" required placeholder="Dr A Rao" className={field} />
        </label>
        <label className="min-w-0 basis-44">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
            Specialty
          </span>
          <input name="specialtyLabelRaw" placeholder="Cardiac Surgery" className={field} />
        </label>
        <button type="submit" className="btn btn-primary !py-2.5 text-sm">Add</button>
        <p className="basis-full text-sm text-ink-soft">
          Bulk instead? <Link href="/admin/import" className="font-semibold text-brand hover:underline">Import a sheet</Link>.
        </p>
      </form>

      {doctors.length === 0 ? (
        <p className="card p-6 text-ink-soft">No doctor records yet.</p>
      ) : (
        <ul className="space-y-2">
          {doctors.map((doctor) => (
            <li key={doctor._id}>
            <Link href={`/admin/doctors/${doctor._id}`} className="card link-card flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              <span className="min-w-0 flex-1 basis-56">
                <span className="block font-semibold text-ink">{doctor.name}</span>
                <span className="mt-0.5 block text-sm text-ink-soft">
                  {doctor.specialtyLabelRaw ?? doctor.specialtyCode ?? "Specialty not mapped"}
                  {doctor.experienceYears ? ` · ${doctor.experienceYears} years` : ""}
                  {doctor.qualifications ? ` · ${doctor.qualifications}` : ""}
                </span>
              </span>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
                  doctor.consentToList ? "bg-leaf/10 text-leaf" : "bg-surface-muted text-ink-soft"
                }`}
              >
                {doctor.consentToList ? "consented to listing" : "no consent yet"}
              </span>
              <span className="shrink-0 rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold text-ink-soft">
                {doctor.publication?.state ?? "research"}
              </span>
            </Link>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
