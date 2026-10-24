import "server-only";
import { getDb } from "./db";
import { listMatchingRules, listTreatments } from "./catalogue";
import { savePlan, type PatientCase } from "./cases";
import { PLAN_PACKAGE_OPTIONS, type Plan, type PlanPackageOption } from "./ai/plan-schema";
import { notifyCase } from "./telegram-notify";
import { toUzCyrillic } from "./uz-cyrillic";

/** The one line under the treatment, in the patient's language: the plan page shows it as written. */
const WHY = {
  en: "Chosen by your coordinator after reading your case.",
  ru: "Выбрано вашим координатором после изучения вашего случая.",
  uz: "Holatingizni o'rganib chiqib, koordinatoringiz tanlagan.",
};
const whyIn = (locale: string) => (locale === "ru" ? WHY.ru : locale === "uz" ? WHY.uz : locale === "oz" ? toUzCyrillic(WHY.uz) : WHY.en);

export type HandPlan = {
  understanding: string;
  diseaseCode: string | null;
  treatmentCode: string | null;
  city: string | null;
  inpatientNights: number | null;
  daysInCountry: number | null;
  packages: string[];
  questions: string[];
  missing: string[];
  redFlag: string | null;
};

/**
 * A plan written by a coordinator, for a case the planner could not finish (or
 * one they want to correct). It has the same shape as the planner's, so the
 * patient's plan page, estimate and package read it the same way. Stay lengths
 * default to the catalogue's matching rule when left empty.
 */
export async function writePlanByHand(reference: string, input: HandPlan, by: string): Promise<boolean> {
  const db = await getDb();
  const record = await db.collection<PatientCase>("cases").findOne({ _id: reference }, { projection: { plan: 1, locale: 1 } });
  if (!record) return false;

  const [treatments, rules] = await Promise.all([listTreatments(), listMatchingRules()]);
  const treatment = input.treatmentCode ? treatments.find((item) => item._id === input.treatmentCode) ?? null : null;
  const rule = treatment ? rules.find((item) => item.treatmentCode === treatment._id && (!input.diseaseCode || item.diseaseCode === input.diseaseCode)) ?? null : null;
  const nights = input.inpatientNights ?? rule?.inpatientNights.max ?? treatment?.inpatientNights.max ?? 0;
  const days = input.daysInCountry ?? rule?.daysInCountry.max ?? treatment?.daysInCountry.max ?? 0;

  const plan: Plan = {
    redFlag: { present: Boolean(input.redFlag), message: input.redFlag ?? "" },
    understanding: input.understanding,
    reportsRead: record.plan?.reportsRead ?? [],
    diseaseCode: input.diseaseCode,
    treatments: treatment ? [{ treatmentCode: treatment._id, why: whyIn(record.locale) }] : [],
    recommendedTreatmentCode: treatment?._id ?? null,
    specialtyCode: rule?.specialtyCode ?? treatment?.primarySpecialtyCode ?? null,
    destinationCity: input.city,
    stay: { inpatientNights: Math.max(0, Math.round(nights)), daysInCountry: Math.max(0, Math.round(days)) },
    itinerary: record.plan?.itinerary ?? [],
    suggestedPackage: input.packages.filter((item): item is PlanPackageOption => (PLAN_PACKAGE_OPTIONS as readonly string[]).includes(item)),
    leisureSuitable: false,
    questionsForPatient: input.questions,
    missingReports: input.missing,
    confidence: "medium",
  };

  await savePlan(reference, plan);
  await db
    .collection<PatientCase>("cases")
    .updateOne({ _id: reference }, { $push: { planEdits: { at: new Date().toISOString(), via: "coordinator", change: `Plan written by ${by}` } } } as never);
  await notifyCase(reference, { kind: "status", status: "planned" }).catch(() => undefined);
  return true;
}
