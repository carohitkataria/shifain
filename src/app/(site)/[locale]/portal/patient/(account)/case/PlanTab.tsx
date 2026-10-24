import { CASE_TABS } from "@/components/patient-app/AppShell";
import Link from "next/link";
import { Panel, PortalFrame, PortalHeading } from "@/components/portal/PortalFrame";
import { PortalIcon } from "@/components/portal/PortalIcon";
import { PORTAL_COPY } from "@/lib/portal-patient-copy";
import { portalPage, withCase, type PortalPageProps } from "@/lib/patient-portal-page";
import { listTreatments } from "@/lib/catalogue";
import { SERVICE_WORDS, sayLang } from "@/lib/voice/command-copy";
import { t } from "@/lib/localize";
import type { L } from "@/lib/content-types";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-surface-muted p-4">
      <dt className="text-sm font-medium text-slate">{label}</dt>
      <dd className="mt-1 text-lg font-bold leading-snug text-navy">{children}</dd>
    </div>
  );
}

export async function PlanTab(props: PortalPageProps) {
  const { locale, content, data } = await portalPage(props);
  const record = data.active;
  if (!record) return <PortalFrame content={content} locale={locale} data={data} section="plan" tabs={CASE_TABS("plan")}>{null}</PortalFrame>;

  const plan = record.plan;
  const treatments = plan ? await listTreatments().catch(() => []) : [];
  const nameOf = (code: string | null) => {
    const found = code ? treatments.find((item) => item._id === code) : null;
    return found ? t(found.name, locale) : code ?? "";
  };
  const lang = sayLang(locale);
  const prefs = record.preferences ?? {};
  const wishes: [L, string | null | undefined][] = [
    [PORTAL_COPY.wishCity, prefs.city],
    [PORTAL_COPY.wishTravel, prefs.travel],
    [PORTAL_COPY.wishCompanions, typeof prefs.companions === "number" ? String(prefs.companions) : null],
  ];

  return (
    <PortalFrame content={content} locale={locale} data={data} section="plan" tabs={CASE_TABS("plan")}>
      <PortalHeading title={t(PORTAL_COPY.planTitle, locale)} lead={plan ? t(PORTAL_COPY.planDraftNote, locale) : undefined}>
        {plan ? (
          <Link
            href={`/${locale}/plan/${record._id}`}
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-violet px-6 font-semibold text-white transition hover:bg-brand-deep"
          >
            {t(PORTAL_COPY.planOpen, locale)}
            <PortalIcon name="arrow" />
          </Link>
        ) : null}
      </PortalHeading>

      {!plan ? (
        <Panel>
          <p className="text-lg text-navy">{t(PORTAL_COPY.planNone, locale)}</p>
          <Link href={withCase(`/${locale}/portal/patient/reports`, record._id)} className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-violet hover:underline">
            {t(PORTAL_COPY.uploadTitle, locale)}
            <PortalIcon name="arrow" className="h-4 w-4" />
          </Link>
        </Panel>
      ) : (
        <>
          {plan.redFlag.present ? (
            <p role="alert" className="flex gap-3 rounded-3xl bg-[#fdecec] p-5 text-[15px] font-medium leading-relaxed text-[#8f1d1d]">
              <PortalIcon name="alert" className="mt-0.5 h-5 w-5 flex-none" />
              {plan.redFlag.message}
            </p>
          ) : null}

          <Panel>
            <h2 className="text-lg font-bold text-navy">{t(PORTAL_COPY.understanding, locale)}</h2>
            <p className="mt-2 max-w-3xl text-[16px] leading-relaxed text-[#2c3a5e]">{plan.understanding}</p>
            <dl className="mt-5 grid gap-3 sm:grid-cols-3">
              <Fact label={t(PORTAL_COPY.recommended, locale)}>{nameOf(plan.recommendedTreatmentCode) || "—"}</Fact>
              <Fact label={t(PORTAL_COPY.destination, locale)}>{plan.destinationCity ?? "—"}</Fact>
              <Fact label={t(PORTAL_COPY.stay, locale)}>
                {plan.stay.inpatientNights} {t(PORTAL_COPY.nights, locale)}
                <span className="block text-base font-semibold text-slate">
                  {plan.stay.daysInCountry} {t(PORTAL_COPY.days, locale)}
                </span>
              </Fact>
            </dl>
          </Panel>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            {plan.itinerary.length ? (
              <Panel>
                <h2 className="text-lg font-bold text-navy">{t(PORTAL_COPY.itinerary, locale)}</h2>
                <ol className="mt-4 flex flex-col gap-3">
                  {plan.itinerary.map((day, index) => (
                    <li key={`${day.day}-${index}`} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 rounded-2xl bg-surface-muted p-4">
                      <span className="text-sm font-bold text-violet">{day.day}</span>
                      <span>
                        <span className="block font-semibold text-navy">{day.title}</span>
                        <span className="mt-0.5 block text-[15px] leading-snug text-[#2c3a5e]">{day.detail}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </Panel>
            ) : null}

            <div className="flex flex-col gap-6">
              <Panel>
                <h2 className="text-lg font-bold text-navy">{t(PORTAL_COPY.services, locale)}</h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {plan.suggestedPackage.map((service) => (
                    <li key={service} className="inline-flex items-center gap-1.5 rounded-full bg-violet-soft px-3 py-1.5 text-sm font-semibold text-violet first-letter:uppercase">
                      <PortalIcon name="check" className="h-4 w-4" />
                      <span className="first-letter:uppercase">{(SERVICE_WORDS[service]?.[lang] ?? service).replace(/^(a|an) /, "")}</span>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel>
                <h2 className="text-lg font-bold text-navy">{t(PORTAL_COPY.wishes, locale)}</h2>
                <dl className="mt-3 divide-y divide-[#eeebf7]">
                  {wishes.map(([label, value]) => (
                    <div key={label.en} className="flex justify-between gap-4 py-2.5 text-[15px]">
                      <dt className="text-slate">{t(label, locale)}</dt>
                      <dd className="text-right font-semibold text-navy">{value || t(PORTAL_COPY.notSet, locale)}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-sm leading-relaxed text-slate">{t(PORTAL_COPY.changeByChat, locale)}</p>
              </Panel>
            </div>
          </div>

          {plan.questionsForPatient.length || plan.missingReports.length ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {plan.questionsForPatient.length ? (
                <Panel>
                  <h2 className="text-lg font-bold text-navy">{t(PORTAL_COPY.questions, locale)}</h2>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-[#2c3a5e]">
                    {plan.questionsForPatient.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                </Panel>
              ) : null}
              {plan.missingReports.length ? (
                <Panel>
                  <h2 className="text-lg font-bold text-navy">{t(PORTAL_COPY.missing, locale)}</h2>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-[#2c3a5e]">
                    {plan.missingReports.map((report) => (
                      <li key={report}>{report}</li>
                    ))}
                  </ul>
                  <Link href={withCase(`/${locale}/portal/patient/reports`, record._id)} className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-violet hover:underline">
                    {t(PORTAL_COPY.uploadTitle, locale)}
                    <PortalIcon name="arrow" className="h-4 w-4" />
                  </Link>
                </Panel>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </PortalFrame>
  );
}
