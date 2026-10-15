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

/** How many of an entry's keywords the message contains; longer phrases count for more. */
function score(message: string, entry: KnowledgeEntry): number {
  const text = ` ${norm(message)} `;
  let total = 0;
  for (const raw of entry.keywords) {
    const keyword = norm(raw);
    if (keyword.length < 2) continue;
    if (text.includes(` ${keyword} `) || (keyword.length >= 5 && text.includes(keyword))) {
      total += keyword.split(" ").length;
    }
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
