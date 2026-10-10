"use server";

import { redirect } from "next/navigation";
import { authenticate, currentPartner, endPartnerSession, startPartnerSession } from "@/lib/partner-auth";
import { hasSomethingToPlanFrom, readIntake } from "@/lib/intake";
import { openCase } from "@/lib/case-flow";
import type { PartnerApplication } from "@/lib/partners";
import { attributeCase } from "@/lib/referrals";
import { getSettings } from "@/lib/settings";
import { getDb } from "@/lib/db";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function doctorLoginAction(formData: FormData) {
  const locale = localeOf(formData);
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const user = await authenticate(email, password).catch((error) => {
    console.error("[shifain] partner sign-in failed", error);
    return null;
  });

  if (!user || user.role !== "doctor") {
    redirect(`/${locale}/portal/doctor/login?error=1`);
  }

  await startPartnerSession(user);
  redirect(`/${locale}/portal/doctor`);
}

export async function doctorLogoutAction(formData: FormData) {
  const locale = localeOf(formData);
  await endPartnerSession();
  redirect(`/${locale}/portal/doctor/login`);
}

/**
 * A referral is the same pipeline as a patient upload, attributed to the
 * referring doctor so their dashboard can follow it.
 */
export async function referPatientAction(formData: FormData) {
  const locale = localeOf(formData);
  const doctor = await currentPartner();
  if (!doctor || doctor.role !== "doctor") redirect(`/${locale}/portal/doctor/login`);

  const name = (
    [formData.get("prefix"), formData.get("firstName"), formData.get("lastName")]
      .map((v) => String(v ?? "").trim())
      .filter(Boolean)
      .join(" ") || String(formData.get("name") ?? "").trim()
  ).trim();
  const country = String(formData.get("country") ?? "").trim();
  const dial = String(formData.get("dial") ?? "").trim();
  const local = String(formData.get("phone") ?? "").trim();
  const phone = [dial, local].filter(Boolean).join(" ").trim();
  if (!name || !phone || !country) redirect(`/${locale}/portal/doctor?error=1#refer`);
  // The patient has to have agreed to being referred and to their records being shared.
  if (formData.get("consent") !== "on") redirect(`/${locale}/portal/doctor?error=consent#refer`);

  const intake = await readIntake(formData);
  if (intake.tooLarge || !hasSomethingToPlanFrom(intake)) {
    redirect(`/${locale}/portal/doctor?error=1#refer`);
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase() || null;

  const record = await openCase({
    locale,
    patient: { name, phone, country, email },
    intake,
    source: "partner-portal",
    referredBy: doctor._id,
  });

  // The commercial side opens with the case, but never blocks it.
  await attributeCase({ record, partner: doctor, channel: "portal", by: doctor._id });

  redirect(`/${locale}/plan/${record._id}`);
}

/**
 * A doctor abroad asking to refer patients to us. Anyone can post this form,
 * so it only ever writes an application — never a login. Approval happens by
 * hand in the console, where the registration number can be checked first.
 */
export async function applyToPartnerAction(formData: FormData) {
  const locale = localeOf(formData);
  const apply = `/${locale}/portal/doctor/apply`;

  const settings = await getSettings();
  if (!settings.partnerApplicationsOpen) redirect(`${apply}?error=closed`);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const country = String(formData.get("country") ?? "").trim();
  if (!name || !email || !country) redirect(`${apply}?error=missing`);

  const text = (key: string) => String(formData.get(key) ?? "").trim() || null;
  const patients = Number(String(formData.get("patientsPerYear") ?? "").trim());

  const db = await getDb();
  const applications = db.collection<PartnerApplication>("partner_applications");

  // A second application from the same address is not a new one — it is the
  // same doctor wondering whether the first arrived.
  const existing = await applications.findOne({ email });
  if (existing && existing.status !== "declined") redirect(`${apply}?sent=1`);

  await applications.insertOne({
    _id: `app-${crypto.randomUUID().slice(0, 12)}`,
    name,
    email,
    phone: text("phone"),
    country,
    city: text("city"),
    clinic: text("clinic"),
    specialty: text("specialty"),
    registrationNumber: text("registrationNumber"),
    patientsPerYear: Number.isFinite(patients) && patients > 0 ? Math.round(patients) : null,
    note: text("note"),
    status: "new",
    decidedAt: null,
    decidedBy: null,
    partnerUserId: null,
    createdAt: new Date().toISOString(),
  });

  redirect(`${apply}?sent=1`);
}
