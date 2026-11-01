import "server-only";
import crypto from "node:crypto";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { getDb, isDatabaseConfigured, readOr } from "./db";
import { available, geminiBaseUrl, noteError, noteFailure, noteSuccess, withGeminiModel } from "./ai/providers";
import { allowHit } from "./rate-limit";
import { readTranslations, sourceKey, translationPrompt } from "./page-translation-rules";
import { TRANSLATED_LOCALES, type TranslatedLocale } from "./i18n";

/**
 * The site in the translated languages (Arabic, French, …): every English
 * sentence is translated by the AI once per language and kept here, so the
 * next visitor gets it instantly and the team can correct it in Admin →
 * Translations. A corrected sentence ("edited") is never overwritten.
 */
export type StoredTranslation = {
  _id: string;
  locale: TranslatedLocale;
  source: string;
  text: string;
  by: "ai" | "edited";
  /** The first page it was seen on, to group the list in the console. */
  page: string;
  createdAt: string;
  updatedAt: string;
};

const COLLECTION = "translations";
const CHUNK = 30;
/** New sentences one visitor can have translated, and the whole site, per window: the AI is paid per call. */
const PER_VISITOR = { limit: 600, windowMs: 10 * 60_000 };
const SITE_WIDE = { limit: 6_000, windowMs: 60 * 60_000 };

export const translationId = (locale: TranslatedLocale, source: string) =>
  `${locale}:${crypto.createHash("sha1").update(sourceKey(source)).digest("hex").slice(0, 24)}`;

let indexed: Promise<unknown> | null = null;

async function viaGemini(texts: string[], locale: TranslatedLocale): Promise<string[] | null> {
  return withGeminiModel(
    async (model, timeoutMs) => {
      const generator = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!).getGenerativeModel(
        {
          model,
          systemInstruction: translationPrompt(locale),
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            responseSchema: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          },
        },
        { timeout: timeoutMs, baseUrl: geminiBaseUrl() },
      );
      const result = await generator.generateContent(JSON.stringify(texts));
      return readTranslations(result.response.text(), texts.length);
    },
    { tier: "chat", timeoutMs: 25_000, attempts: 2 },
  );
}

async function viaClaude(texts: string[], locale: TranslatedLocale): Promise<string[] | null> {
  const model = process.env.ANTHROPIC_CHAT_MODEL || process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
  try {
    const message = await new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }).messages.create(
      { model, max_tokens: 8192, system: translationPrompt(locale), messages: [{ role: "user", content: JSON.stringify(texts) }] },
      { timeout: 30_000, maxRetries: 0 },
    );
    noteSuccess("claude", model);
    const text = message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    return readTranslations(text, texts.length);
  } catch (error) {
    noteError("claude", model, error);
    noteFailure("claude", error);
    return null;
  }
}

async function translateChunk(texts: string[], locale: TranslatedLocale): Promise<string[] | null> {
  if (available("gemini") && process.env.GEMINI_API_KEY) {
    const out = await viaGemini(texts, locale).catch(() => null);
    if (out) return out;
  }
  if (available("claude") && process.env.ANTHROPIC_API_KEY) return viaClaude(texts, locale);
  return null;
}

/**
 * Translations for these English texts, by text. Stored ones come straight
 * back; new ones go to the AI (within the visitor's and the site's budget)
 * and are stored. A text the AI could not do is left out: the page keeps the
 * English rather than showing nothing.
 */
export async function translateTexts(
  locale: TranslatedLocale,
  texts: string[],
  options: {
    page?: string;
    visitor?: string;
    /** False: only translations already stored; nothing goes to the AI. */
    ai?: boolean;
    /** False: translate, but keep nothing — for text that may hold a patient's details. */
    store?: boolean;
    /** The server's own warm-up of the app's text: not held to one visitor's budget. */
    trusted?: boolean;
  } = {},
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (texts.length === 0 || !isDatabaseConfigured()) return out;
  const db = await getDb();
  const collection = db.collection<StoredTranslation>(COLLECTION);
  indexed ??= collection.createIndex({ locale: 1, page: 1 }).catch(() => (indexed = null));

  const ids = new Map(texts.map((text) => [translationId(locale, text), text]));
  const stored = await collection.find({ _id: { $in: [...ids.keys()] } }).toArray().catch(() => []);
  for (const row of stored) out.set(ids.get(row._id) ?? row.source, row.text);

  if (options.ai === false) return out;
  const missing = texts.filter((text) => !out.has(text));
  const affordable = missing.filter(
    () =>
      (options.trusted || allowHit(`translate:${options.visitor ?? "server"}`, PER_VISITOR.limit, PER_VISITOR.windowMs)) &&
      allowHit("translate:site", SITE_WIDE.limit, SITE_WIDE.windowMs),
  );
  const now = new Date().toISOString();
  for (let i = 0; i < affordable.length; i += CHUNK) {
    const chunk = affordable.slice(i, i + CHUNK);
    const translated = await translateChunk(chunk, locale);
    if (!translated) break;
    await Promise.all(
      chunk.map(async (source, index) => {
        out.set(source, translated[index]);
        if (options.store === false) return;
        await collection
          .updateOne(
            { _id: translationId(locale, source) },
            // A sentence the team corrected is never replaced by a new AI attempt.
            { $setOnInsert: { locale, source, text: translated[index], by: "ai", page: (options.page ?? "/").slice(0, 200), createdAt: now, updatedAt: now } },
            { upsert: true },
          )
          .catch(() => undefined);
      }),
    );
  }
  return out;
}

