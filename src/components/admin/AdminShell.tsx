import Link from "next/link";
import { LogoMark } from "../Logo";
import { AdminNav } from "./AdminNav";
import { AdminIcon } from "./AdminIcon";
import { logoutAction } from "@/app/(admin)/admin/actions";

export function AdminShell({
  title,
  subtitle,
  action,
  fullWidth,
  children,
}: {
  title: string;
  subtitle?: string;
  /** The page's primary save button, sat beside the title. */
  action?: React.ReactNode;
  fullWidth?: boolean;
  children: React.ReactNode;
}) {
  const brand = (
    <Link href="/admin" className="flex items-center gap-3">
      <LogoMark className="h-10 w-10 shrink-0" title="ShifaIn" />
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-base font-extrabold tracking-tight text-ink">ShifaIn</span>
        <span className="block text-[0.7rem] font-bold uppercase tracking-[0.14em] text-brand">
          Owner console
        </span>
      </span>
    </Link>
  );

  const actions = (
    <div className="flex items-center gap-1">
      <Link
        href="/"
        target="_blank"
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft transition hover:bg-surface-muted hover:text-ink"
      >
        <AdminIcon name="link" />
        <span className="hidden sm:inline">View site</span>
      </Link>
      <form action={logoutAction}>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft transition hover:bg-surface-muted hover:text-ink"
        >
          <AdminIcon name="exit" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-muted lg:flex">
      <AdminNav brand={brand} actions={actions} />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 hidden border-b border-line bg-white lg:block">
          <div className="flex items-center justify-between gap-4 px-6 py-3">
            {brand}
            {actions}
          </div>
        </header>

        <main className={`mx-auto px-4 py-10 sm:px-6 ${fullWidth ? "max-w-7xl" : "max-w-4xl"}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 basis-64">
              <h1 className="text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
              {subtitle ? <p className="mt-1.5 leading-relaxed text-ink-soft">{subtitle}</p> : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>

          <div className="mt-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="mb-6 rounded-lg bg-leaf-tint px-4 py-2.5 text-sm font-bold text-leaf">
      {children}
    </p>
  );
}

/**
 * The page's primary action — the pill beside the page title. It submits a
 * form it is not inside, via the `form` attribute, so the button can sit in
 * the header while the fields live further down the page.
 */
export function SaveButton({ form, children }: { form: string; children: React.ReactNode }) {
  return (
    <button type="submit" form={form} className="btn btn-primary !rounded-full !px-7 shadow-lg shadow-brand/25">
      {children}
    </button>
  );
}
