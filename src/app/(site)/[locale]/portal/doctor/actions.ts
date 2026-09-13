"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { authenticate, currentPartner, endPartnerSession, startPartnerSession } from "@/lib/partner-auth";
import { createCase, savePlan, savePlanFailure, type CaseReport } from "@/lib/cases";
import { loadGrounding } from "@/lib/catalogue";
import { generatePlan, type PlanReport } from "@/lib/ai/plan";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

const MAX_FILES = 10;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const READABLE = /^(application\/pdf|image\/(png|jpeg|gif|webp))$/;

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
  const phone = String(formData.get("phone") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const need = String(formData.get("need") ?? "").trim();
  if (!name || !phone || !country || !need) redirect(`/${locale}/portal/doctor?error=1`);

  const uploads = formData
    .getAll("reports")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const totalBytes = uploads.reduce((sum, file) => sum + file.size, 0);
  if (uploads.length > MAX_FILES || totalBytes > MAX_TOTAL_BYTES) {
    redirect(`/${locale}/portal/doctor?error=1`);
  }

  const files: { meta: CaseReport; body: PlanReport }[] = await Promise.all(
    uploads.map(async (file) => {
      const mediaType = READABLE.test(file.type) ? file.type : "application/octet-stream";
      return {
        meta: { filename: file.name, mediaType, bytes: file.size },
        body: {
          filename: file.name,
          mediaType,
          data: READABLE.test(file.type)
            ? Buffer.from(await file.arrayBuffer()).toString("base64")
            : "",
        },
      };
    }),
  );

  const record = await createCase({
    status: "planning",
    locale,
    patient: { name, phone, country, email: null },
    statedNeed: need,
    reports: files.map((f) => f.meta),
    referredBy: doctor._id,
  });

  after(async () => {
    try {
      const plan = await generatePlan(
        { statedNeed: need, country, locale, reports: files.map((f) => f.body) },
        await loadGrounding(),
      );
      await savePlan(record._id, plan);
    } catch (error) {
      console.error("[shifain] could not plan referral", record._id, error);
      await savePlanFailure(
        record._id,
        error instanceof Error ? error.message : "The planner did not complete.",
      ).catch(() => undefined);
    }
  });

  redirect(`/${locale}/plan/${record._id}`);
}
