import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI, type Part } from "@google/generative-ai";
import type { Grounding } from "../catalogue";
import { normalisePlan, schemaFor, toGeminiSchema, type Plan } from "./plan-schema";
import { available, geminiBaseUrl, noteFailure, withGeminiModel } from "./providers";
import { INTAKE_QUESTIONS, type IntakeAnswers } from "./plan-questions";

export { PLAN_PACKAGE_OPTIONS, type Plan, type PlanPackageOption } from "./plan-schema";
export { INTAKE_QUESTIONS, type IntakeAnswers } from "./plan-questions";

/**
 * The model ShifaIn plans on. Opus is the right call here: a plan is read by a
 * frightened patient and then checked by a doctor, so the cost of a sloppy
 * reading of a report is far higher than the cost of the tokens.
 */
const MODEL = "claude-opus-5";

/**
 * Gemini plans first because its free tier costs nothing; Claude is the
 * fallback. GEMINI_PLAN_MODEL pins a stronger Gemini model for planning only.
 */
const GEMINI_PLAN_MODEL = process.env.GEMINI_PLAN_MODEL?.trim() || undefined;

const MAX_REPORT_BYTES = 20 * 1024 * 1024;

export type PlanReport = { filename: string; mediaType: string; data: string };

/** What the patient told us, in their own words. */
export type PlanInput = {
  statedNeed: string;
  country: string;
  locale: string;
  reports: PlanReport[];
  /** Free text, when the patient described the problem instead of uploading. */
  description?: string | null;
  /** The standard questions, when they answered those instead. */
  answers?: IntakeAnswers | null;
  /** The partner hospital or doctor they asked for from that page, e.g. "Dr X at Artemis Hospital". */
  requested?: string | null;
};

