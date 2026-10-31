import "server-only";
import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { available, geminiBaseUrl, noteError, noteFailure, noteSuccess, withGeminiModel } from "../ai/providers";
import { reportPrompt, readReportResult, type ReportReading } from "./report-rules";

export type { ReportReading };

/**
 * Reads a report a patient shares in the chat — a PDF or a photo — so the
 * assistant can answer from it: what the document is, what it says in plain
 * words, and which specialty usually looks after it. It never diagnoses: it
 * repeats what the report itself states and leaves the clinical judgement to
 * the doctors who review the free plan.
 *
 * Gemini first, then Claude, the same order as the chat. Null when neither
 * can read it; the caller then says the file was saved for the doctors.
 */
const CLAUDE_MODEL = process.env.ANTHROPIC_CHAT_MODEL?.trim() || process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-5-5";
const READ_TIMEOUT_MS = 20_000;
const MAX_TOKENS = 700;

const READABLE = /^(application\/pdf|image\/(png|jpeg|webp|gif))$/;

export const canReadReport = (mimeType: string) => READABLE.test(mimeType);

export type ReportFile = { fileName: string; mimeType: string; data: Buffer };

type ReadInput = {
  file: ReportFile;
  /** The patient's language, e.g. "Russian" or "Uzbek, in the Latin alphabet". */
  language: string;
  /** Specialty codes the catalogue holds, so the answer can point at hospitals we work with. */
  specialties: { code: string; name: string }[];
  /** Anything the patient typed with the file. */
  note?: string;
};

const GEMINI_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    isMedical: { type: SchemaType.BOOLEAN },
    documentType: { type: SchemaType.STRING },
    findings: { type: SchemaType.STRING },
    specialtyCode: { type: SchemaType.STRING },
    treatment: { type: SchemaType.STRING },
    condition: { type: SchemaType.STRING },
    urgent: { type: SchemaType.BOOLEAN },
    reply: { type: SchemaType.STRING },
  },
  required: ["isMedical", "documentType", "findings", "specialtyCode", "treatment", "condition", "urgent", "reply"],
};

async function readWithGemini(model: string, input: ReadInput, timeoutMs: number): Promise<ReportReading | null> {
  const prompt = reportPrompt(input.language, input.specialties, input.note);
  const result = await new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    .getGenerativeModel(
      {
        model,
        systemInstruction: prompt.system,
        generationConfig: { responseMimeType: "application/json", responseSchema: GEMINI_SCHEMA, temperature: 0.2, maxOutputTokens: MAX_TOKENS },
      },
      { timeout: timeoutMs, baseUrl: geminiBaseUrl() },
    )
    .generateContent({
      contents: [
        {
          role: "user",
          parts: [{ inlineData: { mimeType: input.file.mimeType, data: input.file.data.toString("base64") } }, { text: prompt.user }],
        },
      ],
    });
  return readReportResult(JSON.parse(result.response.text()) as Record<string, unknown>, input.specialties);
}

async function readWithClaude(input: ReadInput): Promise<ReportReading | null> {
  const prompt = reportPrompt(input.language, input.specialties, input.note);
  const data = input.file.data.toString("base64");
  const document: Anthropic.ContentBlockParam =
    input.file.mimeType === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: input.file.mimeType as "image/png" | "image/jpeg" | "image/webp" | "image/gif", data } };
  const response = await new Anthropic().messages.create(
    {
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      system: prompt.system,
      messages: [{ role: "user", content: [document, { type: "text", text: prompt.user }] }],
      tools: [
        {
          name: "report_reading",
          description: "What the report says, for the patient and the intake.",
          input_schema: {
            type: "object" as const,
            properties: {
              isMedical: { type: "boolean" },
              documentType: { type: "string" },
              findings: { type: "string" },
              specialtyCode: { type: "string" },
              treatment: { type: "string" },
              condition: { type: "string" },
              urgent: { type: "boolean" },
              reply: { type: "string" },
            },
            required: ["isMedical", "documentType", "findings", "specialtyCode", "treatment", "condition", "urgent", "reply"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "report_reading" },
    },
    { timeout: READ_TIMEOUT_MS, maxRetries: 0 },
  );
  const block = response.content.find((item) => item.type === "tool_use");
  return block && block.type === "tool_use" ? readReportResult(block.input as Record<string, unknown>, input.specialties) : null;
}

export async function readReport(input: ReadInput): Promise<ReportReading | null> {
  if (!canReadReport(input.file.mimeType)) return null;
  if (available("gemini")) {
    try {
      const reading = await withGeminiModel((model) => readWithGemini(model, input, READ_TIMEOUT_MS), { tier: "chat", timeoutMs: READ_TIMEOUT_MS, attempts: 1 });
      if (reading) return reading;
    } catch (error) {
      console.error("[shifain] Gemini could not read the report:", error);
      noteFailure("gemini", error);
    }
  }
  if (available("claude")) {
    try {
      const reading = await readWithClaude(input);
      noteSuccess("claude", CLAUDE_MODEL);
      if (reading) return reading;
    } catch (error) {
      console.error("[shifain] Claude could not read the report:", error);
      noteError("claude", CLAUDE_MODEL, error);
      noteFailure("claude", error);
    }
  }
  return null;
}
