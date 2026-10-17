import { Icon } from "../Icon";
import { Star } from "../Star";
import { Section, SectionHeading } from "./Common";
import { t } from "@/lib/localize";
import type { SiteContent } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";

export function Usps({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { usps } = content;
  return (
    <Section id="why" muted>
      <SectionHeading
        eyebrow={t(usps.eyebrow, locale)}
        title={t(usps.title, locale)}
        body={t(usps.body, locale)}
      />
      <div className="mt-12 lg:mt-6">
        <Star
          items={usps.points.map((point) => ({
            id: point.id,
            icon: point.icon,
            title: t(point.title, locale),
            body: t(point.body, locale),
          }))}
          hubLabel={t(usps.hubLabel, locale)}
          hubIcon="clipboard"
        />
      </div>
    </Section>
  );
}

/** How it works: four real steps, so here the numbers carry meaning. */
export function Journey({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { journey } = content;
  return (
    <Section id="journey">
      <SectionHeading title={t(journey.title, locale)} body={t(journey.body, locale)} />
      <ol className="relative mt-8 grid gap-6 lg:mt-12 lg:grid-cols-4 lg:gap-8">
        {journey.steps.map((step, index) => (
          <li key={step.id} className="relative grid content-start grid-cols-[2.75rem_minmax(0,1fr)] gap-4 lg:grid-cols-1 lg:gap-5">
            {index < journey.steps.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute left-[1.35rem] top-12 h-[calc(100%-1.5rem)] w-0.5 bg-[#e6e3f4] lg:left-14 lg:top-[1.35rem] lg:h-0.5 lg:w-[calc(100%-1.5rem)]"
              />
            ) : null}
            <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-violet text-lg font-bold text-white">
              {index + 1}
            </span>
            <div>
              <h3 className="text-lg font-bold leading-snug text-navy lg:text-xl">{t(step.title, locale)}</h3>
              <p className="mt-1.5 max-w-[36rem] text-base leading-relaxed text-[#2c3a5e]">{t(step.body, locale)}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-8 lg:mt-12">
        <a href="#quote-form" className="ui-btn ui-btn-primary w-full sm:w-auto">
          {t(content.hero.primaryCta, locale)}
        </a>
      </div>
    </Section>
  );
}

/** Everything the case manager arranges: the heading holds still on the left while the list reads down the right. */
export function Services({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { services } = content;
  return (
    <Section id="services" muted>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading align="start" eyebrow={t(services.eyebrow, locale)} title={t(services.title, locale)} body={t(services.body, locale)} />
        </div>
        <ul className="grid gap-x-10 gap-y-9 sm:grid-cols-2">
          {services.points.map((point) => (
            <li key={point.id} className="flex flex-col gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-violet">
                <Icon name={point.icon} className="h-6 w-6" />
              </span>
              <h3 className="text-xl font-bold leading-snug text-navy">{t(point.title, locale)}</h3>
              <p className="text-base leading-relaxed text-[#2c3a5e]">{t(point.body, locale)}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

/** Why India, with Shifain: the six promises, said once, on the page's one dark field. */
export function WhyIndia({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { whyIndia } = content;
  return (
    <section id="why-india" className="ui-section scroll-mt-20 bg-navy">
      <div className="ui-container">
        <SectionHeading tone="light" title={t(whyIndia.title, locale)} body={t(whyIndia.body, locale)} />
        <ul className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-y-12">
          {whyIndia.points.map((point) => (
            <li key={point.id} className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4">
              <span aria-hidden="true" className="flex h-11 w-11 items-center justify-center rounded-[0.875rem] bg-white/10 text-[#f6b36b]">
                <Icon name={point.icon} className="h-6 w-6" />
              </span>
              <div>
                <h3 className="text-lg font-bold leading-snug text-white lg:text-xl">{t(point.title, locale)}</h3>
                <p className="mt-1.5 text-base leading-relaxed text-white/75">{t(point.body, locale)}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Guarantee({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { guarantee } = content;

  const promises = [
    {
      id: "price",
      icon: "shield",
      badge: t(guarantee.priceBadge, locale),
      title: t(guarantee.priceTitle, locale),
      body: t(guarantee.priceBody, locale),
      tone: "bg-leaf-tint text-leaf",
    },
    {
      id: "translator",
      icon: "translate",
      badge: t(guarantee.translatorBadge, locale),
      title: t(guarantee.translatorTitle, locale),
      body: t(guarantee.translatorBody, locale),
      tone: "bg-brand-tint text-brand-deep",
    },
  ];

  return (
    <section id="promises" className="bg-[#14123a]">
      <div className="mx-auto max-w-[88rem] px-4 py-16 sm:px-6 lg:px-12 lg:py-24">
        <p className="eyebrow !text-white/75">{t(guarantee.eyebrow, locale)}</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {promises.map((promise) => (
            <div key={promise.id} className="rounded-xl2 bg-white/[0.06] p-7 ring-1 ring-white/10">
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${promise.tone}`}>
                  <Icon name={promise.icon} className="h-6 w-6" />
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white/85">
                  {promise.badge}
                </span>
              </div>
              <h3 className="mt-5 text-2xl font-extrabold leading-tight tracking-tight text-white">
                {promise.title}
              </h3>
              <p className="mt-3 leading-relaxed text-white/70">{promise.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
