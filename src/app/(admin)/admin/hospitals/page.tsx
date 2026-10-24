import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { CIcon } from "@/components/console/CIcon";
import { Chip, Empty, FChip, Note, Pill, TableWrap, btn, field, td, th } from "@/components/console/ui";
import { isDatabaseConfigured, readOr } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { allCases } from "@/lib/console";
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

  const [hospitals, cities, doctorCounts, caseCounts] = await Promise.all([
    readOr<Hospital[]>([], (db) => db.collection<Hospital>("hospitals").find(query).sort({ city: 1, name: 1 }).limit(300).toArray()),
    readOr<string[]>([], async (db) => (await db.collection("hospitals").distinct("city")).sort() as string[]),
    readOr<{ _id: string; n: number }[]>([], (db) => db.collection("hospital_doctor_map").aggregate<{ _id: string; n: number }>([{ $group: { _id: "$hospitalId", n: { $sum: 1 } } }]).toArray()),
    allCases(),
  ]);
  const doctors = new Map(doctorCounts.map((row) => [row._id, row.n]));
  const cases = new Map<string, number>();
  for (const record of caseCounts) {
    const id = record.care?.hospitalId ?? record.requested?.hospitalId;
    if (id) cases.set(id, (cases.get(id) ?? 0) + 1);
  }
  const link = (patch: { city?: string; status?: string }) => {
    const params = new URLSearchParams();
    const next = { q, city, status, ...patch };
    for (const [key, value] of Object.entries(next)) if (value) params.set(key, value);
    return params.toString() ? `/admin/hospitals?${params}` : "/admin/hospitals";
  };

  return (
    <AdminShell
      title="Catalogue"
      subtitle="Hospitals, doctors and what patients can see"
      action={
        <details className="relative">
          <summary className={`${btn.primary} cursor-pointer list-none`}>
            <CIcon name="plus" size={16} />
            Add hospital
          </summary>
          <form action={createHospitalAction} className="absolute right-0 z-20 mt-2 w-[320px] rounded-2xl border border-line bg-white p-4 shadow-xl">
            <label className="mb-2 block text-xs font-bold text-ink-soft">
              Hospital name
              <input name="name" required placeholder="Hospital name" className={`${field} mt-1`} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-bold text-ink-soft">
                City
                <input name="city" required className={`${field} mt-1`} />
              </label>
              <label className="block text-xs font-bold text-ink-soft">
                State
                <input name="state" className={`${field} mt-1`} />
              </label>
            </div>
            <button type="submit" className={`${btn.primary} mt-3 w-full`}>
              Add and open the profile
            </button>
            <p className="mt-2 text-xs text-ink-muted">
              Bulk instead?{" "}
              <Link href="/admin/import" className="font-semibold text-brand hover:underline">
                Import a sheet
              </Link>
              .
            </p>
          </form>
        </details>
      }
    >
      {!isDatabaseConfigured() && <Note tone="amber">MONGODB_URI is not set on this deployment, so the catalogue cannot be read yet.</Note>}
      {saved ? (
        <div className="mb-4">
          <Note tone="green" icon="check">
            Hospital {saved}.
          </Note>
        </div>
      ) : null}

      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <form action="/admin/hospitals" className="flex h-[38px] min-w-[220px] items-center gap-2 rounded-[11px] border border-line bg-white px-3 text-ink-muted">
          {city ? <input type="hidden" name="city" value={city} /> : null}
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <CIcon name="search" size={16} />
          <input name="q" defaultValue={q} placeholder="Search hospitals" aria-label="Search hospitals" className="w-full bg-transparent text-[13px] text-ink outline-none" />
        </form>
        <FChip label="All cities" href={link({ city: "" })} on={!city} />
        {cities.slice(0, 8).map((name) => (
          <FChip key={name} label={name} href={link({ city: name })} on={city === name} />
        ))}
        <form action="/admin/hospitals" className="ml-auto">
          {q ? <input type="hidden" name="q" value={q} /> : null}
          {city ? <input type="hidden" name="city" value={city} /> : null}
          <select name="status" defaultValue={status} aria-label="Onboarding" className={`${field} !h-[38px] !w-44`}>
            <option value="">Any status</option>
            {ONBOARDING_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABEL[value]}
              </option>
            ))}
          </select>
          <button className={`${btn.ghost} ${btn.sm} ml-2 !h-[38px]`}>Filter</button>
        </form>
      </div>

      <TableWrap>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["Hospital", "City", "Accreditation", "Tie-up", "Onboarding", "On site", "Doctors", "Cases"].map((name) => (
                <th key={name} className={th}>
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hospitals.map((hospital) => (
              <tr key={hospital._id} className="hover:bg-[#fafafd]">
                <td className={td}>
                  <Link href={`/admin/hospitals/${hospital._id}`} className="flex items-center gap-2.5">
                    <Chip icon="hospital" tone="rose" small />
                    <span>
                      <b className="block hover:text-brand">{hospital.name}</b>
                      <small className="text-xs text-ink-muted">{hospital.specialtyCodes?.length ? `${hospital.specialtyCodes.length} specialties` : "Specialties not mapped"}{hospital.assignedRm ? ` · RM ${hospital.assignedRm}` : ""}</small>
                    </span>
                  </Link>
                </td>
                <td className={td}>{hospital.city}</td>
                <td className={`${td} max-w-[180px] truncate`}>{accreditationLabels(hospital).join(", ") || "—"}</td>
                <td className={td}>{hospital.publication?.tieupId ? <Pill tone="green">Signed</Pill> : <Pill>Prospect</Pill>}</td>
                <td className={td}>
                  <StatusPill status={statusOf(hospital)} />
                </td>
                <td className={td}>{hospital.publication?.state === "published" ? <Pill tone="brand">Live</Pill> : <Pill tone="amber">Research</Pill>}</td>
                <td className={td}>{doctors.get(hospital._id) ?? 0}</td>
                <td className={td}>{cases.get(hospital._id) ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {hospitals.length === 0 ? <Empty>No hospitals match.</Empty> : null}
      </TableWrap>
      <p className="mt-2 text-xs text-ink-muted">{hospitals.length} shown</p>
    </AdminShell>
  );
}
