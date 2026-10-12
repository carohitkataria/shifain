import "server-only";
import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import type { IntakeField } from "./conversation-intake";
import { noteFailure, available, withGeminiModel } from "./ai/providers";
import { COMMAND_NAMES, type CommandName } from "./voice/intents";
import { getAssistantConfig } from "./assistant/config";
import { knowledgeForPrompt } from "./assistant/knowledge";

export { pauseDuration, rankGeminiModels } from "./ai/providers";

/** Overridable without a deploy: set ANTHROPIC_MODEL on the host. */
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5-5";

/**
 * The assistant's character and limits. What the team adds in the console
 * (Assistant → Instructions and Knowledge) is appended to this on every turn.
 */
const BASE_SYSTEM = `You are ShifaIn's care assistant. ShifaIn arranges planned medical treatment in India for international patients: finding the right hospital and doctor, a treatment plan with an itemised estimate, visa letters, travel, stay, interpreters and support until they are home.

HOW YOU TALK
- Answer what the patient actually asked first — briefly, honestly, in general terms — then ask at most ONE question that moves things forward.
- At most three short sentences. Replies are often read aloud: no markdown, no lists, no emoji.
- Warm and plain. Many patients are anxious and speaking a second language; avoid jargon or explain it.
- Reply in the patient's language.

WHAT YOU NEVER DO
- Never diagnose, prescribe or promise an outcome, success rate or survival figure.
- Never quote a price yourself. Say their free plan includes an itemised estimate, which the treating hospital confirms.
- Never invent hospitals, doctors or facts. Prefer the KNOWLEDGE below over general knowledge.
- If something sounds like an emergency happening now (severe chest pain, trouble breathing, heavy bleeding, collapse), tell them to call their local emergency number or go to the nearest emergency department.`;

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ExtractedInfo = Partial<IntakeField> & { email?: string | null; readyToSubmit?: boolean };

export type IntakeReplyResult = {
  reply: string;
  extracted: ExtractedInfo;
  /** Set when the patient asked the app to do something the simple patterns missed. */
  command?: CommandName;
};

/** Where the conversation is, which decides what the assistant should be doing. */
export type TurnStage =
  | { kind: "medical"; fields: Partial<IntakeField> }
  | { kind: "followup"; caseSummary: string };

type TurnInput = {
  message: string;
  history: ConversationMessage[];
  language?: string;
  stage: TurnStage;
  /** Let the assistant name an app command (website chat). */
  commands: boolean;
};

type TurnResult = { reply: string; extracted: ExtractedInfo; command?: CommandName };

const FIELD_KEYS = ["treatment", "condition", "duration", "previousTreatment", "age", "name", "phone", "email", "country"] as const;

const FIELD_HELP: Record<(typeof FIELD_KEYS)[number], string> = {
  treatment:
    "The treatment or specialty they need, in a few English words, e.g. 'heart bypass surgery', 'knee replacement'. If they only describe symptoms, name the specialty to see, e.g. 'cardiology evaluation for chest pain'.",
  condition: "One or two English sentences summarising their symptoms or diagnosis, and for how long.",
  duration: "How long they have had it, if said.",
  previousTreatment: "Treatment they have already had, if said.",
  age: "The patient's age, if said.",
  name: "Their full name, only if they said it.",
  phone: "Their phone number with country code, only if they said it.",
  email: "Their email, only if they said it.",
  country: "The country they live in, only if they said it.",
};