const SYSTEM = `You are the planning assistant for ShifaIn, which arranges medical treatment in India for patients travelling from abroad.

A patient has come to us in one of three ways: they uploaded their medical reports, they described the problem in their own words, or they answered a short set of standard questions because they have no reports ready or would rather not share them yet. All three are legitimate and all three get a plan.

Your job is to produce the logistical plan ShifaIn will act on: which treatment pathway this points to, which specialty handles it, which of our cities we would most likely place the case in, how long the patient will be in India, and what the journey looks like day by day. A treating doctor at the hospital confirms everything you produce within 48 hours.

Say less, and more carefully, the less you were given. A plan built from a description alone is a starting point for a conversation, not a decision — set confidence to "low", put the gaps in missingReports, and ask what you need in questionsForPatient.

WHAT YOU ARE NOT DOING
- You are not diagnosing. You are reading what the reports already say and mapping it onto ShifaIn's catalogue so a coordinator and a doctor have somewhere to start.
- You never contradict or second-guess a diagnosis stated in the reports. If the reports name a condition, use it.
- You never state a price, a cost, a fee or a discount. Cost comes from the catalogue, not from you.
- You never promise an outcome, a success rate or a survival figure.

CHOOSING FROM THE CATALOGUE
- diseaseCode, recommendedTreatmentCode and every treatmentCode MUST come from the catalogue given to you. Never invent a code.
- If the reports do not support any catalogue disease, set diseaseCode to null, set confidence to "low", and say plainly in "understanding" what the reports do show and what is needed to place the case.
- Take stay lengths from the matching rule for the disease/treatment pair you chose. Do not make up your own numbers.
- destinationCity must be one of ShifaIn's cities. Pick the one with the strongest coverage for the specialty you chose, using the coverage figures given to you. If it is too early to say, use null.

TIME OFF FROM TREATMENT
Set leisureSuitable to true only when BOTH hold: the treatment you recommended is marked "tour-friendly" in the catalogue, AND nothing you were told suggests this particular patient would be unwell, immobile or immunosuppressed while they are here. Age, a recent major illness, poor mobility, or an active cancer or transplant pathway all mean false. When you are unsure, it is false. You are not choosing where anyone goes — the site offers the options and the patient picks; you are only saying whether offering them at all would be appropriate.

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
          ` · ${rule.daysInCountry.min}-${rule.daysInCountry.max} days in India` +
          (treatment?.tourFriendly ? " · tour-friendly" : ""),
      );
    }
    lines.push("");
  }

  lines.push("WHERE WE CAN PLACE A CASE — hospitals we hold, by city and specialty", "");
  const byCity = new Map<string, string[]>();
  for (const entry of grounding.coverage) {
    const list = byCity.get(entry.city) ?? [];
    list.push(`${entry.specialtyCode} ${entry.hospitals}`);
    byCity.set(entry.city, list);
  }
  for (const city of grounding.cities) {
    const entries = byCity.get(city.name);
    lines.push(`${city.name}${entries?.length ? `: ${entries.sort().join(", ")}` : ": coverage not yet mapped"}`);
  }
  lines.push("");

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

function patientPrompt(input: PlanInput, usable: PlanReport[]): string {
  const answered = Object.entries(input.answers ?? {}).filter(([, value]) => value?.trim());
  const questionText = new Map(INTAKE_QUESTIONS.map((q) => [q.id, q.question]));
  return [
    `The patient is travelling from ${input.country}.`,
    input.statedNeed ? `What they are seeking: "${input.statedNeed}".` : "",
    input.requested
      ? `They asked for ${input.requested}, a ShifaIn partner. Plan around it (its city) unless what they describe clearly needs care it does not offer; if so, say why in "understanding".`
      : "",
    usable.length > 0 ? `They uploaded ${usable.length} file(s): ${usable.map((r) => r.filename).join(", ")}.` : "",
    input.description?.trim()
      ? `They described the problem themselves:\n"""\n${input.description.trim()}\n"""`
      : "",
    answered.length > 0
      ? `They answered the standard questions:\n${answered
          .map(([id, value]) => `  ${questionText.get(id as never) ?? id}\n    ${value!.trim()}`)
          .join("\n")}`
      : "",
    usable.length === 0 && !input.description?.trim() && answered.length === 0
      ? "They gave nothing beyond what they are seeking — say plainly in missingReports and questionsForPatient what you need, and keep confidence low."
      : "",
    usable.length === 0 ? "No reports were shared, so reportsRead must be empty and confidence must not be high." : "",
    "",
    "Produce the plan.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

const stripFence = (raw: string) => raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

async function planWithGemini(
  model: string,
  input: PlanInput,
  usable: PlanReport[],
  grounding: Grounding,
  timeoutMs: number,
): Promise<unknown> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const schema = schemaFor(grounding);
  const parts: Part[] = [
    ...usable
      .filter((r) => r.mediaType === "application/pdf" || r.mediaType.startsWith("image/"))
      .map((r): Part => ({ inlineData: { mimeType: r.mediaType, data: r.data } })),
    { text: patientPrompt(input, usable) },
  ];

  const run = async (withSchema: boolean) => {
    const generator = genAI.getGenerativeModel({
      model,
      systemInstruction: withSchema
        ? `${SYSTEM}\n\n${catalogueText(grounding)}`
        : `${SYSTEM}\n\n${catalogueText(grounding)}\n\nReturn only JSON that matches this JSON Schema exactly:\n${JSON.stringify(schema)}`,
      generationConfig: {
        responseMimeType: "application/json",
        ...(withSchema ? { responseSchema: toGeminiSchema(schema) as never } : {}),
        temperature: 0.2,
        maxOutputTokens: 16384,
      },
    }, { timeout: timeoutMs, baseUrl: geminiBaseUrl() });
    const result = await generator.generateContent({ contents: [{ role: "user", parts }] });
    const blocked = result.response.promptFeedback?.blockReason;
    if (blocked) throw new PlanUnavailableError(`Gemini declined the request (${blocked}).`);
    return JSON.parse(stripFence(result.response.text()));
  };

  try {
    return await run(true);
  } catch (error) {
    // Some models reject parts of a structured schema; plain JSON mode with
    // the schema in the instructions still works, and the plan is normalised.
    if (/\b400\b|invalid argument|schema/i.test(String(error))) return run(false);
    throw error;
  }
}

async function planWithClaude(input: PlanInput, usable: PlanReport[], grounding: Grounding): Promise<unknown> {
  const client = new Anthropic();
  const content: Anthropic.ContentBlockParam[] = [
    ...reportBlocks(usable),
    { type: "text", text: patientPrompt(input, usable) },
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
  return JSON.parse(text);
}

/**
 * Reads the uploaded reports and returns the plan, or throws. The caller
 * records the failure on the case so a coordinator picks it up by hand —
 * a patient who has uploaded their reports is never dropped.
 */
export async function generatePlan(input: PlanInput, grounding: Grounding): Promise<Plan> {
  if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    throw new PlanUnavailableError("Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is set.");
  }
  if (grounding.diseases.length === 0) {
    throw new PlanUnavailableError("The catalogue is empty, so there is nothing to plan against.");
  }

  const usable = input.reports.filter((r) => r.data.length > 0);
  const totalBytes = usable.reduce((sum, r) => sum + Math.floor((r.data.length * 3) / 4), 0);
  if (totalBytes > MAX_REPORT_BYTES) {
    throw new PlanUnavailableError("The uploaded reports are too large to read in one request.");
  }

  const failures: string[] = [];

  if (available("gemini")) {
    try {
      const raw = await withGeminiModel(
        (model, timeoutMs) => planWithGemini(model, input, usable, grounding, timeoutMs),
        { preferred: GEMINI_PLAN_MODEL, tier: "plan" },
      );
      return normalisePlan(raw, grounding, usable.length);
    } catch (error) {
      console.error("[shifain] Gemini planning failed:", error);
      noteFailure("gemini", error);
      failures.push("Gemini");
    }
  }

  if (available("claude")) {
    try {
      return normalisePlan(await planWithClaude(input, usable, grounding), grounding, usable.length);
    } catch (error) {
      console.error("[shifain] Claude planning failed:", error);
      noteFailure("claude", error);
      failures.push("Claude");
    }
  }

  throw new PlanUnavailableError(
    failures.length > 0
      ? `Automatic planning was unavailable (${failures.join(", ")} did not answer). A coordinator will plan this case by hand.`
      : "Automatic planning is resting after hitting its usage limit. A coordinator will plan this case by hand.",
  );
}
