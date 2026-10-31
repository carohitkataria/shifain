/**
 * Which ElevenLabs model speaks a reply, and who listens to the patient —
 * the browser's recogniser or the server (ElevenLabs Scribe). Pure, so it is
 * tested without a key (scripts/test/voice-engine.test.mts) and safe in the
 * browser.
 */

/**
 * The 32 languages Flash v2.5 speaks: the 29 of Multilingual v2 plus
 * Hungarian, Norwegian and Vietnamese. Uzbek, Kazakh, Kyrgyz, Tajik,
 * Azerbaijani, Armenian and Persian are not among them.
 */
export const FLASH_LANGUAGES = new Set([
  "en", "ja", "zh", "de", "hi", "fr", "ko", "pt", "it", "es", "id", "nl", "tr", "fil", "pl", "sv",
  "bg", "ro", "ar", "cs", "el", "fi", "hr", "ms", "sk", "da", "ta", "uk", "ru", "hu", "no", "vi",
]);

export const FLASH_MODEL = "eleven_flash_v2_5";
/** Eleven v3 speaks 70+ languages, Uzbek among them. */
export const WIDE_MODEL = "eleven_v3";

/** Scribe answers in three-letter codes ("uzb"); our Cyrillic Uzbek page is "oz". */
const THREE_LETTER: Record<string, string> = {
  eng: "en", rus: "ru", uzb: "uz", kaz: "kk", kir: "ky", tgk: "tg", aze: "az", hye: "hy", fas: "fa", per: "fa",
  tur: "tr", hin: "hi", ara: "ar", ukr: "uk", deu: "de", fra: "fr", spa: "es", zho: "zh", cmn: "zh", fil: "fil", tgl: "fil",
};

/** "uz-Latn-UZ", "uzb", "oz" → "uz". Empty when nothing usable came in. */
export function baseLanguage(code: string | null | undefined): string {
  const value = (code ?? "").trim().toLowerCase().split(/[-_]/)[0];
  if (value === "oz") return "uz";
  if (value === "nb" || value === "nn") return "no";
  if (value === "tl") return "fil";
  return THREE_LETTER[value] ?? (/^[a-z]{2,3}$/.test(value) ? value : "");
}

/** Eleven v3 (and models we have not checked) ignore voice_settings.speed; the player applies the rate instead. */
export const takesSpeed = (model: string) => /flash|turbo|multilingual/i.test(model);

/** Only Flash and Turbo take language_code; other models refuse or ignore it. */
export const takesLanguageCode = (model: string) => /flash|turbo/i.test(model);

/**
 * The model for a reply in this language: Flash where it speaks the language
 * (or the language is unknown — Flash detects it), the wide model otherwise.
 * ELEVENLABS_MODEL replaces Flash and ELEVENLABS_MODEL_WIDE the wide model.
 */
export function ttsModelFor(
  lang: string | null | undefined,
  env: { ELEVENLABS_MODEL?: string; ELEVENLABS_MODEL_WIDE?: string } = {},
): { modelId: string; languageCode?: string } {
  const base = baseLanguage(lang);
  const flash = env.ELEVENLABS_MODEL?.trim() || FLASH_MODEL;
  const modelId = !base || FLASH_LANGUAGES.has(base) ? flash : env.ELEVENLABS_MODEL_WIDE?.trim() || WIDE_MODEL;
  return base && takesLanguageCode(modelId) ? { modelId, languageCode: base } : { modelId };
}

/** Languages browsers hear badly or not at all: the server listens instead. */
export const SERVER_HEARD_LANGUAGES = new Set(["uz", "kk", "ky", "tg"]);

/**
 * Whether a voice turn is recorded and heard by the server. Only when the
 * server can transcribe and the browser can record; then always if the admin
 * forces it, if the browser has no recogniser, or if the patient speaks a
 * language browsers do not hear well.
 */
export function listensOnServer(input: {
  serverVoice: boolean;
  canRecord: boolean;
  hasRecogniser: boolean;
  forceServer: boolean;
  languages: (string | null | undefined)[];
}): boolean {
  if (!input.serverVoice || !input.canRecord) return false;
  if (input.forceServer || !input.hasRecogniser) return true;
  return input.languages.some((lang) => SERVER_HEARD_LANGUAGES.has(baseLanguage(lang)));
}
