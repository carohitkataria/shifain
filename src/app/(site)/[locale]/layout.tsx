import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "../../globals.css";
import { getContent } from "@/lib/store";
import { t } from "@/lib/localize";
import { LOCALES, LOCALE_META, isLocale, DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import { FloatingTools } from "@/components/FloatingTools";

/** The site's typeface, served from our own domain; Cyrillic falls back to the system face. */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
});

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
      images: [{ url: "/brand/og-image.png", width: 1200, height: 630, alt: "ShifaIn" }],
    },
    twitter: { card: "summary_large_image", images: ["/brand/og-image.png"] },
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
  const { contact } = await getContent();

  return (
    <html lang={LOCALE_META[locale].htmlLang} dir={LOCALE_META[locale].dir} className="site-scale">
      <body className={jakarta.className}>
        {children}
        <FloatingTools whatsapp={contact.whatsapp || null} phone={contact.phone || null} />
      </body>
    </html>
  );
}
