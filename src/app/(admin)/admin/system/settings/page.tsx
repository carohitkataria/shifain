import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, NotConfigured, Saved, Warn, adminField, adminLabel } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { RETENTION_DAYS } from "@/lib/reports";
import { environmentCheck, getSettings } from "@/lib/settings";
import { saveSettingsAction } from "./actions";

export const dynamic = "force-dynamic";

function Switch({
  name,
  label,
  hint,
  on,
}: {
  name: string;
  label: string;
  hint: string;
  on: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg bg-surface-muted p-4">
      <input
        type="checkbox"
        name={name}
        defaultChecked={on}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[color:var(--brand)]"
      />
      <span className="min-w-0">
        <span className="block font-bold text-ink">{label}</span>
        <span className="mt-0.5 block text-sm leading-relaxed text-ink-soft">{hint}</span>
      </span>
    </label>
  );
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { saved } = await searchParams;

  const settings = await getSettings();
  const environment = environmentCheck();
  const missing = environment.filter((entry) => entry.required && !entry.set);

  return (
    <AdminShell
      title="Site settings"
    >
      {!isDatabaseConfigured() && <NotConfigured />}
      {saved ? <Saved /> : null}
      {missing.length > 0 ? (
        <Warn>
          Not configured on this deployment: {missing.map((entry) => entry.name).join(", ")}. Parts of
          the site will not work until they are set.
        </Warn>
      ) : null}

      <div className="space-y-6">
        <Card title="How the site runs">
          <form action={saveSettingsAction} className="space-y-4">
            <div className="grid gap-3">
              <Switch
                name="plannerEnabled"
                label="Draft plans automatically"
                hint="When this is off, a case still opens and the patient still gets their page — it simply says a coordinator is preparing the plan by hand."
                on={settings.plannerEnabled}
              />
              <Switch
                name="offerTourism"
                label="Suggest somewhere to visit"
                hint="Offers a day out alongside a plan, but only where the treatment is light enough and the patient is well enough. The patient still chooses."
                on={settings.offerTourism}
              />
              <Switch
                name="partnerApplicationsOpen"
                label="Accept partner applications"
                hint="The public form doctors abroad use to ask to refer patients. Turn it off to close the list without taking the page down."
                on={settings.partnerApplicationsOpen}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className={adminLabel}>Keep uploaded reports for</span>
                <input
                  name="reportRetentionDays"
                  type="number"
                  min={7}
                  max={180}
                  step={1}
                  defaultValue={settings.reportRetentionDays}
                  className={adminField}
                />
                <span className="mt-1 block text-sm text-ink-soft">
                  Days. Between 7 and 180; the site ships with {RETENTION_DAYS}. MongoDB deletes each
                  file itself when the time is up — this only sets the clock for files uploaded from
                  now on.
                </span>
              </label>

              <label>
                <span className={adminLabel}>Default currency</span>
                <input
                  name="defaultCurrency"
                  maxLength={3}
                  defaultValue={settings.defaultCurrency}
                  className={adminField}
                />
                <span className="mt-1 block text-sm text-ink-soft">
                  What new offers and referrals start in.
                </span>
              </label>

              <label className="sm:col-span-2">
                <span className={adminLabel}>Operations inbox</span>
                <input
                  name="opsEmail"
                  type="email"
                  defaultValue={settings.opsEmail ?? ""}
                  placeholder="care@shifain.com"
                  className={adminField}
                />
                <span className="mt-1 block text-sm text-ink-soft">
                  Where notices about new cases and leads are addressed. Needs RESEND_API_KEY to
                  actually send.
                </span>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button type="submit" className="btn btn-primary !py-2.5 text-sm">
                Save settings
              </button>
              {settings.updatedAt ? (
                <span className="text-sm text-ink-soft">
                  Last changed{" "}
                  {new Date(settings.updatedAt).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ) : null}
            </div>
          </form>
        </Card>

        <Card
          title="Environment"
          hint="What this deployment has been given. Values are never read or shown here — only whether something is set."
        >
          <ul className="divide-y divide-line">
            {environment.map((entry) => (
              <li key={entry.name} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2.5">
                <span className="min-w-0 flex-1 basis-48">
                  <span className="block font-mono text-sm font-semibold text-ink">{entry.name}</span>
                  <span className="block text-sm text-ink-soft">{entry.what}</span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${
                    entry.set
                      ? "bg-leaf/10 text-leaf"
                      : entry.required
                        ? "bg-red-50 text-red-700"
                        : "bg-surface-muted text-ink-soft"
                  }`}
                >
                  {entry.set ? "set" : entry.required ? "missing" : "not set"}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AdminShell>
  );
}
