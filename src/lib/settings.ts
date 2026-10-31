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
  /** How long a partner's referral of a patient blocks another partner's claim. */
  referralWindowDays: number;
  /**
   * "natural" speaks replies with ElevenLabs (paid per character, cached);
   * "device" uses the patient's phone or browser voice only (free).
   */
  voiceEngine: "natural" | "device";
  /** The ElevenLabs voice patients hear unless they pick another. */
  voiceId: string | null;
  /**
   * Hear patients through ElevenLabs even when their browser can transcribe
   * for free. Off by default; the browser's recogniser costs nothing.
   */
  serverListening: boolean;
  /**
   * Opening reports, payment links, adding family and changing contact details
   * need a sign-in this recent (hours); older, and a fresh code is asked for.
   */
  verifyWindowHours: number;
  updatedAt: string | null;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  reportRetentionDays: 30,
  plannerEnabled: true,
  offerTourism: true,
  opsEmail: null,
  partnerApplicationsOpen: true,
  defaultCurrency: "USD",
  referralWindowDays: 180,
  voiceEngine: "natural",
  voiceId: null,
  serverListening: false,
  verifyWindowHours: 24,
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
  merged.verifyWindowHours = clampVerifyWindow(merged.verifyWindowHours);
  return merged;
}

/** Between one hour and a week. */
export function clampVerifyWindow(hours: number): number {
  if (!Number.isFinite(hours)) return DEFAULT_SETTINGS.verifyWindowHours;
  return Math.min(168, Math.max(1, Math.round(hours)));
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
    { name: "RESEND_API_KEY", set: has("RESEND_API_KEY"), required: false, what: "Sends sign-in and sign-up codes by email. Without it email sign-in cannot work." },
    { name: "MAIL_FROM", set: has("MAIL_FROM"), required: false, what: "The address those emails come from. Defaults to Shifain <no-reply@shifain.com>." },
    { name: "BASE_URL", set: has("BASE_URL"), required: false, what: "Used to build absolute links in emails and metadata." },
    { name: "MONGODB_DB", set: has("MONGODB_DB"), required: false, what: "Database name. Defaults to shifain." },
    { name: "SHIFAIN_NOINDEX", set: has("SHIFAIN_NOINDEX"), required: false, what: "Keeps search engines off a staging deployment." },
    { name: "TELEGRAM_BOT_TOKEN", set: has("TELEGRAM_BOT_TOKEN"), required: false, what: "Shared Telegram bot token (used when separate patient/partner tokens are not set)." },
    { name: "TELEGRAM_PATIENT_BOT_TOKEN", set: has("TELEGRAM_PATIENT_BOT_TOKEN"), required: false, what: "Patient-facing Telegram bot. Falls back to TELEGRAM_BOT_TOKEN." },
    { name: "TELEGRAM_PARTNER_BOT_TOKEN", set: has("TELEGRAM_PARTNER_BOT_TOKEN"), required: false, what: "Partner/doctor-facing Telegram bot. Falls back to TELEGRAM_BOT_TOKEN." },
    { name: "TELEGRAM_PATIENT_BOT_USERNAME", set: has("TELEGRAM_PATIENT_BOT_USERNAME"), required: false, what: "The patient bot's @username for “Message us on Telegram” and Telegram sign-in. Read from Telegram when not set." },
    { name: "OPS_EMAIL", set: has("OPS_EMAIL"), required: false, what: "Where “action needed” alerts go (failed plans, unsaved files) if no ops email is set in Settings." },
    { name: "WHATSAPP_ACCESS_TOKEN", set: has("WHATSAPP_ACCESS_TOKEN"), required: false, what: "WhatsApp Cloud API token. With WHATSAPP_PHONE_NUMBER_ID, patients can get sign-in codes on WhatsApp." },
    { name: "WHATSAPP_PHONE_NUMBER_ID", set: has("WHATSAPP_PHONE_NUMBER_ID"), required: false, what: "The WhatsApp Business number that sends sign-in codes." },
    { name: "WHATSAPP_OTP_TEMPLATE", set: has("WHATSAPP_OTP_TEMPLATE"), required: false, what: "Name of the approved Authentication template for sign-in codes (default shifain_login_code)." },
    { name: "ELEVENLABS_API_KEY", set: has("ELEVENLABS_API_KEY"), required: false, what: "Natural voices and server transcription. Without it the assistant speaks with the patient's device voice, for free." },
    { name: "GEMINI_API_KEY", set: has("GEMINI_API_KEY"), required: false, what: "Google Gemini for the voice conversation engine (free tier). Used when ANTHROPIC_API_KEY is not set." },
  ];
}
