"use server";

import { redirect } from "next/navigation";
import { authenticate, currentPartner, endPartnerSession, startPartnerSession } from "@/lib/partner-auth";
import { hasSomethingToPlanFrom, readIntake } from "@/lib/intake";
import { openCase } from "@/lib/case-flow";
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

  const name = String(formData.get("name") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const dial = String(formData.get("dial") ?? "").trim();
  const local = String(formData.get("phone") ?? "").trim();
  const phone = [dial, local].filter(Boolean).join(" ").trim();
  if (!name || !phone || !country) redirect(`/${locale}/portal/doctor?error=1`);

  const intake = await readIntake(formData);
  if (intake.tooLarge || !hasSomethingToPlanFrom(intake)) {
    redirect(`/${locale}/portal/doctor?error=1`);
  }

  const record = await openCase({
    locale,
    patient: { name, phone, country, email: null },
    intake,
    referredBy: doctor._id,
  });

  redirect(`/${locale}/plan/${record._id}`);
}