/** One fixed sentence written in the code (never a patient's words); the English when it cannot be translated. */
export async function translateText(locale: TranslatedLocale, text: string, page = "/chat"): Promise<string> {
  const source = sourceKey(text);
  if (!source) return text;
  return (await translateTexts(locale, [source], { page })).get(source) ?? text;
}

// ---------------------------------------------------------------- the patient app's own words

/** Languages whose app text is all stored, and when the last attempt started for the rest. */
const warmed = new Set<TranslatedLocale>();
const lastWarm = new Map<TranslatedLocale, number>();
const RETRY_MS = 10 * 60_000;

/**
 * The patient app's and plan page's own interface text — taken from the
 * code's copy, never from a page — translated and stored once per language.
 * Their pages hold a patient's details, so the page translator there only
 * looks up stored text and never sends a page's text to the AI. If the AI
 * could not finish (out of quota, down), it is tried again ten minutes later.
 */
export async function warmAppText(locale: TranslatedLocale): Promise<void> {
  if (warmed.has(locale) || Date.now() - (lastWarm.get(locale) ?? 0) < RETRY_MS) return;
  lastWarm.set(locale, Date.now());
  try {
    const { appTexts } = await import("./app-text");
    const texts = appTexts();
    let done = 0;
    for (let i = 0; i < texts.length; i += 60) {
      done += (await translateTexts(locale, texts.slice(i, i + 60), { page: "/app", trusted: true })).size;
    }
    if (done >= texts.length) warmed.add(locale);
  } catch (error) {
    console.error("[shifain] could not translate the app's text into", locale, error);
  }
}

// ---------------------------------------------------------------- console

export type TranslationFilter = { locale: TranslatedLocale; q?: string; page?: string; edited?: boolean; skip?: number; limit?: number };

export async function listTranslations(filter: TranslationFilter): Promise<{ rows: StoredTranslation[]; total: number }> {
  const query: Record<string, unknown> = { locale: filter.locale };
  if (filter.page) query.page = filter.page;
  if (filter.edited !== undefined) query.by = filter.edited ? "edited" : "ai";
  if (filter.q) {
    const pattern = new RegExp(filter.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ source: pattern }, { text: pattern }];
  }
  return readOr({ rows: [], total: 0 }, async (db) => {
    const collection = db.collection<StoredTranslation>(COLLECTION);
    const [rows, total] = await Promise.all([
      collection.find(query).sort({ page: 1, createdAt: 1 }).skip(filter.skip ?? 0).limit(filter.limit ?? 50).toArray(),
      collection.countDocuments(query),
    ]);
    return { rows, total };
  });
}

export async function translationPages(locale: TranslatedLocale): Promise<string[]> {
  return readOr<string[]>([], async (db) => (await db.collection<StoredTranslation>(COLLECTION).distinct("page", { locale })).sort());
}

export async function translationCounts(): Promise<Record<string, { total: number; edited: number }>> {
  return readOr({}, async (db) => {
    const collection = db.collection<StoredTranslation>(COLLECTION);
    const rows = await Promise.all(
      TRANSLATED_LOCALES.map(async (locale) => {
        const [total, edited] = await Promise.all([collection.countDocuments({ locale }), collection.countDocuments({ locale, by: "edited" })]);
        return [locale, { total, edited }] as const;
      }),
    );
    return Object.fromEntries(rows);
  });
}

/** The team's own wording: kept for good. */
export async function saveTranslation(id: string, text: string): Promise<void> {
  const db = await getDb();
  await db.collection<StoredTranslation>(COLLECTION).updateOne({ _id: id }, { $set: { text: text.trim().slice(0, 2400), by: "edited", updatedAt: new Date().toISOString() } });
}

/** Back to the AI: removed, so the next visitor's page translates it afresh. */
export async function resetTranslation(id: string): Promise<void> {
  const db = await getDb();
  await db.collection<StoredTranslation>(COLLECTION).deleteOne({ _id: id });
}
