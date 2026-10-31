/**
 * Which catalogue treatment a spoken phrase names: "knee", "heart bypass",
 * "пересадка почки", "tizza". Common spoken forms first, then a loose match
 * on the catalogue's own names in every language. Pure, so it is tested
 * against the real catalogue in scripts/test/voice-intents.test.mts.
 */
type NamedTreatment = { _id: string; name: Partial<Record<string, string>> };

const SPOKEN_TREATMENTS: [string, RegExp][] = [
  ["gastric-bypass", /gastric bypass|stomach bypass|шунтирование желудка|желудочное шунтир|oshqozon/],
  ["cabg", /bypass|cabg|шунтир|shunt/],
  ["angioplasty-stent", /stent|angioplast|стент|ангиопласт/],
  ["valve-replacement", /valve|клапан|klapan/],
  ["robotic-knee-replacement", /robotic knee|роботизир\S* .*колен/],
  ["total-knee-replacement", /knee|колен|tizza/],
  ["total-hip-replacement", /\bhip\b|тазобедр|chanoq|son bo'g'im/],
  ["spinal-fusion", /spinal fusion|спондилодез/],
  ["kidney-transplant", /kidney transplant|пересадк\S* почк|трансплантац\S* почк|buyrak (ko'chirib|transplant)/],
  ["liver-transplant", /liver transplant|пересадк\S* печен|трансплантац\S* печен|jigar (ko'chirib|transplant)/],
  ["bone-marrow-transplant", /bone marrow|костного мозга|suyak ko'migi/],
  ["ivf-cycle", /\bivf\b|\bэко\b|ekstrakorporal|in vitro/],
  ["phacoemulsification", /cataract|катаракт|katarakta/],
  ["hair-transplant", /hair|волос|soch/],
  ["dental-implant", /dental|tooth|teeth|зуб|tish/],
  ["sleeve-gastrectomy", /sleeve|weight loss|bariatric|похуден|бариатр|ozish/],
  ["gamma-knife", /gamma knife|гамма[- ]нож/],
  ["cochlear-implant", /cochlear|кохлеар/],
];

const GENERIC_WORDS = new Set([
  "full", "body", "total", "partial", "complete", "surgery", "surgical", "treatment", "operation", "procedure", "therapy", "care",
  "cost", "costs", "price", "much", "does", "what", "with", "from", "need", "want", "have", "this", "that", "about", "your", "india",
  "replacement", "transplant", "repair", "removal", "implant", "upgrade", "advanced", "robotic", "minimally", "invasive",
  "операция", "операции", "лечение", "лечения", "стоимость", "сколько", "стоит", "полная", "полное", "замена", "пересадка", "индии",
  "operatsiya", "davolash", "narxi", "qancha", "turadi", "almashtirish", "hindiston", "hindistonda",
]);

/** The catalogue treatment a spoken phrase names, if one clearly does. */
export function matchTreatment<T extends NamedTreatment>(phrase: string, treatments: T[]): T | null {
  const value = phrase.toLowerCase();
  if (!value.trim()) return null;
  for (const [code, pattern] of SPOKEN_TREATMENTS) {
    if (pattern.test(value)) {
      const found = treatments.find((item) => item._id === code);
      if (found) return found;
    }
  }
  // Only words that say which treatment: "full", "surgery" or "cost" alone
  // must not turn an unknown treatment into a price for a different one.
  const words = value.split(/[^\p{L}\p{N}']+/u).filter((word) => word.length >= 4 && !GENERIC_WORDS.has(word));
  if (words.length === 0) return null;
  let best: { item: T; score: number } | null = null;
  for (const item of treatments) {
    const names = Object.values(item.name ?? {}).join(" ").toLowerCase();
    const score = words.filter((word) => names.includes(word.slice(0, Math.max(4, word.length - 2)))).length;
    if (score > 0 && (!best || score > best.score)) best = { item, score };
  }
  return best?.item ?? null;
}


/** "I want / need / am looking for …" — asking for something, not asking about it. */
const WANTS = /\b(want|need|looking for|interested in|have to|get|do|make|instead|switch|change)\b|хочу|нужн|интересует|вместо|kerak|xohlayman|istayman|o'rniga/i;

/**
 * The catalogue treatment the patient is now asking for, when it differs
 * from the one they asked for before ("actually I want a knee replacement").
 * Null when they name none, the same one, or are only asking a question.
 */
export function newTreatmentRequest<T extends NamedTreatment>(text: string, current: string | null | undefined, treatments: T[]): T | null {
  if (/\?\s*$/.test(text) || !WANTS.test(text)) return null;
  const named = matchTreatment(text, treatments);
  if (!named) return null;
  const before = current ? (treatments.find((item) => item._id === current) ?? matchTreatment(current, treatments)) : null;
  return before?._id === named._id ? null : named;
}

/** Two descriptions of a treatment that clearly name different catalogue treatments. */
export function differentTreatments<T extends NamedTreatment>(a: string, b: string, treatments: T[]): boolean {
  const first = matchTreatment(a, treatments);
  const second = matchTreatment(b, treatments);
  return Boolean(first && second && first._id !== second._id);
}
