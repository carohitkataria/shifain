import "server-only";
import { after } from "next/server";
import { loadGrounding } from "./catalogue";
import { createCase, savePlan, savePlanFailure, type CaseStatus, type PatientCase } from "./cases";
import { generatePlan } from "./ai/plan";
import { expiryFromNow, storeReports } from "./reports";
import { getSettings } from "./settings";
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
  referredBy: string | null;
  status?: CaseStatus;
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
    referredBy: input.referredBy,
  });

  after(async () => {
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
        },
        await loadGrounding(),
      );
      // A day out is offered at all only while the site is offering them.
      if (!settings.offerTourism) plan.leisureSuitable = false;
      await savePlan(record._id, plan);
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
