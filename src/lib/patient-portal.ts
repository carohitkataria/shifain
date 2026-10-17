import "server-only";
import crypto from "node:crypto";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getDb, isDatabaseConfigured } from "./db";
import { casesForEmail, casesForPhone, type PatientCase, type PlanEdit } from "./cases";
import { currentPatient, getPatientAccount, normalisePhone, type PatientAccount, type PatientIdentity } from "./patient-auth";
import { MAX_REPORT_BYTES, storeReports, type ReportUpload } from "./reports";
import { getSettings } from "./settings";

/**
 * The patient portal's data: the signed-in patient, their cases, and what
 * they can do from the portal (add reports, ask for a call). Everything
 * shown comes from the case record; nothing is assumed.
 */

export type AppointmentKind = "coordinator" | "doctor" | "interpreter";
export type AppointmentWindow = "morning" | "afternoon" | "evening";
export type AppointmentStatus = "requested" | "confirmed" | "declined" | "cancelled";

export type Appointment = {
  id: string;
  kind: AppointmentKind;
  /** YYYY-MM-DD, in the patient's own time zone. */
  date: string;
  window: AppointmentWindow;
  timezone: string;
  language: string;
  note: string;
  status: AppointmentStatus;
  requestedAt: string;
  updatedAt: string;
  /** What the coordinator agreed, in their words ("21 Oct, 10:30 Tashkent time, Zoom"). */
  confirmedSlot?: string | null;
};

export const APPOINTMENT_KINDS: AppointmentKind[] = ["coordinator", "doctor", "interpreter"];
export const APPOINTMENT_WINDOWS: AppointmentWindow[] = ["morning", "afternoon", "evening"];

/** Languages offered for calls and the translator; speech codes for the browser's recogniser. */
export const PORTAL_LANGUAGES: { code: string; name: string; native: string; speech: string }[] = [
  { code: "uz", name: "Uzbek", native: "Oʻzbekcha", speech: "uz-UZ" },
  { code: "ru", name: "Russian", native: "Русский", speech: "ru-RU" },
  { code: "en", name: "English", native: "English", speech: "en-IN" },
  { code: "hi", name: "Hindi", native: "हिन्दी", speech: "hi-IN" },
  { code: "tg", name: "Tajik", native: "Тоҷикӣ", speech: "tg-TJ" },
  { code: "kk", name: "Kazakh", native: "Қазақша", speech: "kk-KZ" },
  { code: "ky", name: "Kyrgyz", native: "Кыргызча", speech: "ky-KG" },
  { code: "tk", name: "Turkmen", native: "Türkmençe", speech: "tk-TM" },
  { code: "az", name: "Azerbaijani", native: "Azərbaycanca", speech: "az-AZ" },
  { code: "tr", name: "Turkish", native: "Türkçe", speech: "tr-TR" },
  { code: "fa", name: "Persian", native: "فارسی", speech: "fa-IR" },
  { code: "ar", name: "Arabic", native: "العربية", speech: "ar-SA" },
  { code: "bn", name: "Bengali", native: "বাংলা", speech: "bn-BD" },
  { code: "fr", name: "French", native: "Français", speech: "fr-FR" },
];

export const languageName = (code: string) => PORTAL_LANGUAGES.find((item) => item.code === code)?.name ?? code;

type CaseWithAppointments = PatientCase & { appointments?: Appointment[] };

export type PortalData = {
  identity: PatientIdentity;
  /** Who signed up, when they did; patients who only ever sent a case have none. */
  account: PatientAccount | null;
  cases: CaseWithAppointments[];
  active: CaseWithAppointments | null;
};

/** The signed-in patient and their cases, once per request. */
const loadCases = cache(
  async (): Promise<{ identity: PatientIdentity; account: PatientAccount | null; cases: CaseWithAppointments[] } | null> => {
    if (!isDatabaseConfigured()) return null;
    const identity = await currentPatient().catch(() => null);
    if (!identity) return null;
    const [cases, account] = await Promise.all([
      (identity.kind === "email" ? casesForEmail(identity.email) : casesForPhone(identity.digits)).catch(() => []),
      identity.kind === "email" ? getPatientAccount(identity.email).catch(() => null) : null,
    ]);
    return { identity, account, cases: cases as CaseWithAppointments[] };
  },
);

