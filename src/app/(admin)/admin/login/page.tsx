import { redirect } from "next/navigation";
import { LogoStacked } from "@/components/Logo";
import { isAuthenticated } from "@/lib/auth";
import { deskActor } from "@/lib/desk";
import { loginAction } from "../actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  "1": "That ID and password do not match a Shifain team login.",
  slow: "Too many tries. Wait a few minutes and try again.",
};

/** The team's sign-in: the owner with the admin ID, a coordinator with their email. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAuthenticated()) redirect("/admin");
  const actor = await deskActor().catch(() => null);
  if (actor?.kind === "coordinator") redirect("/coordinator");
  const { error } = await searchParams;
  const message = error ? ERRORS[error] ?? ERRORS["1"] : null;
  const field =
    "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint";
  const label = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card w-full max-w-sm p-7 shadow-xl shadow-ink/5">
        <LogoStacked className="h-20" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">Shifain team sign-in</h1>
        <p className="mt-1.5 text-sm text-ink-soft">For the owner and care coordinators.</p>

        {message ? (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {message}
          </p>
        ) : null}

        <form action={loginAction} className="mt-5 space-y-4">
          <label className="block">
            <span className={label}>Admin ID or coordinator email</span>
            <input type="text" name="id" required autoFocus autoComplete="username" autoCapitalize="none" spellCheck={false} className={field} />
          </label>
          <label className="block">
            <span className={label}>Password</span>
            <input type="password" name="password" required autoComplete="current-password" className={field} />
          </label>
          <button type="submit" className="btn btn-primary w-full">
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
