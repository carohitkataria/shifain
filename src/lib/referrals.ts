import "server-only";
import crypto from "node:crypto";
import { cookies, headers } from "next/headers";
import { getDb, readOr } from "./db";
import { getSettings } from "./settings";
import { send } from "./mailer";
import { getMe, isTelegramConfigured, sendMessage } from "./telegram";
import {
  commissionFor,
  money,
  type Referral,
  type ReferralChannel,
  type ReferralOffer,
  type ReferralStatus,
} from "./partners";
import type { PartnerUser } from "./partner-auth";
import type { CaseSource, CaseStatus, PatientCase } from "./cases";

/**
 * Partner referrals, end to end.
 *
 *   code ──► link (/r/CODE, ?ref=CODE, t.me/<bot>?start=ref_CODE)
 *        ──► cookie / Telegram contact ──► case.referredBy
 *        ──► referral row (offer resolved, duplicate checked, history kept)
 *        ──► stage changes (admin or case sync) ──► commission ──► payout
 *        ──► partner told at every stage, without clinical detail
 *
 * A case knows two separate things: where it came in (`source`) and which
 * partner, if any, it is credited to (`referredBy`). Only a partner id ever
 * goes in `referredBy`.
 */

export const REFERRAL_COOKIE = "shifain_ref";
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 60;
const CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{3,23}$/;

/** Values older code wrote into `referredBy` that name a channel, not a partner. */
const LEGACY_CHANNEL_VALUES = new Set(["web-ai-chat", "telegram-ai-intake"]);

export const STAGE_ORDER: ReferralStatus[] = ["new", "qualified", "travelled", "treated"];

export const STAGE_LABEL: Record<ReferralStatus, string> = {
  new: "Received",
  qualified: "Qualified",
  travelled: "Travelled",
  treated: "Treated",
  cancelled: "Closed",
};

export const CHANNEL_LABEL: Record<ReferralChannel, string> = {
  portal: "Partner portal",
  link: "Referral link",
  telegram: "Telegram link",
  "web-chat": "Website chat",
  manual: "Added by coordinator",
};

export const SOURCE_LABEL: Record<CaseSource, string> = {
  website: "Website form",
  "web-chat": "Website chat",
  telegram: "Telegram",
  "partner-portal": "Partner portal",
  coordinator: "Coordinator",
};

// ------------------------------------------------------------------ codes

export function normaliseCode(raw: string | null | undefined): string | null {
  const code = String(raw ?? "").trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

/** Unambiguous characters only: a code gets read aloud and typed from a card. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomTail(length: number): string {
  const bytes = crypto.randomBytes(length);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

function codeStem(name: string): string {
  const stem = name
    .normalize("NFKD")
    .replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
    .slice(0, 6);
  return stem.length >= 2 ? stem : "SHIFA";
}

/** The partner's code, minted on first use and stable after that. */
export async function ensureReferralCode(partner: PartnerUser): Promise<string> {
  if (partner.referralCode) return partner.referralCode;
  const db = await getDb();
  const users = db.collection<PartnerUser>("partner_users");

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = `${codeStem(partner.name)}-${randomTail(4)}`;
    if (await users.findOne({ referralCode: code })) continue;
    const result = await users.updateOne(
      { _id: partner._id, referralCode: { $in: [null, undefined] as never } },
      { $set: { referralCode: code } },
    );
    if (result.modifiedCount === 1) return code;
    const fresh = await users.findOne({ _id: partner._id });
    if (fresh?.referralCode) return fresh.referralCode;
  }
  throw new Error("Could not mint a unique referral code.");
}

export async function regenerateReferralCode(partnerId: string): Promise<void> {
  const db = await getDb();
  const users = db.collection<PartnerUser>("partner_users");
  const partner = await users.findOne({ _id: partnerId });
  if (!partner) return;
  await users.updateOne({ _id: partnerId }, { $set: { referralCode: null } });
  await ensureReferralCode({ ...partner, referralCode: null });
}

