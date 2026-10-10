import "server-only";
import { GoogleGenerativeAI, SchemaType, type FunctionDeclarationsTool } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import type { IntakeField } from "./conversation-intake";

/** Overridable without a deploy: set ANTHROPIC_MODEL on the host. */
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-5-5";

const BASE_SYSTEM = `You are ShifaIn's patient assistant on Telegram. You help patients who are seeking medical treatment in India.

WHAT YOU DO
- Greet patients warmly and understand what medical help they need.
- Ask clarifying questions about their condition, symptoms, and what treatment they're looking for.
- Collect key information: the medical condition, any previous treatment, and what they hope to achieve.
- Once you have enough information, let them know the system will collect a few more details to create their case.
- Answer general questions about the process of getting treatment in India through ShifaIn.

WHAT YOU DO NOT DO
- You never diagnose. You are not a doctor.
- You never state a price, a cost, a fee or a discount. Pricing comes from the coordinator.
- You never promise an outcome, a success rate or a survival figure.
- You never ask for sensitive medical records over chat. If they need to share reports, tell them to send photos or PDFs right here.
- You never give medical advice or suggest treatments. You gather information for the medical team.
- You NEVER ask for the patient's name, country, or phone number. The system handles that separately.

TONE
- The patient is often anxious and may be speaking in their second language.
- Write plainly: short sentences, no medical jargon you do not immediately explain.
- Be warm but honest. Do not give false reassurance.
- Keep responses concise — 2-4 sentences max for voice responses, since these will be spoken aloud.

LANGUAGE
- Always respond in the same language the patient is speaking.
- If the patient speaks Hindi, respond in Hindi. If Uzbek, respond in Uzbek. If Russian, respond in Russian.
- For voice interactions, keep responses short and natural-sounding.

CONTEXT
- ShifaIn arranges medical treatment in India for international patients.
- The service includes: finding the right hospital and doctor, treatment planning, travel coordination, and ongoing support.
- Common treatments: cardiac surgery, orthopaedics, oncology, fertility (IVF), dental, cosmetic surgery, organ transplants, and more.
- Major hospital cities: Delhi, Mumbai, Chennai, Bangalore, Hyderabad.`;

const INTAKE_SYSTEM = `${BASE_SYSTEM}

MEDICAL CONVERSATION RULES
You are gathering MEDICAL information only. The system collects personal details (name, country, phone) separately — never ask for those.

Ask ONE question at a time, building on what the patient says. Be conversational, not robotic.

Gather through conversation:
1. What treatment or medical procedure they need
2. Description of their medical condition and symptoms
3. How long they've had the condition (if relevant)
4. Any previous treatment they've received (if relevant)
5. Patient's age (if they mention it naturally)

After each message, call "extract_medical_info" with any new medical information you learned.
When you have at least the treatment needed AND a description of the condition, call "ready_for_profile".
Do NOT call ready_for_profile until you have both treatment and condition.
When you call ready_for_profile, your response should be something warm like "Thank you for sharing that. I have a good picture of what you need. Let me just collect a couple more details to set up your case."
Always respond conversationally to the patient AND call the appropriate tool.`;

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

// ---------------------------------------------------------------- quota pauses

type Provider = "gemini" | "claude";
const pausedUntil: Record<Provider, number> = { gemini: 0, claude: 0 };

const isQuotaError = (text: string) =>
  /\b429\b|quota|rate.?limit|resource.?exhausted|too many requests|credit balance|billing/i.test(text);

/**
 * When a provider says its quota or credit is used up, stop asking it until
 * the time it gives (Google sends a retry delay), then use it again
 * automatically. Meanwhile the next provider, or the scripted intake, answers.
 */
