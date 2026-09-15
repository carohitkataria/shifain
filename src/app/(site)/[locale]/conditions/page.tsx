import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getContent } from "@/lib/store";
import { listCategories, listDiseases } from "@/lib/catalogue";
import { CONDITION_COPY } from "@/lib/directory-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ConditionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  const [content, diseases, categories] = await Promise.all([
    getContent(),
    listDiseases(),
    listCategories(),
  ]);

  // Grouped by category, in the order the catalogue puts them.
  const grouped = categories
    .map((category) => ({
      category,
      items: diseases.filter((disease) => disease.categoryCode === category._id),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <Header content={content} locale={locale} path="/conditions" />

      <main className="bg-surface-muted px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-4xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            {t(CONDITION_COPY.title, locale)}
          </h1>
          <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
            {t(CONDITION_COPY.body, locale)}
          </p>

          <div className="mt-10 space-y-10">
            {grouped.map(({ category, items }) => (
              <section key={category._id}>
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-brand">
                  {t(category.name, locale)}
                </h2>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((disease) => (
                    <li key={disease._id}>
                      <Link
                        href={`/${locale}/conditions/${disease._id}`}
                        className="card link-card block p-4"
                      >
                        <span className="font-semibold text-ink">{t(disease.name, locale)}</span>
                        {disease.icd10 ? (
                          <span className="mt-0.5 block text-xs text-ink-muted">
                            ICD-10 {disease.icd10}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </main>

      <Footer content={content} locale={locale} />
    </>
  );
}
