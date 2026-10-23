import { redirect } from "next/navigation";
import { LogoMark } from "@/components/Logo";
import { deskActor } from "@/lib/desk";
import { coordinatorLoginAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function CoordinatorLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const actor = await deskActor().catch(() => null);
  if (actor?.kind === "coordinator") redirect("/coordinator");
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <form action={coordinatorLoginAction} className="card w-full max-w-sm p-6">
        <LogoMark className="h-12" />
        <h1 className="mt-4 text-2xl font-extrabold text-ink">Coordinator desk</h1>
        <p className="mt-1 text-sm text-ink-soft">Your patients, their queries and their trip.</p>
        {error ? (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            That email and password do not match a coordinator login.
          </p>
        ) : null}
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft">Email</span>
          <input name="email" type="email" required autoComplete="username" className="w-full rounded-lg border border-line px-3 py-2.5 text-sm" />
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft">Password</span>
          <input name="password" type="password" required autoComplete="current-password" className="w-full rounded-lg border border-line px-3 py-2.5 text-sm" />
        </label>
        <button className="btn btn-primary mt-5 w-full">Sign in</button>
        <p className="mt-3 text-xs text-ink-muted">Logins are created by the owner under Partner logins, with the coordinator role.</p>
      </form>
    </main>
  );
}
