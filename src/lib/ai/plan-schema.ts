import type { Grounding } from "../catalogue";

/**
 * The shape the planner must return, and the JSON Schema that enforces it.
 *
 * Kept apart from the client call so the schema can be built and checked
 * without reaching for the network or the database.
 */
export const PLAN_PACKAGE_OPTIONS = [
  "flights",
  "airport-transfers",
  "visa-support",
  "accommodation",
  "interpreter",
  "local-sim",
  "meals",
  "post-treatment-followup",
] as const;

export type PlanPackageOption = (typeof PLAN_PACKAGE_OPTIONS)[number];

export type Plan = {
  redFlag: { present: boolean; message: string };
  understanding: string;
  reportsRead: string[];
  diseaseCode: string | null;
  treatments: { treatmentCode: string; why: string }[];
  recommendedTreatmentCode: string | null;
  specialtyCode: string | null;
  /** Where we would most likely place this case, from the cities we cover. */
  destinationCity: string | null;
  stay: { inpatientNights: number; daysInCountry: number };
  itinerary: { day: string; title: string; detail: string }[];
  suggestedPackage: PlanPackageOption[];
  /**
   * Whether this patient is likely to be well enough for a gentle outing.
   * Only ever set for a treatment the catalogue marks tourFriendly, and the
   * plan says plainly that the treating doctor decides.
   */
  leisureSuitable: boolean;
  questionsForPatient: string[];
  missingReports: string[];
  confidence: "low" | "medium" | "high";
};

export function schemaFor(grounding: Grounding): Record<string, unknown> {
  const diseaseCodes = grounding.diseases.map((d) => d._id);
  const treatmentCodes = grounding.treatments.map((t) => t._id);
  const specialtyCodes = [...new Set(grounding.rules.map((r) => r.specialtyCode))];
  const cities = grounding.cities.map((c) => c.name);

  return {
    type: "object",
    additionalProperties: false,
    required: [
      "redFlag",
      "understanding",
      "reportsRead",
      "diseaseCode",
      "treatments",
      "recommendedTreatmentCode",
      "specialtyCode",
      "destinationCity",
      "stay",
      "itinerary",
      "suggestedPackage",
      "leisureSuitable",
      "questionsForPatient",
      "missingReports",
      "confidence",
    ],
    properties: {
      redFlag: {
        type: "object",
        additionalProperties: false,
        required: ["present", "message"],
        properties: {
          present: { type: "boolean" },
          message: { type: "string", description: "Empty unless present is true." },
        },
      },
      understanding: {
        type: "string",
        description:
          "Plain-language summary of what you were told or shown, addressed to the patient. At most 120 words.",
      },
      reportsRead: {
        type: "array",
        items: { type: "string" },
        description:
          "One short line per uploaded file describing what it was, e.g. 'Chest CT, 4 March'. Empty when no reports were uploaded.",
      },
      diseaseCode: { type: ["string", "null"], enum: [...diseaseCodes, null] },
      treatments: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["treatmentCode", "why"],
          properties: {
            treatmentCode: { type: "string", enum: treatmentCodes },
            why: { type: "string", description: "One sentence on why this pathway fits." },
          },
        },
      },
      recommendedTreatmentCode: { type: ["string", "null"], enum: [...treatmentCodes, null] },
      specialtyCode: { type: ["string", "null"], enum: [...specialtyCodes, null] },
      destinationCity: {
        type: ["string", "null"],
        enum: [...cities, null],
        description:
          "The city we would most likely place this case in, from the cities ShifaIn covers. Null if it is too early to say.",
      },
      stay: {
        type: "object",
        additionalProperties: false,
        required: ["inpatientNights", "daysInCountry"],
        properties: {
          inpatientNights: { type: "integer", minimum: 0 },
          daysInCountry: { type: "integer", minimum: 0 },
        },
      },
      itinerary: {
        type: "array",
        description:
          "The journey end to end, from reports reviewed to follow-up after returning home.",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["day", "title", "detail"],
          properties: {
            day: {
              type: "string",
              description: "e.g. 'Before travel', 'Day 1', 'Days 4-9', 'After returning home'.",
            },
            title: { type: "string" },
            detail: { type: "string" },
          },
        },
      },
      suggestedPackage: {
        type: "array",
        items: { type: "string", enum: [...PLAN_PACKAGE_OPTIONS] },
        description:
          "Which travel elements this patient is likely to want. They can add or remove any of them.",
      },
      leisureSuitable: {
        type: "boolean",
        description:
          "True only if the chosen treatment is marked tour-friendly in the catalogue AND nothing you were told suggests this particular patient would be unwell, immobile or immunosuppressed during their stay. False whenever you are unsure.",
      },
      questionsForPatient: { type: "array", items: { type: "string" } },
      missingReports: { type: "array", items: { type: "string" } },
      confidence: { type: "string", enum: ["low", "medium", "high"] },
    },
  };
}
