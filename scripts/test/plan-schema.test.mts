/**
 * Checks the contract the planner is held to, without calling the model:
 * the schema is well-formed, it only ever offers real catalogue codes, and a
 * plausible plan validates against it.
 *
 *   node --experimental-strip-types scripts/test/plan-schema.test.mts
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { schemaFor, normalisePlan, toGeminiSchema, PLAN_PACKAGE_OPTIONS } from "../../src/lib/ai/plan-schema.ts";
import type { Grounding } from "../../src/lib/catalogue.ts";

const DATA = path.join(process.cwd(), "src", "data", "catalogue");
const read = async (name: string) => JSON.parse(await readFile(path.join(DATA, `${name}.json`), "utf8"));

const grounding: Grounding = {
  diseases: await read("diseases"),
  treatments: await read("treatments"),
  rules: await read("matching_rules"),
  cities: await read("cities"),
  coverage: [],
};

type SchemaNode = {
  type?: unknown;
  additionalProperties?: unknown;
  required?: string[];
  enum?: (string | null)[];
  items?: SchemaNode & { properties?: Record<string, SchemaNode> };
  properties?: Record<string, SchemaNode>;
};

const schema = schemaFor(grounding) as SchemaNode;

// The schema must survive the round trip the API puts it through.
JSON.parse(JSON.stringify(schema));

const props = schema.properties!;
assert.equal(schema.type, "object");
assert.equal(schema.additionalProperties, false);
assert.deepEqual(
  [...schema.required!].sort(),
  Object.keys(props).sort(),
  "every property must be required, or the model can silently omit one",
);

// Nothing outside the catalogue may be offered as a choice.
const diseaseCodes = new Set(grounding.diseases.map((d) => d._id));
const treatmentCodes = new Set(grounding.treatments.map((t) => t._id));
const specialtyCodes = new Set(grounding.rules.map((r) => r.specialtyCode));

for (const code of props.diseaseCode.enum!) {
  assert.ok(code === null || diseaseCodes.has(code), `unknown disease code ${code}`);
}
for (const code of props.recommendedTreatmentCode.enum!) {
  assert.ok(code === null || treatmentCodes.has(code), `unknown treatment code ${code}`);
}
for (const code of props.specialtyCode.enum!) {
  assert.ok(code === null || specialtyCodes.has(code), `unknown specialty code ${code}`);
}
assert.equal(props.diseaseCode.enum!.length, diseaseCodes.size + 1, "null must be offered");
assert.equal(props.treatments.items!.properties!.treatmentCode.enum!.length, treatmentCodes.size);

// Only the cities we actually cover may be offered as a destination.
const cityNames = new Set(grounding.cities.map((city) => city.name));
for (const name of props.destinationCity.enum!) {
  assert.ok(name === null || cityNames.has(name), `unknown city ${name}`);
}
assert.equal(props.destinationCity.enum!.length, cityNames.size + 1, "null must be offered");

// A day out is only ever offered where the catalogue says the pathway allows
// it, so every tour-friendly treatment needs somewhere to go.
const attractions = await read("attractions");
const withAttractions = new Set(attractions.map((a: { city: string }) => a.city));
for (const city of cityNames) {
  assert.ok(withAttractions.has(city), `no attractions for ${city}, which the planner can pick`);
}
const tourFriendly = grounding.treatments.filter((t) => t.tourFriendly);
assert.ok(tourFriendly.length > 0, "no treatment is marked tour-friendly");
assert.ok(
  tourFriendly.every((t) => t.daysInCountry.min >= 5),
  "a pathway too short for an outing should not be tour-friendly",
);

// Every package option the model can suggest must have copy to render it.
const { PACKAGE_LINES } = await import("../../src/lib/plan-copy.ts");
for (const option of PLAN_PACKAGE_OPTIONS) {
  assert.ok(option in PACKAGE_LINES, `no copy for package option ${option}`);
}
assert.deepEqual(
  [...props.suggestedPackage.items!.enum!].sort(),
  [...PLAN_PACKAGE_OPTIONS].sort(),
);
assert.deepEqual(
  Object.keys(PACKAGE_LINES).sort(),
  [...PLAN_PACKAGE_OPTIONS].sort(),
  "copy and schema must offer exactly the same options",
);

// And the estimate must come from the catalogue, never from the model.
const { estimateFor } = await import("../../src/lib/ai/estimate.ts");
const bands = await read("price_bands");
assert.deepEqual(estimateFor(null, bands), { kind: "none" });
assert.deepEqual(estimateFor("not-a-treatment", bands), { kind: "none" });

const cabg = estimateFor("cabg", bands);
assert.equal(cabg.kind, "indicative", "a researched band is never presented as a quote");
assert.ok(cabg.kind !== "none" && cabg.min > 0 && cabg.max > cabg.min);

for (const treatment of grounding.treatments) {
  assert.notEqual(
    estimateFor(treatment._id, bands).kind,
    "none",
    `no price band for ${treatment._id}`,
  );
}

// Every standard question must be answerable in all three languages.
const { INTAKE_COPY } = await import("../../src/lib/intake-copy.ts");
const { INTAKE_QUESTIONS } = await import("../../src/lib/ai/plan-questions.ts");
for (const question of INTAKE_QUESTIONS) {
  const copy = INTAKE_COPY.questions[question.id];
  assert.ok(copy, `no copy for intake question ${question.id}`);
  for (const locale of ["en", "ru", "uz"] as const) {
    assert.ok(copy[locale]?.trim(), `intake question ${question.id} has no ${locale}`);
  }
}

// And every country can fill in a dialling code.
const { COUNTRIES } = await import("../../src/lib/countries.ts");
for (const country of COUNTRIES) {
  assert.match(country.dial, /^[0-9]{1,4}$/, `${country.name} has a bad dialling code`);
  assert.match(country.code, /^[A-Z]{2}$/, `${country.name} has a bad ISO code`);
}

// Gemini's schema dialect: no type unions, no null in enums, nothing it rejects.
const gemini = toGeminiSchema(schemaFor(grounding));
const walk = (node: Record<string, unknown>, at: string): void => {
  assert.ok(!Array.isArray(node.type), `${at}: type unions are not accepted by Gemini`);
  assert.ok(!("additionalProperties" in node), `${at}: additionalProperties is not accepted by Gemini`);
  if (Array.isArray(node.enum)) assert.ok(!node.enum.includes(null), `${at}: null in enum`);
  for (const [key, child] of Object.entries((node.properties ?? {}) as Record<string, Record<string, unknown>>)) {
    walk(child, `${at}.${key}`);
  }
  if (node.items) walk(node.items as Record<string, unknown>, `${at}[]`);
};
walk(gemini, "plan");
const gProps = gemini.properties as Record<string, Record<string, unknown>>;
assert.equal(gProps.diseaseCode.nullable, true, "diseaseCode must stay nullable");
assert.equal((gProps.diseaseCode.enum as string[]).length, diseaseCodes.size);

// Whatever a model returns is held to the catalogue before a patient sees it.
const cabgRule = grounding.rules.find((rule) => rule.treatmentCode === "cabg")!;
const good = normalisePlan(
  {
    redFlag: { present: false, message: "" },
    understanding: "Your angiogram shows blocked heart arteries.",
    reportsRead: ["Angiogram, 4 March"],
    diseaseCode: cabgRule.diseaseCode,
    treatments: [{ treatmentCode: "cabg", why: "Several arteries are blocked." }],
    recommendedTreatmentCode: "cabg",
    specialtyCode: cabgRule.specialtyCode,
    destinationCity: grounding.cities[0].name,
    stay: { inpatientNights: cabgRule.inpatientNights.min, daysInCountry: cabgRule.daysInCountry.min },
    itinerary: [{ day: "Day 1", title: "Arrival", detail: "Met at the airport." }],
    suggestedPackage: ["flights", "not-an-option"],
    leisureSuitable: true,
    questionsForPatient: [],
    missingReports: [],
    confidence: "high",
  },
  grounding,
  1,
);
assert.equal(good.confidence, "high", "a clean plan keeps its confidence");
assert.equal(good.leisureSuitable, false, "cabg is not tour-friendly, so no outing is offered");
assert.deepEqual(good.suggestedPackage, ["flights"]);

const invented = normalisePlan(
  {
    diseaseCode: "made-up-disease",
    treatments: [{ treatmentCode: "miracle-cure", why: "" }],
    recommendedTreatmentCode: "miracle-cure",
    destinationCity: "Atlantis",
    stay: { inpatientNights: 999, daysInCountry: -3 },
    redFlag: { present: true, message: "" },
    reportsRead: ["should be dropped"],
    confidence: "high",
  },
  grounding,
  0,
);
assert.equal(invented.diseaseCode, null);
assert.equal(invented.recommendedTreatmentCode, null);
assert.equal(invented.treatments.length, 0);
assert.equal(invented.destinationCity, null);
assert.equal(invented.confidence, "low", "corrections lower confidence");
assert.deepEqual(invented.reportsRead, [], "nothing was uploaded, so nothing was read");
assert.ok(invented.redFlag.message.length > 0, "a red flag always carries an instruction");
assert.deepEqual(invented.stay, { inpatientNights: 365, daysInCountry: 0 });

const clamped = normalisePlan(
  {
    diseaseCode: cabgRule.diseaseCode,
    recommendedTreatmentCode: "cabg",
    treatments: [],
    stay: { inpatientNights: 1, daysInCountry: 200 },
    confidence: "medium",
  },
  grounding,
  0,
);
assert.deepEqual(clamped.stay, { inpatientNights: cabgRule.inpatientNights.min, daysInCountry: cabgRule.daysInCountry.max });
assert.equal(clamped.specialtyCode, cabgRule.specialtyCode, "specialty is filled from the matching rule");
assert.equal(clamped.treatments[0].treatmentCode, "cabg", "the recommendation is always among the options");
assert.throws(() => normalisePlan("not json", grounding, 0));
assert.equal(
  normalisePlan({ ...good, destinationCity: "Atlantis" }, grounding, 1).confidence,
  "low",
  "an invented city alone is enough to lower confidence",
);

console.log(
  `plan schema OK — ${diseaseCodes.size} diseases, ${treatmentCodes.size} treatments, ` +
    `${specialtyCodes.size} specialties, ${cityNames.size} cities, ` +
    `${attractions.length} attractions, ${tourFriendly.length} tour-friendly pathways, ` +
    `${INTAKE_QUESTIONS.length} standard questions, ${COUNTRIES.length} countries`,
);
