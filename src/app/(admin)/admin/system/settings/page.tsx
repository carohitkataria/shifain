import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, NotConfigured, Saved, Warn, adminField, adminLabel } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { RETENTION_DAYS } from "@/lib/reports";
import { environmentCheck, getSettings } from "@/lib/settings";
import { NATURAL_VOICES, naturalVoice } from "@/lib/voice/voices";
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

            <fieldset className="rounded-lg border border-line p-4">
              <legend className="px-1 font-bold text-ink">Assistant voice</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className={adminLabel}>Speak replies with</span>
                  <select name="voiceEngine" defaultValue={settings.voiceEngine} className={adminField}>
                    <option value="natural">Natural voices (ElevenLabs, paid per character, cached)</option>
                    <option value="device">The patient&apos;s own device voice (free)</option>
                  </select>
                  <span className="mt-1 block text-sm text-ink-soft">
                    Natural voices need ELEVENLABS_API_KEY. Repeated answers are cached for 30 days, so they are
                    only paid for once. Patients can still switch to their device voice themselves.
                  </span>
                </label>
                <label>
                  <span className={adminLabel}>Default voice</span>
                  <select
                    name="voiceId"
                    defaultValue={naturalVoice(settings.voiceId) ? (settings.voiceId ?? "") : settings.voiceId ? "custom" : ""}
                    className={adminField}
                  >
                    <option value="">Sarah — warm, reassuring (recommended)</option>
                    {NATURAL_VOICES.slice(1).map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} — {voice.gender}, {voice.note.toLowerCase()}
                      </option>
                    ))}
                    <option value="custom">Another voice from my ElevenLabs library…</option>
                  </select>
                  <input
                    name="voiceIdCustom"
                    defaultValue={settings.voiceId && !naturalVoice(settings.voiceId) ? settings.voiceId : ""}
                    placeholder="ElevenLabs voice ID, e.g. PuHhr7DLJRLgr8fSArz5"
                    className={`${adminField} mt-2`}
                  />
                  <span className="mt-1 block text-sm text-ink-soft">
                    For another voice, add it to your ElevenLabs library first, then paste its ID and choose
                    &ldquo;Another voice&rdquo;.
                  </span>
                </label>
              </div>
              <div className="mt-3">
                <Switch
                  name="serverListening"
                  label="Always transcribe on the server"
                  hint="Off: patients' browsers transcribe speech for free; the server (ElevenLabs) listens when a browser can't, and always for Uzbek, Kazakh, Kyrgyz and Tajik, which browsers hear badly. On: every spoken turn is transcribed by ElevenLabs — better for rare languages, but paid per minute."
                  on={settings.serverListening}
                />
              </div>
            </fieldset>

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

              <label>
                <span className={adminLabel}>Referral protection window</span>
                <input
                  name="referralWindowDays"
                  type="number"
                  min={30}
                  max={730}
                  step={1}
                  defaultValue={settings.referralWindowDays}
                  className={adminField}
                />
                <span className="mt-1 block text-sm text-ink-soft">
                  Days. If a second partner refers a patient already referred by another partner within
                  this window, the later referral is flagged as a possible duplicate.
                </span>
              </label>

              <label>
                <span className={adminLabel}>Re-check sign-in after</span>
                <input
                  name="verifyWindowHours"
                  type="number"
                  min={1}
                  max={168}
                  step={1}
                  defaultValue={settings.verifyWindowHours}
                  className={adminField}
                />
                <span className="mt-1 block text-sm text-ink-soft">
                  Hours. Opening reports, payment links, adding family or changing contact details asks
                  for a fresh one-time code once the patient&apos;s last sign-in is older than this.
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
