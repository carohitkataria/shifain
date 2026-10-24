import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Empty, NotConfigured, Saved, Stage } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured, readOr } from "@/lib/db";
import type { PartnerApplication } from "@/lib/partners";
import { decideApplicationAction } from "../actions";

export const dynamic = "force-dynamic";

const TONE = { new: "busy", reviewing: "warn", approved: "good", declined: "quiet" } as const;

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { saved } = await searchParams;

  const applications = await readOr<PartnerApplication[]>([], (db) =>
    db
      .collection<PartnerApplication>("partner_applications")
      .find({})
      .sort({ status: 1, createdAt: -1 })
      .limit(200)
      .toArray(),
  );

  const waiting = applications.filter((row) => row.status === "new" || row.status === "reviewing");

  return (
    <AdminShell
      title="Partners"
      subtitle="Referring doctors, hospitals and agents"
    >
      {!isDatabaseConfigured() && <NotConfigured />}
      {saved ? <Saved what={saved === "declined" ? "declined" : saved} /> : null}

      {waiting.length > 0 ? (
        <p className="mb-6 rounded-lg bg-brand-tint px-3.5 py-2.5 text-sm font-semibold text-brand-deep">
          {waiting.length} waiting on you.
        </p>
      ) : null}

      {applications.length === 0 ? (
        <Empty>
          No applications yet. The form lives at <code>/[locale]/portal/doctor/apply</code>, linked
          from the doctor sign-in page.
        </Empty>
      ) : (
        <ul className="space-y-3">
          {applications.map((row) => (
            <li key={row._id} className="card p-5">
              <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-extrabold text-ink">{row.name}</p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {row.clinic ? `${row.clinic} · ` : ""}
                    {row.city ? `${row.city}, ` : ""}
                    {row.country}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {row.email}
                    {row.phone ? ` · ${row.phone}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {row.specialty ?? "Specialty not given"}
                    {row.registrationNumber ? ` · reg ${row.registrationNumber}` : ""}
                    {row.patientsPerYear ? ` · ~${row.patientsPerYear} patients/year` : ""}
                  </p>
                  {row.note ? (
                    <p className="mt-2 rounded-lg bg-surface-muted px-3 py-2 text-sm leading-relaxed text-ink-soft">
                      {row.note}
                    </p>
                  ) : null}
                </div>
                <Stage value={row.status} tone={TONE[row.status]} />
              </div>

              {row.status !== "approved" ? (
                <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-4">
                  {(["reviewing", "approved", "declined"] as const)
                    .filter((decision) => decision !== row.status)
                    .map((decision) => (
                      <form key={decision} action={decideApplicationAction}>
                        <input type="hidden" name="id" value={row._id} />
                        <input type="hidden" name="decision" value={decision} />
                        <button
                          type="submit"
                          className={`text-sm font-semibold hover:underline ${
                            decision === "declined" ? "text-red-600" : "text-brand"
                          }`}
                        >
                          {decision === "approved"
                            ? "Approve and create their login"
                            : decision === "reviewing"
                              ? "Mark as reviewing"
                              : "Decline"}
                        </button>
                      </form>
                    ))}
                </div>
              ) : (
                <p className="mt-4 border-t border-line pt-4 text-sm text-ink-soft">
                  Approved{row.decidedAt ? ` on ${row.decidedAt.slice(0, 10)}` : ""}. Their login is
                  under Partner logins.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
