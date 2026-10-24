import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { importAction } from "../hospitals/actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 font-mono text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint";

const SHEETS = [
  {
    kind: "hospitals",
    title: "Hospitals",
    columns: "name, city, state, type, beds, icuBeds, accreditations, specialtyCodes, capabilities, website, about",
    required: "name and city",
    example:
      "name,city,state,beds,accreditations,specialtyCodes\nApollo Hospital,Delhi,Delhi,700,\"JCI, NABH\",\"cardiology, orthopaedics\"",
  },
  {
    kind: "doctors",
    title: "Doctors",
    columns:
      "name, specialty, specialtyCode, qualifications, registrationNumber, experienceYears, profileUrl, hospital, hospitalCity",
    required: "name",
    example:
      "name,specialty,qualifications,experienceYears,hospital,hospitalCity\nDr A Rao,Cardiac Surgery,\"MBBS, MS, MCh\",22,Apollo Hospital,Delhi",
  },
  {
    kind: "mappings",
    title: "Doctor to hospital, with days",
    columns: "doctor, hospital, city, specialtyCode, attachment, day, from, to, slotMinutes, note",
    required: "doctor and hospital",
    example:
      "doctor,hospital,city,attachment,day,from,to\nDr A Rao,Apollo Hospital,Delhi,visiting,tue,10:00,13:00",
  },
];

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string; skipped?: string; error?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { created, updated, skipped, error } = await searchParams;

  return (
    <AdminShell
      title="Catalogue"
      subtitle="Hospitals, doctors and what patients can see"
    >
      {!isDatabaseConfigured() && (
        <p className="mb-6 rounded-lg bg-saffron/15 px-3 py-2 text-sm font-semibold text-ink">
          MONGODB_URI is not set on this deployment, so nothing can be imported yet.
        </p>
      )}

      {created !== undefined ? (
        <p className="mb-6 rounded-lg bg-leaf/10 px-3.5 py-2.5 text-sm font-semibold text-leaf">
          {created} created, {updated} updated, {skipped} skipped.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mb-6 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">
          {error === "empty"
            ? "Nothing was pasted."
            : error === "parse"
              ? "That did not read as a sheet. The first line must be the column names."
              : "Pick what kind of sheet it is."}
        </p>
      ) : null}

      <p className="mb-6 rounded-lg bg-surface-muted px-3.5 py-2.5 text-sm leading-relaxed text-ink-soft">
        Importing never publishes anything. Hospitals and doctors arrive as research, and stay
        invisible to patients until someone signs a tie-up and publishes them by hand.
      </p>

      <div className="space-y-6">
        {SHEETS.map((sheet) => (
          <form key={sheet.kind} action={importAction} className="card p-6">
            <input type="hidden" name="kind" value={sheet.kind} />
            <h2 className="font-extrabold text-ink">{sheet.title}</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Columns: <span className="font-mono text-xs">{sheet.columns}</span>
            </p>
            <p className="mt-0.5 text-sm text-ink-soft">
              Required: <strong>{sheet.required}</strong>. A row missing those is skipped rather
              than half-imported.
            </p>

            <textarea
              name="csv"
              rows={6}
              placeholder={sheet.example}
              className={`${field} mt-4`}
            />

            <button type="submit" className="btn btn-primary mt-4 !py-2.5 text-sm">
              Import {sheet.title.toLowerCase()}
            </button>
          </form>
        ))}
      </div>

      <section className="card mt-8 p-6">
        <h2 className="font-extrabold text-ink">Where to get doctor data</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          The <strong>National Medical Commission&apos;s Indian Medical Register</strong> is the
          authoritative source for who is registered, with what qualification and under which state
          council — it is public, and it is the one record a patient can actually rely on. Hospital
          websites are the source for who works where and on which days; that is also the moment to
          ask the doctor for their consent to be listed, which this panel will not let you skip.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Copying another facilitator&apos;s doctor database wholesale is their compiled work, not
          public fact. Names, registration numbers and hospital affiliations are facts and are fine
          to gather; their write-ups, photographs and ratings are not.
        </p>
      </section>
    </AdminShell>
  );
}