function stageText(stage: TurnStage, commands: boolean): string {
  if (stage.kind === "followup") {
    return `WHERE WE ARE
${stage.caseSummary}
Help with follow-up questions about their treatment, the process, travel and next steps.${
      commands ? " If they want to start a separate, new case, set command to start_case." : ""
    }`;
  }
  const known = Object.entries(stage.fields)
    .filter(([key, value]) => value && FIELD_KEYS.includes(key as never))
    .map(([key, value]) => `${key}: ${value}`)
    .join("; ");
  const missing = (["treatment", "condition"] as const).filter((key) => !stage.fields[key]);
  return `WHERE WE ARE
You are understanding what care they need, so a free treatment plan can be prepared.
Known so far: ${known || "nothing yet"}.
${
  missing.length
    ? `Still needed: ${missing.join(" and ")}. Ask for it naturally, one question at a time. If they describe symptoms without naming a treatment, infer the specialty yourself rather than asking them to name a procedure.`
    : "You have what is needed."
}
As soon as both treatment and condition are known, set ready to true and, in your reply, thank them and say you will take a few quick details to prepare their free plan. Do not ask for their name, phone, email or country yourself — the system asks for those next.`;
}

const COMMAND_TEXT = `APP ACTIONS
The patient can also run this website by voice or chat. If they ask the website itself to do something — check their case status, open or change their plan (city, services such as visa/hotel/interpreter/flights, travel dates, companions), add medical details, sign in or out, upload a report, get a price, browse hospitals/doctors/treatments, talk to a person, switch language, change the voice, or create an account / start a case — set command to the matching action; the system does it. Otherwise command is "none".
Commands: ${COMMAND_NAMES.join(", ")}.`;

async function systemFor(input: TurnInput): Promise<string> {
  const config = await getAssistantConfig();
  const knowledge = knowledgeForPrompt(input.message, config.entries);
  return [
    BASE_SYSTEM,
    stageText(input.stage, input.commands),
    input.commands ? COMMAND_TEXT : "",
    `WHAT TO RETURN
reply: what you say to the patient.
ready: see WHERE WE ARE (false when following up).
command: an app action or "none".
Fields — fill only with what the patient said in this conversation, otherwise leave empty:
${FIELD_KEYS.map((key) => `${key}: ${FIELD_HELP[key]}`).join("\n")}`,
    config.instructions.trim() ? `INSTRUCTIONS FROM THE SHIFAIN TEAM (follow these)\n${config.instructions.trim()}` : "",
    knowledge ? `KNOWLEDGE (facts from the ShifaIn team)\n${knowledge}` : "",
    input.language ? `The patient's language code is "${input.language}". Reply in that language.` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Both APIs want a conversation that starts with the patient and alternates. */
function normaliseHistory(history: ConversationMessage[], message: string): ConversationMessage[] {
  const turns: ConversationMessage[] = [];
  for (const item of [...history.slice(-16), { role: "user" as const, content: message }]) {
    const content = item.content?.trim();
    if (!content) continue;
    if (turns.length === 0 && item.role !== "user") continue;
    const last = turns[turns.length - 1];
    if (last && last.role === item.role) last.content += `\n${content}`;
    else turns.push({ role: item.role, content });
  }
  return turns;
}

function readResult(raw: Record<string, unknown>, commands: boolean): TurnResult {
  const extracted: ExtractedInfo = {};
  for (const key of FIELD_KEYS) {
    const value = raw[key];
    if (typeof value === "string" && value.trim() && !/^(null|none|unknown|n\/a)$/i.test(value.trim())) {
      (extracted as Record<string, string>)[key] = value.trim().slice(0, 1000);
    }
  }
  if (raw.ready === true) extracted.readyToSubmit = true;
  const name = raw.command;
  const command =
    commands && typeof name === "string" && name !== "none" && (COMMAND_NAMES as readonly string[]).includes(name)
      ? (name as CommandName)
      : undefined;
  const reply = typeof raw.reply === "string" ? raw.reply.trim() : "";
  return { reply, extracted, command };
}

// ---------------------------------------------------------------- Gemini

const GEMINI_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    reply: { type: SchemaType.STRING },
    ready: { type: SchemaType.BOOLEAN },
    command: { type: SchemaType.STRING, format: "enum", enum: [...COMMAND_NAMES, "none"] },
    ...Object.fromEntries(FIELD_KEYS.map((key) => [key, { type: SchemaType.STRING, nullable: true }])),
  },
  required: ["reply", "ready", "command"],
};

