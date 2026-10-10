import "server-only";
import { getDb, readOr } from "./db";

/**
 * The handful of switches that change how the business runs, kept in the
 * database rather than in environment variables so they can be turned without
 * a deploy. Anything that is a secret stays in the environment; anything that
 * is a decision lives here.
 */
export type SiteSettings = {
  /** How long an uploaded report is kept before MongoDB deletes it. */
  reportRetentionDays: number;
  /** When off, a case still opens — a coordinator plans it by hand. */
  plannerEnabled: boolean;
  /** Whether a plan may suggest somewhere to visit while the patient is here. */
  offerTourism: boolean;
  /** Where a notice goes when a new case or lead arrives. */
  opsEmail: string | null;
  /** Whether the public partner application form is accepting submissions. */
  partnerApplicationsOpen: boolean;
  /** The currency new offers and referrals start in. */
  defaultCurrency: string;
  updatedAt: string | null;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  reportRetentionDays: 30,
  plannerEnabled: true,
  offerTourism: true,
  opsEmail: null,
  partnerApplicationsOpen: true,
  defaultCurrency: "USD",
  updatedAt: null,
};

const SETTINGS_ID = "site";

type Stored = Partial<SiteSettings> & { _id: string };

/**
 * Never throws and never blocks a render: a site whose settings document is
 * unreachable falls back to the defaults it shipped with, which are the same
 * values it would have had before anyone touched this page.
 */
export async function getSettings(): Promise<SiteSettings> {
  const stored = await readOr<Stored | null>(null, (db) =>
    db.collection<Stored>("site_settings").findOne({ _id: SETTINGS_ID }),
  );
  if (!stored) return { ...DEFAULT_SETTINGS };

  const merged = { ...DEFAULT_SETTINGS, ...stored, _id: undefined } as SiteSettings & {
    _id?: unknown;
  };
  delete merged._id;

  // A retention of zero would delete a report the moment it landed.
  merged.reportRetentionDays = clampRetention(merged.reportRetentionDays);
  return merged;
}

export function clampRetention(days: number): number {
  if (!Number.isFinite(days)) return DEFAULT_SETTINGS.reportRetentionDays;
  return Math.min(180, Math.max(7, Math.round(days)));
}

export async function saveSettings(settings: Omit<SiteSettings, "updatedAt">): Promise<void> {
  const db = await getDb();
  await db.collection<Stored>("site_settings").updateOne(
    { _id: SETTINGS_ID },
    {
      $set: {
        ...settings,
        reportRetentionDays: clampRetention(settings.reportRetentionDays),
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true },
  );
}

/**
 * Which environment variables this deployment has, without ever reading their
 * values. Shown on the settings page so a missing one is visible before it
 * becomes a support call.
 */
export type EnvCheck = { name: string; set: boolean; what: string; required: boolean };

export function environmentCheck(): EnvCheck[] {
  const has = (name: string) => Boolean(process.env[name]?.trim());
  return [
    { name: "MONGODB_URI", set: has("MONGODB_URI"), required: true, what: "The catalogue, cases and partners. Nothing works without it." },
    { name: "ADMIN_PASSWORD", set: has("ADMIN_PASSWORD"), required: true, what: "The password for this console." },
    { name: "ADMIN_SECRET", set: has("ADMIN_SECRET"), required: true, what: "Signs the console's session cookie." },
    { name: "PARTNER_SECRET", set: has("PARTNER_SECRET"), required: true, what: "Signs partner and patient session cookies." },
    { name: "ANTHROPIC_API_KEY", set: has("ANTHROPIC_API_KEY"), required: false, what: "The planner. Without it a case opens but no plan is drafted." },
    { name: "RESEND_API_KEY", set: has("RESEND_API_KEY"), required: false, what: "Sends sign-in codes by email. Without it a coordinator reads the code out." },
    { name: "MAIL_FROM", set: has("MAIL_FROM"), required: false, what: "The address those emails come from." },
    { name: "BASE_URL", set: has("BASE_URL"), required: false, what: "Used to build absolute links in emails and metadata." },
    { name: "MONGODB_DB", set: has("MONGODB_DB"), required: false, what: "Database name. Defaults to shifain." },
    { name: "SHIFAIN_NOINDEX", set: has("SHIFAIN_NOINDEX"), required: false, what: "Keeps search engines off a staging deployment." },
    { name: "TELEGRAM_BOT_TOKEN", set: has("TELEGRAM_BOT_TOKEN"), required: false, what: "Shared Telegram bot token (used when separate patient/partner tokens are not set)." },
    { name: "TELEGRAM_PATIENT_BOT_TOKEN", set: has("TELEGRAM_PATIENT_BOT_TOKEN"), required: false, what: "Patient-facing Telegram bot. Falls back to TELEGRAM_BOT_TOKEN." },
    { name: "TELEGRAM_PARTNER_BOT_TOKEN", set: has("TELEGRAM_PARTNER_BOT_TOKEN"), required: false, what: "Partner/doctor-facing Telegram bot. Falls back to TELEGRAM_BOT_TOKEN." },
    { name: "ELEVENLABS_API_KEY", set: has("ELEVENLABS_API_KEY"), required: false, what: "ElevenLabs voice AI. Without it, voice messages get a text-only reply." },
  ];
}
