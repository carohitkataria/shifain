import type { Filter } from "mongodb";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, Empty, NotConfigured, Saved, Stage, Warn, adminField, adminLabel } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured, readOr } from "@/lib/db";
import { COUNTRIES } from "@/lib/countries";
import { listPartners, type Lead, type LeadStatus } from "@/lib/partners";
import { deleteLeadAction, saveLeadAction } from "../partners/actions";

export const dynamic = "force-dynamic";

const STATUSES: LeadStatus[] = ["new", "contacted", "qualified", "converted", "lost"];
const SOURCES = ["phone", "whatsapp", "email", "partner", "walk-in", "other"] as const;

const TONE: Record<LeadStatus, "busy" | "warn" | "good" | "quiet" | "bad"> = {
  new: "busy",
  contacted: "warn",
  qualified: "warn",
  converted: "good",
  lost: "quiet",
};

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; status?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { saved, error, status } = await searchParams;

  const filter: Filter<Lead> =
    status && STATUSES.includes(status as LeadStatus) ? { status: status as LeadStatus } : {};

  const [leads, partners] = await Promise.all([
    readOr<Lead[]>([], (db) =>
      db.collection<Lead>("leads").find(filter).sort({ createdAt: -1 }).limit(300).toArray(),
    ),
    listPartners(),
  ]);

  const open = leads.filter((lead) => lead.status === "new" || lead.status === "contacted").length;

  return (
    <AdminShell
      title="Leads"
    >
      {!isDatabaseConfigured() && <NotConfigured />}
      {saved ? <Saved what={saved === "deleted" ? "lead removed" : undefined} /> : null}
      {error === "name" ? <Warn>A lead needs at least a name.</Warn> : null}

      {open > 0 ? (
        <p className="mb-6 rounded-lg bg-brand-tint px-3.5 py-2.5 text-sm font-semibold text-brand-deep">
          {open} still open.
        </p>
      ) : null}

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/admin/leads"
          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
            status ? "bg-surface-muted text-ink-soft" : "bg-brand text-white"
          }`}
        >
          All
        </Link>
        {STATUSES.map((value) => (
          <Link
            key={value}
            href={`/admin/leads?status=${value}`}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
              status === value ? "bg-brand text-white" : "bg-surface-muted text-ink-soft"
            }`}
          >
            {value}
          </Link>
        ))}
      </div>

      <div className="space-y-6">
        <Card title="Record a lead" hint="Enough to call them back. Everything else can wait.">
          <form action={saveLeadAction} className="grid gap-4 sm:grid-cols-2">
            <label>
              <span className={adminLabel}>Name</span>
              <input name="name" required className={adminField} />
            </label>

            <label>
              <span className={adminLabel}>Phone</span>
              <input name="phone" type="tel" className={adminField} />
            </label>

            <label>
              <span className={adminLabel}>Email</span>
              <input name="email" type="email" className={adminField} />
            </label>

            <label>
              <span className={adminLabel}>Country</span>
              <input name="country" list="lead-countries" className={adminField} />
              <datalist id="lead-countries">
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.name} />
                ))}
              </datalist>
            </label>

            <label className="sm:col-span-2">
              <span className={adminLabel}>What they need</span>
              <textarea name="need" rows={2} className={adminField} />
            </label>

            <label>
              <span className={adminLabel}>How they reached us</span>
              <select name="source" defaultValue="phone" className={adminField}>
                {SOURCES.map((source) => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className={adminLabel}>Introduced by (optional)</span>
              <select name="partnerUserId" defaultValue="" className={adminField}>
                <option value="">Nobody — they came to us</option>
                {partners.map((partner) => (
                  <option key={partner._id} value={partner._id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="sm:col-span-2">
              <button type="submit" className="btn btn-primary !py-2.5 text-sm">
                Save lead
              </button>
            </div>
          </form>
        </Card>

        {leads.length === 0 ? (
          <Empty>No leads recorded yet.</Empty>
        ) : (
          <ul className="space-y-3">
            {leads.map((lead) => (
              <li key={lead._id} className="card p-5">
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="font-extrabold text-ink">{lead.name}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {[lead.phone, lead.email, lead.country].filter(Boolean).join(" · ") ||
                        "No contact details"}
                    </p>
                    {lead.need ? (
                      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{lead.need}</p>
                    ) : null}
                    <p className="mt-1 text-sm text-ink-soft">
                      via {lead.source} · {when(lead.createdAt)}
                      {lead.caseReference ? (
                        <>
                          {" · "}
                          <span className="font-mono">{lead.caseReference}</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <Stage value={lead.status} tone={TONE[lead.status] ?? "quiet"} />
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-bold text-brand">Update</summary>
                  <form
                    action={saveLeadAction}
                    className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2"
                  >
                    <input type="hidden" name="id" value={lead._id} />
                    <input type="hidden" name="name" value={lead.name} />
                    <input type="hidden" name="phone" value={lead.phone ?? ""} />
                    <input type="hidden" name="email" value={lead.email ?? ""} />
                    <input type="hidden" name="country" value={lead.country ?? ""} />
                    <input type="hidden" name="need" value={lead.need ?? ""} />
                    <input type="hidden" name="source" value={lead.source} />
                    <input type="hidden" name="partnerUserId" value={lead.partnerUserId ?? ""} />

                    <label>
                      <span className={adminLabel}>Where it stands</span>
                      <select name="status" defaultValue={lead.status} className={adminField}>
                        {STATUSES.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span className={adminLabel}>Case reference, once they book</span>
                      <input
                        name="caseReference"
                        defaultValue={lead.caseReference ?? ""}
                        placeholder="SH-…"
                        className={adminField}
                      />
                    </label>

                    <label className="sm:col-span-2">
                      <span className={adminLabel}>Note</span>
                      <textarea name="note" rows={2} defaultValue={lead.note ?? ""} className={adminField} />
                    </label>

                    <div className="flex flex-wrap gap-3 sm:col-span-2">
                      <button type="submit" className="btn btn-primary !py-2.5 text-sm">
                        Save
                      </button>
                    </div>
                  </form>
                  <form action={deleteLeadAction} className="mt-3">
                    <input type="hidden" name="id" value={lead._id} />
                    <button type="submit" className="btn btn-secondary !py-2.5 text-sm !text-red-600">
                      Delete this lead
                    </button>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  );
}
