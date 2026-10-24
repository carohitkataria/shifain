/**
 * Uzbek Latin → Uzbek Cyrillic, by the official correspondence between the
 * two alphabets. Almost every Latin letter or letter pair has exactly one
 * Cyrillic counterpart, so the site's Uzbek text can be shown in Cyrillic
 * without a second translation — which matters to older readers, who learned
 * to read in Cyrillic. Brand names, links and addresses are left as written.
 */

const APOSTROPHES = "'ʻʼ‘’`";
const VOWELS = "aeiouAEIOU";

const SINGLE: Record<string, string> = {
  a: "а",
  b: "б",
  d: "д",
  e: "е",
  f: "ф",
  g: "г",
  h: "ҳ",
  i: "и",
  j: "ж",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  q: "қ",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  v: "в",
  x: "х",
  y: "й",
  z: "з",
  c: "с",
  w: "в",
};

/** Words kept in Latin: the brand, the apps people know by name, accreditations. */
const KEEP = new Set(["shifain", "whatsapp", "telegram", "google", "zoom", "jci", "nabh", "pdf", "sms", "id", "ok", "it", "mri", "ct", "frro", "medical", "attendant", "visa", "evisa"]);

const isApostrophe = (char: string | undefined) => !!char && APOSTROPHES.includes(char);
const upper = (text: string, like: string) => (like === like.toUpperCase() && like !== like.toLowerCase() ? text.toUpperCase() : text);

function word(token: string): string {
  const bare = token.toLowerCase().replace(/[^a-zʻʼ'‘’`]/g, "");
  if (KEEP.has(bare) || /[a-z][A-Z]/.test(token)) return token;
  const allCaps = token.length > 1 && token === token.toUpperCase() && /[A-Z]{2}/.test(token);
  let out = "";
  for (let i = 0; i < token.length; i += 1) {
    const char = token[i];
    const lower = char.toLowerCase();
    const next = token[i + 1]?.toLowerCase();
    const caseOf = allCaps ? char.toUpperCase() : char;
    // oʻ and gʻ: the apostrophe belongs to the letter.
    if ((lower === "o" || lower === "g") && isApostrophe(token[i + 1])) {
      out += upper(lower === "o" ? "ў" : "ғ", caseOf);
      i += 1;
      continue;
    }
    if (lower === "s" && next === "h") {
      out += upper("ш", caseOf);
      i += 1;
      continue;
    }
    if (lower === "c" && next === "h") {
      out += upper("ч", caseOf);
      i += 1;
      continue;
    }
    // ya, yu, yo, ye — but not yoʻ, which is й + ў.
    if (lower === "y" && next && "auoe".includes(next) && !(next === "o" && isApostrophe(token[i + 2]))) {
      out += upper({ a: "я", u: "ю", o: "ё", e: "е" }[next]!, caseOf);
      i += 1;
      continue;
    }
    // e at the start of a word, or after a vowel, is э.
    if (lower === "e") {
      const previous = token[i - 1];
      out += upper(!previous || !/[a-zA-Z]/.test(previous) || VOWELS.includes(previous) ? "э" : "е", caseOf);
      continue;
    }
    // The tutuq belgisi (ʼ) between letters is the hard sign.
    if (isApostrophe(char)) {
      const before = token[i - 1];
      const after = token[i + 1];
      out += before && after && /[a-zA-Z]/.test(before) && /[a-zA-Z]/.test(after) ? "ъ" : char;
      continue;
    }
    const mapped = SINGLE[lower];
    out += mapped ? upper(mapped, caseOf) : char;
  }
  return out;
}

/** Converts Uzbek written in Latin to Cyrillic, word by word. */
export function toUzCyrillic(text: string): string {
  if (!text) return text;
  // Links, emails, handles and anything with digits glued to letters stay as written.
  // So do official English names written into the Uzbek: e-Medical, e-FRRO.
  return text.replace(/(https?:\/\/\S+|www\.\S+|\S+@\S+|@\w+|\be-[A-Za-z]+|[A-Za-zʻʼ'‘’`]+)/g, (token) => (/^[A-Za-zʻʼ'‘’`]+$/.test(token) ? word(token) : token));
}