export async function partnerByCode(code: string | null | undefined): Promise<PartnerUser | null> {
  const normalised = normaliseCode(code);
  if (!normalised) return null;
  return readOr<PartnerUser | null>(null, (db) =>
    db.collection<PartnerUser>("partner_users").findOne({ referralCode: normalised, status: "active" }),
  );
}

export async function countReferralClick(partnerId: string): Promise<void> {
  const db = await getDb();
  await db
    .collection<PartnerUser>("partner_users")
    .updateOne({ _id: partnerId }, { $inc: { "referralStats.clicks": 1 } as never });
}

/** The partner a visitor arrived through, if they came on a partner's link. */
export async function partnerFromCookie(): Promise<PartnerUser | null> {
  const jar = await cookies();
  return partnerByCode(jar.get(REFERRAL_COOKIE)?.value);
}

// ------------------------------------------------------------------ links

export async function siteOrigin(): Promise<string> {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const usernameCache = new Map<string, { value: string | null; at: number }>();

/** The bot's @username, needed to build t.me deep links. */
export async function botUsername(role: "patient" | "partner"): Promise<string | null> {
  const fromEnv =
    role === "patient"
      ? process.env.TELEGRAM_PATIENT_BOT_USERNAME
      : process.env.TELEGRAM_PARTNER_BOT_USERNAME;
  if (fromEnv) return fromEnv.replace(/^@/, "");
  if (!isTelegramConfigured(role)) return null;

  const cached = usernameCache.get(role);
  if (cached && Date.now() - cached.at < 60 * 60 * 1000) return cached.value;
  const value = await getMe(role)
    .then((me) => me.username ?? null)
    .catch(() => null);
  usernameCache.set(role, { value, at: Date.now() });
  return value;
}

export type ReferralLinks = {
  code: string;
  web: string;
  telegram: string | null;
  whatsappShare: string;
  telegramShare: string;
};

export async function referralLinks(code: string): Promise<ReferralLinks> {
  const origin = await siteOrigin();
  const web = `${origin}/r/${code}`;
  const bot = await botUsername("patient");
  const telegram = bot ? `https://t.me/${bot}?start=ref_${code}` : null;
  const message = `I recommend ShifaIn for treatment in India — they prepare a free treatment plan and cost estimate. Start here: ${web}`;
  return {
    code,
    web,
    telegram,
    whatsappShare: `https://wa.me/?text=${encodeURIComponent(message)}`,
    telegramShare: `https://t.me/share/url?url=${encodeURIComponent(web)}&text=${encodeURIComponent(
      "Free treatment plan and cost estimate for treatment in India",
    )}`,
  };
}

// ------------------------------------------------------- partner Telegram link

function linkSecret(): string {
  const value = process.env.PARTNER_SECRET || process.env.ADMIN_SECRET;
  if (value && value.length >= 16) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PARTNER_SECRET must be set (at least 16 characters) in production.");
  }
  return "shifain-development-secret-do-not-use-in-production";
}

function linkSignature(partnerId: string): string {
  return crypto.createHmac("sha256", linkSecret()).update(`tg-link:${partnerId}`).digest("hex").slice(0, 16);
}

/** A /start payload that proves which partner opened the bot (≤ 64 chars). */
export function telegramLinkPayload(partnerId: string): string {
  return `link_${partnerId}_${linkSignature(partnerId)}`;
}

export function verifyTelegramLinkPayload(payload: string): string | null {
  const match = /^link_([A-Za-z0-9-]{3,40})_([0-9a-f]{16})$/.exec(payload);
  if (!match) return null;
  const [, partnerId, signature] = match;
  const expected = linkSignature(partnerId);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? partnerId : null;
}

export async function linkPartnerTelegram(partnerId: string, chatId: number): Promise<PartnerUser | null> {
  const db = await getDb();
  const users = db.collection<PartnerUser>("partner_users");
  // One chat belongs to one partner; relinking moves it rather than sharing it.
  await users.updateMany({ telegramChatId: chatId, _id: { $ne: partnerId } }, { $set: { telegramChatId: null } });
  await users.updateOne({ _id: partnerId, status: "active" }, { $set: { telegramChatId: chatId } });
  return users.findOne({ _id: partnerId, status: "active" });
}

