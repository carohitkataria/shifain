import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isDatabaseConfigured, readOr } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import type { CaseStatus, PatientCase } from "@/lib/cases";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<CaseStatus, string> = {
  new: "Received",
  planning: "Reading reports",
  planned: "Plan ready",
  "plan-failed": "Needs a coordinator",
  confirmed: "Confirmed by hospital",
  closed: "Closed",
};

const STATUS_TONE: Record<CaseStatus, string> = {
  new: "bg-surface-muted text-ink-soft",
  planning: "bg-brand-tint text-brand-deep",
  planned: "bg-leaf/10 text-leaf",
  "plan-failed": "bg-saffron/15 text-saffron",
  confirmed: "bg-leaf/10 text-leaf",
  closed: "bg-surface-muted text-ink-muted",
};

/** The order a coordinator wants to see first. */
const PRIORITY: CaseStatus[] = ["plan-failed", "planning", "planned", "new", "confirmed", "closed"];

export default async function CasesPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const cases = await readOr<PatientCase[]>([], (db) =>
    db.collection<PatientCase>("cases").find({}).sort({ createdAt: -1 }).limit(200).toArray(),
  );

  const counts = PRIORITY.map((status) => ({
    status,
    count: cases.filter((item) => item.status === status).length,
  })).filter((entry) => entry.count > 0);

  return (
    <AdminShell
      title="Patient cases"
      subtitle="Every enquiry that came in with reports, and what the planner made of it. Report files are not stored — only what each report was and the plan it produced."
    >
      {!isDatabaseConfigured() && (
        <p className="mb-6 rounded-lg bg-saffron/15 px-3 py-2 text-sm font-semibold text-ink">
          MONGODB_URI is not set on this deployment, so cases cannot be read yet.
        </p>
      )}

      {counts.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          {counts.map(({ status, count }) => (
            <span
              key={status}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${STATUS_TONE[status]}`}
            >
              {count} {STATUS_LABEL[status].toLowerCase()}
            </span>
          ))}
        </div>
      )}

      {cases.length === 0 ? (
        <p className="card p-6 text-ink-soft">No cases yet.</p>
      ) : (
        <ul className="space-y-3">
          {cases.map((item) => (
            <li key={item._id} className="card p-5">
              <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-extrabold text-ink">{item.patient.name}</p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {item.patient.country} · {item.patient.phone}
                    {item.patient.email ? ` · ${item.patient.email}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    {item.statedNeed || "No stated need"} ·{" "}
                    {item.intakeRoute === "reports"
                      ? `${item.reports.length} report${item.reports.length === 1 ? "" : "s"}`
                      : item.intakeRoute === "description"
                        ? "described in their own words"
                        : "answered the standard questions"}
                  </p>

                  {item.reports.length > 0 ? (
                    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                      {item.reports.map((report, index) =>
                        report.id ? (
                          <a
                            key={report.id}
                            href={`/api/admin/report/${item._id}/${item._id}-${report.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-brand hover:underline"
                          >
                            {report.filename}
                          </a>
                        ) : (
                          <span key={`${report.filename}-${index}`} className="text-ink-muted">
                            {report.filename} (not stored)
                          </span>
                        ),
                      )}
                    </p>
                  ) : null}

                  {item.description ? (
                    <p className="mt-2 rounded-lg bg-surface-muted px-3 py-2 text-sm leading-relaxed text-ink-soft">
                      {item.description}
                    </p>
                  ) : null}
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${STATUS_TONE[item.status]}`}
                >
                  {STATUS_LABEL[item.status]}
                </span>

                <Link
                  href={`/${item.locale}/plan/${item._id}`}
                  target="_blank"
                  className="shrink-0 text-sm font-semibold text-brand hover:underline"
                >
                  Open plan
                </Link>
              </div>

              <p className="mt-3 border-t border-line pt-3 text-xs text-ink-muted">
                <span className="font-bold tracking-wide text-ink-soft">{item._id}</span> ·{" "}
                {new Date(item.createdAt).toUTCString()}
                {item.referredBy ? " · referred by a partner doctor" : " · from the homepage"}
                {item.reportsExpireAt
                  ? ` · reports held until ${new Date(item.reportsExpireAt).toUTCString().slice(5, 16)}`
                  : ""}
              </p>

              {item.planError ? (
                <p className="mt-2 rounded-lg bg-saffron/10 px-3 py-2 text-sm text-ink-soft">
                  Planner said: {item.planError}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
