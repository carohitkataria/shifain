import type { Metadata } from "next";
import "../../globals.css";
import { getContent } from "@/lib/store";
import { t } from "@/lib/localize";
import { LOCALES, LOCALE_META, isLocale, DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import { FloatingTools } from "@/components/FloatingTools";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const content = await getContent();

  return {
    title: `${content.brand.name} — ${t(content.brand.tagline, locale)}`,
    description: t(content.hero.body, locale),
    alternates: {
      languages: Object.fromEntries(LOCALES.map((l) => [LOCALE_META[l].htmlLang, `/${l}`])),
    },
  };
}

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  return (
    <html lang={LOCALE_META[locale].htmlLang} dir={LOCALE_META[locale].dir}>
      <body>
        {children}
        <FloatingTools />
      </body>
    </html>
  );
}
