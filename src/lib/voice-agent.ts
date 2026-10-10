import "server-only";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-5-20250514";

const SYSTEM = `You are ShifaIn's patient assistant on Telegram. You help patients who are seeking medical treatment in India.

WHAT YOU DO
- Greet patients warmly and understand what medical help they need.
- Ask clarifying questions about their condition, symptoms, and what treatment they're looking for.
- Collect key information: their country, the medical condition, any previous treatment, and what they hope to achieve.
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

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

/**
 * Generates a conversational reply for a patient's message.
 * Maintains conversation history for context within a session.
 */
export async function generateReply(
  userMessage: string,
  history: ConversationMessage[] = [],
  patientLanguage?: string,
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  const client = new Anthropic();

  const systemPrompt = patientLanguage
    ? `${SYSTEM}\n\nThe patient's detected language is: ${patientLanguage}. Respond in that language.`
    : SYSTEM;

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: systemPrompt,
    messages,
  });

  const text = response.content.find((b) => b.type === "text")?.text;
  return text ?? "I'm sorry, I couldn't process that. Please try again or type /help.";
}