export async function partnerByTelegramChat(chatId: number): Promise<PartnerUser | null> {
  return readOr<PartnerUser | null>(null, (db) =>
    db.collection<PartnerUser>("partner_users").findOne({ telegramChatId: chatId, status: "active" }),
  );
}

// ------------------------------------------------------------ case identity

/** The partner a case is credited to, ignoring channel names older code stored there. */
export function partnerIdOf(record: Pick<PatientCase, "referredBy">): string | null {
  const value = record.referredBy;
  if (!value || LEGACY_CHANNEL_VALUES.has(value)) return null;
  return value;
}

export function sourceOf(record: Pick<PatientCase, "source" | "referredBy">): CaseSource {
  if (record.source) return record.source;
  if (record.referredBy === "web-ai-chat") return "web-chat";
  if (record.referredBy === "telegram-ai-intake") return "telegram";
  if (record.referredBy) return "partner-portal";
  return "website";
}

// ------------------------------------------------------------------ offers

function offerIsLive(offer: ReferralOffer, now: string): boolean {
  if (offer.status !== "active") return false;
  if (offer.validFrom && offer.validFrom > now) return false;
  if (offer.validUntil && `${offer.validUntil}T23:59:59.999Z` < now) return false;
  return true;
}

/**
 * The offer a new referral earns under, most specific first: the partner's
 * own agreed offer, then an offer for this treatment, then one for the
 * partner's specialty, then the house default.
 */
export async function resolveOffer(
  partner: Pick<PartnerUser, "offerId" | "specialty">,
  statedNeed: string | null,
): Promise<ReferralOffer | null> {
  const offers = await readOr<ReferralOffer[]>([], (db) =>
    db.collection<ReferralOffer>("referral_offers").find({ status: "active" }).toArray(),
  );
  const now = new Date().toISOString();
  const live = offers.filter((offer) => offerIsLive(offer, now));
  const need = (statedNeed ?? "").trim().toLowerCase();
  const specialty = (partner.specialty ?? "").trim().toLowerCase();
  const covers = (offer: ReferralOffer, value: string) =>
    Boolean(value) && offer.appliesToCodes.some((code) => code.toLowerCase() === value);

  return (
    live.find((offer) => offer._id === partner.offerId) ??
    live.find((offer) => offer.appliesTo === "treatment" && covers(offer, need)) ??
    live.find((offer) => offer.appliesTo === "specialty" && (covers(offer, need) || covers(offer, specialty))) ??
    live.find((offer) => offer.isDefault && offer.appliesTo === "all") ??
    live.find((offer) => offer.isDefault) ??
    null
  );
}

export function describeOffer(offer: ReferralOffer | null): string {
  if (!offer) return "Terms are agreed with your coordinator.";
  const amount =
    offer.kind === "percent-of-treatment" ? `${offer.value}% of the treatment value` : money(offer.value, offer.currency);
  const when =
    offer.kind === "percent-of-treatment"
      ? "once the patient has been treated"
      : offer.kind === "flat-per-travelled"
        ? "once the patient travels to India"
        : "once the case is qualified";
  const cap = offer.capAmount ? `, up to ${money(offer.capAmount, offer.currency)} per patient` : "";
  return `${amount}${cap}, earned ${when}.`;
}

// ------------------------------------------------------------- attribution

const digitsTail = (phone: string) => phone.replace(/\D/g, "").slice(-9);

/**
 * Another partner's earlier claim on the same patient, inside the
 * attribution window. First referral wins; the later one is still recorded so
 * a coordinator can judge it, but it is flagged.
 */
async function earlierClaim(
  record: PatientCase,
  partnerId: string,
  windowDays: number,
): Promise<string | null> {
  const tail = digitsTail(record.patient.phone);
  if (tail.length < 6) return null;
  const since = new Date(Date.now() - windowDays * 86_400_000).toISOString();
  const db = await getDb();
  const match = await db.collection<PatientCase>("cases").findOne({
    _id: { $ne: record._id },
    "patient.phone": { $regex: `${tail.split("").join("[^0-9]*")}$` },
    referredBy: { $nin: [null, partnerId, ...LEGACY_CHANNEL_VALUES] },
    createdAt: { $gte: since },
  });
  return match?._id ?? null;
}

