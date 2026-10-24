import Link from "next/link";
import { redirect } from "next/navigation";
import { ConsoleShell, consoleUrl } from "@/components/console/ConsoleShell";
import { CIcon } from "@/components/console/CIcon";
import { ChannelIcon } from "@/components/console/drawers";
import { RowCheck, SelectAll } from "@/components/console/client";
import { Av, Empty, FChip, Pill, Seg, TableWrap, btn, field, td, th, type Tone } from "@/components/console/ui";
import { NotConfigured, Saved } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { BOARD, STATUSES, STATUS_LABEL, caseRows, consoleCoordinators, type CaseRow } from "@/lib/console";
import { withDrawer } from "@/lib/console-url";
import { bulkCasesAction } from "../console-actions";

export const dynamic = "force-dynamic";

type Query = { view?: string; f?: string; q?: string; status?: string; country?: string; from?: string; to?: string; sort?: string; saved?: string };

const SOURCES = ["Website", "Web chat", "Telegram", "Partner", "Desk"];

const STATUS_TONE: Record<string, Tone> = { new: "brand", planning: "sky", planned: "teal", "plan-failed": "red", confirmed: "amber", closed: "grey" };

const ago = (iso: string) => {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h`;
  return `${Math.round(mins / 1440)} d`;
};

/** Every case: a board by stage, or a list to filter, tick and act on together. */
export default async function CasesPage({ searchParams }: { searchParams: Promise<Query> }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const sp = await searchParams;
  const [url, rows, coords] = await Promise.all([consoleUrl(), caseRows(), consoleCoordinators()]);
  const view = sp.view === "list" || (sp.q && sp.view !== "board") ? "list" : "board";
  const q = (sp.q ?? "").trim().toLowerCase();
  const f = sp.f ?? "all";
  const status = STATUSES.includes(sp.status as never) ? sp.status : "";
  const country = (sp.country ?? "").trim();
  const from = (sp.from ?? "").trim();
  const to = (sp.to ?? "").trim();

  let list = rows.filter((row) => {
    if (f === "unassigned" && row.coordinatorId) return false;
    if (SOURCES.includes(f) && row.source !== f) return false;
    if (q && !`${row.name} ${row.id} ${row.treatment} ${row.hospital ?? ""} ${row.country}`.toLowerCase().includes(q)) return false;
    if (status && row.status !== status) return false;
    if (country && row.country !== country) return false;
    if (from && row.updatedAt.slice(0, 10) < from) return false;
    if (to && row.updatedAt.slice(0, 10) > to) return false;
    return true;
  });
  if (sp.sort === "oldest") list = [...list].reverse();

  const link = (patch: Partial<Query>) => {
    const params = new URLSearchParams();
    const next = { view, f, q: sp.q, status, country, from, to, sort: sp.sort, ...patch };
    for (const [key, value] of Object.entries(next)) if (value && !(key === "f" && value === "all") && !(key === "view" && value === "board")) params.set(key, String(value));
    const query = params.toString();
    return query ? `/admin/cases?${query}` : "/admin/cases";
  };
  const open = (row: CaseRow) => withDrawer(url, { d: "case", ref: row.id });
  const countries = [...new Set(rows.map((row) => row.country).filter(Boolean))].sort();
  const coordInitials = (row: CaseRow) => (row.coordinator ? row.coordinator.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() : "—");

  return (
    <ConsoleShell
      title="Cases"
      sub={`${rows.filter((row) => row.status !== "closed").length} open · ${rows.filter((row) => !row.coordinatorId && row.status !== "closed").length} unassigned`}
      right={
        <>
          <Seg
            label="View"
            items={[
              { label: "Board", href: link({ view: "board" }), on: view === "board", icon: "kanban" },
              { label: "List", href: link({ view: "list" }), on: view === "list", icon: "list" },
            ]}
          />
          <Link href={withDrawer(url, { d: "new-case" })} scroll={false} className={btn.primary}>
            <CIcon name="plus" size={16} />
            New case
          </Link>
        </>
      }
    >
      {!isDatabaseConfigured() && <NotConfigured />}
      {sp.saved === "deleted" ? <Saved what="case removed" /> : sp.saved ? <Saved /> : null}

      <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
        <form action="/admin/cases" className="flex h-[38px] min-w-[220px] items-center gap-2 rounded-[11px] border border-line bg-white px-3 text-ink-muted">
          <input type="hidden" name="view" value="list" />
          <CIcon name="search" size={16} />
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Name, case no., treatment" aria-label="Search cases" className="w-full bg-transparent text-[13px] text-ink outline-none" />
        </form>
        <FChip label="All sources" href={link({ f: "all" })} on={f === "all"} count={rows.length} />
        <FChip label="Unassigned" href={link({ f: "unassigned" })} on={f === "unassigned"} count={rows.filter((row) => !row.coordinatorId && row.status !== "closed").length} />
        {SOURCES.map((source) => (
          <FChip key={source} label={source} href={link({ f: source })} on={f === source} count={rows.filter((row) => row.source === source).length} />
        ))}
      </div>

      {view === "board" ? (
        <div className="grid auto-cols-[minmax(250px,1fr)] grid-flow-col gap-3.5 overflow-x-auto pb-2">
          {BOARD.map((column) => {
            const items = list.filter((row) => row.board === column.key);
            return (
              <section key={column.key} aria-label={column.label} className="flex min-h-[300px] flex-col gap-2.5 rounded-2xl bg-[#efeff6] p-2.5">
                <div className="flex items-center gap-2 px-1 pb-1.5 pt-1 text-[13px] font-extrabold">
                  <i className="block h-2 w-2 rounded-full" style={{ background: column.color }} />
                  {column.label}
                  <span className="ml-auto text-[11.5px] font-bold text-ink-muted">{items.length}</span>
                </div>
                {items.map((row) => (
                  <Link key={row.id} href={open(row)} scroll={false} className={`flex flex-col gap-2 rounded-xl border border-line bg-white p-3 text-left shadow-[0_1px_2px_rgba(30,32,50,.04)] transition hover:border-brand/30 hover:shadow-md ${row.flag ? "border-l-[3px] border-l-red-500" : ""}`}>
                    <div className="flex items-center gap-2">
                      <Av text={row.initials} size="sm" />
                      <b className="min-w-0 flex-1 truncate text-[13.5px]">{row.name}</b>
                      {row.waiting ? <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1.5 text-[10.5px] font-extrabold text-white">{row.waiting}</span> : null}
                    </div>
                    <div className="truncate text-xs text-ink-muted">
                      {row.treatment}
                      {row.hospital ? ` · ${row.hospital}` : ""}
                    </div>
                    <div className={`text-xs font-semibold ${row.flag ? "text-red-600" : "text-ink-soft"}`}>{row.next}</div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {row.channel ? <ChannelIcon channel={row.channel} /> : null}
                      <Pill>{row.country || "—"}</Pill>
                      {row.doctorChange ? <Pill tone="brand">Doctor change</Pill> : null}
                      {row.callRequest ? <Pill tone="amber">Call request</Pill> : null}
                      <span className="ml-auto" title={row.coordinator ?? "Unassigned"}>
                        <Av text={coordInitials(row)} size="sm" tone={row.coordinator ? "brand" : "grey"} />
                      </span>
                    </div>
                  </Link>
                ))}
                {items.length === 0 ? <p className="p-3.5 text-[12.5px] text-ink-muted">Nothing here</p> : null}
              </section>
            );
          })}
        </div>
      ) : (
        <>
          <details className="mb-3 rounded-2xl border border-line bg-white p-3.5" open={Boolean(status || country || from || to || sp.sort)}>
            <summary className="cursor-pointer text-[13px] font-bold text-ink-soft">More filters</summary>
            <form action="/admin/cases" className="mt-3 flex flex-wrap items-end gap-3">
              <input type="hidden" name="view" value="list" />
              {f !== "all" ? <input type="hidden" name="f" value={f} /> : null}
              {sp.q ? <input type="hidden" name="q" value={sp.q} /> : null}
              <label className="text-xs font-bold text-ink-soft">
                Stage
                <select name="status" defaultValue={status} className={`${field} mt-1 !w-44`}>
                  <option value="">Any stage</option>
                  {STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {STATUS_LABEL[item]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-ink-soft">
                Country
                <select name="country" defaultValue={country} className={`${field} mt-1 !w-44`}>
                  <option value="">Any country</option>
                  {countries.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-ink-soft">
                Updated from
                <input type="date" name="from" defaultValue={from} className={`${field} mt-1`} />
              </label>
              <label className="text-xs font-bold text-ink-soft">
                to
                <input type="date" name="to" defaultValue={to} className={`${field} mt-1`} />
              </label>
              <label className="text-xs font-bold text-ink-soft">
                Sort
                <select name="sort" defaultValue={sp.sort ?? ""} className={`${field} mt-1 !w-40`}>
                  <option value="">Latest activity</option>
                  <option value="oldest">Oldest activity</option>
                </select>
              </label>
              <button className={btn.primary}>Apply</button>
              <Link href={link({ status: "", country: "", from: "", to: "", sort: "" })} className={btn.ghost}>
                Clear
              </Link>
            </form>
          </details>

          <TableWrap>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={th}>
                    <SelectAll form="bulk" label="Select all" />
                  </th>
                  {["Patient", "Treatment", "Hospital", "Stage", "Coordinator", "Channel", "Quote", "Updated"].map((name) => (
                    <th key={name} className={th}>
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.id} className="hover:bg-[#fafafd]">
                    <td className={td}>
                      <RowCheck form="bulk" value={row.id} label={`Select ${row.name}`} />
                    </td>
                    <td className={td}>
                      <Link href={open(row)} scroll={false} className="flex items-center gap-2.5">
                        <Av text={row.initials} size="sm" />
                        <span>
                          <b className="block font-bold hover:text-brand">{row.name}</b>
                          <small className="block text-xs text-ink-muted">
                            {row.id.slice(0, 12)} · {row.country}
                          </small>
                        </span>
                      </Link>
                    </td>
                    <td className={`${td} max-w-[220px] truncate`}>{row.treatment}</td>
                    <td className={`${td} max-w-[200px] truncate`}>{row.hospital ?? "—"}</td>
                    <td className={td}>
                      <Pill tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Pill>
                    </td>
                    <td className={td}>{row.coordinator ?? <Pill tone="red">Unassigned</Pill>}</td>
                    <td className={td}>
                      <span className="inline-flex items-center gap-1.5">
                        {row.channel ? <ChannelIcon channel={row.channel} /> : "—"}
                        {row.waiting ? <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1.5 text-[10.5px] font-extrabold text-white">{row.waiting}</span> : null}
                      </span>
                    </td>
                    <td className={td}>{row.value != null ? `${row.currency === "USD" ? "$" : `${row.currency} `}${row.value.toLocaleString()}` : "—"}</td>
                    <td className={`${td} text-ink-muted`}>{ago(row.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 ? <Empty>No cases match this view.</Empty> : null}
          </TableWrap>

          <form id="bulk" action={bulkCasesAction}>
            <input type="hidden" name="back" value={url} />
            <div id="bulk-bar" hidden className="sticky bottom-20 mt-3 flex flex-wrap items-center gap-2.5 rounded-2xl bg-ink p-3 text-white shadow-lg md:bottom-4">
              <b className="flex-1 text-[13px]">
                <span id="bulk-count">0</span> selected
              </b>
              <select name="coordinatorId" aria-label="Coordinator" className="h-8 rounded-lg bg-white/10 px-2 text-xs text-white">
                <option value="">Unassigned</option>
                {coords.map((item) => (
                  <option key={item._id} value={item._id} className="text-ink">
                    {item.name}
                  </option>
                ))}
              </select>
              <button name="op" value="assign" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/15 px-3 text-xs font-bold hover:bg-white/25">
                <CIcon name="users" size={14} />
                Assign
              </button>
              <select name="status" aria-label="Stage" className="h-8 rounded-lg bg-white/10 px-2 text-xs text-white">
                {STATUSES.map((item) => (
                  <option key={item} value={item} className="text-ink">
                    {STATUS_LABEL[item]}
                  </option>
                ))}
              </select>
              <button name="op" value="stage" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/15 px-3 text-xs font-bold hover:bg-white/25">
                <CIcon name="route" size={14} />
                Move stage
              </button>
              <input name="message" placeholder="Message in the app" aria-label="Message" className="h-8 w-48 rounded-lg bg-white/10 px-2 text-xs text-white placeholder:text-white/60" />
              <button name="op" value="message" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/15 px-3 text-xs font-bold hover:bg-white/25">
                <CIcon name="send" size={14} />
                Message
              </button>
            </div>
          </form>
        </>
      )}
    </ConsoleShell>
  );
}
