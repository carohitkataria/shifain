import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LogoMark } from "@/components/Logo";
import { getContent } from "@/lib/store";
import { t } from "@/lib/localize";
import { localeHref } from "@/lib/href";
import { PORTAL_BACK, PORTAL_COPY, isPortalRole } from "@/lib/portal-copy";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ locale: string; role: string }>;
}) {
  const { locale: raw, role } = await params;
  if (!isPortalRole(role)) notFound();

  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const content = await getContent();
  const copy = PORTAL_COPY[role];
  const href = copy.ctaHref.startsWith("#") ? `/${locale}${copy.ctaHref}` : localeHref(copy.ctaHref, locale);

  return (
    <>
      <Header content={content} locale={locale} path={`/portal/${role}`} />

      <main className="flex min-h-[60vh] items-center justify-center bg-surface-muted px-4 py-20">
        <div className="card max-w-lg p-8 text-center shadow-xl shadow-ink/5">
          <LogoMark className="mx-auto h-14 w-14" title="ShifaIn" />
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink">{t(copy.title, locale)}</h1>
          <p className="mt-3 leading-relaxed text-ink-soft">{t(copy.body, locale)}</p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href={href} className="btn btn-primary">
              {t(copy.cta, locale)}
            </Link>
            <Link href={`/${locale}`} className="btn btn-secondary">
              {t(PORTAL_BACK, locale)}
            </Link>
          </div>
        </div>
      </main>

      <Footer content={content} locale={locale} />
    </>
  );
}
