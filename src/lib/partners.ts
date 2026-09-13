import "server-only";
import { getDb, readOr } from "./db";
import type { PartnerUser } from "./partner-auth";

export type ApplicationStatus = "new" | "reviewing" | "approved" | "declined";
export type ReferralStatus = "new" | "qualified" | "travelled" | "treated" | "cancelled";
export type PayoutStatus = "draft" | "approved" | "paid" | "cancelled";
export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost";

export type PartnerApplication = {
  _id: string;
  name: string;
  email: string;
  phone: string | null;
  country: string;
  city: string | null;
  clinic: string | null;
  specialty: string | null;
  registrationNumber: string | null;
  patientsPerYear: number | null;
  note: string | null;
  status: ApplicationStatus;
  decidedAt: string | null;
  decidedBy: string | null;
  partnerUserId: string | null;
  createdAt: string;
};

export type ReferralOffer = {
  _id: string;
  name: string;
  description: string | null;
  kind: "percent-of-treatment" | "flat-per-referral" | "flat-per-travelled";
  value: number;
  currency: string;
  appliesTo: "all" | "specialty" | "treatment";
  appliesToCodes: string[];
  minTreatmentValue: number | null;
  capAmount: number | null;
  validFrom: string | null;
  validUntil: string | null;
  status: "draft" | "active" | "retired";
  isDefault: boolean;
  createdAt: string;
};

export type Referral = {
  _id: string;
  caseReference: string;
  partnerUserId: string;
  partnerName: string | null;
  patientName: string | null;
  status: ReferralStatus;
  offerId: string | null;
  treatmentValue: number | null;
  currency: string | null;
  commissionAmount: number | null;
  payoutId: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type Payout = {
  _id: string;
  partnerUserId: string;
  partnerName: string | null;
  referralIds: string[];
  amount: number;
  currency: string;
  status: PayoutStatus;
  reference: string | null;
  note: string | null;
  createdAt: string;
  paidAt: string | null;
};

export type Broadcast = {
  _id: string;
  title: string;
  body: string;
  audience: "all" | "country" | "specialty";
  audienceValue: string | null;
  pinned: boolean;
  createdAt: string;
  createdBy: string | null;
  expiresAt: string | null;
};

export type Lead = {
  _id: string;
  name: string;
  phone: string | null;
  email: string | null;
  country: string | null;
  need: string | null;
  source: "phone" | "whatsapp" | "email" | "partner" | "walk-in" | "other";
  partnerUserId: string | null;
  status: LeadStatus;
  caseReference: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string | null;
};

/**
 * What a referral earns under an offer.
 *
 * Nothing is owed until the patient has actually been treated — a referral
 * that never travelled cost the partner a conversation, not a case, and
 * paying on it would be an invitation to send us everyone.
 */
export function commissionFor(referral: Referral, offer: ReferralOffer | null): number {
  if (!offer || referral.status === "cancelled") return 0;

  const value = referral.treatmentValue ?? 0;
  if (offer.minTreatmentValue && value < offer.minTreatmentValue) return 0;

  let amount = 0;
  if (offer.kind === "percent-of-treatment") {
    if (referral.status !== "treated") return 0;
    amount = (value * offer.value) / 100;
  } else if (offer.kind === "flat-per-travelled") {
    if (referral.status !== "travelled" && referral.status !== "treated") return 0;
    amount = offer.value;
  } else {
    // flat-per-referral still waits for a qualified case; a name and a phone
    // number is not a referral.
    if (referral.status === "new") return 0;
    amount = offer.value;
  }

  if (offer.capAmount && amount > offer.capAmount) amount = offer.capAmount;
  return Math.round(amount * 100) / 100;
}

export const money = (amount: number, currency = "USD") =>
  `${currency === "USD" ? "$" : `${currency} `}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

// ------------------------------------------------------------------- reads

export async function listOffers(): Promise<ReferralOffer[]> {
  return readOr<ReferralOffer[]>([], (db) =>
    db.collection<ReferralOffer>("referral_offers").find({}).sort({ createdAt: -1 }).toArray(),
  );
}

export async function defaultOffer(): Promise<ReferralOffer | null> {
  return readOr<ReferralOffer | null>(null, (db) =>
    db.collection<ReferralOffer>("referral_offers").findOne({ isDefault: true, status: "active" }),
  );
}

export async function listReferrals(filter: Record<string, unknown> = {}): Promise<Referral[]> {
  return readOr<Referral[]>([], (db) =>
    db.collection<Referral>("referrals").find(filter).sort({ createdAt: -1 }).limit(300).toArray(),
  );
}

export async function listPartners(): Promise<PartnerUser[]> {
  return readOr<PartnerUser[]>([], (db) =>
    db
      .collection<PartnerUser>("partner_users")
      .find({ role: { $in: ["doctor", "hospital"] } })
      .sort({ name: 1 })
      .toArray(),
  );
}

/** Broadcasts a given partner should see, newest and pinned first. */
export async function broadcastsFor(partner: PartnerUser): Promise<Broadcast[]> {
  const now = new Date().toISOString();
  return readOr<Broadcast[]>([], (db) =>
    db
      .collection<Broadcast>("broadcasts")
      .find({
        $and: [
          { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
          {
            $or: [
              { audience: "all" },
              { audience: "country", audienceValue: partner.country ?? "—" },
              { audience: "specialty", audienceValue: partner.specialty ?? "—" },
            ],
          },
        ],
      })
      .sort({ pinned: -1, createdAt: -1 })
      .limit(20)
      .toArray(),
  );
}

/**
 * Opens the commercial side of a referral when a partner sends us a case.
 * Separate from the case itself, and never fatal: a patient is not held up
 * because a commission row would not write.
 */
export async function openReferral(input: {
  caseReference: string;
  partnerUserId: string;
  partnerName: string | null;
  patientName: string | null;
}): Promise<void> {
  const db = await getDb();
  const offer = await db
    .collection<ReferralOffer>("referral_offers")
    .findOne({ isDefault: true, status: "active" });

  await db.collection<Referral>("referrals").updateOne(
    { _id: `ref-${input.caseReference}` },
    {
      $setOnInsert: {
        caseReference: input.caseReference,
        partnerUserId: input.partnerUserId,
        partnerName: input.partnerName,
        patientName: input.patientName,
        status: "new",
        offerId: offer?._id ?? null,
        treatmentValue: null,
        currency: offer?.currency ?? "USD",
        commissionAmount: null,
        payoutId: null,
        note: null,
        createdAt: new Date().toISOString(),
        updatedAt: null,
      },
    },
    { upsert: true },
  );
}
