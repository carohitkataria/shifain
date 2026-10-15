"use server";

import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { deleteReports } from "@/lib/reports";
import type { PatientCase } from "@/lib/cases";
import {
  APPOINTMENT_KINDS,
  APPOINTMENT_WINDOWS,
  PORTAL_LANGUAGES,
  addPortalReports,
  cancelAppointment,
  ownedCase,
  requestAppointment,
  type AppointmentKind,
  type AppointmentWindow,
} from "@/lib/patient-portal";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

/** Actions the signed-in patient takes from the portal. Each checks the case is theirs. */

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

const back = (locale: Locale, section: string, reference: string, flag: string) =>
  `/${locale}/portal/patient/${section}?case=${encodeURIComponent(reference)}&${flag}`;

export async function uploadReportsAction(formData: FormData) {
  const locale = localeOf(formData);
  const reference = String(formData.get("case") ?? "");
  const owned = await ownedCase(reference);
  if (!owned) redirect(`/${locale}/portal/patient/login`);

  const files = formData.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);
  const added = await addPortalReports(owned.record._id, files).catch((error) => {
    console.error("[shifain] portal upload failed", owned.record._id, error);
    return 0;
  });
  redirect(back(locale, "reports", owned.record._id, added > 0 ? "done=uploaded" : "error=upload"));
}

export async function deleteReportsAction(formData: FormData) {
  const locale = localeOf(formData);
  const reference = String(formData.get("case") ?? "");
  const owned = await ownedCase(reference);
  if (!owned) redirect(`/${locale}/portal/patient/login`);
  if (formData.get("confirm") !== "yes") redirect(back(locale, "reports", owned.record._id, "error=confirm"));

  await deleteReports(owned.record._id);
  const now = new Date().toISOString();
  const db = await getDb();
  await db.collection<PatientCase>("cases").updateOne({ _id: owned.record._id }, {
    $set: { reportsExpireAt: null, updatedAt: now },
    $push: { planEdits: { at: now, via: "portal", change: "Asked for every stored report to be deleted now" } },
  } as never);
  redirect(back(locale, "reports", owned.record._id, "done=deleted"));
}

export async function requestAppointmentAction(formData: FormData) {
  const locale = localeOf(formData);
  const reference = String(formData.get("case") ?? "");
  const owned = await ownedCase(reference);
  if (!owned) redirect(`/${locale}/portal/patient/login`);

  const kind = String(formData.get("kind") ?? "") as AppointmentKind;
  const window = String(formData.get("window") ?? "") as AppointmentWindow;
  const language = String(formData.get("language") ?? "");
  const date = String(formData.get("date") ?? "");
  const timezone = String(formData.get("timezone") ?? "").trim() || "UTC";
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);

  // From tomorrow (allowing for time zones) to six months ahead.
  const day = Date.parse(`${date}T12:00:00Z`);
  const valid =
    APPOINTMENT_KINDS.includes(kind) &&
    APPOINTMENT_WINDOWS.includes(window) &&
    PORTAL_LANGUAGES.some((item) => item.code === language) &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(day) &&
    day >= Date.now() &&
    day <= Date.now() + 183 * 86_400_000 &&
    /^[A-Za-z0-9_/+-]{1,64}$/.test(timezone);
  if (!valid) redirect(back(locale, "schedule", owned.record._id, "error=request"));

  await requestAppointment(owned.record._id, { kind, window, language, date, timezone, note });
  redirect(back(locale, "schedule", owned.record._id, "done=requested"));
}

export async function cancelAppointmentAction(formData: FormData) {
  const locale = localeOf(formData);
  const reference = String(formData.get("case") ?? "");
  const owned = await ownedCase(reference);
  if (!owned) redirect(`/${locale}/portal/patient/login`);
  await cancelAppointment(owned.record._id, String(formData.get("id") ?? ""));
  redirect(back(locale, "schedule", owned.record._id, "done=cancelled"));
}
