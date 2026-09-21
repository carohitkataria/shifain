import { AdminIcon } from "./AdminIcon";

export const adminField =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint";
export const adminLabel =
  "mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft";

const TONE: Record<string, string> = {
  good: "bg-leaf/10 text-leaf",
  busy: "bg-brand-tint text-brand-deep",
  warn: "bg-saffron/15 text-saffron",
  quiet: "bg-surface-muted text-ink-soft",
  bad: "bg-red-50 text-red-700",
};

/** Where a record sits in its own lifecycle, coloured so a list scans. */
export function Stage({ value, tone = "quiet" }: { value: string; tone?: keyof typeof TONE }) {
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${TONE[tone]}`}>
      {value}
    </span>
  );
}

/**
 * A "?" that reveals its help on hover, so guidance is there when wanted
 * without a paragraph taking up room on every screen.
 */
export function Hint({ text }: { text: string }) {
  return (
    <span className="group relative ml-1.5 inline-flex shrink-0 align-middle">
      <span
        aria-hidden="true"
        className="flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-surface-muted text-[10px] font-bold text-ink-soft ring-1 ring-line"
      >
        ?
      </span>
      <span className="sr-only">{text}</span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-6 z-30 w-60 rounded-lg bg-ink px-3 py-2 text-xs font-medium normal-case leading-relaxed tracking-normal text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

export function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6">
      <h2 className="flex items-center font-extrabold text-ink">
        {title}
        {hint ? <Hint text={hint} /> : null}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="card p-6 leading-relaxed text-ink-soft">{children}</p>;
}

export function NotConfigured() {
  return (
    <p className="mb-6 flex gap-2 rounded-lg bg-saffron/15 px-3.5 py-2.5 text-sm font-semibold text-ink">
      <AdminIcon name="sliders" className="mt-0.5 h-4 w-4 shrink-0" />
      MONGODB_URI is not set on this deployment, so nothing here can be read or written yet.
    </p>
  );
}

export function Saved({ what }: { what?: string }) {
  return (
    <p role="status" className="mb-6 rounded-lg bg-leaf-tint px-4 py-2.5 text-sm font-bold text-leaf">
      {what ? `Saved — ${what}.` : "Saved."}
    </p>
  );
}

export function Warn({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mb-6 rounded-lg bg-saffron/15 px-3.5 py-2.5 text-sm font-semibold text-ink">
      {children}
    </p>
  );
}
