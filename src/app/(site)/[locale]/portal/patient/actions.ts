"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  accountForPhone,
  currentPatient,
  ensureAccount,
  getPatientAccount,
  authenticatePatient,
  endPatientSession,
  requestEmailCode,
  startPatientEmailSession,
  startPatientSession,
  verifyEmailCode,
  type CodeRequest,
  type SignUpDetails,
} from "@/lib/patient-auth";
import { MIN_PASSWORD, checkPassword, setAccountPassword } from "@/lib/patient-password";
import { casesForEmail } from "@/lib/cases";
import { requestPhoneCode, verifyPhoneCode, type PhoneCodeRequest } from "@/lib/phone-codes";
import { allowHit } from "@/lib/rate-limit";
import { COUNTRIES } from "@/lib/countries";
import { CHANNELS, type ContactChannel } from "@/lib/journey-rules";
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
  redirect(`${afterCode(page, email, result)}${resetting(formData) ? "&then=password" : ""}`);
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
  const channels = [...new Set(formData.getAll("channels").map(String))].filter((value): value is ContactChannel => (CHANNELS as readonly string[]).includes(value));
  if (channels.length) {
    details.channels = channels;
    const main = String(formData.get("main") ?? "");
    details.mainChannel = channels.includes(main as ContactChannel) ? (main as ContactChannel) : channels[0];
  }
  const gender = String(formData.get("gender") ?? "");
  if (gender === "male" || gender === "female") details.gender = gender;
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
    redirect(`${page}?sent=1&email=${encodeURIComponent(email)}&error=code${resetting(formData) ? "&then=password" : ""}`);
  }

  await startPatientEmailSession(verified);
  if (resetting(formData)) redirect(SET_PASSWORD(locale));
  redirect(`/${locale}/portal/patient${formData.get("from") === "signup" ? "?welcome=1" : ""}`);
}

/** "Forgot password?" is a one-time-code sign-in that ends on Settings, where a new password is set. */
const resetting = (formData: FormData) => formData.get("then") === "password";
const SET_PASSWORD = (locale: Locale) => `/${locale}/portal/patient/settings?set=password#password`;

async function clientIp(): Promise<string> {
  const list = await headers();
  return list.get("x-forwarded-for")?.split(",")[0].trim() || list.get("x-real-ip") || "local";
}

/**
 * The main sign-in: one field for an email address or a mobile number, and a password. Wrong
 * address, no password set yet and wrong password all get the same answer.
 * Ten tries per account and thirty per network in fifteen minutes.
 */
export async function passwordLoginAction(formData: FormData) {
  const locale = localeOf(formData);
  const page = `/${locale}/portal/patient/login?`;
  // Mobile mode sends the country code apart from the number.
  const dial = field(formData, "dial", 6).replace(/\D/g, "");
  const typed = field(formData, "identifier", 200);
  // A number typed whole ("+998…") already has its code; a local one loses its trunk 0.
  const identifier = dial && !typed.includes("@") && !typed.startsWith("+") ? `+${dial}${typed.replace(/^0+/, "")}` : typed;
  const password = String(formData.get("password") ?? "").slice(0, 200);
  const remember = formData.get("remember") === "yes";
  const keep = `id=${encodeURIComponent(identifier)}`;
  if (!identifier || !password) redirect(`${page}error=password&${keep}`);

  const ip = await clientIp();
  if (!allowHit(`pw-id:${identifier.toLowerCase()}`, 10, 15 * 60_000) || !allowHit(`pw-ip:${ip}`, 30, 15 * 60_000)) {
    redirect(`${page}error=slow&${keep}`);
  }
  const account = await checkPassword(identifier, password).catch((error) => {
    console.error("[shifain] password sign-in failed", error);
    return null;
  });
  if (!account) redirect(`${page}error=password&${keep}`);

  await startPatientEmailSession(account.email, { remember });
  redirect(`/${locale}/portal/patient`);
}

/** WhatsApp code, step one. A number we do not know gets the same "sent" as one we do. */
export async function requestPhoneCodeAction(formData: FormData) {
  const locale = localeOf(formData);
  const page = `/${locale}/portal/patient/login`;
  const phone = field(formData, "phone", 30);
  const then = resetting(formData) ? "&then=password" : "";
  if (!allowHit(`otp-ip:${await clientIp()}`, 12, 15 * 60_000)) redirect(`${page}?otp=whatsapp&error=slow${then}`);

  const result = await requestPhoneCode(phone).catch((error): PhoneCodeRequest => {
    console.error("[shifain] could not issue a WhatsApp code", error);
    return { status: "failed" };
  });
  if (result.status === "invalid") redirect(`${page}?otp=whatsapp&error=phone${then}`);
  if (result.status === "failed") redirect(`${page}?otp=whatsapp&error=whatsapp&phone=${encodeURIComponent(phone)}${then}`);
  const params = new URLSearchParams({ otp: "whatsapp", phone, sent: "1" });
  if (result.status === "dev") params.set("dev", result.code);
  redirect(`${page}?${params.toString()}${then}`);
}

/** WhatsApp code, step two: into the account with that number, or the cases opened with it. */
export async function verifyPhoneCodeAction(formData: FormData) {
  const locale = localeOf(formData);
  const phone = field(formData, "phone", 30);
  const code = field(formData, "code", 12);
  const verified = await verifyPhoneCode(phone, code).catch((error) => {
    console.error("[shifain] could not check a WhatsApp code", error);
    return null;
  });
  if (!verified) {
    redirect(`/${locale}/portal/patient/login?otp=whatsapp&sent=1&phone=${encodeURIComponent(phone)}&error=code${resetting(formData) ? "&then=password" : ""}`);
  }
  const account = await accountForPhone(verified).catch(() => null);
  if (account) await startPatientEmailSession(account.email);
  else await startPatientSession(verified);
  if (resetting(formData)) redirect(SET_PASSWORD(locale));
  redirect(`/${locale}/portal/patient`);
}

/** Set or change the password, from Settings — also where "Forgot password?" ends, signed in by a one-time code. */
export async function setPasswordAction(formData: FormData) {
  const locale = localeOf(formData);
  const page = `/${locale}/portal/patient/settings`;
  const identity = await currentPatient().catch(() => null);
  if (!identity) redirect(`/${locale}/portal/patient/login`);
  let account =
    identity.kind === "email" ? await getPatientAccount(identity.email).catch(() => null) : await accountForPhone(identity.digits).catch(() => null);
  // Signed in by an email code but never signed up (the case came from the enquiry form): the
  // address is proven, so the account is made from their latest case. Not for a phone sign-in —
  // an email typed into a form proves nothing about who owns it.
  if (!account && identity.kind === "email") {
    const latest = (await casesForEmail(identity.email).catch(() => []))[0];
    if (latest) {
      await ensureAccount(identity.email, latest.patient.name, latest.locale, { country: latest.patient.country, phone: latest.patient.phone }).catch(() => undefined);
      account = await getPatientAccount(identity.email).catch(() => null);
    }
  }
  if (!account) redirect(`${page}?error=noaccount#password`);

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < MIN_PASSWORD || password.length > 200) redirect(`${page}?error=short#password`);
  if (password !== confirm) redirect(`${page}?error=mismatch#password`);

  await setAccountPassword(account.email, password);
  redirect(`${page}?done=password#password`);
}
