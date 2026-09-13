import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isDatabaseConfigured, readOr } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import type { Hospital } from "@/lib/catalogue";

export const dynamic = "force-dynamic";

const TONE: Record<string, string> = {
  published: "bg-leaf/10 text-leaf",
  verified: "bg-brand-tint text-brand-deep",
  research: "bg-surface-muted text-ink-soft",
  withdrawn: "bg-saffron/15 text-saffron",
};

export default async function HospitalsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; state?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { q = "", city = "", state = "" } = await searchParams;

  const query: Record<string, unknown> = {};
  if (q.trim()) query.name = { $regex: q.trim(), $options: "i" };
  if (city) query.city = city;
  if (state) query["publication.state"] = state;

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
      subtitle="The 126 hospitals in the catalogue. All of them start as research — a hospital only appears on the public site once it is signed and published here."
    >
      {!isDatabaseConfigured() && (
        <p className="mb-6 rounded-lg bg-saffron/15 px-3 py-2 text-sm font-semibold text-ink">
          MONGODB_URI is not set on this deployment, so the catalogue cannot be read yet.
        </p>
      )}

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
          <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">Stage</span>
          <select
            name="state"
            defaultValue={state}
            className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none"
          >
            <option value="">Any stage</option>
            {["research", "verified", "published", "withdrawn"].map((value) => (
              <option key={value} value={value}>
                {value}
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
                  {hospital.accreditations?.length ? ` · ${hospital.accreditations.join(", ")}` : ""}
                  {hospital.specialtyCodes?.length
                    ? ` · ${hospital.specialtyCodes.length} specialties`
                    : " · specialties not mapped"}
                </span>
              </span>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
                  TONE[hospital.publication?.state] ?? TONE.research
                }`}
              >
                {hospital.publication?.state ?? "research"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
