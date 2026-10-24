import Link from "next/link";
import { redirect } from "next/navigation";
import { ConsoleShell, consoleUrl } from "@/components/console/ConsoleShell";
import { CIcon } from "@/components/console/CIcon";
import { Av, Box, CARE_KIND, Chip, Empty, FChip, Pill, Row, Seg, StatePill, TableWrap, btn, field, initialsOf, td, th } from "@/components/console/ui";
import { NotConfigured } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { addDays, allCases, careEvents, consoleProviders, isHere } from "@/lib/console";
import { withDrawer } from "@/lib/console-url";
import { deskRideAction } from "@/lib/desk-actions";
import { indiaToday } from "@/lib/patient-app";

export const dynamic = "force-dynamic";

const FILTERS: [string, string, string][] = [
  ["all", "All", "grid"],
  ["arrival", "Arrivals", "plane"],
  ["ride", "Rides", "car"],
  ["hospital", "Hospital", "hospital"],
  ["departure", "Departures", "plane"],
];

/** Everything happening on the ground, by the hour: arrivals, cars, hospital visits, departures. */
export default async function CareDeskPage({ searchParams }: { searchParams: Promise<{ day?: string; f?: string }> }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { day: rawDay, f = "all" } = await searchParams;
  const day = rawDay === "1" ? 1 : 0;
  const date = addDays(indiaToday(), day);
  const [url, events, cases, providers] = await Promise.all([consoleUrl(), careEvents(date), allCases(), consoleProviders()]);
  const shown = events.filter((event) => f === "all" || event.kind === f);
  const here = cases.filter((record) => isHere(record));
  const drivers = providers.filter((item) => item.kind === "driver" && item.active);
  const phoneOf = new Map(cases.map((record) => [record._id, record.patient.phone]));
  const base = (patch: { day?: number; f?: string }) => {
    const next = { day, f, ...patch };
    const params = new URLSearchParams();
    if (next.day) params.set("day", String(next.day));
    if (next.f && next.f !== "all") params.set("f", next.f);
    return params.toString() ? `/admin/care?${params}` : "/admin/care";
  };

  return (
    <ConsoleShell
      title="Care desk"
      sub="Everything happening on the ground, by the hour"
      right={
        <>
          <Seg
            label="Day"
            items={[
              { label: "Today", href: base({ day: 0 }), on: day === 0 },
              { label: "Tomorrow", href: base({ day: 1 }), on: day === 1 },
            ]}
          />
          <Link href={withDrawer(url, { d: "ride" })} scroll={false} className={btn.primary}>
            <CIcon name="car" size={16} />
            Book a ride
          </Link>
        </>
      }
    >
      {!isDatabaseConfigured() && <NotConfigured />}
      <div className="mb-3.5 flex flex-wrap gap-2.5">
        {FILTERS.map(([key, name, icon]) => (
          <FChip key={key} label={name} icon={icon} href={base({ f: key })} on={f === key} count={key === "all" ? events.length : events.filter((event) => event.kind === key).length} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <TableWrap>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {["Time", "What", "Patient", "Where", "Assigned", "Status", ""].map((name) => (
                  <th key={name} className={th}>
                    {name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((event) => (
                <tr key={event.id} className="hover:bg-[#fafafd]">
                  <td className={td}>
                    <b>{event.time ?? "—"}</b>
                  </td>
                  <td className={td}>
                    <span className="flex items-center gap-2.5">
                      <Chip icon={CARE_KIND[event.kind][0]} tone={CARE_KIND[event.kind][1]} small />
                      <b>{event.title}</b>
                    </span>
                  </td>
                  <td className={td}>
                    <Link href={withDrawer(url, { d: "case", ref: event.caseRef, tab: "schedule" })} scroll={false} className="flex items-center gap-2.5">
                      <Av text={initialsOf(event.patient)} size="sm" />
                      <span>
                        <b className="block hover:text-brand">{event.patient}</b>
                        <small className="text-xs text-ink-muted">{event.locale.toUpperCase()}</small>
                      </span>
                    </Link>
                  </td>
                  <td className={`${td} max-w-[200px] truncate text-ink-muted`}>{event.where ?? "—"}</td>
                  <td className={td}>
                    {event.state === "unassigned" && event.rideId ? (
                      <form action={deskRideAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="reference" value={event.caseRef} />
                        <input type="hidden" name="id" value={event.rideId} />
                        <input type="hidden" name="status" value="assigned" />
                        <input type="hidden" name="back" value={url} />
                        <select name="driverId" required aria-label="Driver" className={`${field} !h-8 !w-32 !text-xs`}>
                          {drivers.map((item) => (
                            <option key={item._id} value={item._id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                        <button className={`${btn.danger} ${btn.sm}`} disabled={!drivers.length}>
                          Assign
                        </button>
                      </form>
                    ) : (
                      (event.assigned ?? "—")
                    )}
                  </td>
                  <td className={td}>
                    <StatePill state={event.state} />
                  </td>
                  <td className={td}>
                    <span className="flex gap-1">
                      <a href={`tel:${(phoneOf.get(event.caseRef) ?? "").replace(/[^\d+]/g, "")}`} aria-label={`Call ${event.patient}`} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted">
                        <CIcon name="phone" size={16} />
                      </a>
                      <Link href={withDrawer(url, { d: "case", ref: event.caseRef, tab: "messages" })} scroll={false} aria-label={`Message ${event.patient}`} className="grid h-8 w-8 place-items-center rounded-lg text-ink-muted hover:bg-surface-muted">
                        <CIcon name="msg" size={16} />
                      </Link>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 ? <Empty>Nothing scheduled {day ? "tomorrow" : "today"}.</Empty> : null}
        </TableWrap>

        <Box title="Patients here now" right={<Pill tone="sky">{here.length}</Pill>}>
          {here.length === 0 ? <Empty>Nobody has arrived yet.</Empty> : null}
          {here.map((record) => (
            <Row key={record._id} href={withDrawer(url, { d: "case", ref: record._id })} lead={<Av text={initialsOf(record.patient.name)} />} title={record.patient.name} sub={`${record.statedNeed ?? "Treatment"} · ${record.care?.room ? `room ${record.care.room}` : record.patient.country}`} right={<CIcon name="chev-r" size={16} className="text-ink-muted" />} />
          ))}
        </Box>
      </div>
    </ConsoleShell>
  );
}
