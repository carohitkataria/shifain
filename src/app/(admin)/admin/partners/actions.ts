"use server";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { hashPassword, type PartnerUser } from "@/lib/partner-auth";
import { commissionFor, type Broadcast, type Lead, type PartnerApplication, type Payout, type Referral, type ReferralOffer } from "@/lib/partners";
import { getSettings } from "@/lib/settings";
import { notifyOps } from "@/lib/mailer";
import { FLASH_COOKIE, FLASH_MAX_AGE_SECONDS, FLASH_PATH } from "../access/flash";

const text = (value: FormDataEntryValue | null) => String(value ?? "").trim() || null;
const num = (value: FormDataEntryValue | null) => {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : null;
};

async function guard() {
  if (!(await isAuthenticated())) redirect("/admin/login");
}

// ------------------------------------------------------------ applications

/**
 * Approving an application creates the login in the same step. A partner who
 * has been told yes and then waits a week for credentials has been told no.
 */
export async function decideApplicationAction(formData: FormData) {
  await guard();

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (!id || !["reviewing", "approved", "declined"].includes(decision)) {
    redirect("/admin/partners/applications");
  }

  const db = await getDb();
  const applications = db.collection<PartnerApplication>("partner_applications");
  const application = await applications.findOne({ _id: id });
  if (!application) redirect("/admin/partners/applications");

  if (decision !== "approved") {
    await applications.updateOne(
      { _id: id },
      { $set: { status: decision as never, decidedAt: new Date().toISOString() } },
    );
    revalidatePath("/admin/partners/applications");
    redirect(`/admin/partners/applications?saved=${decision}`);
  }

  const users = db.collection<PartnerUser>("partner_users");
  const email = application.email.toLowerCase();
  const existing = await users.findOne({ email });
  const password = crypto.randomBytes(12).toString("base64url");
  const partnerUserId = existing?._id ?? `pu-${crypto.randomBytes(8).toString("hex")}`;

  await users.updateOne(
    { email },
    {
      $set: {
        email,
        name: application.name,
        role: "doctor",
        country: application.country,
        city: application.city,
        clinic: application.clinic,
        specialty: application.specialty,
        passwordHash: hashPassword(password),
        status: "active",
      },
      $setOnInsert: {
        _id: partnerUserId,
        doctorId: null,
        hospitalId: null,
        offerId: null,
        payoutMethod: null,
        payoutDetails: null,
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
      },
    },
    { upsert: true },
  );

  await applications.updateOne(
    { _id: id },
    {
      $set: {
        status: "approved",
        decidedAt: new Date().toISOString(),
        partnerUserId,
      },
    },
  );

  // The one and only showing of their password.
  const jar = await cookies();
  jar.set(FLASH_COOKIE, Buffer.from(JSON.stringify({ email, password })).toString("base64url"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: FLASH_PATH,
    maxAge: FLASH_MAX_AGE_SECONDS,
  });

  revalidatePath("/admin/partners/applications");
  redirect("/admin/access?saved=approved");
}

// ------------------------------------------------------------------ partner

export async function savePartnerProfileAction(formData: FormData) {
  await guard();

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/partners");

  const db = await getDb();
  await db.collection<PartnerUser>("partner_users").updateOne(
    { _id: id },
    {
      $set: {
        name: String(formData.get("name") ?? "").trim(),
        country: text(formData.get("country")),
        city: text(formData.get("city")),
        clinic: text(formData.get("clinic")),
        specialty: text(formData.get("specialty")),
        offerId: text(formData.get("offerId")),
        payoutMethod: text(formData.get("payoutMethod")),
        payoutDetails: text(formData.get("payoutDetails")),
      } as never,
    },
  );

  revalidatePath(`/admin/partners/${id}`);
  redirect(`/admin/partners/${id}?saved=1`);
}

// ------------------------------------------------------------------- offers

