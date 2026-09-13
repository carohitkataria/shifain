import type { Locale } from "./i18n";

/** Prefixes internal paths with the active locale; leaves anchors and externals alone. */
export function localeHref(href: string, locale: Locale): string {
  if (href.startsWith("#") || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return href;
  }
  return `/${locale}${href.startsWith("/") ? href : `/${href}`}`;
}
