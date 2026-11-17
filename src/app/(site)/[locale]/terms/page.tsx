import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { TERMS } from "@/lib/legal-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  return { title: `${t(TERMS.title, locale)} · Shifain`, description: t(TERMS.lead, locale) };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  return <LegalPage doc={TERMS} locale={locale} path="/terms" />;
}
