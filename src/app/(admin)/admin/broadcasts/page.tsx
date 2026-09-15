import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, Empty, NotConfigured, Saved, Warn, adminField, adminLabel } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured, readOr } from "@/lib/db";
import { listPartners, type Broadcast } from "@/lib/partners";
import { deleteBroadcastAction, saveBroadcastAction } from "../partners/actions";

export const dynamic = "force-dynamic";

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function BroadcastsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { saved, error } = await searchParams;

  const [broadcasts, partners] = await Promise.all([
    readOr<Broadcast[]>([], (db) =>
      db
        .collection<Broadcast>("broadcasts")
        .find({})
        .sort({ pinned: -1, createdAt: -1 })
        .limit(100)
        .toArray(),
    ),
    listPartners(),
  ]);

  const countries = [...new Set(partners.map((row) => row.country).filter(Boolean))].sort();
  const specialties = [...new Set(partners.map((row) => row.specialty).filter(Boolean))].sort();
  const now = new Date().toISOString();

  return (
    <AdminShell
      title="Broadcasts"
    >
      {!isDatabaseConfigured() && <NotConfigured />}
      {saved ? <Saved what={saved === "deleted" ? "notice removed" : "sent"} /> : null}
      {error === "empty" ? <Warn>A notice needs both a headline and a body.</Warn> : null}

      <div className="space-y-6">
        <Card
          title="Write a notice"
          hint="It appears on the doctor portal the moment you post it. Pin the ones that should stay at the top."
        >
          <form action={saveBroadcastAction} className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className={adminLabel}>Headline</span>
              <input
                name="title"
                required
                placeholder="Cardiac referrals now earn 10% through March"
                className={adminField}
              />
            </label>

            <label className="sm:col-span-2">
              <span className={adminLabel}>Body</span>
              <textarea
                name="body"
                rows={4}
                required
                placeholder="Say it the way you would on the phone."
                className={adminField}
              />
            </label>

            <label>
              <span className={adminLabel}>Who sees it</span>
              <select name="audience" defaultValue="all" className={adminField}>
                <option value="all">Every partner</option>
                <option value="country">One country</option>
                <option value="specialty">One specialty</option>
              </select>
            </label>

            <label>
              <span className={adminLabel}>Which country or specialty</span>
              <input
                name="audienceValue"
                list="broadcast-audience"
                placeholder="Leave blank when it goes to everyone"
                className={adminField}
              />
              <datalist id="broadcast-audience">
                {[...countries, ...specialties].map((value) => (
                  <option key={value} value={value ?? ""} />
                ))}
              </datalist>
            </label>

            <label>
              <span className={adminLabel}>Stops showing on (optional)</span>
              <input name="expiresAt" type="date" className={adminField} />
            </label>

            <label className="flex items-center gap-2.5 self-end pb-2.5">
              <input type="checkbox" name="pinned" className="h-4 w-4 accent-[color:var(--brand)]" />
              <span className="text-sm font-semibold text-ink">Pin to the top</span>
            </label>

            <div className="sm:col-span-2">
              <button type="submit" className="btn btn-primary !py-2.5 text-sm">
                Post to partners
              </button>
            </div>
          </form>
        </Card>

        {broadcasts.length === 0 ? (
          <Empty>Nothing posted yet.</Empty>
        ) : (
          <ul className="space-y-3">
            {broadcasts.map((broadcast) => {
              const expired = Boolean(broadcast.expiresAt && broadcast.expiresAt <= now);
              return (
                <li key={broadcast._id} className={`card p-5 ${expired ? "opacity-60" : ""}`}>
                  <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="font-extrabold text-ink">
                        {broadcast.pinned ? "📌 " : ""}
                        {broadcast.title}
                      </p>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                        {broadcast.body}
                      </p>
                      <p className="mt-2 text-sm text-ink-soft">
                        {broadcast.audience === "all"
                          ? "Every partner"
                          : `${broadcast.audience === "country" ? "Country" : "Specialty"}: ${broadcast.audienceValue ?? "—"}`}{" "}
                        · posted {when(broadcast.createdAt)}
                        {broadcast.expiresAt
                          ? expired
                            ? ` · expired ${when(broadcast.expiresAt)}`
                            : ` · until ${when(broadcast.expiresAt)}`
                          : ""}
                      </p>
                    </div>
                    <form action={deleteBroadcastAction} className="shrink-0">
                      <input type="hidden" name="id" value={broadcast._id} />
                      <button type="submit" className="btn btn-secondary !py-2 text-sm !text-red-600">
                        Delete
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AdminShell>
  );
}
