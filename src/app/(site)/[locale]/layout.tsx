import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
// Served from our own domain and bundled at build: no build or page load depends on Google Fonts.
// Plus Jakarta Sans has no basic Cyrillic, so Inter (which has) carries Russian and Uzbek Cyrillic.
import "@fontsource-variable/plus-jakarta-sans/wght.css";
import "@fontsource-variable/inter/wght.css";
import "../../globals.css";
import { getContent } from "@/lib/store";
import { t } from "@/lib/localize";
import { LOCALES, LOCALE_META, isLocale, isTranslatedLocale, DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import { FloatingTools } from "@/components/FloatingTools";
import { PageTranslator } from "@/components/PageTranslator";

/**
 * Published edits refresh these pages at once (the editor revalidates them);
 * this is the safety net if a build ever rendered them without the database.
 */
export const revalidate = 600;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const viewport: Viewport = { themeColor: "#7c3aed" };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const content = await getContent();

  return {
    // Absolute links for the logo in link previews (WhatsApp, Telegram, Facebook).
    metadataBase: new URL(process.env.BASE_URL?.trim() || "https://shifain.com"),
    title: `${content.brand.name} — ${t(content.brand.tagline, locale)}`,
    description: t(content.hero.body, locale),
    openGraph: {
      type: "website",
      siteName: content.brand.name,
      title: `${content.brand.name} — ${t(content.brand.tagline, locale)}`,
      description: t(content.hero.body, locale),
      locale: LOCALE_META[locale].htmlLang,
      images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: "Shifain" }],
    },
    twitter: { card: "summary_large_image", images: ["/brand/og-image.png"] },
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
  // "/wp-login.php" or "/abc.txt" lands here (the middleware skips dotted paths):
  // anything that is not one of our languages is a missing page, not the English site.
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const { contact } = await getContent();

  // A translated language renders the English, then swaps it: the page stays
  // hidden for that moment (at most 2.5 s) so the visitor never sees it switch.
  const translated = isTranslatedLocale(locale);

  return (
    <html
      lang={LOCALE_META[locale].htmlLang}
      dir={LOCALE_META[locale].dir}
      className="site-scale"
      {...(translated ? { "data-translating": "" } : {})}
    >
      <body>
        {children}
        <FloatingTools whatsapp={contact.whatsapp || null} phone={contact.phone || null} />
        {translated ? <PageTranslator locale={locale} /> : null}
      </body>
    </html>
  );
}
