/**
 * Matching a patient's message to the knowledge the team has taught the
 * assistant. Pure, so it is tested without a database.
 */
import type { KnowledgeEntry } from "./config";

type Lang = "en" | "ru" | "uz";

const norm = (text: string) =>
  text
    .toLowerCase()
    .replace(/[‘’ʻʼ`´]/g, "'")
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Russian and Uzbek change a word's ending with its role in the sentence
 * ("виза", "визу", "визы"; "viza", "vizani", "vizaga"), so a keyword matches
 * any form of itself: the commonest endings come off, leaving a stem of at
 * least three letters.
 */
const ENDINGS = [
  // Uzbek, Latin and Cyrillic
  "larning", "lardan", "larni", "larga", "larda", "ingiz", "imiz", "ning", "dan", "lar", "ni", "ga", "ka", "qa", "da", "im", "si",
  "ларнинг", "лардан", "ларни", "ларга", "ларда", "нинг", "дан", "лар", "ни", "га", "қа", "да",
  // Russian
  "ами", "ями", "ого", "его", "ому", "ему", "ыми", "ими", "ах", "ях", "ам", "ям", "ом", "ем", "ой", "ей", "ую", "юю", "ая", "яя",
  "ое", "ее", "ые", "ие", "ый", "ий", "ов", "ев", "а", "я", "у", "ю", "ы", "и", "е", "о", "ь",
].sort((a, b) => b.length - a.length);

function strip(word: string): string {
  for (const ending of ENDINGS) {
    if (word.length - ending.length >= 3 && word.endsWith(ending)) return word.slice(0, -ending.length);
  }
  return word;
}

/** Up to two endings off ("визани" → "виза" → "виз"), never below three letters. */
export const stem = (word: string) => strip(strip(word));

/** The same word in another form: equal stems, or, for long words, a shared start of five letters or more. */
export function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 3 || b.length < 3) return false;
  if (stem(a) === stem(b)) return true;
  const shorter = Math.min(a.length, b.length);
  let shared = 0;
  while (shared < shorter && a[shared] === b[shared]) shared++;
  return shared >= 5 && shared >= shorter - 2;
}

/** How many of an entry's keywords the message contains; longer phrases count for more. */
function score(message: string, entry: KnowledgeEntry): number {
  const text = ` ${norm(message)} `;
  const said = text.trim().split(" ").filter(Boolean);
  let total = 0;
  for (const raw of entry.keywords) {
    const keyword = norm(raw);
    if (keyword.length < 2) continue;
    const parts = keyword.split(" ");
    const exact = text.includes(` ${keyword} `) || (keyword.length >= 5 && text.includes(keyword));
    // Every word of the keyword, in any of its forms.
    const inflected = keyword.length >= 3 && parts.every((part) => said.some((word) => sameWord(word, part)));
    if (exact || inflected) total += parts.length;
  }
  return total;
}

export function answerIn(entry: KnowledgeEntry, lang: Lang): string {
  return (entry.answer[lang] || entry.answer.en || entry.answer.ru || entry.answer.uz || "").trim();
}

/**
 * A stored answer to give straight back, without the AI: only for entries
 * marked instant, only when the message is a short question rather than
 * someone describing their illness, and only on a clear match.
 */
export function instantAnswer(message: string, entries: KnowledgeEntry[], lang: Lang): { entry: KnowledgeEntry; text: string } | null {
  const words = norm(message).split(" ").filter(Boolean).length;
  if (words === 0 || words > 22) return null;
  let best: { entry: KnowledgeEntry; score: number } | null = null;
  for (const entry of entries) {
    if (!entry.enabled || !entry.instant) continue;
    const value = score(message, entry);
    if (value > 0 && (!best || value > best.score)) best = { entry, score: value };
  }
  if (!best) return null;
  const text = answerIn(best.entry, lang);
  return text ? { entry: best.entry, text } : null;
}

/**
 * The knowledge to put in front of the AI for this message: everything when
 * it is short, otherwise the entries that match best, within a size budget
 * so a large knowledge base does not make every reply slow and costly.
 */
export function knowledgeForPrompt(message: string, entries: KnowledgeEntry[], budget = 6000): string {
  const enabled = entries.filter((entry) => entry.enabled && answerIn(entry, "en"));
  const ranked = [...enabled].sort((a, b) => score(message, b) - score(message, a));
  const parts: string[] = [];
  let used = 0;
  for (const entry of ranked) {
    const block = `- ${entry.title}: ${answerIn(entry, "en")}`;
    if (used + block.length > budget) continue;
    parts.push(block);
    used += block.length;
  }
  return parts.join("\n");
}
