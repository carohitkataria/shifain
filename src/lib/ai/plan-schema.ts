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

// ---------------------------------------------------------------- Gemini schema

type JsonNode = Record<string, unknown>;

/**
 * Gemini's responseSchema takes an OpenAPI subset: no type unions, no null in
 * enums, no additionalProperties. Nullable fields become `nullable: true`.
 * The plan is normalised afterwards anyway, so nothing here is load-bearing
 * for safety — it only steers the model towards the right shape.
 */
export function toGeminiSchema(node: JsonNode): JsonNode {
  const out: JsonNode = {};
  let type = node.type;
  if (Array.isArray(type)) {
    const concrete = type.filter((t) => t !== "null");
    if (concrete.length < type.length) out.nullable = true;
    type = concrete[0];
  }
  if (type) out.type = type;
  if (typeof node.description === "string") out.description = node.description;
  if (Array.isArray(node.enum)) {
    const values = node.enum.filter((v) => v !== null);
    if (values.length < node.enum.length) out.nullable = true;
    out.enum = values;
    if (type === "string") out.format = "enum";
  }
  if (node.properties && typeof node.properties === "object") {
    const props = node.properties as Record<string, JsonNode>;
    out.properties = Object.fromEntries(Object.entries(props).map(([k, v]) => [k, toGeminiSchema(v)]));
    out.propertyOrdering = Object.keys(props);
  }
  if (Array.isArray(node.required)) out.required = node.required;
  if (node.items && typeof node.items === "object") out.items = toGeminiSchema(node.items as JsonNode);
  return out;
}

// ---------------------------------------------------------------- normalising

const text = (value: unknown, max = 2000) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const texts = (value: unknown, max = 20) =>
  Array.isArray(value) ? value.map((v) => text(v, 500)).filter(Boolean).slice(0, max) : [];
const count = (value: unknown) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 365) : 0;
};

/**
 * Holds any model's answer to the catalogue, whichever provider wrote it. A
 * code that is not ours is dropped rather than shown to a patient, stay
 * lengths are kept inside the matching rule, and anything that had to be
 * corrected lowers confidence so a coordinator looks more closely.
 */
export function normalisePlan(raw: unknown, grounding: Grounding, reportsUploaded: number): Plan {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("The planner did not return a plan object.");
  }
  const r = raw as Record<string, unknown>;
  const diseases = new Set(grounding.diseases.map((d) => d._id));
  const treatmentById = new Map(grounding.treatments.map((t) => [t._id, t]));
  const specialties = new Set(grounding.rules.map((rule) => rule.specialtyCode));
  const cities = new Set(grounding.cities.map((c) => c.name));
  let corrected = false;

  const pick = (value: unknown, valid: Set<string> | Map<string, unknown>): string | null => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value === "string" && valid.has(value)) return value;
    corrected = true;
    return null;
  };

  const diseaseCode = pick(r.diseaseCode, diseases);
  const treatments = (Array.isArray(r.treatments) ? r.treatments : [])
    .map((t) => (t && typeof t === "object" ? (t as Record<string, unknown>) : {}))
    .filter((t) => {
      const ok = typeof t.treatmentCode === "string" && treatmentById.has(t.treatmentCode);
      if (!ok) corrected = true;
      return ok;
    })
    .map((t) => ({ treatmentCode: t.treatmentCode as string, why: text(t.why, 400) }))
    .slice(0, 6);

  const recommendedTreatmentCode = pick(r.recommendedTreatmentCode, treatmentById);
  if (recommendedTreatmentCode && !treatments.some((t) => t.treatmentCode === recommendedTreatmentCode)) {
    treatments.unshift({ treatmentCode: recommendedTreatmentCode, why: "" });
  }

  const rule =
    grounding.rules.find((x) => x.diseaseCode === diseaseCode && x.treatmentCode === recommendedTreatmentCode) ??
    grounding.rules.find((x) => x.treatmentCode === recommendedTreatmentCode);

  let specialtyCode = pick(r.specialtyCode, specialties);
  if (!specialtyCode && rule) specialtyCode = rule.specialtyCode;

  const stayRaw = (r.stay && typeof r.stay === "object" ? r.stay : {}) as Record<string, unknown>;
  let inpatientNights = count(stayRaw.inpatientNights);
  let daysInCountry = count(stayRaw.daysInCountry);
  if (rule) {
    const clamp = (n: number, range: { min: number; max: number }) => Math.min(range.max, Math.max(range.min, n));
    const nights = clamp(inpatientNights, rule.inpatientNights);
    const days = clamp(daysInCountry, rule.daysInCountry);
    if (nights !== inpatientNights || days !== daysInCountry) corrected = true;
    inpatientNights = nights;
    daysInCountry = days;
  }

  const flagRaw = (r.redFlag && typeof r.redFlag === "object" ? r.redFlag : {}) as Record<string, unknown>;
  const flagPresent = flagRaw.present === true;
  const redFlag = {
    present: flagPresent,
    message: flagPresent
      ? text(flagRaw.message, 600) ||
        "Something in your reports needs urgent attention. Please seek emergency care where you are now, before planning any travel."
      : "",
  };

  const destinationCity = pick(r.destinationCity, cities);
  const recommended = recommendedTreatmentCode ? treatmentById.get(recommendedTreatmentCode) : undefined;
  // Every correction above must be counted before confidence is settled.
  let confidence: Plan["confidence"] =
    r.confidence === "high" || r.confidence === "medium" || r.confidence === "low" ? r.confidence : "low";
  if (reportsUploaded === 0 && confidence === "high") confidence = "medium";
  if (corrected || !diseaseCode) confidence = "low";

  const packageOptions = new Set<string>(PLAN_PACKAGE_OPTIONS);
  const suggestedPackage = [...new Set(texts(r.suggestedPackage))].filter((o): o is PlanPackageOption =>
    packageOptions.has(o),
  );

  return {
    redFlag,
    understanding:
      text(r.understanding, 1200) ||
      "We have your details. A coordinator and the treating doctor will review them and confirm the plan with you.",
    reportsRead: reportsUploaded > 0 ? texts(r.reportsRead) : [],
    diseaseCode,
    treatments,
    recommendedTreatmentCode,
    specialtyCode,
    destinationCity,
    stay: { inpatientNights, daysInCountry },
    itinerary: (Array.isArray(r.itinerary) ? r.itinerary : [])
      .map((i) => (i && typeof i === "object" ? (i as Record<string, unknown>) : {}))
      .map((i) => ({ day: text(i.day, 60), title: text(i.title, 120), detail: text(i.detail, 600) }))
      .filter((i) => i.title || i.detail)
      .slice(0, 20),
    suggestedPackage,
    leisureSuitable: r.leisureSuitable === true && Boolean(recommended?.tourFriendly) && !flagPresent,
    questionsForPatient: texts(r.questionsForPatient, 10),
    missingReports: texts(r.missingReports, 10),
    confidence,
  };
}
