import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { available, geminiBaseUrl, noteError, noteFailure, noteSuccess, withGeminiModel } from "./providers";

/**
 * The portal's live translator: one short line from one language to another,
 * for a patient talking to a doctor, nurse or driver. The cheapest models,
 * a short reply cap and no history — each line stands alone.
 */
const SYSTEM = (from: string, to: string) =>
  `You translate spoken lines between a patient and the people looking after them in India (doctors, nurses, drivers, hotel staff).
Translate the user's text from ${from} into ${to}. Keep the meaning, tone and any medical terms exact; keep numbers, doses and names as written.
Reply with the translation only: no quotes, no notes, no transliteration, no explanation. If the text is already in ${to}, return it unchanged.`;

const MAX_TOKENS = 400;

async function withGemini(text: string, from: string, to: string): Promise<string> {
  return withGeminiModel(
    async (model, timeoutMs) => {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const result = await genAI
        .getGenerativeModel(
          { model, systemInstruction: SYSTEM(from, to), generationConfig: { temperature: 0.2, maxOutputTokens: MAX_TOKENS } },
          { timeout: timeoutMs, baseUrl: geminiBaseUrl() },
        )
        .generateContent(text);
      return result.response.text().trim();
    },
    { tier: "chat" },
  );
}

async function withClaude(text: string, from: string, to: string): Promise<string> {
  const model = process.env.ANTHROPIC_CHAT_MODEL || process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const message = await client.messages.create(
      { model, max_tokens: MAX_TOKENS, system: SYSTEM(from, to), messages: [{ role: "user", content: text }] },
      { timeout: 12_000, maxRetries: 0 },
    );
    noteSuccess("claude", model);
    return message.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("")
      .trim();
  } catch (error) {
    noteError("claude", model, error);
    noteFailure("claude", error);
    throw error;
  }
}

/** The translation, or null when no AI could do it. */
export async function translateLine(text: string, from: string, to: string): Promise<string | null> {
  const line = text.trim().slice(0, 600);
  if (!line) return null;
  if (available("gemini")) {
    try {
      const out = await withGemini(line, from, to);
      if (out) return out;
    } catch {
      /* fall through */
    }
  }
  if (available("claude")) {
    try {
      const out = await withClaude(line, from, to);
      if (out) return out;
    } catch {
      /* no translation */
    }
  }
  return null;
}
