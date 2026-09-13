"use server";

import { redirect } from "next/navigation";
import {
  authenticatePatient,
  endPatientSession,
  startPatientSession,
} from "@/lib/patient-auth";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export async function patientLoginAction(formData: FormData) {
  const locale = localeOf(formData);
  const reference = String(formData.get("reference") ?? "");
  const phone = String(formData.get("phone") ?? "");

  const record = await authenticatePatient(reference, phone).catch((error) => {
    console.error("[shifain] patient sign-in failed", error);
    return null;
  });

  if (!record) redirect(`/${locale}/portal/patient/login?error=1`);

  await startPatientSession(record.patient.phone);
  redirect(`/${locale}/portal/patient`);
}

export async function patientLogoutAction(formData: FormData) {
  const locale = localeOf(formData);
  await endPatientSession();
  redirect(`/${locale}/portal/patient/login`);
}
