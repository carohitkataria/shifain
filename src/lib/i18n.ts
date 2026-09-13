import { COUNTRIES } from "./countries";

export const LOCALES = ["en", "ru", "uz"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_META: Record<Locale, { label: string; english: string; dir: "ltr" | "rtl"; htmlLang: string }> = {
  en: { label: "English", english: "English", dir: "ltr", htmlLang: "en" },
  ru: { label: "Русский", english: "Russian", dir: "ltr", htmlLang: "ru" },
  uz: { label: "O'zbek", english: "Uzbek", dir: "ltr", htmlLang: "uz" },
};

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
