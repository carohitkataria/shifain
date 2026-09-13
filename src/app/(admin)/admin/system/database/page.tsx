import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, NotConfigured, Warn } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { getDb, isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * The collections grouped the way they are actually used, with a plain-words
 * line each. A count of zero is only a problem for some of them, which is why
 * `seeded` is here: those are the ones the catalogue cannot work without.
 */
const AREAS: { heading: string; rows: { name: string; what: string; seeded?: boolean }[] }[] = [
  {
    heading: "Reference data",
    rows: [
      { name: "categories", what: "Broad areas of care", seeded: true },
      { name: "specialties", what: "Medical specialties", seeded: true },
      { name: "capabilities", what: "What a hospital can actually do", seeded: true },
      { name: "cities", what: "Indian cities we send patients to", seeded: true },
      { name: "diseases", what: "Conditions a patient may arrive with", seeded: true },
      { name: "treatments", what: "Procedures we can arrange", seeded: true },
    ],
  },
  {
    heading: "Mappings",
    rows: [
      { name: "disease_specialty_map", what: "Which specialty treats which condition", seeded: true },
      { name: "disease_treatment_map", what: "What a condition is treated with", seeded: true },
      { name: "treatment_specialty_map", what: "Which specialty performs a treatment", seeded: true },
      { name: "matching_rules", what: "How a case is routed to a hospital", seeded: true },
      { name: "hospital_doctor_map", what: "Who practises where", seeded: true },
      { name: "hospital_specialty_map", what: "What each hospital covers", seeded: true },
      { name: "treatment_hospital_map", what: "Where a treatment can be done", seeded: true },
      { name: "treatment_doctor_map", what: "Who performs a treatment" },
    ],
  },
  {
    heading: "Providers",
    rows: [
      { name: "hospitals", what: "Hospital records and their publication state", seeded: true },
      { name: "doctors", what: "Doctor records and consent to be listed", seeded: true },
      { name: "doctor_schedules", what: "Which days a doctor sits at which hospital" },
      { name: "tieups", what: "Signed agreements — nothing is published without one" },
    ],
  },
  {
    heading: "Money",
    rows: [
      { name: "price_bands", what: "Indicative research ranges, never quoted as a price", seeded: true },
      { name: "cost_estimates", what: "Real quotes tied to a hospital" },
      { name: "referral_offers", what: "What a partner earns" },
      { name: "payouts", what: "Commission statements" },
    ],
  },
  {
    heading: "People and cases",
    rows: [
      { name: "cases", what: "Patient cases and their plans" },
      { name: "case_reports", what: "Uploaded reports — deleted automatically after 30 days" },
      { name: "signin_codes", what: "Short-lived email sign-in codes" },
      { name: "partner_users", what: "Partner logins" },
      { name: "partner_applications", what: "Doctors asking to become partners" },
      { name: "referrals", what: "The commercial side of a referred case" },
      { name: "leads", what: "Enquiries before they become a case" },
      { name: "broadcasts", what: "Notices shown on the partner portal" },
    ],
  },
  {
    heading: "Content and provenance",
    rows: [
      { name: "attractions", what: "Places to see near a treatment city", seeded: true },
      { name: "sources", what: "Where each record came from and whether we may publish it" },
    ],
  },
];

type Row = { name: string; count: number; indexes: number; exists: boolean };

async function survey(): Promise<{ rows: Map<string, Row>; extra: string[]; error: string | null }> {
  const rows = new Map<string, Row>();
  const known = new Set(AREAS.flatMap((area) => area.rows.map((row) => row.name)));

  try {
    const db = await getDb();
    const present = await db.listCollections({}, { nameOnly: true }).toArray();
    const names = present.map((entry) => entry.name);

    await Promise.all(
      names.map(async (name) => {
        const collection = db.collection(name);
        const [count, indexes] = await Promise.all([
          collection.estimatedDocumentCount(),
          collection.indexes().catch(() => []),
        ]);
        rows.set(name, { name, count, indexes: indexes.length, exists: true });
      }),
    );

    return { rows, extra: names.filter((name) => !known.has(name)).sort(), error: null };
  } catch (error) {
    return { rows, extra: [], error: error instanceof Error ? error.message : String(error) };
  }
}

export default async function DatabasePage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const configured = isDatabaseConfigured();
  const { rows, extra, error } = configured
    ? await survey()
    : { rows: new Map<string, Row>(), extra: [], error: null };

  const documents = [...rows.values()].reduce((sum, row) => sum + row.count, 0);
  const missing = AREAS.flatMap((area) => area.rows)
    .filter((row) => row.seeded && !(rows.get(row.name)?.count ?? 0))
    .map((row) => row.name);

  return (
    <AdminShell
      title="Database"
      subtitle="What is in the catalogue right now, collection by collection. Read-only — the schema itself is versioned in the repository and applied by the seed script."
    >
      {!configured && <NotConfigured />}
      {error ? (
        <Warn>
          MONGODB_URI is set, but the database would not answer: {error}. Check the connection string
          and that this deployment&rsquo;s IP is on the Atlas access list.
        </Warn>
      ) : null}
      {missing.length > 0 && !error && configured ? (
        <Warn>
          Empty but expected to hold data: {missing.join(", ")}. Run <code>npm run db:seed</code>{" "}
          against this database.
        </Warn>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <p className="card p-4">
          <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">Database</span>
          <span className="mt-1 block text-lg font-extrabold text-ink">
            {process.env.MONGODB_DB || "shifain"}
          </span>
        </p>
        <p className="card p-4">
          <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">Collections</span>
          <span className="mt-1 block text-2xl font-extrabold text-ink">{rows.size}</span>
        </p>
        <p className="card p-4">
          <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">Documents</span>
          <span className="mt-1 block text-2xl font-extrabold text-ink">
            {documents.toLocaleString("en-US")}
          </span>
        </p>
      </div>

      <div className="space-y-6">
        {AREAS.map((area) => (
          <Card key={area.heading} title={area.heading}>
            <ul className="divide-y divide-line">
              {area.rows.map((row) => {
                const live = rows.get(row.name);
                const empty = !live || live.count === 0;
                return (
                  <li key={row.name} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2.5">
                    <span className="min-w-0 flex-1 basis-48">
                      <span className="block font-mono text-sm font-semibold text-ink">{row.name}</span>
                      <span className="block text-sm text-ink-soft">{row.what}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span
                        className={`block font-bold ${
                          empty ? (row.seeded ? "text-saffron" : "text-ink-soft") : "text-ink"
                        }`}
                      >
                        {!live ? "not created" : live.count.toLocaleString("en-US")}
                      </span>
                      {live ? (
                        <span className="block text-xs text-ink-soft">
                          {live.indexes} index{live.indexes === 1 ? "" : "es"}
                        </span>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}

        {extra.length > 0 ? (
          <Card
            title="Not in the schema"
            hint="Collections present in the database that the repository does not define. Usually left over from an experiment."
          >
            <p className="font-mono text-sm text-ink-soft">{extra.join(", ")}</p>
          </Card>
        ) : null}

        <Card
          title="Changing the schema"
          hint="Collections, validators and indexes live in scripts/db/collections.mjs and are applied by npm run db:seed. They are deliberately not editable from here — a validator changed by hand in production is a validator nobody can reproduce."
        >
          <p className="text-sm leading-relaxed text-ink-soft">
            The seed script is safe to re-run: it creates what is missing, updates the collections it
            owns, and leaves everything else alone.
          </p>
        </Card>
      </div>
    </AdminShell>
  );
}