export async function saveOfferAction(formData: FormData) {
  await guard();

  const id = String(formData.get("id") ?? "") || `offer-${crypto.randomBytes(5).toString("hex")}`;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/admin/offers?error=name");

  const isDefault = formData.get("isDefault") === "on";
  const settings = await getSettings();
  const db = await getDb();
  const offers = db.collection<ReferralOffer>("referral_offers");

  // Exactly one default, or a new referral would not know what it earns.
  if (isDefault) await offers.updateMany({}, { $set: { isDefault: false } });

  await offers.updateOne(
    { _id: id },
    {
      $set: {
        name,
        description: text(formData.get("description")),
        kind: String(formData.get("kind") ?? "percent-of-treatment") as never,
        value: num(formData.get("value")) ?? 0,
        currency:
          (String(formData.get("currency") ?? "").trim() || settings.defaultCurrency).toUpperCase(),
        appliesTo: String(formData.get("appliesTo") ?? "all") as never,
        appliesToCodes: String(formData.get("appliesToCodes") ?? "")
          .split(/[,;]/)
          .map((code) => code.trim())
          .filter(Boolean),
        minTreatmentValue: num(formData.get("minTreatmentValue")),
        capAmount: num(formData.get("capAmount")),
        validFrom: text(formData.get("validFrom")),
        validUntil: text(formData.get("validUntil")),
        status: String(formData.get("status") ?? "draft") as never,
        isDefault,
      },
      $setOnInsert: { createdAt: new Date().toISOString() },
    },
    { upsert: true },
  );

  revalidatePath("/admin/offers");
  redirect("/admin/offers?saved=1");
}

export async function deleteOfferAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  if (id) {
    const db = await getDb();
    await db.collection<ReferralOffer>("referral_offers").deleteOne({ _id: id });
  }
  revalidatePath("/admin/offers");
  redirect("/admin/offers?saved=deleted");
}

// ---------------------------------------------------------------- referrals

/** Recomputes what is owed whenever the facts behind it change. */
export async function saveReferralAction(formData: FormData) {
  await guard();

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/referrals");

  const db = await getDb();
  const referrals = db.collection<Referral>("referrals");
  const current = await referrals.findOne({ _id: id });
  if (!current) redirect("/admin/referrals");

  // A referral already inside a payout is settled; its numbers stop moving.
  if (current.payoutId) redirect("/admin/referrals?error=settled");

  const offerId = text(formData.get("offerId"));
  const offer = offerId
    ? await db.collection<ReferralOffer>("referral_offers").findOne({ _id: offerId })
    : null;

  const next: Referral = {
    ...current,
    status: String(formData.get("status") ?? current.status) as never,
    offerId,
    treatmentValue: num(formData.get("treatmentValue")),
    currency: text(formData.get("currency")) ?? offer?.currency ?? (await getSettings()).defaultCurrency,
    note: text(formData.get("note")),
  };

  await referrals.updateOne(
    { _id: id },
    {
      $set: {
        status: next.status,
        offerId,
        treatmentValue: next.treatmentValue,
        currency: next.currency,
        commissionAmount: commissionFor(next, offer),
        note: next.note,
        updatedAt: new Date().toISOString(),
      },
    },
  );

  revalidatePath("/admin/referrals");
  redirect("/admin/referrals?saved=1");
}

// ------------------------------------------------------------------ payouts

/**
 * Draws a statement from everything earned and not yet paid. Each referral is
 * stamped with the payout id in the same step, so nothing can land on two
 * statements.
 */
export async function createPayoutAction(formData: FormData) {
  await guard();

  const partnerUserId = String(formData.get("partnerUserId") ?? "");
  if (!partnerUserId) redirect("/admin/payouts");

  const db = await getDb();
  const referrals = db.collection<Referral>("referrals");
  const owed = await referrals
    .find({ partnerUserId, payoutId: null, commissionAmount: { $gt: 0 } })
    .toArray();

  if (owed.length === 0) redirect("/admin/payouts?error=nothing");

  const partner = await db.collection<PartnerUser>("partner_users").findOne({ _id: partnerUserId });
  const amount =
    Math.round(owed.reduce((sum, row) => sum + (row.commissionAmount ?? 0), 0) * 100) / 100;
  const id = `pay-${crypto.randomBytes(5).toString("hex")}`;

  await db.collection<Payout>("payouts").insertOne({
    _id: id,
    partnerUserId,
    partnerName: partner?.name ?? null,
    referralIds: owed.map((row) => row._id),
    amount,
    currency: owed[0].currency ?? (await getSettings()).defaultCurrency,
    status: "draft",
    reference: null,
    note: null,
    createdAt: new Date().toISOString(),
    paidAt: null,
  });

  await referrals.updateMany({ _id: { $in: owed.map((row) => row._id) } }, { $set: { payoutId: id } });

  revalidatePath("/admin/payouts");
  redirect(`/admin/payouts?saved=drafted`);
}