export function pauseDuration(error: unknown): number | null {
  const text = String(error instanceof Error ? error.message : error);
  if (/api key not valid|invalid.?api.?key|authentication|\b401\b|\b403\b/i.test(text)) return 60 * 60 * 1000;
  if (!isQuotaError(text)) return null;
  if (/credit balance|billing/i.test(text)) return 30 * 60 * 1000;
  const seconds =
    Number(/retry in ([\d.]+)\s*s/i.exec(text)?.[1]) ||
    Number(/"?retryDelay"?\s*:\s*"?(\d+)s/i.exec(text)?.[1]) ||
    60;
  return Math.min(60 * 60, Math.max(10, Math.ceil(seconds))) * 1000;
}

function noteFailure(provider: Provider, error: unknown): void {
  const ms = pauseDuration(error);
  if (ms) {
    pausedUntil[provider] = Date.now() + ms;
    console.error(`[shifain] ${provider} paused for ${Math.round(ms / 1000)}s (quota, credit or key); resumes automatically`);
  }
}

function available(provider: Provider): boolean {
  const key = provider === "gemini" ? process.env.GEMINI_API_KEY : process.env.ANTHROPIC_API_KEY;
  return Boolean(key) && Date.now() >= pausedUntil[provider];
}

// ---------------------------------------------------------------- Gemini model choice

/**
 * Google retires Gemini model names on its own schedule (2.0-flash and
 * 1.5-flash both went), so the model is not hardcoded. GEMINI_MODEL pins one;
 * otherwise the key's own model list is read and the best stable Flash model
 * that supports generateContent is used, re-checked every six hours.
 */
const GEMINI_LIST_URL = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000";
const MODEL_LIST_TTL = 6 * 60 * 60 * 1000;
let geminiModelCache: { models: string[]; at: number } | null = null;

type GeminiModelInfo = { name: string; supportedGenerationMethods?: string[] };

const SPECIALISED = /(image|tts|audio|live|embed|vision|robotics|computer|native|aqa|learnlm|gemma)/;
const UNSTABLE = /(exp|preview|thinking)/;

export function rankGeminiModels(models: GeminiModelInfo[]): string[] {
  const usable = models
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((name) => name.includes("flash") && !SPECIALISED.test(name));
  const stable = usable.filter((name) => !UNSTABLE.test(name));
  const pool = stable.length > 0 ? stable : usable;

  const version = (name: string) => Number(/gemini-(\d+(?:\.\d+)?)/.exec(name)?.[1] ?? 0);
  const score = (name: string) =>
    (name === "gemini-flash-latest" ? 1000 : 0) + version(name) * 10 - (name.includes("lite") ? 5 : 0) -
    (/-\d{3}$/.test(name) ? 1 : 0);
  return [...new Set(pool)].sort((a, b) => score(b) - score(a)).slice(0, 4);
}

async function geminiModels(): Promise<string[]> {
  const pinned = process.env.GEMINI_MODEL?.trim();
  if (!geminiModelCache || Date.now() - geminiModelCache.at > MODEL_LIST_TTL) {
    let models: string[] = [];
    try {
      const res = await fetch(GEMINI_LIST_URL, { headers: { "x-goog-api-key": process.env.GEMINI_API_KEY! } });
      if (res.ok) {
        const json = (await res.json()) as { models?: GeminiModelInfo[] };
        models = rankGeminiModels(json.models ?? []);
      } else {
        console.error("[shifain] could not list Gemini models:", res.status);
      }
    } catch (error) {
      console.error("[shifain] could not list Gemini models:", error);
    }
    // A failed listing is retried in five minutes rather than trusted for six hours.
    geminiModelCache = {
      models: models.length > 0 ? models : ["gemini-flash-latest"],
      at: models.length > 0 ? Date.now() : Date.now() - MODEL_LIST_TTL + 5 * 60 * 1000,
    };
  }
  const list = geminiModelCache.models;
  return pinned ? [pinned, ...list.filter((m) => m !== pinned)] : list;
}

const isModelMissing = (error: unknown) => /\b404\b|not found|no longer available/i.test(String(error));
/** Google's overload is per model, so a busy model is a reason to try the next one too. */
const isModelBusy = (error: unknown) =>
  /\b503\b|\b500\b|overloaded|high demand|unavailable/i.test(String(error));

/** Tries each candidate model in turn, moving on only when Google says the model does not exist. */
async function withGeminiModel<T>(run: (model: string) => Promise<T>): Promise<T> {
  const candidates = await geminiModels();
  let lastError: unknown = new Error("No Gemini model available.");
  for (const model of candidates) {
    try {
      return await run(model);
    } catch (error) {
      lastError = error;
      if (isModelBusy(error)) {
        console.error(`[shifain] Gemini model ${model} is busy, trying the next one`);
        continue;
      }
      if (!isModelMissing(error)) throw error;
      console.error(`[shifain] Gemini model ${model} unavailable, trying the next one`);
      geminiModelCache = geminiModelCache && {
        ...geminiModelCache,
        models: geminiModelCache.models.filter((m) => m !== model),
      };
    }
  }
  throw lastError;
}

export type ExtractedInfo = Partial<IntakeField> & { readyToSubmit?: boolean };

export type IntakeReplyResult = {
  reply: string;
  extracted: ExtractedInfo;
};

// ---------------------------------------------------------------- Gemini

const GEMINI_TOOLS: FunctionDeclarationsTool[] = [
  {
    functionDeclarations: [
      {
        name: "extract_medical_info",
        description:
          "Extract medical information mentioned in the conversation. Call this after every patient message with whatever new medical info was provided. Do NOT include name, country, or phone — those are collected separately.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            treatment: { type: SchemaType.STRING, description: "Treatment or procedure they need" },
            condition: { type: SchemaType.STRING, description: "Description of their medical condition" },
            duration: { type: SchemaType.STRING, description: "How long they've had the condition" },
            previousTreatment: { type: SchemaType.STRING, description: "Any previous treatment received" },
            age: { type: SchemaType.STRING, description: "Patient's age" },
          },
        },
      },
      {
        name: "ready_for_profile",
        description:
          "Call this when you have gathered enough medical information (at least treatment AND condition). This signals the system to collect remaining profile details from the patient.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            ready: { type: SchemaType.BOOLEAN, description: "Must be true" },
          },
          required: ["ready"],
        },
      },
    ],
  },
];

