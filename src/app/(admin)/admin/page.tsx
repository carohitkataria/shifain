import Link from "next/link";
import { redirect } from "next/navigation";
import { ConsoleShell, consoleUrl } from "@/components/console/ConsoleShell";
import { CIcon } from "@/components/console/CIcon";
import { ChannelIcon } from "@/components/console/drawers";
import { Bars, Box, Chip, Empty, Kpi, MoreLink, Pill, Row, Seg, StatePill, TONE, CARE_KIND } from "@/components/console/ui";
import { NotConfigured } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { BOARD, INBOX_CHANNELS, careEvents, caseRows, conversations, homeNumbers, notifications, waitingBy, addDays } from "@/lib/console";
import { withDrawer } from "@/lib/console-url";
import { currentActor } from "@/lib/onboarding";
import { indiaToday } from "@/lib/patient-app";

export const dynamic = "force-dynamic";



const greeting = () => {
  const hour = Number(new Date(Date.now() + 330 * 60_000).toISOString().slice(11, 13));
  return hour >= 5 && hour < 12 ? "Good morning" : hour < 17 && hour >= 12 ? "Good afternoon" : hour >= 17 && hour < 21 ? "Good evening" : "Good night";
};

/** Home: the numbers that matter today, what needs someone now, and who is on the ground. */
export default async function ConsoleHome({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { range = "today" } = await searchParams;
  const [url, numbers, notices, rows, waiting, convs, actor] = await Promise.all([consoleUrl(), homeNumbers(), notifications(), caseRows(), waitingBy(), conversations(), currentActor()]);
  const today = indiaToday();
  const days = range === "week" ? 7 : range === "month" ? 30 : 1;
  const events = (await Promise.all(Array.from({ length: Math.min(days, 7) }, (_, index) => careEvents(addDays(today, index))))).flat();
  const pipeline = BOARD.map((column) => ({ label: column.label, value: rows.filter((row) => row.board === column.key).length, color: column.color }));
  const byHospital = new Map<string, number>();
  for (const row of rows) if (row.hospital && row.status !== "closed") byHospital.set(row.hospital, (byHospital.get(row.hospital) ?? 0) + 1);
  const hospitals = [...byHospital.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const name = (actor || "").trim().split(/\s+/)[0];
  const money = (value: number) => (value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value}`);

  return (
    <ConsoleShell
      title={
        <>
          {greeting()}
          {name ? (
            <>
              , <b>{name}</b>
            </>
          ) : null}
        </>
      }
      sub={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}
      right={
        <>
          <Seg
            label="Range"
            items={[
              { label: "Today", href: "/admin", on: range === "today" },
              { label: "Week", href: "/admin?range=week", on: range === "week" },
              { label: "Month", href: "/admin?range=month", on: range === "month" },
            ]}
          />
          <span className="inline-flex items-center gap-2 rounded-[11px] bg-leaf-tint px-3 py-2.5 text-xs font-bold text-leaf">
            <span className="h-2 w-2 animate-pulse rounded-full bg-leaf" />
            {numbers.here.length} patient{numbers.here.length === 1 ? "" : "s"} here now
          </span>
        </>
      }
    >
      {!isDatabaseConfigured() && <NotConfigured />}
      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Kpi icon="user-plus" tone="brand" value={numbers.thisWeek} label="New enquiries this week" trend={numbers.trend == null ? null : { dir: numbers.trend > 0 ? "up" : numbers.trend < 0 ? "down" : "flat", text: `${numbers.trend > 0 ? "↑" : numbers.trend < 0 ? "↓" : ""} ${Math.abs(numbers.trend)}%` }} href="/admin/cases" />
        <Kpi icon="case" tone="teal" value={numbers.active} label="Active cases" href="/admin/cases" />
        <Kpi icon="plane" tone="sky" value={numbers.here.length} label="Patients here now" href="/admin/care" />
        <Kpi icon="calendar" tone="amber" value={numbers.arriving} label="Arrivals in the next 7 days" href="/admin/care?day=1" />
        <Kpi icon="coins" tone="green" value={numbers.pipeline ? money(numbers.pipeline) : "—"} label={numbers.due ? `Quoted · ${money(numbers.due)} still due` : "Quoted in open cases"} href="/admin/reports" />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Box title="Needs you now" right={<Pill tone={notices.length ? "red" : "green"}>{notices.length}</Pill>}>
          {notices.length === 0 ? <Empty>Nothing waiting on anyone.</Empty> : null}
          {notices.slice(0, 7).map((notice, index) => (
            <Row
              key={`${notice.title}-${index}`}
              lead={<Chip icon={notice.icon} tone={notice.tone} small />}
              title={notice.title}
              sub={notice.sub}
              right={
                <Link href={notice.href.startsWith("?") ? withDrawer(url, Object.fromEntries(new URLSearchParams(notice.href.slice(1)))) : notice.href} scroll={false} className="inline-flex h-8 items-center rounded-[9px] bg-brand-tint px-3 text-xs font-bold text-brand hover:bg-brand/15">
                  Open
                </Link>
              }
            />
          ))}
          {notices.length > 7 ? (
            <Link href={withDrawer(url, { d: "notifs" })} scroll={false} className="mt-2 inline-block text-xs font-bold text-brand">
              {notices.length - 7} more
            </Link>
          ) : null}
        </Box>
        <Box title={range === "today" ? "On the ground today" : `On the ground, next ${Math.min(days, 7)} days`} right={<MoreLink href="/admin/care">Care desk</MoreLink>}>
          {events.length === 0 ? <Empty>Nothing booked{range === "today" ? " today" : ""}.</Empty> : null}
          {events.slice(0, 8).map((event) => (
            <Row
              key={event.id}
              href={withDrawer(url, { d: "case", ref: event.caseRef, tab: "schedule" })}
              lead={
                <>
                  <span className="w-[52px] shrink-0 text-xs font-bold text-ink-soft">{range === "today" ? event.time ?? "Today" : `${event.date.slice(5)} ${event.time ?? ""}`}</span>
                  <Chip icon={CARE_KIND[event.kind][0]} tone={CARE_KIND[event.kind][1]} small />
                </>
              }
              title={event.title}
              sub={`${event.patient}${event.assigned ? ` · ${event.assigned}` : ""}`}
              right={<StatePill state={event.state} />}
            />
          ))}
        </Box>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Box title="Pipeline" right={<MoreLink href="/admin/cases">Board</MoreLink>}>
          <Bars rows={pipeline} />
        </Box>
        <Box title="Inbox" right={<MoreLink href={withDrawer(url, { d: "inbox", ch: "all" })}>Open</MoreLink>}>
          <div className="mb-2.5 grid grid-cols-3 gap-2">
            {INBOX_CHANNELS.slice(1, 4).map((channel) => (
              <Link key={channel.key} href={withDrawer(url, { d: "inbox", ch: channel.key })} scroll={false} className="rounded-xl border border-line p-2.5 hover:border-brand/30">
                <span className={`grid h-7 w-7 place-items-center rounded-lg ${TONE[channel.tone]}`}>
                  <CIcon name={channel.icon} size={15} />
                </span>
                <div className="mt-1.5 text-lg font-extrabold">{waiting[channel.key]}</div>
                <div className="truncate text-[11px] font-semibold text-ink-muted">{channel.label}</div>
              </Link>
            ))}
          </div>
          {convs
            .filter((row) => row.waiting)
            .slice(0, 3)
            .map((row) => (
              <Row key={row.key} href={withDrawer(url, { d: "inbox", ch: row.channel, c: row.key })} lead={<ChannelIcon channel={row.channel} />} title={row.name} sub={row.last} right={<span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1.5 text-[10.5px] font-extrabold text-white">{row.waiting}</span>} />
            ))}
          {waiting.all === 0 ? <Empty>Every chat has a reply.</Empty> : null}
        </Box>
        <Box title="Cases by hospital" right={<MoreLink href="/admin/hospitals">Catalogue</MoreLink>}>
          {hospitals.length ? <Bars rows={hospitals.map(([label, value]) => ({ label, value }))} /> : <Empty>No case has a hospital yet.</Empty>}
        </Box>
      </div>
    </ConsoleShell>
  );
}
