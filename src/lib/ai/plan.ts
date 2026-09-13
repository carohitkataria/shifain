import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { Grounding } from "../catalogue";
import { schemaFor, type Plan } from "./plan-schema";

export { PLAN_PACKAGE_OPTIONS, type Plan, type PlanPackageOption } from "./plan-schema";

/**
 * The model ShifaIn plans on. Opus is the right call here: a plan is read by a
 * frightened patient and then checked by a doctor, so the cost of a sloppy
 * reading of a report is far higher than the cost of the tokens.
 */
const MODEL = "claude-opus-5";

const MAX_REPORT_BYTES = 20 * 1024 * 1024;

export type PlanReport = { filename: string; mediaType: string; data: string };

/** What the patient told us, in their own words. */
export type PlanInput = {
  statedNeed: string;
  country: string;
  locale: string;
  reports: PlanReport[];
};

const SYSTEM = `You are the planning assistant for ShifaIn, which arranges medical treatment in India for patients travelling from abroad.

A patient has uploaded their medical reports. Your job is to read them and produce the logistical plan ShifaIn will act on: which treatment pathway the reports point to, which specialty handles it, how long the patient will be in India, and what the journey looks like day by day. A treating doctor at the hospital confirms everything you produce within 48 hours.

WHAT YOU ARE NOT DOING
- You are not diagnosing. You are reading what the reports already say and mapping it onto ShifaIn's catalogue so a coordinator and a doctor have somewhere to start.
- You never contradict or second-guess a diagnosis stated in the reports. If the reports name a condition, use it.
- You never state a price, a cost, a fee or a discount. Cost comes from the catalogue, not from you.
- You never promise an outcome, a success rate or a survival figure.

CHOOSING FROM THE CATALOGUE
- diseaseCode, recommendedTreatmentCode and every treatmentCode MUST come from the catalogue given to you. Never invent a code.
- If the reports do not support any catalogue disease, set diseaseCode to null, set confidence to "low", and say plainly in "understanding" what the reports do show and what is needed to place the case.
- Take stay lengths from the matching rule for the disease/treatment pair you chose. Do not make up your own numbers.

RED FLAGS
If the reports show something needing emergency care where the patient already is — for example an acute coronary syndrome, sepsis, an acute stroke, a critical haemoglobin or potassium, an acute abdomen, or anything else that cannot wait for international travel — set redFlag.present to true and write a direct instruction to seek local emergency care now. Travel planning is secondary to that. When there is no such finding, set redFlag.present to false and leave the message empty.

TONE
The patient is anxious and is often reading in their second language. Write plainly: short sentences, no jargon you do not immediately explain, no reassurance you cannot back up. "understanding" is addressed to the patient and is at most 120 words.

Say what is missing. If a decision needs a report you were not given — a biopsy, an ejection fraction, a recent scan, staging — list it in missingReports rather than guessing around it.`;

/** The catalogue, compact enough to cache and small enough to stay readable. */
function catalogueText(grounding: Grounding): string {
  const treatmentById = new Map(grounding.treatments.map((t) => [t._id, t]));
  const lines: string[] = ["DISEASES AND THEIR TREATMENT PATHWAYS", ""];

  for (const disease of grounding.diseases) {
    const rules = grounding.rules.filter((rule) => rule.diseaseCode === disease._id);
    lines.push(`${disease._id} — ${disease.name.en}${disease.icd10 ? ` (ICD-10 ${disease.icd10})` : ""}`);
    for (const rule of rules) {
      const treatment = treatmentById.get(rule.treatmentCode);
      lines.push(
        `    ${rule.treatmentCode} — ${treatment?.name.en ?? rule.treatmentCode}` +
          ` · specialty ${rule.specialtyCode}` +
          ` · ${rule.inpatientNights.min}-${rule.inpatientNights.max} inpatient nights` +
          ` · ${rule.daysInCountry.min}-${rule.daysInCountry.max} days in India`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

function reportBlocks(reports: PlanReport[]): Anthropic.ContentBlockParam[] {
  return reports.flatMap((report): Anthropic.ContentBlockParam[] => {
    if (report.mediaType === "application/pdf") {
      return [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: report.data },
          title: report.filename,
        },
      ];
    }
    if (report.mediaType.startsWith("image/")) {
      return [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: report.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: report.data,
          },
        },
      ];
    }
    return [];
  });
}

export class PlanUnavailableError extends Error {}

/**
 * Reads the uploaded reports and returns the plan, or throws. The caller
 * records the failure on the case so a coordinator picks it up by hand —
 * a patient who has uploaded their reports is never dropped.
 */
export async function generatePlan(input: PlanInput, grounding: Grounding): Promise<Plan> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new PlanUnavailableError("ANTHROPIC_API_KEY is not set.");
  }
  if (grounding.diseases.length === 0) {
    throw new PlanUnavailableError("The catalogue is empty, so there is nothing to plan against.");
  }

  const usable = input.reports.filter((r) => r.data.length > 0);
  const totalBytes = usable.reduce((sum, r) => sum + Math.floor((r.data.length * 3) / 4), 0);
  if (totalBytes > MAX_REPORT_BYTES) {
    throw new PlanUnavailableError("The uploaded reports are too large to read in one request.");
  }

  const client = new Anthropic();

  const content: Anthropic.ContentBlockParam[] = [
    ...reportBlocks(usable),
    {
      type: "text",
      text: [
        `The patient is travelling from ${input.country}.`,
        input.statedNeed ? `In their own words, what they are seeking: "${input.statedNeed}".` : "",
        usable.length === 0
          ? "They have not uploaded any reports yet — plan from their stated need alone and be explicit in missingReports about what you need to see."
          : `They uploaded ${usable.length} file(s): ${usable.map((r) => r.filename).join(", ")}.`,
        "",
        "Produce the plan.",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: schemaFor(grounding) },
    },
    system: [
      { type: "text", text: SYSTEM },
      // The catalogue is identical on every request, so it is worth caching.
      { type: "text", text: catalogueText(grounding), cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content }],
  });

  const response = await stream.finalMessage();

  if (response.stop_reason === "refusal") {
    throw new PlanUnavailableError("The request was declined, so a coordinator will plan this case by hand.");
  }

  const text = response.content.find((block) => block.type === "text")?.text;
  if (!text) throw new PlanUnavailableError("The planner returned nothing to read.");

  return JSON.parse(text) as Plan;
}
