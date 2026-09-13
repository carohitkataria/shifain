import Link from "next/link";
import { LogoMark } from "../Logo";
import { logoutAction } from "@/app/(admin)/admin/actions";

export function AdminShell({
  title,
  subtitle,
  back,
  children,
}: {
  title: string;
  subtitle?: string;
  back?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <LogoMark className="h-9 w-9" title="ShifaIn" />
            <span className="text-sm font-extrabold tracking-tight text-ink">Homepage control panel</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/" target="_blank" className="btn btn-secondary !px-3.5 !py-2 text-xs">
              View site
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="btn btn-secondary !px-3.5 !py-2 text-xs">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {back ? (
          <Link href={back.href} className="text-sm font-bold text-brand-deep hover:underline">
            &larr; {back.label}
          </Link>
        ) : null}
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1.5 text-ink-soft">{subtitle}</p> : null}
        <div className="mt-8">{children}</div>
      </main>
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
