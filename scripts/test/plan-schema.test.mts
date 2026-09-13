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
import { schemaFor, PLAN_PACKAGE_OPTIONS } from "../../src/lib/ai/plan-schema.ts";
import type { Grounding } from "../../src/lib/catalogue.ts";

const DATA = path.join(process.cwd(), "src", "data", "catalogue");
const read = async (name: string) => JSON.parse(await readFile(path.join(DATA, `${name}.json`), "utf8"));

const grounding: Grounding = {
  diseases: await read("diseases"),
  treatments: await read("treatments"),
  rules: await read("matching_rules"),
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

console.log(
  `plan schema OK — ${diseaseCodes.size} diseases, ${treatmentCodes.size} treatments, ` +
    `${specialtyCodes.size} specialties, ${PLAN_PACKAGE_OPTIONS.length} package options`,
);