/** For portal pages: the patient's cases and the one they are looking at, or off to sign in. */
export async function loadPortal(locale: string, caseParam?: string | null): Promise<PortalData> {
  const loaded = await loadCases();
  if (!loaded) redirect(`/${locale}/portal/patient/login`);
  const { identity, account, cases } = loaded;
  const wanted = caseParam?.trim().toUpperCase();
  const active =
    (wanted && cases.find((item) => item._id === wanted)) ||
    cases.find((item) => item.status !== "closed") ||
    cases[0] ||
    null;
  return { identity, account, cases, active };
}

/** Whether this signed-in patient may see or change this case. */
export function ownsCase(identity: PatientIdentity, record: Pick<PatientCase, "patient" | "accountEmail">): boolean {
  if (identity.kind === "email") {
    const email = identity.email.toLowerCase();
    return (record.patient.email ?? "").toLowerCase() === email || (record.accountEmail ?? "").toLowerCase() === email;
  }
  const known = normalisePhone(record.patient.phone);
  return identity.digits.length >= 6 && known.length >= 6 && known.endsWith(identity.digits.slice(-9));
}

/** The case, only if the signed-in patient owns it. */
export async function ownedCase(reference: string): Promise<{ identity: PatientIdentity; record: CaseWithAppointments } | null> {
  if (!isDatabaseConfigured()) return null;
  const identity = await currentPatient().catch(() => null);
  if (!identity) return null;
  const db = await getDb();
  const record = await db.collection<CaseWithAppointments>("cases").findOne({ _id: reference.trim().toUpperCase() });
  if (!record || !ownsCase(identity, record)) return null;
  return { identity, record };
}

const edit = (change: string): PlanEdit => ({ at: new Date().toISOString(), via: "portal", change });

/** Reports the patient adds from the portal, stored like the ones they sent first. */
export async function addPortalReports(reference: string, files: File[]): Promise<number> {
  const allowed = /^(application\/pdf|image\/(png|jpeg|webp|heic|heif))$/;
  const uploads: ReportUpload[] = [];
  for (const file of files.slice(0, 5)) {
    if (!file.size || file.size > MAX_REPORT_BYTES || !allowed.test(file.type)) continue;
    uploads.push({
      id: crypto.randomBytes(6).toString("hex"),
      filename: file.name.slice(0, 160) || "report",
      mediaType: file.type,
      body: Buffer.from(await file.arrayBuffer()),
    });
  }
  if (uploads.length === 0) return 0;

  const settings = await getSettings();
  const stored = await storeReports(reference, uploads, settings.reportRetentionDays);
  if (stored === 0) return 0;

  const expiresAt = new Date(Date.now() + settings.reportRetentionDays * 86_400_000).toISOString();
  const db = await getDb();
  await db.collection<PatientCase>("cases").updateOne({ _id: reference }, {
    $push: {
      reports: { $each: uploads.map((upload) => ({ id: upload.id, filename: upload.filename, mediaType: upload.mediaType, bytes: upload.body.byteLength })) },
      planEdits: edit(`Added ${uploads.length} report${uploads.length === 1 ? "" : "s"}: ${uploads.map((upload) => upload.filename).join(", ")}`),
    },
    $set: { reportsExpireAt: expiresAt, updatedAt: new Date().toISOString() },
  } as never);
  return stored;
}

/** A call the patient asks for. It stays "requested" until a coordinator confirms it. */
export async function requestAppointment(
  reference: string,
  input: Pick<Appointment, "kind" | "date" | "window" | "timezone" | "language" | "note">,
): Promise<Appointment> {
  const now = new Date().toISOString();
  const appointment: Appointment = { ...input, id: crypto.randomBytes(6).toString("hex"), status: "requested", requestedAt: now, updatedAt: now };
  const db = await getDb();
  await db.collection<CaseWithAppointments>("cases").updateOne({ _id: reference }, {
    $push: {
      appointments: appointment,
      planEdits: edit(
        `Asked for a ${input.kind} call on ${input.date}, ${input.window} (${input.timezone}), in ${languageName(input.language)}${input.note ? ` — “${input.note}”` : ""}`,
      ),
    },
    $set: { updatedAt: now },
  } as never);
  return appointment;
}

