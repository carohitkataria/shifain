import Link from "next/link";
import { CIcon } from "./CIcon";

/**
 * The console's building blocks, in the site's own tokens (brand violet, leaf,
 * saffron, ink) with Tailwind's palette for the extra chip colours. Server
 * components throughout: anything interactive is a link or a form.
 */

export type Tone = "brand" | "teal" | "amber" | "rose" | "sky" | "green" | "red" | "grey" | "wa" | "tg";

export const TONE: Record<Tone, string> = {
  brand: "bg-brand-tint text-brand",
  teal: "bg-teal-50 text-teal-700",
  amber: "bg-saffron-tint text-[#b5650d]",
  rose: "bg-rose-50 text-rose-600",
  sky: "bg-sky-50 text-sky-700",
  green: "bg-leaf-tint text-leaf",
  red: "bg-red-50 text-red-600",
  grey: "bg-surface-muted text-ink-muted",
  wa: "bg-emerald-50 text-emerald-600",
  tg: "bg-sky-50 text-[#229ED9]",
};

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

/** The page heading: a title, a line under it, and the page's own controls on the right. */
export function Greet({ title, sub, right }: { title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-2xl font-extrabold tracking-tight text-ink [&_b]:text-brand">{title}</h2>
        {sub ? <div className="mt-0.5 text-[13px] text-ink-muted">{sub}</div> : null}
      </div>
      {right ? <div className="flex flex-wrap items-center gap-2.5">{right}</div> : null}
    </div>
  );
}

export function Chip({ icon, tone = "brand", small = false }: { icon: string; tone?: Tone; small?: boolean }) {
  return (
    <span className={cx("grid shrink-0 place-items-center", small ? "h-[30px] w-[30px] rounded-[9px]" : "h-9 w-9 rounded-[10px]", TONE[tone])}>
      <CIcon name={icon} size={small ? 16 : 20} />
    </span>
  );
}

