import "server-only";
import { after } from "next/server";
import { loadGrounding } from "./catalogue";
import { createCase, describeRequest, getCase, savePlan, savePlanFailure, type CaseRequest, type CaseSource, type CaseStatus, type PatientCase } from "./cases";
import { getDb } from "./db";
import { generatePlan } from "./ai/plan";
import { expiryFromNow, listReports, readReport, storeReports } from "./reports";
import { getSettings } from "./settings";
import { notifyOps } from "./mailer";
import { sendCaseUpdate } from "./telegram-notify";
import type { Intake } from "./intake";
import type { Locale } from "./i18n";

/**
 * Opens a case and starts the plan behind it.
 *
 * The plan takes about a minute, so it runs after the response has gone: the
 * patient gets their page immediately and it fills itself in. A failure is
 * recorded on the case rather than thrown, because a patient who has told us
 * about their illness must never be dropped on the floor.
 */
export async function openCase(input: {
  locale: Locale;
  patient: { name: string; phone: string; country: string; email: string | null };
  intake: Intake;
  source: CaseSource;
  /** A partner user id, only when the partner is known at intake time. */
  referredBy: string | null;
  status?: CaseStatus;
  /** The hospital or doctor page the patient asked from. */
  requested?: CaseRequest | null;
}): Promise<PatientCase> {
  const { intake } = input;
  const settings = await getSettings();

  const record = await createCase({
    status: input.status ?? "planning",
    locale: input.locale,
    patient: input.patient,
    statedNeed: intake.statedNeed || null,
    intakeRoute: intake.route,
    description: intake.description,
    answers: intake.answers as Record<string, string> | null,
    reports: intake.meta,
    reportsExpireAt:
      intake.uploads.length > 0
        ? expiryFromNow(settings.reportRetentionDays).toISOString()
        : null,
    source: input.source,
    referredBy: input.referredBy,
    requested: input.requested ?? null,
  });

  after(async () => {
    // The inbox learns a case arrived, not what is wrong with anybody.
    await notifyOps(settings.opsEmail, `New case ${record._id}`, [
      `A new case opened from ${input.patient.country}.`,
      `Reference: ${record._id}`,
      `Route: ${intake.route}`,
      `Came in through: ${input.source}${input.referredBy ? ` (partner ${input.referredBy})` : ""}`,
      "",
      "Open it in the console under Patient cases. Nothing clinical is in this email.",
    ]);

    if (intake.uploads.length > 0) {
      await storeReports(record._id, intake.uploads, settings.reportRetentionDays).catch((error) =>
        // The plan matters more than the archive, so this never blocks it.
        console.error("[shifain] could not store reports for", record._id, error),
      );
    }

    if (!settings.plannerEnabled) {
      // Turned off deliberately: the case stands, a coordinator plans it.
      await savePlanFailure(
        record._id,
        "Automatic planning is switched off. A coordinator is preparing this plan by hand.",
      ).catch(() => undefined);
      return;
    }

    try {
      const plan = await generatePlan(
        {
          statedNeed: intake.statedNeed,
          country: input.patient.country,
          locale: input.locale,
          reports: intake.forPlanner,
          description: intake.description,
          answers: intake.answers,
          requested: describeRequest(input.requested),
        },
        await loadGrounding(),
      );
      // A day out is offered at all only while the site is offering them.
      if (!settings.offerTourism) plan.leisureSuitable = false;
      await savePlan(record._id, plan);
      await sendCaseUpdate(record._id, "planned", input.patient.phone).catch(() => undefined);
    } catch (error) {
      console.error("[shifain] could not plan case", record._id, error);
      await savePlanFailure(
        record._id,
        error instanceof Error ? error.message : "The planner did not complete.",
      ).catch(() => undefined);
    }
  });

  return record;
}

/** How many times a patient may ask for a fresh plan in a day. Each one is an AI call. */
export const REPLANS_PER_DAY = 2;

export type ReplanResult = "started" | "busy" | "limit" | "missing" | "off";

/**
 * Plans a case again with what the patient has added since — new symptoms,
 * results, a preferred city. Their own package choices are laid back over
 * the new plan, so asking for an update never undoes "no hotel, please".
 */
export async function replanCase(reference: string): Promise<ReplanResult> {
  const record = await getCase(reference);
  if (!record) return "missing";
  if (record.status === "planning") return "busy";

  const settings = await getSettings();
  if (!settings.plannerEnabled) return "off";

  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recent = (record.replans ?? []).filter((at) => Date.parse(at) > dayAgo);
  if (recent.length >= REPLANS_PER_DAY) return "limit";

  const now = new Date().toISOString();
  const db = await getDb();
  const claimed = await db.collection<PatientCase>("cases").updateOne(
    { _id: reference, status: { $ne: "planning" } },
    { $set: { status: "planning", planError: null, updatedAt: now }, $push: { replans: now } },
  );
  if (claimed.modifiedCount === 0) return "busy";

  after(async () => {
    try {
      const prefs = record.preferences ?? {};
      const added = (prefs.notes ?? []).map((note) => `Update from the patient (${note.at.slice(0, 10)}): ${note.text}`);
      const wishes = [
        prefs.city ? `The patient would prefer treatment in ${prefs.city}.` : null,
        prefs.travel ? `They would like to travel ${prefs.travel}.` : null,
        typeof prefs.companions === "number" ? `Travelling companions: ${prefs.companions}.` : null,
      ].filter(Boolean) as string[];

      const reports = [];
      for (const stored of await listReports(reference).catch(() => [])) {
        if (!/^(application\/pdf|image\/(png|jpeg|gif|webp))$/.test(stored.mediaType)) continue;
        const file = await readReport(reference, stored._id).catch(() => null);
        if (file) reports.push({ filename: file.filename, mediaType: file.mediaType, data: file.body.toString("base64") });
      }

      const plan = await generatePlan(
        {
          statedNeed: record.statedNeed ?? "",
          country: record.patient.country,
          locale: record.locale as Locale,
          reports,
          description: [record.description, ...added, ...wishes].filter(Boolean).join("\n\n") || null,
          answers: record.answers,
          requested: describeRequest(record.requested),
        },
        await loadGrounding(),
      );
      if (!settings.offerTourism) plan.leisureSuitable = false;
      for (const [service, include] of Object.entries(prefs.packages ?? {})) {
        const has = plan.suggestedPackage.includes(service as never);
        if (include && !has) plan.suggestedPackage.push(service as never);
        if (!include && has) plan.suggestedPackage = plan.suggestedPackage.filter((item) => item !== service);
      }
      await savePlan(reference, plan);
      await sendCaseUpdate(reference, "planned", record.patient.phone).catch(() => undefined);
    } catch (error) {
      console.error("[shifain] could not re-plan case", reference, error);
      // The earlier plan is still on the case; put it back in front of the patient.
      await db
        .collection<PatientCase>("cases")
        .updateOne(
          { _id: reference },
          record.plan
            ? { $set: { status: record.status, updatedAt: new Date().toISOString() } }
            : { $set: { status: "plan-failed", planError: "The planner did not complete." } },
        )
        .catch(() => undefined);
    }
  });

  return "started";
}