async function intakeWithGemini(
  model: string,
  userMessage: string,
  history: ConversationMessage[],
  currentFields: Partial<IntakeField>,
  patientLanguage?: string,
): Promise<IntakeReplyResult> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  const fieldsNote = Object.entries(currentFields)
    .filter(([k, v]) => v && !["name", "phone", "country"].includes(k))
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  const systemPrompt = [
    INTAKE_SYSTEM,
    fieldsNote ? `\nAlready collected medical info: ${fieldsNote}` : "",
    patientLanguage ? `\nThe patient's detected language is: ${patientLanguage}. Respond in that language.` : "",
  ].join("");

  const chat = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
    tools: GEMINI_TOOLS,
  }).startChat({
    history: history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
  });

  const result = await chat.sendMessage(userMessage);
  const response = result.response;

  const extracted: ExtractedInfo = {};
  const calls = response.functionCalls();
  if (calls) {
    for (const call of calls) {
      if (call.name === "extract_medical_info") {
        const args = call.args as Record<string, string>;
        for (const [k, v] of Object.entries(args)) {
          if (v && k in extracted === false) {
            (extracted as Record<string, unknown>)[k] = v;
          }
        }
      }
      if (call.name === "ready_for_profile") {
        extracted.readyToSubmit = true;
      }
    }
  }

  const reply = response.text() || "I'm here to help. Could you tell me more about your medical needs?";
  return { reply, extracted };
}

// ---------------------------------------------------------------- Claude

const CLAUDE_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "extract_medical_info",
    description:
      "Extract medical information mentioned in the conversation. Call this after every patient message with whatever new medical info was provided. Do NOT include name, country, or phone — those are collected separately.",
    input_schema: {
      type: "object" as const,
      properties: {
        treatment: { type: "string", description: "Treatment or procedure they need" },
        condition: { type: "string", description: "Description of their medical condition" },
        duration: { type: "string", description: "How long they've had the condition" },
        previousTreatment: { type: "string", description: "Any previous treatment received" },
        age: { type: "string", description: "Patient's age" },
      },
    },
  },
  {
    name: "ready_for_profile",
    description:
      "Call this when you have gathered enough medical information (at least treatment AND condition). This signals the system to collect remaining profile details from the patient.",
    input_schema: {
      type: "object" as const,
      properties: {
        ready: { type: "boolean", description: "Must be true" },
      },
      required: ["ready"],
    },
  },
];

