import type { L } from "./content-types";
import { DEFAULT_LOCALE, type Locale } from "./i18n";

/** Reads a localized string, falling back to English when a translation is blank. */
export function t(value: L | undefined, locale: Locale): string {
  if (!value) return "";
  const text = value[locale];
  if (text && text.trim().length > 0) return text;
  return value[DEFAULT_LOCALE] ?? "";
}
