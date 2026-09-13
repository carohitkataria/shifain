import { Icon } from "../Icon";
import { Star } from "../Star";
import { Trail } from "../Trail";
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

export function Journey({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { journey } = content;
  return (
    <Section id="journey">
      <SectionHeading
        eyebrow={t(journey.eyebrow, locale)}
        title={t(journey.title, locale)}
        body={t(journey.body, locale)}
      />
      <div className="mt-12 lg:mt-8">
        <Trail
          stops={journey.steps.map((step) => ({
            id: step.id,
            icon: step.icon,
            title: t(step.title, locale),
            body: t(step.body, locale),
          }))}
        />
      </div>
      <p className="mt-8 text-center text-sm font-semibold text-ink-muted lg:mt-4">
        {t(journey.footnote, locale)}
      </p>
    </Section>
  );
}

export function Services({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { services } = content;
  return (
    <Section id="services" muted>
      <SectionHeading
        eyebrow={t(services.eyebrow, locale)}
        title={t(services.title, locale)}
        body={t(services.body, locale)}
      />
      <div className="mt-12 lg:mt-6">
        <Star
          items={services.points.map((point) => ({
            id: point.id,
            icon: point.icon,
            title: t(point.title, locale),
            body: t(point.body, locale),
          }))}
          hubLabel={t(services.hubLabel, locale)}
          hubIcon="chat"
          tone="leaf"
        />
      </div>
    </Section>
  );
}

export function WhyIndia({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { whyIndia } = content;
  return (
    <Section id="why-india">
      <SectionHeading
        eyebrow={t(whyIndia.eyebrow, locale)}
        title={t(whyIndia.title, locale)}
        body={t(whyIndia.body, locale)}
      />
      <div className="mt-12 lg:mt-6">
        <Star
          items={whyIndia.points.map((point) => ({
            id: point.id,
            icon: point.icon,
            title: t(point.title, locale),
            body: t(point.body, locale),
          }))}
          hubLabel={t(whyIndia.hubLabel, locale)}
          hubIcon="hospital"
          tone="saffron"
        />
      </div>
    </Section>
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
    <section id="promises" className="bg-ink">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <p className="eyebrow text-center text-white/60">{t(guarantee.eyebrow, locale)}</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {promises.map((promise) => (
            <div key={promise.id} className="rounded-xl2 bg-white/[0.06] p-7 ring-1 ring-white/10">
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${promise.tone}`}>
                  <Icon name={promise.icon} className="h-6 w-6" />
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/80">
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
