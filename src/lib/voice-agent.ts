import "server-only";
import { GoogleGenerativeAI, SchemaType, type FunctionDeclarationsTool } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import type { IntakeField } from "./conversation-intake";

const GEMINI_MODEL = "gemini-2.0-flash";
const CLAUDE_MODEL = "claude-sonnet-4-5-20250514";

const BASE_SYSTEM = `You are ShifaIn's patient assistant on Telegram. You help patients who are seeking medical treatment in India.

WHAT YOU DO
- Greet patients warmly and understand what medical help they need.
- Ask clarifying questions about their condition, symptoms, and what treatment they're looking for.
- Collect key information: their name, country, the medical condition, any previous treatment, and what they hope to achieve.
- Once you have enough information, let them know a coordinator will follow up with a detailed plan and cost estimate.
- Answer general questions about the process of getting treatment in India through ShifaIn.

WHAT YOU DO NOT DO
- You never diagnose. You are not a doctor.
- You never state a price, a cost, a fee or a discount. Pricing comes from the coordinator.
- You never promise an outcome, a success rate or a survival figure.
- You never ask for sensitive medical records over chat. If they need to share reports, direct them to the patient portal.
- You never give medical advice or suggest treatments. You gather information for the medical team.

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

INTAKE CONVERSATION RULES
You are gathering information to create a medical case. Ask naturally — do NOT list all questions at once.
Ask ONE question at a time, building on what the patient says. Be conversational, not robotic.

Required information (ask for these naturally through conversation):
1. Patient's name
2. Country they are from
3. What treatment or medical procedure they need
4. Description of their medical condition

Optional but helpful (ask if it comes up naturally):
- How long they've had the condition
- Any previous treatment they've received
- Patient's age
- Phone number

After each message from the patient, call the "extract_patient_info" tool with any new information you learned.
When you have at least: name, country, treatment, and condition description — call "submit_intake" to create their case.
Do NOT call submit_intake until you have all four required fields.
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
        name: "extract_patient_info",
        description:
          "Extract any patient information mentioned in the conversation so far. Call this after every patient message with whatever new info was provided.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING, description: "Patient's full name" },
            phone: { type: SchemaType.STRING, description: "Patient's phone number" },
            country: { type: SchemaType.STRING, description: "Patient's country of origin" },
            treatment: { type: SchemaType.STRING, description: "Treatment or procedure they need" },
            condition: { type: SchemaType.STRING, description: "Description of their medical condition" },
            duration: { type: SchemaType.STRING, description: "How long they've had the condition" },
            previousTreatment: { type: SchemaType.STRING, description: "Any previous treatment received" },
            age: { type: SchemaType.STRING, description: "Patient's age" },
          },
        },
      },
      {
        name: "submit_intake",
        description:
          "Call this ONLY when you have collected all required information (name, country, treatment, condition). This creates a case for the patient.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            ready: { type: SchemaType.BOOLEAN, description: "Must be true to submit" },
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
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  const systemPrompt = [
    INTAKE_SYSTEM,
    fieldsNote ? `\nAlready collected: ${fieldsNote}` : "",
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
      if (call.name === "extract_patient_info") {
        const args = call.args as Record<string, string>;
        for (const [k, v] of Object.entries(args)) {
          if (v && k in extracted === false) {
            (extracted as Record<string, unknown>)[k] = v;
          }
        }
      }
      if (call.name === "submit_intake") {
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
    name: "extract_patient_info",
    description:
      "Extract any patient information mentioned in the conversation so far. Call this after every patient message with whatever new info was provided.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Patient's full name" },
        phone: { type: "string", description: "Patient's phone number" },
        country: { type: "string", description: "Patient's country of origin" },
        treatment: { type: "string", description: "Treatment or procedure they need" },
        condition: { type: "string", description: "Description of their medical condition" },
        duration: { type: "string", description: "How long they've had the condition" },
        previousTreatment: { type: "string", description: "Any previous treatment received" },
        age: { type: "string", description: "Patient's age" },
      },
    },
  },
  {
    name: "submit_intake",
    description:
      "Call this ONLY when you have collected all required information (name, country, treatment, condition). This creates a case for the patient.",
    input_schema: {
      type: "object" as const,
      properties: {
        ready: { type: "boolean", description: "Must be true to submit" },
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
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  const systemPrompt = [
    INTAKE_SYSTEM,
    fieldsNote ? `\nAlready collected: ${fieldsNote}` : "",
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
      if (block.name === "extract_patient_info") {
        const args = block.input as Record<string, string>;
        for (const [k, v] of Object.entries(args)) {
          if (v) (extracted as Record<string, unknown>)[k] = v;
        }
      }
      if (block.name === "submit_intake") {
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
    return intakeWithGemini(userMessage, history, currentFields, patientLanguage);
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
    return replyWithGemini(userMessage, history, patientLanguage);
  }
  return replyWithClaude(userMessage, history, patientLanguage);
}
