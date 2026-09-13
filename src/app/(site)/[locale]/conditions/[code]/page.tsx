import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { getContent } from "@/lib/store";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { listSpecialties, priceBandsFor, type Disease, type MatchingRule, type Treatment } from "@/lib/catalogue";
import { estimateFor } from "@/lib/ai/estimate";
import { CONDITION_COPY } from "@/lib/directory-copy";
import { PLAN_COPY } from "@/lib/plan-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const money = (value: number) => `$${Math.round(value).toLocaleString("en-US")}`;

export default async function ConditionPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale: raw, code } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  if (!isDatabaseConfigured()) notFound();
  const db = await getDb();

  const disease = await db.collection<Disease>("diseases").findOne({ _id: code });
  if (!disease) notFound();

  const rules = await db.collection<MatchingRule>("matching_rules").find({ diseaseCode: code }).toArray();
  const [content, specialties, treatments, bands] = await Promise.all([
    getContent(),
    listSpecialties(),
    db
      .collection<Treatment>("treatments")
      .find({ _id: { $in: rules.map((rule) => rule.treatmentCode) } })
      .toArray(),
    priceBandsFor(rules.map((rule) => rule.treatmentCode)),
  ]);

  const treatmentById = new Map(treatments.map((item) => [item._id, item]));
  const specialtyName = (value: string) =>
    t(specialties.find((item) => item._id === value)?.name, locale) || value;

  return (
    <>
      <Header content={content} locale={locale} path={`/conditions/${code}`} />

      <main className="bg-surface-muted px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-3xl">
          <Link href={`/${locale}/conditions`} className="text-sm font-bold text-brand hover:underline">
            &larr; {t(CONDITION_COPY.back, locale)}
          </Link>

          <div className="card mt-4 p-7 sm:p-9">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">
              {t(disease.name, locale)}
            </h1>
            <p className="mt-1.5 text-ink-soft">
              {t(CONDITION_COPY.specialty, locale)}: {specialtyName(disease.primarySpecialtyCode)}
              {disease.icd10 ? ` · ICD-10 ${disease.icd10}` : ""}
            </p>

            <section className="mt-8">
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-ink-soft">
                {t(CONDITION_COPY.pathways, locale)}
              </h2>
              <ul className="mt-3 space-y-3">
                {rules.map((rule) => {
                  const treatment = treatmentById.get(rule.treatmentCode);
                  const estimate = estimateFor(rule.treatmentCode, bands);
                  return (
                    <li key={rule._id} className="rounded-xl2 border border-line bg-surface-muted p-4">
                      <p className="font-semibold text-ink">
                        {treatment ? t(treatment.name, locale) : rule.treatmentCode}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="chip">
                          <Icon name="bed" className="h-4 w-4" />
                          {rule.inpatientNights.min}–{rule.inpatientNights.max}{" "}
                          {t(CONDITION_COPY.nights, locale)}
                        </span>
                        <span className="chip">
                          <Icon name="clock" className="h-4 w-4" />
                          {rule.daysInCountry.min}–{rule.daysInCountry.max}{" "}
                          {t(CONDITION_COPY.days, locale)}
                        </span>
                        {estimate.kind !== "none" ? (
                          <span className="chip">
                            <Icon name="card" className="h-4 w-4" />
                            {money(estimate.min)}–{money(estimate.max)}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <p className="mt-8 border-t border-line pt-5 text-sm leading-relaxed text-ink-soft">
              {t(CONDITION_COPY.disclaimer, locale)} {t(PLAN_COPY.indicative, locale)}
            </p>
          </div>

          <Link href={`/${locale}#quote-form`} className="btn btn-primary mt-6">
            {t(CONDITION_COPY.cta, locale)}
          </Link>
        </div>
      </main>

      <Footer content={content} locale={locale} />
    </>
  );
}
