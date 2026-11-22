import { redirect } from "next/navigation";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import { Bars, Box, Empty, Kpi, Pill, Seg } from "@/components/console/ui";
import { NotConfigured } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { COUNTRY_BY_CODE } from "@/lib/countries";
import { LOCALE_META, isLocale } from "@/lib/i18n";
import { visitorReport } from "@/lib/visitors";

export const dynamic = "force-dynamic";

const DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const PERIODS = [7, 30, 90] as const;

const PAGE_NAMES: Record<string, string> = {
  "/": "Home page",
  "/plan/[case]": "A patient's plan",
  "/portal/patient": "Patient account",
  "/portal/patient/login": "Patient sign-in",
  "/treatments": "Treatments",
  "/hospitals": "Hospitals",
  "/doctors": "Doctors",
  "/conditions": "Conditions",
  "/faq": "FAQ",
  "/privacy": "Privacy policy",
  "/terms": "Terms of use",
};

const pageName = (key: string) => PAGE_NAMES[key] ?? key;
const langName = (key: string) => (isLocale(key) ? LOCALE_META[key].english : "No language in the address");
const countryName = (code: string) => (code === "??" ? "Unknown" : COUNTRY_BY_CODE.get(code)?.name ?? code);
const deviceName = (key: string) => ({ phone: "Phone", tablet: "Tablet", computer: "Computer" })[key] ?? key;

/** How many people the site reaches, where they come from and what they read. Counted by the site itself, without cookies. */
export default async function VisitorsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const raw = Number((await searchParams).days);
  const days = (PERIODS as readonly number[]).includes(raw) ? raw : 30;
  const report = await visitorReport(days);
  const today = report.days[report.days.length - 1];
  const top = Math.max(1, ...report.days.map((item) => item.visitors));
  const perVisitor = report.visitors ? (report.views / report.visitors).toFixed(1) : "—";
  const rows = (items: { key: string; value: number }[], name: (key: string) => string, limit = 8) => {
    const shown = items.slice(0, limit).map((item) => ({ label: name(item.key), value: item.value }));
    const rest = items.slice(limit).reduce((sum, item) => sum + item.value, 0);
    return rest ? [...shown, { label: "Other", value: rest }] : shown;
  };
  // Every bar is labelled on a long period; a date every few bars on the longer ones.
  const labelEvery = days <= 7 ? 1 : days <= 30 ? 5 : 15;

  return (
    <ConsoleShell
      title="Visitors"
      sub={report.since ? `Counted since ${DAY.format(new Date(`${report.since}T00:00:00Z`))} · no cookies, no outside company` : "Counting starts with the next visit"}
      right={<Seg label="Period" items={PERIODS.map((period) => ({ label: `${period} days`, href: `/admin/reports/visitors?days=${period}`, on: period === days }))} />}
    >
      {!isDatabaseConfigured() && <NotConfigured />}
      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi icon="users" tone="brand" value={report.visitors} label={`Visitors, last ${days} days`} />
        <Kpi icon="eye" tone="teal" value={report.views} label="Pages viewed" />
        <Kpi icon="file" tone="amber" value={perVisitor} label="Pages per visitor" />
        <Kpi icon="user-plus" tone="green" value={today?.visitors ?? 0} label="Visitors today (UTC)" />
      </div>

      <Box title="Visitors per day" right={<Pill>UTC days</Pill>} className="mb-4">
        {report.visitors ? (
          <div className="flex h-[180px] items-end gap-[3px] pt-2" role="img" aria-label={`Visitors per day over the last ${days} days`}>
            {report.days.map((item, index) => (
              <div key={item.day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1 text-[10.5px] font-semibold text-ink-muted" title={`${DAY.format(new Date(`${item.day}T00:00:00Z`))}: ${item.visitors} visitors, ${item.views} pages`}>
                {days <= 30 ? <span className="text-ink-soft">{item.visitors || ""}</span> : null}
                <i className="block w-full max-w-[28px] rounded-t-[6px] rounded-b bg-brand" style={{ height: `${(item.visitors / top) * 78}%`, minHeight: item.visitors ? 3 : 0 }} />
                <span className="h-3 whitespace-nowrap">{index % labelEvery === 0 || index === report.days.length - 1 ? DAY.format(new Date(`${item.day}T00:00:00Z`)) : ""}</span>
              </div>
            ))}
          </div>
        ) : (
          <Empty>No visits counted in this period yet. Counting started when this page went live; earlier visits were not recorded.</Empty>
        )}
      </Box>

      <div className="grid gap-4 lg:grid-cols-3">
        <Box title="Where visitors came from" className="lg:col-span-1">
          {report.sources.length ? <Bars rows={rows(report.sources, (key) => key)} /> : <Empty>Nothing yet.</Empty>}
          <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
            WhatsApp and Telegram often hide where a visitor came from, so they show as Direct. Add <b>?utm_source=whatsapp</b> (or telegram) to links you share there to see them by name.
          </p>
        </Box>
        <Box title="Countries">{report.countries.length ? <Bars rows={rows(report.countries, countryName)} /> : <Empty>Nothing yet.</Empty>}</Box>
        <Box title="Languages">{report.langs.length ? <Bars rows={rows(report.langs, langName)} /> : <Empty>Nothing yet.</Empty>}</Box>
        <Box title="Most viewed pages" className="lg:col-span-2">
          {report.pages.length ? <Bars rows={rows(report.pages, pageName, 12)} /> : <Empty>Nothing yet.</Empty>}
        </Box>
        <Box title="Devices">{report.devices.length ? <Bars rows={rows(report.devices, deviceName)} /> : <Empty>Nothing yet.</Empty>}</Box>
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-ink-muted">
        A visitor is one browser on one day: someone who comes back on three days counts three times. Robots, link previews and the team&apos;s console are not counted, nor are visitors whose browser asks not to be tracked. Countries come from the visitor&apos;s time zone when the network does not say.
      </p>
    </ConsoleShell>
  );
}
