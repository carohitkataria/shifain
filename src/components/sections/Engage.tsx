import Link from "next/link";
import { Icon } from "../Icon";
import { PackageBuilder } from "../PackageBuilder";
import { Section, SectionHeading } from "./Common";
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
 * Professional entry points sit low on the page: patients get the login in the
 * header, doctors and hospitals get theirs here.
 */
export function Partners({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { partners } = content;

  const panels = [
    {
      id: "doctors",
      icon: "stethoscope",
      title: t(partners.doctorTitle, locale),
      body: t(partners.doctorBody, locale),
      points: partners.doctorPoints.map((point) => ({ id: point.id, label: t(point.label, locale) })),
      cta: t(partners.doctorCta, locale),
      ctaHref: "#quote-form",
      warm: false,
      login: t(partners.doctorLogin, locale),
      loginHref: `/${locale}/portal/doctor`,
    },
    {
      id: "hospitals",
      icon: "hospital",
      title: t(partners.hospitalTitle, locale),
      body: t(partners.hospitalBody, locale),
      points: partners.hospitalPoints.map((point) => ({ id: point.id, label: t(point.label, locale) })),
      cta: t(partners.hospitalCta, locale),
      ctaHref: `/${locale}/portal/hospital`,
      warm: true,
      login: t(partners.hospitalLogin, locale),
      loginHref: `/${locale}/portal/hospital`,
    },
  ];

  return (
    <Section id="partners">
      <p className="eyebrow">{t(partners.eyebrow, locale)}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {panels.map((panel) => (
          <div key={panel.id} className={`card flex flex-col p-7 ${panel.warm ? "!border-saffron/25 bg-saffron-tint/40" : ""}`}>
            <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${panel.warm ? "bg-saffron-tint text-saffron" : "bg-brand-tint text-brand-deep"}`}>
              <Icon name={panel.icon} className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">{panel.title}</h3>
            <p className="mt-2 text-ink-soft">{panel.body}</p>

            <ul className="mt-5 grid flex-1 gap-2.5 sm:grid-cols-2">
              {panel.points.map((point) => (
                <li key={point.id} className="flex items-start gap-2 text-sm text-ink-soft">
                  <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full bg-leaf-tint text-leaf">
                    <Icon name="check" className="h-3 w-3" />
                  </span>
                  {point.label}
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={panel.ctaHref} className={`btn !py-2.5 text-sm ${panel.warm ? "btn-accent" : "btn-primary"}`}>
                {panel.cta}
              </Link>
              <Link href={panel.loginHref} className="btn btn-secondary !py-2.5 text-sm">
                {panel.login}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Stories({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { stories } = content;
  // Only stories a patient agreed to share are shown; samples never reach the public page.
  const verified = stories.items.filter((item) => item.verified);
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

export function Faq({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { faq } = content;
  return (
    <Section id="faq">
      <SectionHeading eyebrow={t(faq.eyebrow, locale)} title={t(faq.title, locale)} body={t(faq.body, locale)} />

      <div className="mx-auto mt-11 max-w-3xl space-y-3">
        {faq.items.map((item, i) => (
          <details key={item.id} className="faq-item group" open={i === 0}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-navy marker:content-none">
              {t(item.question, locale)}
              <span aria-hidden="true" className="faq-toggle">
                <span className="group-open:hidden">+</span>
                <span className="hidden group-open:inline">&minus;</span>
              </span>
            </summary>
            <p className="mt-3 pr-10 text-base leading-relaxed text-[#2c3a5e]">{t(item.answer, locale)}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
