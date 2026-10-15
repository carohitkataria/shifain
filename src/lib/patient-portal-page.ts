import "server-only";
import { getContent } from "./store";
import { loadPortal } from "./patient-portal";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./i18n";

export type PortalPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ case?: string; done?: string; error?: string }>;
};

/** What every portal page starts from: the language, the site content and the patient's cases. */
export async function portalPage({ params, searchParams }: PortalPageProps) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const query = await searchParams;
  const [content, data] = await Promise.all([getContent(), loadPortal(locale, query.case)]);
  return { locale, content, data, query };
}

/** Keeps the chosen case on links inside the portal. */
export const withCase = (href: string, reference: string | undefined) =>
  reference ? `${href}${href.includes("?") ? "&" : "?"}case=${encodeURIComponent(reference)}` : href;
