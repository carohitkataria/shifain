"use server";

import { redirect } from "next/navigation";
import {
  authenticatePatient,
  endPatientSession,
  requestEmailCode,
  startPatientEmailSession,
  startPatientSession,
  verifyEmailCode,
  type CodeRequest,
  type SignUpDetails,
} from "@/lib/patient-auth";
import { COUNTRIES } from "@/lib/countries";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

const field = (formData: FormData, name: string, max = 120) => String(formData.get(name) ?? "").trim().slice(0, max);

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

/** Where the code step lives, and what it says, after a code was asked for. */
function afterCode(page: string, email: string, result: CodeRequest): string {
  const params = new URLSearchParams({ email });
  if (result.status === "mail-failed") {
    params.set("error", "mail");
    return `${page}?${params.toString()}`;
  }
  params.set("sent", "1");
  // Only in local development with no mailer: the code, so the flow can be tried.
  if (result.status === "dev") params.set("dev", result.code);
  return `${page}?${params.toString()}`;
}

/**
 * Step one of email sign-in. The answer is the same whether or not we know the
 * address, so this page cannot be used to find out who is a patient here.
 */
export async function requestEmailCodeAction(formData: FormData) {
  const locale = localeOf(formData);
  const page = `/${locale}/portal/patient/login`;
  const email = field(formData, "email", 200).toLowerCase();
  if (!EMAIL.test(email)) redirect(`${page}?error=email`);

  const result = await requestEmailCode(email).catch((error): CodeRequest => {
    console.error("[shifain] could not issue a sign-in code", error);
    return { status: "mail-failed" };
  });
  redirect(afterCode(page, email, result));
}

/** Sign-up: basic details now, the account once the emailed code comes back. A case can follow any time. */
export async function signUpAction(formData: FormData) {
  const locale = localeOf(formData);
  const page = `/${locale}/portal/patient/signup`;
  const email = field(formData, "email", 200).toLowerCase();
  const details: SignUpDetails = {
    firstName: field(formData, "firstName", 80),
    lastName: field(formData, "lastName", 80),
    country: field(formData, "country", 80),
    dial: field(formData, "dial", 8).replace(/[^\d+]/g, ""),
    phone: field(formData, "phone", 30).replace(/[^\d\s()-]/g, "").trim(),
    locale,
  };
  const known = details.country === "Other" || COUNTRIES.some((country) => country.name === details.country);
  const agreed = formData.get("agree") === "yes";
  if (!details.firstName || !known || details.phone.replace(/\D/g, "").length < 5 || !EMAIL.test(email) || !agreed) {
    redirect(`${page}?error=details`);
  }

  const result = await requestEmailCode(email, details).catch((error): CodeRequest => {
    console.error("[shifain] could not issue a sign-up code", error);
    return { status: "mail-failed" };
  });
  redirect(afterCode(page, email, result));
}

export async function verifyEmailCodeAction(formData: FormData) {
  const locale = localeOf(formData);
  const email = field(formData, "email", 200);
  const code = field(formData, "code", 12);
  const page = formData.get("from") === "signup" ? `/${locale}/portal/patient/signup` : `/${locale}/portal/patient/login`;

  const verified = await verifyEmailCode(email, code).catch((error) => {
    console.error("[shifain] could not check a sign-in code", error);
    return null;
  });
  if (!verified) {
    redirect(`${page}?sent=1&email=${encodeURIComponent(email)}&error=code`);
  }

  await startPatientEmailSession(verified);
  redirect(`/${locale}/portal/patient${formData.get("from") === "signup" ? "?welcome=1" : ""}`);
}
