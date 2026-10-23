import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { coordinatorLogoutAction } from "./actions";

/** The coordinator's own frame: their name, their patients, sign out. Works on a phone. */
export function CoordinatorShell({ name, title, back, children }: { name: string; title: string; back?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          {back ? (
            <Link href={back} className="rounded-lg px-2 py-1 text-sm font-bold text-brand hover:bg-brand-tint" aria-label="Back to my patients">
              ←
            </Link>
          ) : (
            <LogoMark className="h-8 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold text-ink">{title}</p>
            <p className="truncate text-xs text-ink-muted">Coordinator · {name}</p>
          </div>
          <form action={coordinatorLogoutAction}>
            <button className="rounded-lg px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-surface-muted">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
    </div>
  );
}
