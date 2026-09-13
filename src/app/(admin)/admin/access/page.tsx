import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured, readOr } from "@/lib/db";
import type { PartnerUser } from "@/lib/partner-auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { dismissPasswordAction, savePartnerAction, setPartnerStatusAction } from "./actions";
import { readGeneratedPassword } from "./flash";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft";

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { saved, error } = await searchParams;

  const users = await readOr<PartnerUser[]>([], (db) =>
    db.collection<PartnerUser>("partner_users").find({}).sort({ createdAt: -1 }).toArray(),
  );

  // Only a render here: the cookie is cleared by the Done button below, since
  // Next.js forbids writing a cookie while a page is rendering. It also expires
  // on its own within five minutes.
  const generated = await readGeneratedPassword();

  return (
    <AdminShell
      title="Partner logins"
      subtitle="Sign-ins for referring doctors, hospital desks and coordinators. A doctor signs in at /portal/doctor."
    >
      {!isDatabaseConfigured() && (
        <p className="mb-4 rounded-lg bg-saffron/15 px-3 py-2 text-sm font-semibold text-ink">
          MONGODB_URI is not set on this deployment, so logins cannot be created or read yet.
        </p>
      )}

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          Name, email and role are all required.
        </p>
      )}
      {saved && !generated && (
        <p className="mb-4 rounded-lg bg-leaf/10 px-3 py-2 text-sm font-semibold text-leaf">
          Login {saved}.
        </p>
      )}

      {generated && (
        <div className="mb-4 rounded-xl border-2 border-brand bg-brand-tint p-4">
          <p className="text-sm font-bold uppercase tracking-wider text-brand">
            Password for {generated.email}
          </p>
          <p className="mt-2 break-all font-mono text-lg font-bold text-ink">{generated.password}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Copy it now and send it over a channel you trust. It is stored only as a hash, so this
            is the one and only time it is shown. To change it, save the login again.
          </p>
          <form action={dismissPasswordAction} className="mt-3">
            <button type="submit" className="btn btn-secondary !py-2 text-sm">
              Done — hide this
            </button>
          </form>
        </div>
      )}

      <form action={savePartnerAction} className="card space-y-4 p-6">
        <h2 className="font-bold text-ink">Create or update a login</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block min-w-0">
            <span className={label}>Full name</span>
            <input type="text" name="name" required className={field} />
          </label>
          <label className="block min-w-0">
            <span className={label}>Email</span>
            <input type="email" name="email" required className={field} />
          </label>
          <label className="block min-w-0">
            <span className={label}>Role</span>
            <select name="role" className={field} defaultValue="doctor">
              <option value="doctor">Referring doctor</option>
              <option value="hospital">Hospital desk</option>
              <option value="coordinator">ShifaIn coordinator</option>
            </select>
          </label>
          <label className="block min-w-0">
            <span className={label}>Password (blank generates one)</span>
            <input type="text" name="password" autoComplete="off" className={field} />
          </label>
          <label className="block min-w-0">
            <span className={label}>Doctor record id (optional)</span>
            <input type="text" name="doctorId" placeholder="d-…" className={field} />
          </label>
          <label className="block min-w-0">
            <span className={label}>Hospital record id (optional)</span>
            <input type="text" name="hospitalId" placeholder="h-…" className={field} />
          </label>
        </div>
        <button type="submit" className="btn btn-primary">
          Save login
        </button>
        <p className="text-sm leading-relaxed text-ink-soft">
          Saving an existing email replaces that person&apos;s password. Existing sessions keep
          working for up to twelve hours — suspend the login to cut access off now.
        </p>
      </form>

      <h2 className="mt-10 font-bold text-ink">Existing logins</h2>
      {users.length === 0 ? (
        <p className="card mt-3 p-6 text-ink-soft">No partner logins yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {users.map((user) => (
            <li key={user._id} className="card flex flex-wrap items-center gap-x-4 gap-y-3 p-5">
              <span className="min-w-0 flex-1 basis-48">
                <span className="block font-semibold text-ink">{user.name}</span>
                <span className="mt-0.5 block text-sm text-ink-soft">
                  {user.email} · {user.role}
                  {user.lastLoginAt ? ` · last signed in ${user.lastLoginAt.slice(0, 10)}` : " · never signed in"}
                </span>
              </span>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
                  user.status === "active" ? "bg-leaf/10 text-leaf" : "bg-surface-muted text-ink-soft"
                }`}
              >
                {user.status}
              </span>
              <form action={setPartnerStatusAction} className="shrink-0">
                <input type="hidden" name="id" value={user._id} />
                <input
                  type="hidden"
                  name="status"
                  value={user.status === "active" ? "suspended" : "active"}
                />
                <button type="submit" className="text-sm font-semibold text-brand hover:underline">
                  {user.status === "active" ? "Suspend" : "Reactivate"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
