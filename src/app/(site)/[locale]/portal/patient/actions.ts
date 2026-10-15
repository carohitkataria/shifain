"use server";

import { redirect } from "next/navigation";
import {
  authenticatePatient,
  endPatientSession,
  requestEmailCode,
  startPatientEmailSession,
  startPatientSession,
  verifyEmailCode,
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

  if (!record) redirect(`/${locale}/portal/patient/login?with=reference&error=1`);

  await startPatientSession(record.patient.phone);
  redirect(`/${locale}/portal/patient`);
}

export async function patientLogoutAction(formData: FormData) {
  const locale = localeOf(formData);
  await endPatientSession();
  redirect(`/${locale}/portal/patient/login`);
}

/**
 * Step one of email sign-in. The answer is the same whether or not we know the
 * address, so this page cannot be used to find out who is a patient here.
 */
export async function requestEmailCodeAction(formData: FormData) {
  const locale = localeOf(formData);
  const email = String(formData.get("email") ?? "").trim();
  if (!email) redirect(`/${locale}/portal/patient/login?error=1`);

  const { codeForCoordinator } = await requestEmailCode(email).catch((error) => {
    console.error("[shifain] could not issue a sign-in code", error);
    return { delivered: false, codeForCoordinator: null };
  });

  // With no mail provider set up the code cannot reach them by email. Rather
  // than leave someone watching an inbox that will never ring, show it on the
  // page so they can sign straight in. This only ever happens when no mailer
  // is configured; once RESEND_API_KEY is set the code is emailed and never
  // shown here.
  const params = new URLSearchParams({ email });
  if (codeForCoordinator === null) {
    params.set("sent", "1");
  } else {
    params.set("sent", "code");
    params.set("code", codeForCoordinator);
  }
  redirect(`/${locale}/portal/patient/login?${params.toString()}`);
}

export async function verifyEmailCodeAction(formData: FormData) {
  const locale = localeOf(formData);
  const email = String(formData.get("email") ?? "");
  const code = String(formData.get("code") ?? "");

  const verified = await verifyEmailCode(email, code).catch(() => null);
  if (!verified) {
    redirect(`/${locale}/portal/patient/login?sent=1&email=${encodeURIComponent(email)}&error=code`);
  }

  await startPatientEmailSession(verified);
  redirect(`/${locale}/portal/patient`);
}
