import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { PlanPackage, type PlanLine } from "@/components/PlanPackage";
import { PlanWaiting } from "@/components/PlanWaiting";
import { getContent } from "@/lib/store";
import { getCase } from "@/lib/cases";
import { isDatabaseConfigured } from "@/lib/db";
import { listDiseases, listTreatments, priceBandsFor } from "@/lib/catalogue";
import { estimateFor } from "@/lib/ai/estimate";
import { PACKAGE_LINES, PLAN_COPY } from "@/lib/plan-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-ink-soft">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function PlanPage({
  params,
}: {
  params: Promise<{ locale: string; reference: string }>;
}) {
  const { locale: raw, reference } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const content = await getContent();

  if (!isDatabaseConfigured()) notFound();
  const record = await getCase(reference).catch(() => null);
  if (!record) notFound();

  const shell = (body: React.ReactNode) => (
    <>
      <Header content={content} locale={locale} path={`/plan/${reference}`} />
      <main className="bg-surface-muted px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-3xl">{body}</div>
      </main>
      <Footer content={content} locale={locale} />
    </>
  );

  const referenceLine = (
    <p className="mt-4 text-sm text-ink-soft">
      {t(PLAN_COPY.reference, locale)}:{" "}
      <span className="font-bold tracking-wide text-ink">{record._id}</span>
    </p>
  );

  if (record.status === "planning") {
    return shell(
      <div className="card p-8">
        <div className="flex items-center gap-3">
          <PlanWaiting reference={record._id} />
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            {t(PLAN_COPY.working.title, locale)}
          </h1>
        </div>
        <p className="mt-3 leading-relaxed text-ink-soft">{t(PLAN_COPY.working.body, locale)}</p>
        {referenceLine}
      </div>,
    );
  }

  if (!record.plan) {
    return shell(
      <div className="card p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">
          {t(PLAN_COPY.failed.title, locale)}
        </h1>
        <p className="mt-3 leading-relaxed text-ink-soft">{t(PLAN_COPY.failed.body, locale)}</p>
        {referenceLine}
        <Link href={`/${locale}`} className="btn btn-secondary mt-6">
          {t(PLAN_COPY.back, locale)}
        </Link>
      </div>,
    );
  }

  const plan = record.plan;
  const [diseases, treatments, bands] = await Promise.all([
    listDiseases(),
    listTreatments(),
    priceBandsFor(
      [plan.recommendedTreatmentCode, ...plan.treatments.map((item) => item.treatmentCode)].filter(
        (code): code is string => Boolean(code),
      ),
    ),
  ]);

  const treatmentName = (code: string) =>
    t(treatments.find((item) => item._id === code)?.name, locale) || code;
  const diseaseName = plan.diseaseCode
    ? t(diseases.find((item) => item._id === plan.diseaseCode)?.name, locale) || plan.diseaseCode
    : null;

  const estimate = estimateFor(plan.recommendedTreatmentCode, bands);
  const suggested = new Set(plan.suggestedPackage);

  const lines: PlanLine[] =
    estimate.kind === "none"
      ? []
      : [
          {
            id: "treatment",
            icon: "hospital",
            title: t(PLAN_COPY.treatmentLine, locale),
            note: plan.recommendedTreatmentCode ? treatmentName(plan.recommendedTreatmentCode) : "",
            min: estimate.min,
            max: estimate.max,
            optional: false,
            preselected: true,
          },
          ...Object.entries(PACKAGE_LINES).map(([id, line]) => ({
            id,
            icon: line.icon,
            title: t(line.label, locale),
            note: t(line.note, locale),
            min: line.usdMin,
            max: line.usdMax,
            optional: true,
            preselected: suggested.has(id as keyof typeof PACKAGE_LINES),
          })),
        ];

  return shell(
    <>
      {plan.redFlag.present && (
        <div className="mb-6 rounded-2xl border-2 border-saffron bg-saffron/10 p-6">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink">
            <Icon name="shield" className="h-5 w-5 text-saffron" />
            {t(PLAN_COPY.redFlag, locale)}
          </h2>
          <p className="mt-2 leading-relaxed text-ink">{plan.redFlag.message}</p>
        </div>
      )}

      <div className="card p-7 sm:p-9">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand">
          {t(PLAN_COPY.confidence[plan.confidence], locale)}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink">
          {diseaseName ?? t(PLAN_COPY.understanding, locale)}
        </h1>
        <p className="mt-4 leading-relaxed text-ink-soft">{plan.understanding}</p>
        {referenceLine}

        {plan.reportsRead.length > 0 && (
          <Section title={t(PLAN_COPY.reportsRead, locale)}>
            <ul className="space-y-1.5">
              {plan.reportsRead.map((item) => (
                <li key={item} className="flex gap-2 text-ink-soft">
                  <Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-leaf" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {plan.recommendedTreatmentCode && (
          <Section title={t(PLAN_COPY.pathway, locale)}>
            <p className="text-xl font-bold text-ink">
              {treatmentName(plan.recommendedTreatmentCode)}
            </p>
            <p className="mt-1 text-ink-soft">
              {plan.treatments.find((item) => item.treatmentCode === plan.recommendedTreatmentCode)?.why}
            </p>

            {plan.treatments.length > 1 && (
              <>
                <p className="mt-5 text-sm font-bold uppercase tracking-[0.14em] text-ink-soft">
                  {t(PLAN_COPY.alternatives, locale)}
                </p>
                <ul className="mt-2 space-y-2">
                  {plan.treatments
                    .filter((item) => item.treatmentCode !== plan.recommendedTreatmentCode)
                    .map((item) => (
                      <li key={item.treatmentCode} className="text-ink-soft">
                        <span className="font-semibold text-ink">
                          {treatmentName(item.treatmentCode)}
                        </span>{" "}
                        — {item.why}
                      </li>
                    ))}
                </ul>
              </>
            )}
          </Section>
        )}

        <Section title={t(PLAN_COPY.stay, locale)}>
          <div className="flex flex-wrap gap-3">
            <span className="chip">
              <Icon name="bed" className="h-4 w-4" />
              {plan.stay.inpatientNights} {t(PLAN_COPY.nights, locale)}
            </span>
            <span className="chip">
              <Icon name="clock" className="h-4 w-4" />
              {plan.stay.daysInCountry} {t(PLAN_COPY.days, locale)}
            </span>
          </div>
        </Section>

        {plan.itinerary.length > 0 && (
          <Section title={t(PLAN_COPY.itinerary, locale)}>
            <ol className="space-y-4 border-l-2 border-line pl-5">
              {plan.itinerary.map((step, index) => (
                <li key={`${step.day}-${index}`} className="relative">
                  <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-brand bg-white" />
                  <p className="text-sm font-bold uppercase tracking-[0.12em] text-brand">{step.day}</p>
                  <p className="font-semibold text-ink">{step.title}</p>
                  <p className="mt-0.5 leading-relaxed text-ink-soft">{step.detail}</p>
                </li>
              ))}
            </ol>
          </Section>
        )}

        <Section title={t(PLAN_COPY.packageTitle, locale)}>
          {lines.length > 0 ? (
            <>
              <p className="mb-3 text-ink-soft">{t(PLAN_COPY.packageNote, locale)}</p>
              <PlanPackage
                currency="USD"
                lines={lines}
                labels={{
                  included: t(PLAN_COPY.included, locale),
                  optional: t(PLAN_COPY.optional, locale),
                  total: t(PLAN_COPY.total, locale),
                  note: t(PLAN_COPY.indicative, locale),
                  free: t(PLAN_COPY.included, locale),
                }}
              />
            </>
          ) : (
            <p className="rounded-2xl bg-surface-muted p-5 leading-relaxed text-ink-soft">
              {t(PLAN_COPY.noEstimate, locale)}
            </p>
          )}
        </Section>

        {plan.questionsForPatient.length > 0 && (
          <Section title={t(PLAN_COPY.questions, locale)}>
            <ul className="list-disc space-y-1.5 pl-5 text-ink-soft">
              {plan.questionsForPatient.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Section>
        )}

        {plan.missingReports.length > 0 && (
          <Section title={t(PLAN_COPY.missing, locale)}>
            <ul className="list-disc space-y-1.5 pl-5 text-ink-soft">
              {plan.missingReports.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Section>
        )}

        <p className="mt-8 border-t border-line pt-5 text-sm leading-relaxed text-ink-soft">
          {t(PLAN_COPY.disclaimer, locale)}
        </p>
      </div>

      <Link href={`/${locale}`} className="btn btn-secondary mt-6">
        {t(PLAN_COPY.back, locale)}
      </Link>
    </>,
  );
}