async function intakeWithClaude(
  userMessage: string,
  history: ConversationMessage[],
  currentFields: Partial<IntakeField>,
  patientLanguage?: string,
): Promise<IntakeReplyResult> {
  const client = new Anthropic();

  const fieldsNote = Object.entries(currentFields)
    .filter(([k, v]) => v && !["name", "phone", "country"].includes(k))
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  const systemPrompt = [
    INTAKE_SYSTEM,
    fieldsNote ? `\nAlready collected medical info: ${fieldsNote}` : "",
    patientLanguage ? `\nThe patient's detected language is: ${patientLanguage}. Respond in that language.` : "",
  ].join("");

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 600,
    system: systemPrompt,
    messages,
    tools: CLAUDE_TOOLS,
  });

  const extracted: ExtractedInfo = {};
  let reply = "";

  for (const block of response.content) {
    if (block.type === "text") {
      reply += block.text;
    }
    if (block.type === "tool_use") {
      if (block.name === "extract_medical_info") {
        const args = block.input as Record<string, string>;
        for (const [k, v] of Object.entries(args)) {
          if (v) (extracted as Record<string, unknown>)[k] = v;
        }
      }
      if (block.name === "ready_for_profile") {
        extracted.readyToSubmit = true;
      }
    }
  }

  if (!reply) reply = "I'm here to help. Could you tell me more about your medical needs?";
  return { reply, extracted };
}

// ---------------------------------------------------------------- public API

/**
 * Gemini first (free tier), then Claude, then a scripted intake. A patient
 * describing an illness never gets a dead end because an AI provider is down,
 * out of credit, or has retired a model.
 */
export async function generateIntakeReply(
  userMessage: string,
  history: ConversationMessage[] = [],
  currentFields: Partial<IntakeField> = {},
  patientLanguage?: string,
): Promise<IntakeReplyResult> {
  if (available("gemini")) {
    try {
      return await withGeminiModel((model) =>
        intakeWithGemini(model, userMessage, history, currentFields, patientLanguage),
      );
    } catch (err) {
      console.error("[shifain] Gemini intake failed:", err);
      noteFailure("gemini", err);
    }
  }
  if (available("claude")) {
    try {
      return await intakeWithClaude(userMessage, history, currentFields, patientLanguage);
    } catch (err) {
      console.error("[shifain] Claude intake failed:", err);
      noteFailure("claude", err);
    }
  }
  console.error("[shifain] no AI provider answered; using the scripted intake");
  return scriptedIntake(userMessage, currentFields);
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

// ---------------------------------------------------------------- simple reply (backward compat)

async function replyWithGemini(
  model: string,
  userMessage: string,
  history: ConversationMessage[],
  patientLanguage?: string,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  const systemPrompt = patientLanguage
    ? `${BASE_SYSTEM}\n\nThe patient's detected language is: ${patientLanguage}. Respond in that language.`
    : BASE_SYSTEM;

  const chat = genAI.getGenerativeModel({
    model,
    systemInstruction: systemPrompt,
  }).startChat({
    history: history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
  });

  const result = await chat.sendMessage(userMessage);
  return result.response.text() || "I'm sorry, I couldn't process that. Please try again or type /help.";
}

async function replyWithClaude(
  userMessage: string,
  history: ConversationMessage[],
  patientLanguage?: string,
): Promise<string> {
  const client = new Anthropic();

  const systemPrompt = patientLanguage
    ? `${BASE_SYSTEM}\n\nThe patient's detected language is: ${patientLanguage}. Respond in that language.`
    : BASE_SYSTEM;

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const response = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 400,
    system: systemPrompt,
    messages,
  });

  const text = response.content.find((b) => b.type === "text")?.text;
  return text ?? "I'm sorry, I couldn't process that. Please try again or type /help.";
}

export async function generateReply(
  userMessage: string,
  history: ConversationMessage[] = [],
  patientLanguage?: string,
): Promise<string> {
  if (available("gemini")) {
    try {
      return await withGeminiModel((model) => replyWithGemini(model, userMessage, history, patientLanguage));
    } catch (err) {
      console.error("[shifain] Gemini reply failed:", err);
      noteFailure("gemini", err);
    }
  }
  if (available("claude")) {
    try {
      return await replyWithClaude(userMessage, history, patientLanguage);
    } catch (err) {
      console.error("[shifain] Claude reply failed:", err);
      noteFailure("claude", err);
    }
  }
  return "Thank you for your message. Your coordinator has it and will reply here shortly. If it is urgent, please message us on WhatsApp.";
}
