import { redirect } from "next/navigation";
import { LogoStacked } from "@/components/Logo";
import { isAuthenticated } from "@/lib/auth";
import { loginAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAuthenticated()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card w-full max-w-sm p-7 shadow-xl shadow-ink/5">
        <LogoStacked className="h-20" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">Homepage control panel</h1>
        <p className="mt-1.5 text-sm text-ink-soft">Sign in to publish homepage content.</p>

        {error ? (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            That password was not recognised.
          </p>
        ) : null}

        <form action={loginAction} className="mt-5 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">Password</span>
            <input
              type="password"
              name="password"
              required
              autoFocus
              autoComplete="current-password"
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint"
            />
          </label>
          <button type="submit" className="btn btn-primary w-full">
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
