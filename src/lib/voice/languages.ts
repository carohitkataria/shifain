/**
 * Language codes between the translator, speech-to-text and the natural
 * voices. Shared by the browser and the server.
 */

/** Languages the natural voices pronounce well; the rest use the phone's own voice. */
export const NATURAL_TTS = new Set(["en", "hi", "ru", "tr", "ar", "fr"]);

const THREE_LETTER: Record<string, string> = {
  eng: "en",
  rus: "ru",
  uzb: "uz",
  hin: "hi",
  tgk: "tg",
  kaz: "kk",
  kir: "ky",
  tuk: "tk",
  aze: "az",
  tur: "tr",
  fas: "fa",
  per: "fa",
  ara: "ar",
  ben: "bn",
  fra: "fr",
  fre: "fr",
};

/** "eng", "en-US" or "en" → "en": speech-to-text answers in more than one style. */
export function fromSpeechCode(code: string | null | undefined): string {
  const base = String(code ?? "")
    .toLowerCase()
    .split(/[-_]/)[0];
  return THREE_LETTER[base] ?? base;
}