export function Pill({ tone = "grey", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={cx("inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-bold", TONE[tone])}>{children}</span>;
}

export function Av({ text, size = "md", tone = "brand" }: { text: string; size?: "sm" | "md" | "lg"; tone?: Tone }) {
  const dim = size === "sm" ? "h-[26px] w-[26px] text-[10px]" : size === "lg" ? "h-[52px] w-[52px] text-[17px]" : "h-[34px] w-[34px] text-xs";
  return <span className={cx("grid shrink-0 place-items-center rounded-full font-extrabold", dim, TONE[tone])}>{text || "—"}</span>;
}

export const initialsOf = (name: string) =>
  name
    .replace(/^(dr|mr|mrs|ms)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export function Kpi({ icon, tone, value, label, trend, href }: { icon: string; tone: Tone; value: React.ReactNode; label: string; trend?: { dir: "up" | "down" | "flat"; text: string } | null; href?: string }) {
  const body = (
    <>
      <div className="mb-3 flex items-center justify-between">
        <Chip icon={icon} tone={tone} />
        {trend ? <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-bold", trend.dir === "up" ? TONE.green : trend.dir === "down" ? TONE.rose : TONE.grey)}>{trend.text}</span> : null}
      </div>
      <div className="text-2xl font-extrabold tracking-tight text-ink">{value}</div>
      <div className="mt-0.5 text-xs font-semibold text-ink-muted">{label}</div>
    </>
  );
  const cls = "flex flex-col rounded-2xl border border-line bg-white p-4 text-left shadow-[0_1px_2px_rgba(30,32,50,.04),0_6px_20px_rgba(30,32,50,.05)] transition";
  return href ? (
    <Link href={href} className={cx(cls, "hover:-translate-y-0.5 hover:shadow-lg")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Box({ title, right, children, className }: { title?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx("min-w-0 rounded-2xl border border-line bg-white p-[18px] shadow-[0_1px_2px_rgba(30,32,50,.04),0_6px_20px_rgba(30,32,50,.05)]", className)}>
      {title || right ? (
        <div className="mb-3 flex items-center justify-between gap-2.5">
          {title ? <h3 className="text-[15px] font-extrabold text-ink">{title}</h3> : <span />}
          {right}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-0.5 text-[12.5px] font-bold text-brand hover:underline">
      {children}
      <CIcon name="chev-r" size={16} />
    </Link>
  );
}

/** One row in a panel list. */
export function Row({ lead, title, sub, right, href }: { lead?: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; href?: string }) {
  const inner = (
    <>
      {lead}
      <div className="min-w-0 flex-1">
        <b className="block truncate text-[13.5px] font-bold text-ink group-hover:text-brand">{title}</b>
        {sub ? <small className="block truncate text-xs text-ink-muted">{sub}</small> : null}
      </div>
      {right}
    </>
  );
  const cls = "group flex w-full items-center gap-3 border-b border-surface-muted py-2.5 text-left last:border-b-0";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function Bars({ rows, max }: { rows: { label: string; value: number; color?: string; suffix?: string }[]; max?: number }) {
  const top = max ?? Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[110px_1fr_44px] items-center gap-2.5 text-[12.5px] font-semibold">
          <span className="truncate text-ink-soft">{row.label}</span>
          <span className="h-2.5 overflow-hidden rounded-md bg-surface-muted">
            <i className="block h-full rounded-md" style={{ width: `${Math.max(row.value ? 6 : 0, (row.value / top) * 100)}%`, background: row.color ?? "var(--color-brand)" }} />
          </span>
          <span className="text-right text-ink-muted">
            {row.value}
            {row.suffix ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}

/** A segmented control of links. */
export function Seg({ items, label }: { items: { label: React.ReactNode; href: string; on: boolean; icon?: string }[]; label?: string }) {
  return (
    <div className="inline-flex rounded-[11px] border border-line bg-white p-[3px]" role="group" aria-label={label}>
      {items.map((item) => (
        <Link key={item.href} href={item.href} aria-current={item.on ? "page" : undefined} className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition", item.on ? "bg-brand text-white" : "text-ink-muted hover:text-ink")}>
          {item.icon ? <CIcon name={item.icon} size={16} /> : null}
          {item.label}
        </Link>
      ))}
    </div>
  );
}

/** Tabs under a page heading; each one a page or a view of it. */
export function Tabs({ items }: { items: { label: string; href: string; on: boolean; count?: number | null; muted?: number | null }[] }) {
  return (
    <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-line" aria-label="Sections">
      {items.map((item) => (
        <Link key={item.href} href={item.href} aria-current={item.on ? "page" : undefined} className={cx("-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-[13.5px] font-bold transition", item.on ? "border-brand text-brand" : "border-transparent text-ink-muted hover:text-ink")}>
          {item.label}
          {item.count ? <span className="rounded-full bg-rose-500 px-1.5 text-[11px] text-white">{item.count}</span> : null}
          {item.muted != null ? <span className="font-semibold text-ink-muted">{item.muted}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

export function FChip({ label, href, on, count, icon }: { label: string; href: string; on: boolean; count?: number; icon?: string }) {
  return (
    <Link href={href} aria-current={on ? "page" : undefined} className={cx("inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[12.5px] font-semibold transition", on ? "border-brand/25 bg-brand-tint text-brand" : "border-line bg-white text-ink-soft hover:border-brand/25")}>
      {icon ? <CIcon name={icon} size={16} /> : null}
      {label}
      {count != null ? <span className={cx("rounded-[10px] px-1.5 text-[11px]", on ? "bg-white text-brand" : "bg-surface-muted text-ink-muted")}>{count}</span> : null}
    </Link>
  );
}

export function Note({ tone = "amber", icon = "info", children }: { tone?: Tone; icon?: string; children: React.ReactNode }) {
  return (
    <div className={cx("flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold", TONE[tone])}>
      <CIcon name={icon} size={16} />
      <div className="min-w-0 flex-1 text-ink">{children}</div>
    </div>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(30,32,50,.04),0_6px_20px_rgba(30,32,50,.05)]">{children}</div>;
}

export const th = "whitespace-nowrap border-b border-line bg-[#fafafd] px-3.5 py-2.5 text-left text-[11.5px] font-bold text-ink-muted";
export const td = "whitespace-nowrap border-b border-surface-muted px-3.5 py-2.5 align-middle text-[13px]";

export const btn = {
  primary: "inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-[11px] bg-brand px-4 text-[13px] font-bold text-white transition hover:bg-brand-deep",
  ghost: "inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-[11px] border border-line bg-white px-4 text-[13px] font-bold text-ink transition hover:border-brand/30 hover:text-brand",
  soft: "inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-[11px] bg-brand-tint px-4 text-[13px] font-bold text-brand transition hover:bg-brand/15",
  danger: "inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-[11px] bg-red-50 px-4 text-[13px] font-bold text-red-600 transition hover:bg-red-100",
  ok: "inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-[11px] bg-leaf-tint px-4 text-[13px] font-bold text-leaf transition hover:bg-leaf/15",
  sm: "!h-8 !rounded-[9px] !px-3 !text-xs",
};

export const field = "h-10 w-full rounded-[11px] border border-line bg-white px-3 text-[13.5px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-tint";
export const area = "min-h-[96px] w-full rounded-[11px] border border-line bg-white px-3 py-2.5 text-[13.5px] text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand-tint";
export const label = "mb-3 block text-[12px] font-bold text-ink-soft [&>input]:mt-1.5 [&>select]:mt-1.5 [&>textarea]:mt-1.5";

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="p-6 text-center text-[13px] text-ink-muted">{children}</p>;
}

/** Where something on the ground stands right now. */
export function StatePill({ state }: { state: "done" | "now" | "next" | "unassigned" }) {
  return state === "done" ? <Pill tone="green">Done</Pill> : state === "now" ? <Pill tone="amber">Now</Pill> : state === "unassigned" ? <Pill tone="red">Unassigned</Pill> : <Pill tone="grey">Next</Pill>;
}

/** The icon and colour for each kind of thing on the ground. */
export const CARE_KIND: Record<string, [string, Tone]> = {
  arrival: ["plane", "sky"],
  ride: ["car", "amber"],
  hospital: ["hospital", "rose"],
  departure: ["plane", "teal"],
  stay: ["bed", "brand"],
  other: ["calendar", "grey"],
};
