import Link from "next/link";
import { redirect } from "next/navigation";
import type { Filter } from "mongodb";
import { AdminShell } from "@/components/admin/AdminShell";
import { Saved, adminField, adminLabel } from "@/components/admin/Panel";
import { isDatabaseConfigured, readOr } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import type { CaseStatus, PatientCase } from "@/lib/cases";
import { listPartners, type Referral } from "@/lib/partners";
import { SOURCE_LABEL, STAGE_LABEL, partnerIdOf, sourceOf } from "@/lib/referrals";
import { attributeCaseAction, deleteCaseAction, saveCaseAction, setCaseStatusAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUSES: CaseStatus[] = ["new", "planning", "planned", "plan-failed", "confirmed", "closed"];

const STATUS_LABEL: Record<CaseStatus, string> = {
  new: "Received",
  planning: "Reading reports",
  planned: "Plan ready",
  "plan-failed": "Needs a coordinator",
  confirmed: "Confirmed",
  closed: "Closed",
};

const STATUS_TONE: Record<CaseStatus, string> = {
  new: "bg-brand-tint text-brand-deep",
  planning: "bg-brand-tint text-brand-deep",
  planned: "bg-leaf/10 text-leaf",
  "plan-failed": "bg-saffron/15 text-saffron",
  confirmed: "bg-leaf/10 text-leaf",
  closed: "bg-surface-muted text-ink-muted",
};

type Query = {
  status?: string;
  country?: string;
  from?: string;
  to?: string;
  sort?: string;
  saved?: string;
};

export default async function CasesPage({ searchParams }: { searchParams: Promise<Query> }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const sp = await searchParams;

  const status = STATUSES.includes(sp.status as CaseStatus) ? (sp.status as CaseStatus) : "";
  const country = (sp.country ?? "").trim();
  const from = (sp.from ?? "").trim();
  const to = (sp.to ?? "").trim();
  const sort = sp.sort === "oldest" ? 1 : -1;

  const filter: Filter<PatientCase> = {};
  if (status) filter.status = status;
  if (country) filter["patient.country"] = country;
  if (from || to) {
    const range: Record<string, string> = {};
    if (from) range.$gte = `${from}T00:00:00.000Z`;
    if (to) range.$lte = `${to}T23:59:59.999Z`;
    filter.createdAt = range as never;
  }

  const [cases, countries, counts] = await Promise.all([
    readOr<PatientCase[]>([], (db) =>
      db.collection<PatientCase>("cases").find(filter).sort({ createdAt: sort }).limit(300).toArray(),
    ),
    readOr<string[]>([], (db) => db.collection<PatientCase>("cases").distinct("patient.country")),
    readOr<{ _id: CaseStatus; n: number }[]>([], (db) =>
      db
        .collection<PatientCase>("cases")
        .aggregate<{ _id: CaseStatus; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }])
        .toArray(),
    ),
  ]);

  const [partners, referralRows] = await Promise.all([
    listPartners(),
    readOr<Referral[]>([], (db) =>
      db
        .collection<Referral>("referrals")
        .find({ caseReference: { $in: cases.map((item) => item._id) } })
        .toArray(),
    ),
  ]);
  const partnerName = new Map(partners.map((p) => [p._id, p.name]));
  const referralOf = new Map(referralRows.map((r) => [r.caseReference, r]));

  const countOf = (s: CaseStatus) => counts.find((c) => c._id === s)?.n ?? 0;
  const total = counts.reduce((sum, c) => sum + c.n, 0);

  // The current filters as a string, so an action can send the admin back to
  // exactly the view they were on.
  const back = (() => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (country) p.set("country", country);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (sort === 1) p.set("sort", "oldest");
    const s = p.toString();
    return s ? `/admin/cases?${s}` : "/admin/cases";
  })();

  const chip = (value: string, label: string, n?: number) => {
    const p = new URLSearchParams();
    if (value) p.set("status", value);
    if (country) p.set("country", country);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (sort === 1) p.set("sort", "oldest");
    const active = status === value;
    return (
      <Link
        key={value || "all"}
        href={`/admin/cases${p.toString() ? `?${p}` : ""}`}
        className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
          active ? "bg-brand text-white" : "bg-surface-muted text-ink-soft"
        }`}
      >
        {label}
        {n !== undefined ? ` ${n}` : ""}
      </Link>
    );
  };

  return (
    <AdminShell title="Inquiries">
      {!isDatabaseConfigured() && (
        <p className="mb-6 rounded-lg bg-saffron/15 px-3 py-2 text-sm font-semibold text-ink">
          MONGODB_URI is not set on this deployment, so inquiries cannot be read yet.
        </p>
      )}
      {sp.saved === "deleted" ? <Saved what="inquiry removed" /> : sp.saved ? <Saved /> : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {chip("", "All", total)}
        {STATUSES.map((s) => chip(s, STATUS_LABEL[s], countOf(s)))}
      </div>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3 rounded-xl bg-surface-muted p-4">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <label className="min-w-40 flex-1">
          <span className={adminLabel}>Country</span>
          <select name="country" defaultValue={country} className={adminField}>
            <option value="">Any country</option>
            {countries.filter(Boolean).sort().map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={adminLabel}>From</span>
          <input type="date" name="from" defaultValue={from} className={adminField} />
        </label>
        <label>
          <span className={adminLabel}>To</span>
          <input type="date" name="to" defaultValue={to} className={adminField} />
        </label>
        <label>
          <span className={adminLabel}>Sort</span>
          <select name="sort" defaultValue={sort === 1 ? "oldest" : "newest"} className={adminField}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary !py-2.5 text-sm">
          Apply
        </button>
        {(country || from || to || sort === 1) && (
          <Link
            href={status ? `/admin/cases?status=${status}` : "/admin/cases"}
            className="btn btn-secondary !py-2.5 text-sm"
          >
            Clear
          </Link>
        )}
      </form>

      {cases.length === 0 ? (
        <p className="card p-6 text-ink-soft">No inquiries match this view.</p>
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

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <form action={setCaseStatusAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={item._id} />
                  <input type="hidden" name="back" value={back} />
                  <select name="status" defaultValue={item.status} className={`${adminField} !py-1.5 !w-auto text-sm`}>
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn btn-secondary !py-1.5 text-sm">
                    Set status
                  </button>
                </form>

                <details className="ml-auto">
                  <summary className="cursor-pointer text-sm font-bold text-brand">Edit</summary>
                  <form action={saveCaseAction} className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input type="hidden" name="id" value={item._id} />
                    <input type="hidden" name="back" value={back} />
                    <label className="block min-w-0">
                      <span className={adminLabel}>Name</span>
                      <input name="name" defaultValue={item.patient.name} className={adminField} />
                    </label>
                    <label className="block min-w-0">
                      <span className={adminLabel}>Phone</span>
                      <input name="phone" defaultValue={item.patient.phone} className={adminField} />
                    </label>
                    <label className="block min-w-0">
                      <span className={adminLabel}>Country</span>
                      <input name="country" defaultValue={item.patient.country} className={adminField} />
                    </label>
                    <label className="block min-w-0">
                      <span className={adminLabel}>Email</span>
                      <input name="email" defaultValue={item.patient.email ?? ""} className={adminField} />
                    </label>
                    <label className="block min-w-0 sm:col-span-2">
                      <span className={adminLabel}>Stated need</span>
                      <input name="statedNeed" defaultValue={item.statedNeed ?? ""} className={adminField} />
                    </label>
                    <input type="hidden" name="status" value={item.status} />
                    <div className="flex gap-3 sm:col-span-2">
                      <button type="submit" className="btn btn-primary !py-2.5 text-sm">
                        Save changes
                      </button>
                    </div>
                  </form>
                  <form action={deleteCaseAction} className="mt-2">
                    <input type="hidden" name="id" value={item._id} />
                    <input type="hidden" name="back" value={back} />
                    <button type="submit" className="btn btn-secondary !py-2.5 text-sm !text-red-600">
                      Delete this inquiry
                    </button>
                  </form>
                </details>
              </div>

              <p className="mt-3 text-xs text-ink-muted">
                <span className="font-bold tracking-wide text-ink-soft">{item._id}</span> ·{" "}
                {new Date(item.createdAt).toUTCString()}
 · {SOURCE_LABEL[sourceOf(item)]}
              </p>
              {(() => {
                const partnerId = partnerIdOf(item);
                const referral = referralOf.get(item._id);
                if (partnerId) {
                  return (
                    <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-bold text-brand-deep">
                        Partner referral
                      </span>
                      <Link href={`/admin/partners/${partnerId}`} className="font-semibold text-brand hover:underline">
                        {partnerName.get(partnerId) ?? partnerId}
                      </Link>
                      {referral ? (
                        <Link
                          href={`/admin/referrals?partner=${partnerId}#${referral._id}`}
                          className="text-ink-soft hover:underline"
                        >
                          · {STAGE_LABEL[referral.status]}
                          {referral.duplicateOf ? " · possible duplicate" : ""}
                        </Link>
                      ) : null}
                    </p>
                  );
                }
                if (partners.length === 0) return null;
                return (
                  <form action={attributeCaseAction} className="mt-2 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="id" value={item._id} />
                    <input type="hidden" name="back" value={back} />
                    <label className="sr-only" htmlFor={`credit-${item._id}`}>
                      Credit this case to a partner
                    </label>
                    <select
                      id={`credit-${item._id}`}
                      name="partnerId"
                      defaultValue=""
                      className={`${adminField} !w-auto !py-1.5 text-sm`}
                    >
                      <option value="" disabled>
                        Credit to a partner…
                      </option>
                      {partners
                        .filter((p) => p.status === "active")
                        .map((p) => (
                          <option key={p._id} value={p._id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                    <button type="submit" className="btn btn-secondary !py-1.5 text-sm">
                      Credit
                    </button>
                  </form>
                );
              })()}
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
