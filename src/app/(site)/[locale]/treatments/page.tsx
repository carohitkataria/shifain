import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getContent } from "@/lib/store";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const content = await getContent();
  return {
    title: `${t(content.specialties.title, locale)} — ${content.brand.name}`,
    description: t(content.specialties.body, locale),
  };
}

export default async function TreatmentsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const content = await getContent();
  const { specialties } = content;

  return (
    <>
      <Header content={content} locale={locale} path="/treatments" />
      <main className="bg-surface-muted">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            {t(specialties.title, locale)}
          </h1>
          <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">{t(specialties.body, locale)}</p>

          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {specialties.items.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/${locale}/treatments/${item.slug}`}
                  className="card link-card group flex h-full flex-col p-6 focus:outline-none"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl"
                  >
                    {item.icon}
                  </span>
                  <h2 className="mt-4 text-xl font-extrabold tracking-tight text-ink">
                    {t(item.title, locale)}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">
                    {t(item.body, locale)}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-deep">
                    {t(specialties.linkLabel, locale)}
                    <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                      &rarr;
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer content={content} locale={locale} />
    </>
  );
}
