import { redirect } from "next/navigation";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { CIcon } from "@/components/console/CIcon";
import { Bars, Box, Empty, Kpi, Pill, Seg, btn } from "@/components/console/ui";
import { NotConfigured } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured, readOr } from "@/lib/db";
import { allCases } from "@/lib/console";
import { journeyOf } from "@/lib/journey-rules";
import type { CrmMessage } from "@/lib/crm-messages";

export const dynamic = "force-dynamic";

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

/** How the business is doing: enquiries, where they come from, how many become treatment, how fast we answer. */
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ months?: string }> }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { months: raw } = await searchParams;
  const months = raw === "12" ? 12 : raw === "3" ? 3 : 6;
  const since = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - (months - 1), 1)).toISOString();
  const before = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - (months * 2 - 1), 1)).toISOString();

  const [cases, replies, referrals] = await Promise.all([
    allCases(),
    readOr<Pick<CrmMessage, "caseReference" | "createdAt">[]>([], (db) =>
      db
        .collection<CrmMessage>("crm_messages")
        .find({ direction: "outbound", caseReference: { $ne: null }, createdAt: { $gte: before } }, { projection: { caseReference: 1, createdAt: 1 } })
        .sort({ createdAt: 1 })
        .toArray(),
    ),
    readOr<number>(0, (db) => db.collection("referrals").countDocuments({ createdAt: { $gte: since } })),
  ]);

  const inRange = cases.filter((record) => record.createdAt >= since);
  const previous = cases.filter((record) => record.createdAt >= before && record.createdAt < since);
  const trend = previous.length ? Math.round(((inRange.length - previous.length) / previous.length) * 100) : null;

  const planned = inRange.filter((record) => record.plan || ["planned", "confirmed"].includes(record.status));
  const called = inRange.filter((record) => (record as { appointments?: { status: string }[] }).appointments?.some((call) => call.status === "confirmed"));
  const confirmed = inRange.filter((record) => record.status === "confirmed" || (record.status === "closed" && journeyOf(record, "procedure")));
  const treated = inRange.filter((record) => {
    const procedure = journeyOf(record, "procedure");
    return procedure && (procedure.status === "done" || (procedure.date && procedure.date < new Date().toISOString().slice(0, 10)));
  });
  const pct = (part: number) => (inRange.length ? Math.round((part / inRange.length) * 100) : 0);

  // First reply: from the case opening to the first message we sent on any channel.
  const firstReply = new Map<string, string>();
  for (const message of replies) if (message.caseReference && !firstReply.has(message.caseReference)) firstReply.set(message.caseReference, message.createdAt);
  const waits = inRange
    .map((record) => (firstReply.has(record._id) ? (Date.parse(firstReply.get(record._id)!) - Date.parse(record.createdAt)) / 60000 : null))
    .filter((value): value is number => value != null && value >= 0)
    .sort((a, b) => a - b);
  const median = waits.length ? waits[Math.floor(waits.length / 2)] : null;
  const medianText = median == null ? "—" : median < 60 ? `${Math.round(median)} min` : median < 1440 ? `${Math.round(median / 60)} h` : `${Math.round(median / 1440)} d`;

  const byMonth = Array.from({ length: months }, (_, index) => {
    const start = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - (months - 1 - index), 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    return { label: MONTH.format(start), value: inRange.filter((record) => record.createdAt >= start.toISOString() && record.createdAt < end.toISOString()).length };
  });
  const top = Math.max(1, ...byMonth.map((item) => item.value));

  const countries = new Map<string, number>();
  for (const record of inRange) countries.set(record.patient.country || "Unknown", (countries.get(record.patient.country || "Unknown") ?? 0) + 1);
  const sources = [...countries.entries()].sort((a, b) => b[1] - a[1]);
  const shownSources = sources.slice(0, 6);
  const other = sources.slice(6).reduce((sum, [, n]) => sum + n, 0);

  const quoted = inRange.filter((record) => record.billing?.quote && (record.billing.currency ?? "USD") === "USD").reduce((sum, record) => sum + (record.billing?.quote ?? 0), 0);

  return (
    <ConsoleShell
      title="Reports"
      sub={`Last ${months} months`}
      right={
        <>
          <Seg
            label="Period"
            items={[
              { label: "3 months", href: "/admin/reports?months=3", on: months === 3 },
              { label: "6 months", href: "/admin/reports", on: months === 6 },
              { label: "12 months", href: "/admin/reports?months=12", on: months === 12 },
            ]}
          />
          <a href={`/api/admin/export/cases?months=${months}`} className={btn.ghost}>
            <CIcon name="download" size={16} />
            Export
          </a>
        </>
      }
    >
      {!isDatabaseConfigured() && <NotConfigured />}
      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Kpi icon="user-plus" tone="brand" value={inRange.length} label="Enquiries" trend={trend == null ? null : { dir: trend > 0 ? "up" : trend < 0 ? "down" : "flat", text: `${trend > 0 ? "↑" : trend < 0 ? "↓" : ""} ${Math.abs(trend)}%` }} />
        <Kpi icon="trend" tone="teal" value={`${pct(confirmed.length)}%`} label="Enquiry to confirmed" />
        <Kpi icon="clock" tone="amber" value={medianText} label="First reply, median" />
        <Kpi icon="coins" tone="green" value={quoted ? `$${(quoted / 1000).toFixed(1)}k` : "—"} label="Quoted (USD)" />
        <Kpi icon="users" tone="rose" value={referrals} label="Partner referrals" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Box title="Enquiries by month">
          <div className="flex h-[170px] items-end gap-2.5 pt-2">
            {byMonth.map((item) => (
              <div key={item.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5 text-[11px] font-semibold text-ink-muted">
                <span className="text-ink-soft">{item.value || ""}</span>
                <i className="block w-full max-w-[34px] rounded-t-[7px] rounded-b bg-brand" style={{ height: `${(item.value / top) * 80}%`, minHeight: item.value ? 4 : 0 }} />
                {item.label}
              </div>
            ))}
          </div>
        </Box>
        <Box title="Where patients come from" right={<Pill>Admin only</Pill>}>
          {sources.length ? <Bars rows={[...shownSources.map(([label, n]) => ({ label, value: pct(n), suffix: "%" })), ...(other ? [{ label: "Other", value: pct(other), suffix: "%" }] : [])]} max={100} /> : <Empty>No enquiries in this period.</Empty>}
        </Box>
        <Box title="Conversion">
          <Bars
            max={100}
            rows={[
              { label: "Enquiries", value: inRange.length ? 100 : 0, color: "#0d9488", suffix: "%" },
              { label: "Plan sent", value: pct(planned.length), color: "#0d9488", suffix: "%" },
              { label: "Call held", value: pct(called.length), color: "#0d9488", suffix: "%" },
              { label: "Confirmed", value: pct(confirmed.length), color: "#0d9488", suffix: "%" },
              { label: "Treated", value: pct(treated.length), color: "#0d9488", suffix: "%" },
            ]}
          />
        </Box>
      </div>
    </ConsoleShell>
  );
}
