import Link from "next/link";
import { Icon } from "../Icon";
import { PackageBuilder } from "../PackageBuilder";
import { Section, SectionHeading } from "./Common";
import { FaqList } from "../FaqList";
import { listFaqs } from "@/lib/faqs";
import { t } from "@/lib/localize";
import type { L, SiteContent } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";

export function Planner({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { aiPlanner } = content;
  return (
    <Section id="planner" muted>
      <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-14">
        <div className="min-w-0 lg:sticky lg:top-28">
          <SectionHeading
            eyebrow={t(aiPlanner.eyebrow, locale)}
            title={t(aiPlanner.title, locale)}
            body={t(aiPlanner.body, locale)}
            align="start"
          />
          <p className="mt-6 flex gap-3 rounded-xl2 border border-line bg-white p-4 text-xs leading-relaxed text-ink-soft">
            <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-saffron-tint text-saffron">
              <Icon name="clock" className="h-4 w-4" />
            </span>
            {t(aiPlanner.disclaimer, locale)}
          </p>
        </div>

        <div className="card min-w-0 p-6 shadow-xl shadow-ink/5 sm:p-7">
          <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
            <div>
              <h3 className="text-lg font-extrabold leading-tight text-ink">{t(aiPlanner.packageTitle, locale)}</h3>
              <p className="mt-0.5 text-xs text-ink-muted">{t(aiPlanner.packageSubtitle, locale)}</p>
            </div>
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-tint text-brand-deep">
              <Icon name="sliders" className="h-5 w-5" />
            </span>
          </div>

          <PackageBuilder
            lines={aiPlanner.lines.map((line) => ({
              id: line.id,
              icon: line.icon,
              title: t(line.title, locale),
              note: t(line.note, locale),
              amount: line.amount,
              included: line.included,
              optional: line.optional,
            }))}
            includedLabel={t(aiPlanner.includedLabel, locale)}
            optionalLabel={t(aiPlanner.optionalLabel, locale)}
            totalLabel={t(aiPlanner.totalLabel, locale)}
            totalNote={t(aiPlanner.totalNote, locale)}
            cta={t(aiPlanner.cta, locale)}
          />
        </div>
      </div>
    </Section>
  );
}

/**
 * Professional entry points sit last on the page, as one quiet strip: patients
 * get the login in the header, doctors and hospitals get theirs here.
 */
export function Partners({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { partners } = content;
  const rows = [
    {
      id: "doctors",
      icon: "stethoscope",
      title: t(partners.doctorTitle, locale),
      body: t(partners.doctorBody, locale),
      cta: t(partners.doctorCta, locale),
      ctaHref: `/${locale}/portal/doctor/apply`,
      login: t(partners.doctorLogin, locale),
      loginHref: `/${locale}/portal/doctor`,
    },
    {
      id: "hospitals",
      icon: "hospital",
      title: t(partners.hospitalTitle, locale),
      body: t(partners.hospitalBody, locale),
      cta: t(partners.hospitalCta, locale),
      ctaHref: `/${locale}/portal/hospital`,
      login: t(partners.hospitalLogin, locale),
      loginHref: `/${locale}/portal/hospital`,
    },
  ];

  return (
    <section id="partners" aria-label={t(partners.eyebrow, locale)} className="scroll-mt-20 bg-white py-10 lg:py-14">
      <div className="ui-container grid gap-4 lg:grid-cols-2 lg:gap-6">
        {rows.map((row) => (
          <div key={row.id} className="flex flex-col gap-4 rounded-[1.25rem] bg-hero p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <span aria-hidden="true" className="ui-tile h-11 w-11 flex-none bg-white">
                <Icon name={row.icon} className="h-6 w-6" />
              </span>
              <div>
                <h2 className="text-lg font-bold leading-snug text-navy">{row.title}</h2>
                <p className="mt-1 text-[15px] leading-relaxed text-[#2c3a5e]">{row.body}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:pl-[3.75rem]">
              <Link href={row.ctaHref} className="ui-btn ui-btn-secondary min-h-11 px-5 text-[15px]">
                {row.cta}
              </Link>
              <Link href={row.loginHref} className="ui-link px-2 text-[15px]">
                {row.login}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Stories({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { stories } = content;
  // Only stories a patient agreed to share are shown; samples never reach the public page.
  const verified = stories.items.filter((item) => item.verified);
  // Until a patient agrees to share their story, the section is left out rather than filled.
  if (verified.length === 0) return null;
  return (
    <Section id="stories" muted>
      <SectionHeading
        eyebrow={t(stories.eyebrow, locale)}
        title={t(stories.title, locale)}
        body={t(stories.body, locale)}
      />

      {verified.length ? (
        <ul className="mt-12 grid gap-5 lg:grid-cols-3">
          {verified.map((item) => (
            <li key={item.id} className="flex flex-col rounded-3xl bg-white p-7 ring-1 ring-[#e6e3f4]">
              <p className="flex-1 text-lg leading-relaxed text-navy">&ldquo;{t(item.quote, locale)}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-violet-soft text-sm font-bold text-violet">
                  {item.initials}
                </span>
                <div>
                  <p className="font-semibold text-navy">{item.name}</p>
                  <p className="text-sm text-slate">
                    {t(item.from, locale)} &middot; {t(item.treatment, locale)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 rounded-3xl bg-white p-7 ring-1 ring-[#e6e3f4] sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:p-10">
          <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-soft text-violet">
            <Icon name="chat" className="h-8 w-8" />
          </span>
          <div>
            <p className="text-xl font-bold leading-snug text-navy">{t(STORIES_SOON.title, locale)}</p>
            <p className="mt-2 text-base leading-relaxed text-[#2c3a5e]">{t(STORIES_SOON.body, locale)}</p>
          </div>
        </div>
      )}
    </Section>
  );
}

const STORIES_SOON: { title: L; body: L } = {
  title: {
    en: "Our first patients' stories will appear here.",
    ru: "Здесь появятся истории наших первых пациентов.",
    uz: "Bu yerda birinchi bemorlarimiz hikoyalari paydo bo'ladi.",
  },
  body: {
    en: "We are just starting, with patients from Uzbekistan first. Each story will be published only with the patient's permission, in their own words — never written by us.",
    ru: "Мы только начинаем — первыми к нам приходят пациенты из Узбекистана. Каждая история появится только с согласия пациента и его собственными словами — мы их не сочиняем.",
    uz: "Biz endi boshlayapmiz — birinchi bo'lib O'zbekiston bemorlari bilan. Har bir hikoya faqat bemor roziligi bilan, uning o'z so'zlarida e'lon qilinadi — biz ularni o'ylab topmaymiz.",
  },
};

const VISA_HEADING: L = { en: "Visa & documents", ru: "Виза и документы", uz: "Viza va hujjatlar" };
const ALL_QUESTIONS: L = { en: "All questions", ru: "Все вопросы", uz: "Barcha savollar" };

export async function Faq({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { faq } = content;
  const visa = (await listFaqs().catch(() => [])).filter((item) => item.category === "visa").slice(0, 5);
  return (
    <Section id="faq">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading title={t(faq.title, locale)} body={t(faq.body, locale)} />
        </div>
        <div className="flex flex-col gap-8">
          <div className="divide-y divide-[#e6e3f4] border-y border-[#e6e3f4]">
            {faq.items.map((item) => (
              <details key={item.id} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-left text-base font-semibold text-navy sm:text-lg [&::-webkit-details-marker]:hidden">
                  {t(item.question, locale)}
                  <span aria-hidden="true" className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-violet-soft text-lg text-violet transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-5 pr-12 text-base leading-relaxed text-[#2c3a5e]">{t(item.answer, locale)}</p>
              </details>
            ))}
          </div>
          {visa.length ? (
            <div>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.14em] text-violet">{t(VISA_HEADING, locale)}</h3>
              <FaqList items={visa} locale={locale} />
              <Link href={`/${locale}/faq#visa`} className="ui-link mt-4 inline-flex">
                {t(ALL_QUESTIONS, locale)} →
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </Section>
  );
}
