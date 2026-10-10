import "server-only";
import { GoogleGenerativeAI, SchemaType, type FunctionDeclarationsTool } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import type { IntakeField } from "./conversation-intake";

const GEMINI_MODEL = "gemini-1.5-flash";
const CLAUDE_MODEL = "claude-sonnet-4-5-20250514";

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

type Provider = "gemini" | "claude";

function pickProvider(): Provider {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  throw new Error("Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is set.");
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

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
    tools: GEMINI_TOOLS,
  });

  const chat = model.startChat({
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

export async function generateIntakeReply(
  userMessage: string,
  history: ConversationMessage[] = [],
  currentFields: Partial<IntakeField> = {},
  patientLanguage?: string,
): Promise<IntakeReplyResult> {
  const provider = pickProvider();
  if (provider === "gemini") {
    try {
      return await intakeWithGemini(userMessage, history, currentFields, patientLanguage);
    } catch (err) {
      console.error("[shifain] Gemini intake failed, falling back to Claude:", err);
      if (process.env.ANTHROPIC_API_KEY) {
        return intakeWithClaude(userMessage, history, currentFields, patientLanguage);
      }
      throw err;
    }
  }
  return intakeWithClaude(userMessage, history, currentFields, patientLanguage);
}

// ---------------------------------------------------------------- simple reply (backward compat)

async function replyWithGemini(
  userMessage: string,
  history: ConversationMessage[],
  patientLanguage?: string,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  const systemPrompt = patientLanguage
    ? `${BASE_SYSTEM}\n\nThe patient's detected language is: ${patientLanguage}. Respond in that language.`
    : BASE_SYSTEM;

  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
  });

  const chat = model.startChat({
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
  const provider = pickProvider();
  if (provider === "gemini") {
    try {
      return await replyWithGemini(userMessage, history, patientLanguage);
    } catch (err) {
      console.error("[shifain] Gemini reply failed, falling back to Claude:", err);
      if (process.env.ANTHROPIC_API_KEY) {
        return replyWithClaude(userMessage, history, patientLanguage);
      }
      throw err;
    }
  }
  return replyWithClaude(userMessage, history, patientLanguage);
}
