import Link from "next/link";
import { redirect } from "next/navigation";
import { deskActor } from "@/lib/desk";
import { casesForCoordinator, portalMessages } from "@/lib/journey";
import { arrivalDate, todoList } from "@/lib/journey-rules";
import { CoordinatorShell } from "./CoordinatorShell";

export const dynamic = "force-dynamic";

/** A coordinator's patients: who is waiting on them first. */
export default async function CoordinatorHome() {
  const actor = await deskActor();
  if (!actor || actor.kind !== "coordinator") redirect("/coordinator/login");
  const cases = await casesForCoordinator(actor.user._id);
  const rows = await Promise.all(
    cases.map(async (record) => {
      const messages = await portalMessages(record._id);
      const lastOut = [...messages].reverse().find((message) => message.direction === "outbound")?.createdAt ?? "";
      const unread = messages.filter((message) => message.direction === "inbound" && message.createdAt > lastOut).length;
      const open = todoList(record).filter((item) => item.owner === "desk").length;
      return { record, unread, open, arrival: arrivalDate(record) };
    }),
  );
  rows.sort((a, b) => b.unread + b.open - (a.unread + a.open) || (a.arrival ?? "9").localeCompare(b.arrival ?? "9"));

  return (
    <CoordinatorShell name={actor.name} title="My patients">
      {rows.length === 0 ? (
        <p className="card p-5 text-sm text-ink-soft">No patients are assigned to you yet. The owner assigns cases from each case&rsquo;s care desk.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ record, unread, open, arrival }) => (
            <li key={record._id}>
              <Link href={`/coordinator/${record._id}`} className="card link-card block p-4">
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate font-extrabold text-ink">{record.patient.name}</span>
                    <span className="block truncate text-sm text-ink-soft">
                      {record.patient.country} · {record.statedNeed || "—"}
                    </span>
                  </span>
                  <span className="flex flex-none gap-1">
                    {unread ? <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">{unread} new</span> : null}
                    {open ? <span className="rounded-full bg-saffron-tint px-2 py-0.5 text-xs font-bold text-saffron">{open} open</span> : null}
                  </span>
                </span>
                <span className="mt-2 block text-xs text-ink-muted">
                  {record._id} · {arrival ? `arrives ${arrival}` : "arrival not booked"} · {record.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </CoordinatorShell>
  );
}
