/**
 * Questions the assistant could not answer, as the team sees them: contact
 * details masked, and keywords suggested for the knowledge entry that will
 * answer them next time. Pure, tested in scripts/test/assistant.test.mts.
 */

export type UnansweredReason = "no_answer" | "handed_over";

/**
 * Phone numbers, emails and case numbers never reach the list — in every form
 * the app accepts a case number: "UZ48213", "uz48213", "U Z 48 213", or an
 * old "SH-…" reference. Over-masking (any two letters and five digits) is fine.
 */
export function maskContacts(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]")
    .replace(/\bSH[\s-]*[A-Z0-9]{4}(?:[\s-]*[A-Z0-9]{4}){2,3}\b/gi, "[case]")
    .replace(/\b[A-Z0-9]{16}\b/gi, (value) => (/\d/.test(value) && /[A-Z]/i.test(value) ? "[case]" : value))
    .replace(/(?<![A-Za-z])[A-Za-z][\s.-]?[A-Za-z][\s.-]*(?:\d[\s.-]*){4}\d(?!\d)/g, "[case]")
    .replace(/\+?\d[\d\s().-]{5,}\d/g, "[number]")
    .replace(/\d{5,}/g, "[number]")
    .trim()
    .slice(0, 300);
}

/** Worth listing: a few words of a real question, not "ok" and not a whole story. */
export function worthListing(text: string): boolean {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return words >= 2 && words <= 60;
}

const STOP = new Set([
  "what", "which", "when", "where", "does", "have", "with", "your", "from", "that", "this", "there", "about", "would", "could", "should", "will", "need", "much", "many", "they", "them", "then", "than", "into", "just", "also", "please", "know", "want", "tell",
  "какой", "какая", "какие", "когда", "сколько", "можно", "нужно", "нужна", "нужен", "есть", "если", "чтобы", "меня", "мне", "вас", "ваши", "ваша", "пожалуйста", "скажите", "подскажите", "это", "этот", "там", "тоже", "очень",
  "qanday", "qancha", "qachon", "qayerda", "nima", "bormi", "kerak", "mumkin", "iltimos", "menga", "sizlar", "sizda", "bilan", "uchun",
]);

/** Up to five distinctive words of the question, to start the entry's keyword list. */
export function suggestKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[‘’ʻʼ`´]/g, "'")
    .replace(/[^\p{L}' ]+/gu, " ")
    .split(/\s+/)
    .filter((word) => word.replace(/'/g, "").length >= 4 && !STOP.has(word));
  return [...new Set(words)].slice(0, 5);
}
