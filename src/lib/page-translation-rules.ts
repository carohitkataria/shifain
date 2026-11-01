/**
 * Which text on a page the translator touches, and how a batch is checked
 * before any AI sees it. Pure (no database, no browser), so it is shared by
 * the page script and the server, and tested in scripts/test/page-translation.test.mts.
 */
import { LOCALE_META, type TranslatedLocale } from "./i18n";

/** Languages written in their own script: anything still in Latin letters there is English to translate. */
const OWN_SCRIPT: Partial<Record<TranslatedLocale, RegExp>> = {
  ar: /\p{Script=Arabic}/u,
  hi: /\p{Script=Devanagari}/u,
  bn: /\p{Script=Bengali}/u,
  bg: /\p{Script=Cyrillic}/u,
};

/** Never sent: the brand, contact details, links, numbers and codes read the same in every language. */
const KEEP_AS_IS = [
  /^(shifa\s?in|shifain)$/i,
  /^[\w.+-]+@[\w-]+\.[\w.-]+$/, // email
  /^(https?:\/\/|www\.)\S+$/i, // link
  /^[+\d\s().,:%/–—-]+$/, // numbers, phones, dates, prices
  /^[A-Z]{2}\d{5}$/, // case number
  /^[A-Z0-9]{1,4}$/, // short codes: EN, JCI, NABH, USD
];

/**
 * A patient's own pages (their account, a plan; the path without its locale).
 * Their details are on them, so text there is never sent to the AI or stored.
 */
export const isPrivatePage = (page: string) => /^\/(portal|plan)(\/|$)/.test(page);

export const MAX_TEXT = 800;
export const MAX_BATCH = 60;
export const MAX_BATCH_CHARS = 24_000;

const squash = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Whether this text (a text node or an attribute) should be translated into
 * the language: it has words, it is not something that reads the same in
 * every language, and — for languages with their own script — it is still in
 * Latin letters, so not already translated.
 */
export function needsTranslation(raw: string, locale: TranslatedLocale): boolean {
  const text = squash(raw);
  if (text.length < 2 || text.length > MAX_TEXT) return false;
  if (!/\p{L}{2}/u.test(text)) return false;
  if (KEEP_AS_IS.some((pattern) => pattern.test(text))) return false;
  const own = OWN_SCRIPT[locale];
  if (own && own.test(text) && !/[A-Za-z]{3}/.test(text.replace(/ShifaIn|Shifain/g, ""))) return false;
  return true;
}

/** The text as it is stored and matched: whitespace folded, so line breaks in markup do not make new entries. */
export const sourceKey = squash;

/** A batch from the page, cleaned: strings only, deduplicated, within the limits, and only ones worth translating. */
export function cleanBatch(texts: unknown, locale: TranslatedLocale): string[] {
  if (!Array.isArray(texts)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  let chars = 0;
  for (const item of texts) {
    if (typeof item !== "string") continue;
    const text = sourceKey(item);
    if (seen.has(text) || !needsTranslation(text, locale)) continue;
    if (out.length >= MAX_BATCH || chars + text.length > MAX_BATCH_CHARS) break;
    seen.add(text);
    out.push(text);
    chars += text.length;
  }
  return out;
}

/** The instruction for the AI: one batch of short site texts, returned as a list of the same length. */
export function translationPrompt(locale: TranslatedLocale): string {
  const language = LOCALE_META[locale].english;
  return `You translate the website of ShifaIn, a service that helps patients from abroad get medical treatment in India (plans, hospitals, travel, visas).
Translate each English text in the list into ${language}, for patients and their families: clear, warm, plain words; medical terms exact.
Keep exactly as written: the brand "ShifaIn", names of hospitals, doctors, cities and people, accreditation names (JCI, NABH), numbers, prices, currencies, phone numbers, emails, links and anything in {curly braces}.
Short labels (buttons, menu items) stay short. Keep punctuation like "→" and "·". Never add notes or explanations.
Reply with a JSON array of strings: the translations, in the same order and the same number as the input.`;
}

/** The AI's reply, accepted only if it is a list of the right length with text in every place. */
export function readTranslations(reply: unknown, expected: number): string[] | null {
  let value = reply;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch {
      return null;
    }
  }
  if (!Array.isArray(value) || value.length !== expected) return null;
  const out = value.map((item) => (typeof item === "string" ? item.trim() : ""));
  return out.every((item) => item.length > 0 && item.length <= MAX_TEXT * 3) ? out : null;
}