export async function setPayoutStatusAction(formData: FormData) {
  await guard();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["draft", "approved", "paid", "cancelled"].includes(status)) {
    redirect("/admin/payouts");
  }

  const db = await getDb();
  const payouts = db.collection<Payout>("payouts");

  if (status === "cancelled") {
    // Releasing the referrals is the whole point of cancelling: they go back
    // into the pool rather than being quietly written off.
    const payout = await payouts.findOne({ _id: id });
    if (payout) {
      await db
        .collection<Referral>("referrals")
        .updateMany({ _id: { $in: payout.referralIds } }, { $set: { payoutId: null } });
    }
  }

  await payouts.updateOne(
    { _id: id },
    {
      $set: {
        status: status as never,
        reference: text(formData.get("reference")),
        paidAt: status === "paid" ? new Date().toISOString() : null,
      },
    },
  );

  revalidatePath("/admin/payouts");
  redirect("/admin/payouts?saved=1");
}

// --------------------------------------------------------------- broadcasts

export async function saveBroadcastAction(formData: FormData) {
  await guard();

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) redirect("/admin/broadcasts?error=empty");

  const db = await getDb();
  await db.collection<Broadcast>("broadcasts").insertOne({
    _id: `bc-${crypto.randomBytes(5).toString("hex")}`,
    title,
    body,
    audience: String(formData.get("audience") ?? "all") as never,
    audienceValue: text(formData.get("audienceValue")),
    pinned: formData.get("pinned") === "on",
    createdAt: new Date().toISOString(),
    createdBy: "admin",
    expiresAt: text(formData.get("expiresAt")),
  });

  revalidatePath("/admin/broadcasts");
  redirect("/admin/broadcasts?saved=1");
}

export async function deleteBroadcastAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  if (id) {
    const db = await getDb();
    await db.collection<Broadcast>("broadcasts").deleteOne({ _id: id });
  }
  revalidatePath("/admin/broadcasts");
  redirect("/admin/broadcasts?saved=deleted");
}

// -------------------------------------------------------------------- leads

export async function saveLeadAction(formData: FormData) {
  await guard();

  const id = String(formData.get("id") ?? "") || `lead-${crypto.randomBytes(5).toString("hex")}`;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/admin/leads?error=name");

  const db = await getDb();
  const existing = await db.collection<Lead>("leads").findOne({ _id: id });
  await db.collection<Lead>("leads").updateOne(
    { _id: id },
    {
      $set: {
        name,
        phone: text(formData.get("phone")),
        email: text(formData.get("email")),
        country: text(formData.get("country")),
        need: text(formData.get("need")),
        source: String(formData.get("source") ?? "phone") as never,
        partnerUserId: text(formData.get("partnerUserId")),
        status: String(formData.get("status") ?? "new") as never,
        caseReference: text(formData.get("caseReference")),
        note: text(formData.get("note")),
        updatedAt: new Date().toISOString(),
      },
      $setOnInsert: { createdAt: new Date().toISOString() },
    },
    { upsert: true },
  );

  // Only a brand-new lead is worth a notice, and only the fact of it: whoever
  // is on the rota may not be the person who typed it in.
  if (!existing) {
    const settings = await getSettings();
    await notifyOps(settings.opsEmail, `New lead: ${name}`, [
      `${name} got in touch via ${String(formData.get("source") ?? "phone")}.`,
      text(formData.get("country")) ? `From: ${text(formData.get("country"))}` : "",
      "",
      "Their details are in the console under Leads.",
    ].filter(Boolean));
  }

  revalidatePath("/admin/leads");
  redirect("/admin/leads?saved=1");
}

export async function deleteLeadAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  if (id) {
    const db = await getDb();
    await db.collection<Lead>("leads").deleteOne({ _id: id });
  }
  revalidatePath("/admin/leads");
  redirect("/admin/leads?saved=deleted");
}
