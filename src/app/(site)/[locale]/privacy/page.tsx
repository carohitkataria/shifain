import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { PRIVACY } from "@/lib/legal-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  return { title: `${t(PRIVACY.title, locale)} · Shifain`, description: t(PRIVACY.lead, locale) };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  return <LegalPage doc={PRIVACY} locale={locale} path="/privacy" />;
}