/**
 * Credits a case to a partner and opens the commercial record behind it.
 * Idempotent per case. Never throws to its caller's patient: errors are
 * logged and the case carries on.
 */
export async function attributeCase(input: {
  record: PatientCase;
  partner: PartnerUser;
  channel: ReferralChannel;
  by: string;
}): Promise<Referral | null> {
  const { record, partner, channel } = input;
  if (partner.status !== "active") return null;

  try {
    const db = await getDb();
    const settings = await getSettings();
    const referrals = db.collection<Referral>("referrals");
    const id = `ref-${record._id}`;

    const existing = await referrals.findOne({ _id: id });
    if (existing) return existing;

    const [offer, duplicateOf, code] = await Promise.all([
      resolveOffer(partner, record.statedNeed),
      earlierClaim(record, partner._id, settings.referralWindowDays),
      ensureReferralCode(partner).catch(() => null),
    ]);
    const now = new Date().toISOString();

    await db
      .collection<PatientCase>("cases")
      .updateOne({ _id: record._id }, { $set: { referredBy: partner._id } });

    const referral: Referral = {
      _id: id,
      caseReference: record._id,
      partnerUserId: partner._id,
      partnerName: partner.name,
      patientName: record.patient.name,
      patientCountry: record.patient.country,
      statedNeed: record.statedNeed,
      status: "new",
      channel,
      referralCode: code,
      offerId: offer?._id ?? null,
      treatmentValue: null,
      currency: offer?.currency ?? settings.defaultCurrency,
      commissionAmount: null,
      payoutId: null,
      duplicateOf,
      note: duplicateOf ? `Patient was referred earlier by another partner (${duplicateOf}).` : null,
      history: [
        { status: "new", at: now, by: input.by, note: `Opened via ${CHANNEL_LABEL[channel].toLowerCase()}` },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await referrals.updateOne({ _id: id }, { $setOnInsert: referral }, { upsert: true });
    await notifyPartner(partner, referral, "opened").catch(() => undefined);
    return referral;
  } catch (error) {
    console.error("[shifain] could not attribute case", record._id, error);
    return null;
  }
}

/** Credits a case to whoever's link the visitor arrived on, if anyone. */
export async function attributeFromCookie(record: PatientCase, channel: ReferralChannel): Promise<void> {
  const partner = await partnerFromCookie().catch(() => null);
  if (partner) await attributeCase({ record, partner, channel, by: "system" });
}

// ------------------------------------------------------------------ stages

export type StageChange = {
  status?: ReferralStatus;
  offerId?: string | null;
  treatmentValue?: number | null;
  currency?: string | null;
  note?: string | null;
  by: string;
};

/**
 * The single place a referral moves. Recomputes commission, keeps the
 * history, and tells the partner when the stage changed. A referral already
 * on a payout statement is settled and does not move.
 */
export async function updateReferral(
  id: string,
  change: StageChange,
): Promise<"ok" | "settled" | "missing"> {
  const db = await getDb();
  const referrals = db.collection<Referral>("referrals");
  const current = await referrals.findOne({ _id: id });
  if (!current) return "missing";
  if (current.payoutId) return "settled";

  const offerId = change.offerId === undefined ? current.offerId : change.offerId;
  const offer = offerId
    ? await db.collection<ReferralOffer>("referral_offers").findOne({ _id: offerId })
    : null;

  const next: Referral = {
    ...current,
    status: change.status ?? current.status,
    offerId,
    treatmentValue: change.treatmentValue === undefined ? current.treatmentValue : change.treatmentValue,
    currency: change.currency ?? current.currency ?? offer?.currency ?? null,
    note: change.note === undefined ? current.note : change.note,
  };
  const now = new Date().toISOString();
  const moved = next.status !== current.status;

  await referrals.updateOne(
    { _id: id },
    {
      $set: {
        status: next.status,
        offerId: next.offerId,
        treatmentValue: next.treatmentValue,
        currency: next.currency,
        commissionAmount: commissionFor(next, offer),
        note: next.note,
        updatedAt: now,
      },
      ...(moved
        ? { $push: { history: { status: next.status, at: now, by: change.by, note: null } } as never }
        : {}),
    },
  );

  if (moved) {
    const partner = await db.collection<PartnerUser>("partner_users").findOne({ _id: current.partnerUserId });
    if (partner) {
      await notifyPartner(partner, { ...next, commissionAmount: commissionFor(next, offer) }, "moved").catch(
        () => undefined,
      );
    }
  }
  return "ok";
}

/**
 * Keeps the referral in step with the case. Only moves forward, and only
 * the steps the case itself can prove: a confirmed case is a qualified
 * referral. Travel and treatment are recorded by a coordinator who knows.
 */
export async function syncReferralWithCase(caseReference: string, caseStatus: CaseStatus): Promise<void> {
  if (caseStatus !== "confirmed") return;
  const db = await getDb();
  const referral = await db.collection<Referral>("referrals").findOne({ caseReference });
  if (!referral || referral.status !== "new") return;
  await updateReferral(referral._id, { status: "qualified", by: "case-sync" });
}

// ---------------------------------------------------------- notifications

/** "Akmal R." — enough for a doctor to recognise their patient, no more. */
export function shortName(name: string | null): string {
  if (!name) return "Your patient";
  const parts = name.replace(/^(dr|prof|mr|mrs|ms)\.?\s+/i, "").trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
}

const STAGE_MESSAGE: Record<ReferralStatus, string> = {
  new: "has been received. Our team is preparing their plan.",
  qualified: "is qualified — the treatment plan has been accepted.",
  travelled: "has arrived in India for treatment.",
  treated: "has completed treatment.",
  cancelled: "has been closed without travel.",
};

/**
 * Tells the partner how their referral is going. Never anything clinical:
 * the patient's first name and initial, the stage and the money.
 */
async function notifyPartner(
  partner: PartnerUser,
  referral: Referral,
  kind: "opened" | "moved",
): Promise<void> {
  const who = shortName(referral.patientName);
  const earned =
    referral.commissionAmount && referral.commissionAmount > 0
      ? ` Commission earned: ${money(referral.commissionAmount, referral.currency ?? "USD")}.`
      : "";
  const lead = kind === "opened" ? "New referral credited to you." : "Referral update.";
  const body = `${lead} ${who} (${referral.caseReference.slice(0, 12)}…) ${STAGE_MESSAGE[referral.status]}${earned}`;

  if (partner.telegramChatId && isTelegramConfigured("partner")) {
    await sendMessage("partner", { chatId: partner.telegramChatId, text: `🤝 ${body}` });
    return;
  }
  if (partner.email) {
    await send(partner.email, `ShifaIn referral: ${who} — ${STAGE_LABEL[referral.status]}`, `${body}\n\nSee every referral in your partner portal.`);
  }
}

// ------------------------------------------------------------------ partner view

export type PartnerPipeline = {
  counts: Record<ReferralStatus, number>;
  total: number;
  conversion: number;
  earned: number;
  pending: number;
  paid: number;
  clicks: number;
};

export function pipelineOf(referrals: Referral[], clicks: number): PartnerPipeline {
  const counts: Record<ReferralStatus, number> = { new: 0, qualified: 0, travelled: 0, treated: 0, cancelled: 0 };
  for (const row of referrals) counts[row.status] = (counts[row.status] ?? 0) + 1;
  const earned = referrals.reduce((sum, row) => sum + (row.commissionAmount ?? 0), 0);
  const paid = referrals.filter((row) => row.payoutId).reduce((sum, row) => sum + (row.commissionAmount ?? 0), 0);
  return {
    counts,
    total: referrals.length,
    conversion:
      referrals.length > 0 ? Math.round(((counts.travelled + counts.treated) / referrals.length) * 100) : 0,
    earned,
    pending: earned - paid,
    paid,
    clicks,
  };
}

/** Whether the partner may open the patient's plan: only when they sent the records themselves. */
export function partnerCanViewPlan(referral: Pick<Referral, "channel">): boolean {
  return (referral.channel ?? "portal") === "portal";
}
