import type { L } from "./content-types";
import type { Locale } from "./i18n";
import { toUzCyrillic } from "./uz-cyrillic";

/** Reads a localized string, falling back to English when a translation is blank. Cyrillic Uzbek is made from the Latin. */
export function t(value: L | undefined, locale: Locale): string {
  if (!value) return "";
  if (locale === "oz") {
    const latin = value.uz;
    return latin && latin.trim().length > 0 ? toUzCyrillic(latin) : (value.en ?? "");
  }
  const text = value[locale];
  if (text && text.trim().length > 0) return text;
  return value.en ?? "";
}