/**
 * Changes one call request. The list is rewritten whole rather than through a
 * positional update, which keeps this to plain operations every MongoDB-compatible
 * store supports; requests on one case are few and rarely changed at once.
 */
async function changeAppointment(
  reference: string,
  id: string,
  change: (appointment: Appointment) => Appointment | null,
  edit?: PlanEdit,
): Promise<boolean> {
  const db = await getDb();
  const cases = db.collection<CaseWithAppointments>("cases");
  const record = await cases.findOne({ _id: reference }, { projection: { appointments: 1 } });
  let changed = false;
  const next = (record?.appointments ?? []).map((appointment) => {
    if (appointment.id !== id) return appointment;
    const updated = change(appointment);
    if (!updated) return appointment;
    changed = true;
    return updated;
  });
  if (!changed) return false;
  const now = new Date().toISOString();
  await cases.updateOne({ _id: reference }, {
    $set: { appointments: next, updatedAt: now },
    ...(edit ? { $push: { planEdits: edit } } : {}),
  } as never);
  return true;
}

export async function cancelAppointment(reference: string, id: string): Promise<void> {
  const now = new Date().toISOString();
  await changeAppointment(
    reference,
    id,
    (appointment) => (appointment.status === "requested" ? { ...appointment, status: "cancelled", updatedAt: now } : null),
    edit("Cancelled a call request"),
  );
}

/** A coordinator answers a call request from the admin console. */
export async function answerAppointment(
  reference: string,
  id: string,
  status: "confirmed" | "declined",
  confirmedSlot: string | null,
): Promise<void> {
  const now = new Date().toISOString();
  await changeAppointment(reference, id, (appointment) => ({
    ...appointment,
    status,
    confirmedSlot: confirmedSlot?.slice(0, 200) || null,
    updatedAt: now,
  }));
}

export type HistoryEvent = {
  at: string;
  kind: "created" | "reports" | "planned" | "replan" | "change" | "note" | "call" | "confirmed";
  detail?: string;
  via?: PlanEdit["via"];
  /** For a call request, so the page can describe it in the patient's language. */
  appointment?: Appointment;
};

/** The case's story from what the record holds, newest first. */
export function caseHistory(record: CaseWithAppointments): HistoryEvent[] {
  const edits = record.planEdits ?? [];
  const events: HistoryEvent[] = [{ at: record.createdAt, kind: "created", detail: record.statedNeed ?? undefined }];
  const addedLater = new Set(
    edits.flatMap((change) => (/^Added \d+ reports?: /.test(change.change) ? change.change.replace(/^Added \d+ reports?: /, "").split(", ") : [])),
  );
  const firstReports = record.reports.filter((report) => !addedLater.has(report.filename));
  if (firstReports.length) {
    events.push({ at: record.createdAt, kind: "reports", detail: firstReports.map((report) => report.filename).join(", ") });
  }
  for (const at of record.replans ?? []) events.push({ at, kind: "replan" });
  for (const change of edits) {
    // Calls are told from the request itself below; this line is the coordinators' log.
    if (/^Asked for a .* call/.test(change.change) || change.change === "Cancelled a call request") continue;
    if (/^Added \d+ reports?: /.test(change.change)) {
      events.push({ at: change.at, kind: "reports", detail: change.change.replace(/^Added \d+ reports?: /, ""), via: change.via });
    } else if (change.change.startsWith("Added medical details")) {
      events.push({ at: change.at, kind: "note", via: change.via });
    } else {
      events.push({ at: change.at, kind: "change", detail: change.change, via: change.via });
    }
  }
  for (const appointment of record.appointments ?? []) {
    events.push({ at: appointment.requestedAt, kind: "call", via: "portal", appointment });
  }
  if (record.plan && record.status !== "planning") {
    // The plan's own time is not stored; the latest re-plan, else the case's opening, is the closest truth.
    const at = (record.replans ?? []).at(-1) ?? record.createdAt;
    events.push({ at, kind: "planned", detail: record.plan.understanding.slice(0, 220) });
  }
  if (record.status === "confirmed" && record.updatedAt) events.push({ at: record.updatedAt, kind: "confirmed" });
  return events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