async function turnWithGemini(model: string, input: TurnInput, system: string): Promise<TurnResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const result = await genAI
    .getGenerativeModel({
      model,
      systemInstruction: system,
      generationConfig: { responseMimeType: "application/json", responseSchema: GEMINI_SCHEMA, temperature: 0.4 },
    })
    .generateContent({
      contents: normaliseHistory(input.history, input.message).map((turn) => ({
        role: turn.role === "assistant" ? "model" : "user",
        parts: [{ text: turn.content }],
      })),
    });
  return readResult(JSON.parse(result.response.text()) as Record<string, unknown>, input.commands);
}

// ---------------------------------------------------------------- Claude

const CLAUDE_RESPOND: Anthropic.Messages.Tool = {
  name: "respond",
  description: "Your reply to the patient, with anything you learned from them.",
  input_schema: {
    type: "object" as const,
    properties: {
      reply: { type: "string" },
      ready: { type: "boolean" },
      command: { type: "string", enum: [...COMMAND_NAMES, "none"] },
      ...Object.fromEntries(FIELD_KEYS.map((key) => [key, { type: ["string", "null"] }])),
    },
    required: ["reply", "ready", "command"],
  },
};

async function turnWithClaude(input: TurnInput, system: string): Promise<TurnResult> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 700,
    system,
    messages: normaliseHistory(input.history, input.message).map((turn) => ({ role: turn.role, content: turn.content })),
    tools: [CLAUDE_RESPOND],
    tool_choice: { type: "tool", name: "respond" },
  });
  const block = response.content.find((item) => item.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("Claude returned no reply");
  return readResult(block.input as Record<string, unknown>, input.commands);
}

// ---------------------------------------------------------------- one turn

/**
 * One reply from the assistant: Gemini first (free tier), then Claude. Each
 * returns a structured answer — the words to say, the details it learned and
 * any app action — so there is always something to say back. Returns null
 * when no AI is available; callers fall back to their scripted path.
 */
export async function assistantTurn(input: TurnInput): Promise<TurnResult | null> {
  const system = await systemFor(input);
  if (available("gemini")) {
    try {
      const result = await withGeminiModel((model) => turnWithGemini(model, input, system));
      if (result.reply || result.command) return result;
    } catch (err) {
      console.error("[shifain] Gemini turn failed:", err);
      noteFailure("gemini", err);
    }
  }
  if (available("claude")) {
    try {
      const result = await turnWithClaude(input, system);
      if (result.reply || result.command) return result;
    } catch (err) {
      console.error("[shifain] Claude turn failed:", err);
      noteFailure("claude", err);
    }
  }
  return null;
}

// ---------------------------------------------------------------- public API

/**
 * The medical conversation (website and Telegram): the AI, then a scripted
 * intake. A patient describing an illness never gets a dead end because an
 * AI provider is down, out of credit, or has retired a model.
 */
export async function generateIntakeReply(
  userMessage: string,
  history: ConversationMessage[] = [],
  currentFields: Partial<IntakeField> = {},
  patientLanguage?: string,
  options: { commands?: boolean } = {},
): Promise<IntakeReplyResult> {
  const result = await assistantTurn({
    message: userMessage,
    history,
    language: patientLanguage,
    stage: { kind: "medical", fields: currentFields },
    commands: options.commands === true,
  });
  if (result) return result;
  console.error("[shifain] no AI provider answered; using the scripted intake");
  return scriptedIntake(userMessage, currentFields);
}

export type ChatReplyResult = { reply: string; command?: CommandName };

const COORDINATOR_FALLBACK =
  "Thank you for your message. Your coordinator has it and will reply here shortly. If it is urgent, please message us on WhatsApp.";

