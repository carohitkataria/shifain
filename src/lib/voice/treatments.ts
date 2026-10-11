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
  const words = value.split(/[^\p{L}\p{N}]+/u).filter((word) => word.length >= 4);
  if (words.length === 0) return null;
  let best: { item: T; score: number } | null = null;
  for (const item of treatments) {
    const names = Object.values(item.name ?? {}).join(" ").toLowerCase();
    const score = words.filter((word) => names.includes(word.slice(0, Math.max(4, word.length - 2)))).length;
    if (score > 0 && (!best || score > best.score)) best = { item, score };
  }
  return best?.item ?? null;
}

