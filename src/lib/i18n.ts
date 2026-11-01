import { COUNTRIES } from "./countries";

/** The languages text is written and stored in. */
export const CONTENT_LOCALES = ["en", "ru", "uz"] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];

/**
 * The languages a page can be shown in.
 * - en, ru, uz: written by hand, in the code and the content.
 * - oz: Uzbek in Cyrillic (the code Uzbekistan's own government sites use):
 *   never stored, but made from the Latin Uzbek as the page renders — see uz-cyrillic.ts.
 * - The rest are translated by the AI from English, once per sentence, and kept
 *   in the database, where the team can correct them (Admin → Translations).
 *   Arabic, Hindi and Bengali are the ones the team reviews.
 */
export const LOCALES = ["en", "ru", "uz", "oz", "ar", "hi", "bn", "fr", "es", "pt", "bg", "ro", "sq"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Languages the page translator fills in from English. */
export const TRANSLATED_LOCALES = ["ar", "hi", "bn", "fr", "es", "pt", "bg", "ro", "sq"] as const satisfies readonly Locale[];
export type TranslatedLocale = (typeof TRANSLATED_LOCALES)[number];
/** Of those, the ones the team checks and corrects first. */
export const REVIEWED_LOCALES: readonly TranslatedLocale[] = ["ar", "hi", "bn"];
export const isTranslatedLocale = (value: string | null | undefined): value is TranslatedLocale =>
  !!value && (TRANSLATED_LOCALES as readonly string[]).includes(value);

export const LOCALE_META: Record<Locale, { label: string; english: string; dir: "ltr" | "rtl"; htmlLang: string; short: string }> = {
  en: { label: "English", english: "English", dir: "ltr", htmlLang: "en", short: "EN" },
  ru: { label: "Русский", english: "Russian", dir: "ltr", htmlLang: "ru", short: "RU" },
  uz: { label: "Oʻzbekcha", english: "Uzbek (Latin)", dir: "ltr", htmlLang: "uz", short: "UZ" },
  oz: { label: "Ўзбекча", english: "Uzbek (Cyrillic)", dir: "ltr", htmlLang: "uz-Cyrl", short: "ЎЗ" },
  ar: { label: "العربية", english: "Arabic", dir: "rtl", htmlLang: "ar", short: "AR" },
  hi: { label: "हिन्दी", english: "Hindi", dir: "ltr", htmlLang: "hi", short: "HI" },
  bn: { label: "বাংলা", english: "Bengali", dir: "ltr", htmlLang: "bn", short: "BN" },
  fr: { label: "Français", english: "French", dir: "ltr", htmlLang: "fr", short: "FR" },
  es: { label: "Español", english: "Spanish", dir: "ltr", htmlLang: "es", short: "ES" },
  pt: { label: "Português", english: "Portuguese", dir: "ltr", htmlLang: "pt", short: "PT" },
  bg: { label: "Български", english: "Bulgarian", dir: "ltr", htmlLang: "bg", short: "BG" },
  ro: { label: "Română", english: "Romanian", dir: "ltr", htmlLang: "ro", short: "RO" },
  sq: { label: "Shqip", english: "Albanian", dir: "ltr", htmlLang: "sq", short: "SQ" },
};

/** "en|ru|uz|…", for matching a locale at the start of a path. */
export const LOCALE_PATTERN = LOCALES.join("|");

/**
 * The stored language a page language reads from: Cyrillic Uzbek reads the
 * Latin, and the translated languages read the English the translator starts from.
 */
export const contentLocale = (locale: Locale): ContentLocale =>
  locale === "oz" ? "uz" : (CONTENT_LOCALES as readonly string[]).includes(locale) ? (locale as ContentLocale) : "en";

/**
 * Country -> language mapping, taken from the country list so there is one
 * place to add a country and the language it reads best in. The site opens in
 * the language that fits where the visitor is browsing from; anything not
 * listed falls back to English. This is a preference, never a restriction:
 * every language stays available from the switcher in the header.
 */
const COUNTRY_LOCALE: Record<string, Locale> = Object.fromEntries(
  COUNTRIES.filter((country) => country.locale).map((country) => [country.code, country.locale!]),
);

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

export function localeForCountry(country: string | undefined | null): Locale | null {
  if (!country) return null;
  return COUNTRY_LOCALE[country.toUpperCase()] ?? null;
}

/** Picks the best supported locale from an Accept-Language header. */
export function localeFromAcceptLanguage(header: string | undefined | null): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.trim().toLowerCase(), q: q ? Number.parseFloat(q.split("=")[1]) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    if (tag.startsWith("uz-cyrl")) return "oz";
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return null;
}

/** Resolution order: explicit choice (cookie) > country > browser language > English. */
export function resolveLocale(input: {
  cookie?: string | null;
  country?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (isLocale(input.cookie)) return input.cookie;
  return localeForCountry(input.country) ?? localeFromAcceptLanguage(input.acceptLanguage) ?? DEFAULT_LOCALE;
}

export const LOCALE_COOKIE = "shifain_locale";