/** A follow-up answer once a case exists; may also name an app command (website chat). */
export async function generateChatReply(
  userMessage: string,
  history: ConversationMessage[] = [],
  patientLanguage?: string,
  options: { commands?: boolean; caseSummary?: string } = {},
): Promise<ChatReplyResult> {
  const result = await assistantTurn({
    message: userMessage,
    history,
    language: patientLanguage,
    stage: { kind: "followup", caseSummary: options.caseSummary ?? "The patient already has a case open with ShifaIn." },
    commands: options.commands === true,
  });
  return result ? { reply: result.reply, command: result.command } : { reply: COORDINATOR_FALLBACK };
}

export async function generateReply(
  userMessage: string,
  history: ConversationMessage[] = [],
  patientLanguage?: string,
): Promise<string> {
  return (await generateChatReply(userMessage, history, patientLanguage)).reply || COORDINATOR_FALLBACK;
}

// ---------------------------------------------------------------- scripted fallback

const TREATMENT_KEYWORDS: [string, RegExp][] = [
  ["cardiac-care", /heart|cardi|bypass|cabg|valve|angio|stent|артери|сердц|шунт|yurak/i],
  ["oncology", /cancer|oncolog|tumou?r|chemo|radiat|biops|leuk|lymphom|рак|онко|опухол|saraton/i],
  ["orthopaedics", /knee|hip|joint|spine|back pain|ortho|fracture|shoulder|колен|сустав|позвон|тазобедр|tizza|bo'g'im/i],
  ["neurosurgery", /brain|neuro|nerve|stroke|epilep|parkinson|мозг|нейро|инсульт|miya/i],
  ["organ-transplant", /transplant|kidney|liver|dialys|трансплант|почк|печен|buyrak|jigar/i],
  ["fertility-ivf", /ivf|fertil|infertil|pregnan|эко|бесплод|беремен|homilador|bepushtlik/i],
];

const GREETING = /^(hi|hello|hey|help|salom|assalomu|привет|здравствуйте|помогите|good (morning|afternoon|evening))\b/i;

export function scriptedIntake(userMessage: string, currentFields: Partial<IntakeField>): IntakeReplyResult {
  const text = userMessage.trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const greetingOnly = GREETING.test(text) && words <= 4;
  const extracted: ExtractedInfo = {};

  let treatment = currentFields.treatment ?? null;
  let condition = currentFields.condition ?? null;
  const knewTreatment = Boolean(treatment);

  if (!treatment) {
    const match = TREATMENT_KEYWORDS.find(([, pattern]) => pattern.test(text));
    if (match) {
      treatment = match[0];
    } else if (condition && !greetingOnly && words >= 1) {
      // We already asked which treatment; whatever they answered is the answer.
      treatment = text.slice(0, 120);
    }
    if (treatment) extracted.treatment = treatment;
  }

  // A short "I need heart surgery" names the treatment; it does not describe the condition.
  if (!condition && !greetingOnly && (knewTreatment ? words >= 3 : words >= 8)) {
    condition = text.slice(0, 1000);
    extracted.condition = condition;
  }

  if (treatment && condition) {
    return {
      reply:
        "Thank you — that gives our medical team what they need to start, and a coordinator will review it personally. " +
        "Just a couple of quick details to set up your case.",
      extracted: { ...extracted, readyToSubmit: true },
    };
  }

  if (!treatment && !condition) {
    return {
      reply:
        (greetingOnly ? "Hello, and welcome to ShifaIn. " : "") +
        "Which treatment are you looking for? For example heart surgery, a knee or hip replacement, cancer care, " +
        "a transplant or IVF — or simply describe the problem in your own words.",
      extracted,
    };
  }

  if (!condition) {
    return {
      reply:
        "Thank you. Could you describe the condition in a few sentences — the symptoms, how long it has been going on, " +
        "and what your doctor has said so far? You can also attach your reports here.",
      extracted,
    };
  }

  return {
    reply:
      "Thank you for explaining. Which treatment are you hoping for — or, if you are not sure yet, what has your doctor suggested?",
    extracted,
  };
}
