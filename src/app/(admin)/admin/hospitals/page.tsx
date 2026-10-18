import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isDatabaseConfigured, readOr } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { accreditationLabels, type Hospital } from "@/lib/catalogue";
import { StatusPill } from "@/components/admin/onboarding/Wizard";
import { ONBOARDING_STATUSES, STATUS_LABEL, type OnboardingStatus } from "@/lib/onboarding-rules";
import { createHospitalAction } from "./actions";

export const dynamic = "force-dynamic";

/** Research rows that predate onboarding read as drafts, unless they are already live. */
const statusOf = (hospital: Hospital): OnboardingStatus =>
  hospital.onboarding?.status ?? (hospital.publication?.state === "published" ? "published" : "draft");

export default async function HospitalsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; status?: string; saved?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { q = "", city = "", status = "", saved } = await searchParams;

  const query: Record<string, unknown> = {};
  if (q.trim()) query.name = { $regex: q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  if (city) query.city = city;
  if (status === "published") query["publication.state"] = "published";
  else if (status === "draft") query.$or = [{ "onboarding.status": "draft" }, { onboarding: { $exists: false }, "publication.state": { $ne: "published" } }];
  else if (status) query["onboarding.status"] = status;

  const [hospitals, cities] = await Promise.all([
    readOr<Hospital[]>([], (db) =>
      db.collection<Hospital>("hospitals").find(query).sort({ city: 1, name: 1 }).limit(300).toArray(),
    ),
    readOr<string[]>([], async (db) =>
      (await db.collection("hospitals").distinct("city")).sort() as string[],
    ),
  ]);

  return (
    <AdminShell
      title="Hospitals"
    >
      {!isDatabaseConfigured() && (
        <p className="mb-6 rounded-lg bg-saffron/15 px-3 py-2 text-sm font-semibold text-ink">
          MONGODB_URI is not set on this deployment, so the catalogue cannot be read yet.
        </p>
      )}

      {saved ? (
        <p className="mb-6 rounded-lg bg-leaf/10 px-3 py-2 text-sm font-semibold text-leaf">
          Hospital {saved}.
        </p>
      ) : null}

      <form action={createHospitalAction} className="card mb-4 flex flex-wrap items-end gap-3 p-5">
        <label className="min-w-0 flex-1 basis-52">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
            Add a hospital
          </span>
          <input
            name="name"
            required
            placeholder="Hospital name"
            className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
          />
        </label>
        <label className="min-w-0 basis-40">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">City</span>
          <input
            name="city"
            required
            placeholder="Delhi"
            className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
          />
        </label>
        <label className="min-w-0 basis-36">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">State</span>
          <input
            name="state"
            placeholder="Delhi"
            className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
          />
        </label>
        <button type="submit" className="btn btn-primary !py-2.5 text-sm">Add</button>
        <p className="basis-full text-sm text-ink-soft">
          Bulk instead? <Link href="/admin/import" className="font-semibold text-brand hover:underline">Import a sheet</Link>.
        </p>
      </form>

      <form className="card mb-6 flex flex-wrap items-end gap-3 p-5">
        <label className="min-w-0 flex-1 basis-48">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
            Search by name
          </span>
          <input
            name="q"
            defaultValue={q}
            placeholder="Apollo, Medanta…"
            className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
          />
        </label>
        <label className="min-w-0 basis-40">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">City</span>
          <select
            name="city"
            defaultValue={city}
            className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
          >
            <option value="">All cities</option>
            {cities.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 basis-40">
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">Onboarding</span>
          <select
            name="status"
            defaultValue={status}
            className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
          >
            <option value="">Any status</option>
            {ONBOARDING_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABEL[value]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary !py-2.5 text-sm">
          Filter
        </button>
      </form>

      <p className="mb-3 text-sm text-ink-soft">{hospitals.length} shown</p>

      <ul className="space-y-2">
        {hospitals.map((hospital) => (
          <li key={hospital._id}>
            <Link
              href={`/admin/hospitals/${hospital._id}`}
              className="card link-card flex flex-wrap items-center gap-x-4 gap-y-2 p-4"
            >
              <span className="min-w-0 flex-1 basis-56">
                <span className="block font-semibold text-ink">{hospital.name}</span>
                <span className="mt-0.5 block text-sm text-ink-soft">
                  {hospital.city}
                  {accreditationLabels(hospital).length ? ` · ${accreditationLabels(hospital).join(", ")}` : ""}
                  {hospital.specialtyCodes?.length
                    ? ` · ${hospital.specialtyCodes.length} specialties`
                    : " · specialties not mapped"}
                  {hospital.assignedRm ? ` · RM ${hospital.assignedRm}` : ""}
                </span>
              </span>
              <StatusPill status={statusOf(hospital)} />
            </Link>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
