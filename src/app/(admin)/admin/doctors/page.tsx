import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { CIcon } from "@/components/console/CIcon";
import { Av, Empty, Note, Pill, TableWrap, btn, field, initialsOf, td, th } from "@/components/console/ui";
import { saveDoctorAction } from "../hospitals/actions";
import { isDatabaseConfigured, readOr } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import type { Doctor } from "@/lib/catalogue";

export const dynamic = "force-dynamic";

export default async function DoctorsPage({ searchParams }: { searchParams: Promise<{ saved?: string; q?: string }> }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { saved, q = "" } = await searchParams;

  const query = q.trim() ? { name: { $regex: q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } } : {};
  const [doctors, links, hospitals] = await Promise.all([
    readOr<Doctor[]>([], (db) => db.collection<Doctor>("doctors").find(query).sort({ name: 1 }).limit(300).toArray()),
    readOr<{ doctorId: string; hospitalId: string }[]>([], (db) => db.collection<{ doctorId: string; hospitalId: string }>("hospital_doctor_map").find({}, { projection: { doctorId: 1, hospitalId: 1 } }).toArray()),
    readOr<{ _id: string; name: string }[]>([], (db) => db.collection<{ _id: string; name: string }>("hospitals").find({}, { projection: { name: 1 } }).toArray()),
  ]);
  const hospitalName = new Map(hospitals.map((item) => [item._id, item.name]));
  const hospitalsOf = new Map<string, string[]>();
  for (const link of links) {
    const name = hospitalName.get(link.hospitalId);
    if (name) hospitalsOf.set(link.doctorId, [...(hospitalsOf.get(link.doctorId) ?? []), name]);
  }

  return (
    <AdminShell
      title="Catalogue"
      subtitle="Hospitals, doctors and what patients can see"
      action={
        <details className="relative">
          <summary className={`${btn.primary} cursor-pointer list-none`}>
            <CIcon name="plus" size={16} />
            Add doctor
          </summary>
          <form action={saveDoctorAction} className="absolute right-0 z-20 mt-2 w-[320px] rounded-2xl border border-line bg-white p-4 shadow-xl">
            <label className="mb-2 block text-xs font-bold text-ink-soft">
              Name
              <input name="name" required placeholder="Dr A Rao" className={`${field} mt-1`} />
            </label>
            <label className="block text-xs font-bold text-ink-soft">
              Specialty
              <input name="specialtyLabelRaw" placeholder="Cardiac Surgery" className={`${field} mt-1`} />
            </label>
            <button type="submit" className={`${btn.primary} mt-3 w-full`}>
              Add
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
            Doctor {saved === "deleted" ? "deleted" : "saved"}.
          </Note>
        </div>
      ) : null}
      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <form action="/admin/doctors" className="flex h-[38px] min-w-[240px] items-center gap-2 rounded-[11px] border border-line bg-white px-3 text-ink-muted">
          <CIcon name="search" size={16} />
          <input name="q" defaultValue={q} placeholder="Search doctors" aria-label="Search doctors" className="w-full bg-transparent text-[13px] text-ink outline-none" />
        </form>
        <p className="text-xs text-ink-muted">Ratings gathered during research stay out of sight — they are someone else’s numbers and never shown on the site.</p>
      </div>

      <TableWrap>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["Doctor", "Specialty", "Hospital", "Experience", "Listing", "On site"].map((name) => (
                <th key={name} className={th}>
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {doctors.map((doctor) => (
              <tr key={doctor._id} className="hover:bg-[#fafafd]">
                <td className={td}>
                  <Link href={`/admin/doctors/${doctor._id}`} className="flex items-center gap-2.5">
                    <Av text={initialsOf(doctor.name)} size="sm" />
                    <span>
                      <b className="block hover:text-brand">{doctor.name}</b>
                      {doctor.qualifications ? <small className="block max-w-[260px] truncate text-xs text-ink-muted">{doctor.qualifications}</small> : null}
                    </span>
                  </Link>
                </td>
                <td className={td}>{doctor.specialtyLabelRaw ?? doctor.specialtyCode ?? "Not mapped"}</td>
                <td className={`${td} max-w-[220px] truncate`}>{(hospitalsOf.get(doctor._id) ?? []).join(", ") || "—"}</td>
                <td className={td}>{doctor.experienceYears ? `${doctor.experienceYears} yrs` : "—"}</td>
                <td className={td}>{doctor.consentToList ? <Pill tone="green">Consented</Pill> : <Pill>No consent yet</Pill>}</td>
                <td className={td}>{doctor.publication?.state === "published" ? <Pill tone="brand">Live</Pill> : <Pill tone="amber">{doctor.publication?.state ?? "Research"}</Pill>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {doctors.length === 0 ? <Empty>No doctor records yet.</Empty> : null}
      </TableWrap>
    </AdminShell>
  );
}
