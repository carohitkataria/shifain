import Link from "next/link";
import { Section, SectionHeading } from "./Common";
import { t } from "@/lib/localize";
import type { SiteContent } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";

export function Stats({ content, locale }: { content: SiteContent; locale: Locale }) {
  return (
    <section className="border-y border-line bg-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 px-4 py-10 sm:px-6 lg:grid-cols-4">
        {content.stats.items.map((item) => (
          <div key={item.id} className="text-center">
            <p className="text-[clamp(1.6rem,1.2rem+1.2vw,2.25rem)] font-extrabold tracking-tight text-brand-deep">
              {item.value}
            </p>
            <p className="mt-1 text-sm font-semibold text-ink-soft">{t(item.label, locale)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Treatment categories — every card is a link through to its treatment page. */
export function Specialties({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { specialties } = content;
  return (
    <Section id="specialties">
      <SectionHeading
        eyebrow={t(specialties.eyebrow, locale)}
        title={t(specialties.title, locale)}
        body={t(specialties.body, locale)}
      />

      <ul className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {specialties.items.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/${locale}/treatments/${item.slug}`}
              className="card link-card group flex h-full flex-col p-6 focus:outline-none"
            >
              <span
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted text-2xl"
              >
                {item.icon}
              </span>
              <h3 className="mt-4 text-xl font-extrabold tracking-tight text-ink">{t(item.title, locale)}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{t(item.body, locale)}</p>
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
    </Section>
  );
}

export function Costs({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { costs } = content;
  return (
    <Section id="costs" muted>
      <SectionHeading eyebrow={t(costs.eyebrow, locale)} title={t(costs.title, locale)} body={t(costs.body, locale)} />

      <ul className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {costs.items.map((item) => (
          <li key={item.id} className="card flex flex-col p-6">
            <span aria-hidden="true" className="text-2xl">
              {item.icon}
            </span>
            <h3 className="mt-3 font-extrabold leading-tight text-ink">{t(item.title, locale)}</h3>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-ink-muted">
              {t(costs.fromLabel, locale)}
            </p>
            <p className="text-2xl font-extrabold tracking-tight text-brand-deep">{item.amount}</p>
            <p className="mt-1 flex-1 text-xs text-ink-muted">{t(item.note, locale)}</p>
            <a href="#quote-form" className="btn btn-secondary mt-5 w-full !py-2.5 text-sm">
              {t(costs.ctaLabel, locale)}
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-center text-xs text-ink-muted">{t(costs.footnote, locale)}</p>
    </Section>
  );
}

export function Hospitals({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { hospitals } = content;
  return (
    <Section id="hospitals">
      <SectionHeading
        eyebrow={t(hospitals.eyebrow, locale)}
        title={t(hospitals.title, locale)}
        body={t(hospitals.body, locale)}
      />

      <ul className="mt-11 grid gap-5 lg:grid-cols-3">
        {hospitals.items.map((item) => (
          <li key={item.id} className="card link-card flex flex-col p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold leading-tight text-ink">{item.name}</h3>
                <p className="mt-0.5 text-sm text-ink-muted">{item.city}</p>
              </div>
              <span className="flex-none rounded-full bg-saffron-tint px-2.5 py-1 text-sm font-bold text-saffron">
                {item.rating} &#9733;
              </span>
            </div>

            <ul className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <li key={tag} className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-semibold text-brand-deep">
                  {tag}
                </li>
              ))}
            </ul>

            <dl className="mt-5 grid flex-1 grid-cols-2 gap-4 border-t border-line pt-4">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  {t(hospitals.bedsLabel, locale)}
                </dt>
                <dd className="text-lg font-extrabold text-ink">{item.beds}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  {t(hospitals.proceduresLabel, locale)}
                </dt>
                <dd className="text-lg font-extrabold text-ink">{item.procedures}</dd>
              </div>
            </dl>

            <a href="#quote-form" className="btn btn-secondary mt-5 w-full !py-2.5 text-sm">
              {t(hospitals.viewLabel, locale)}
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-8 text-center">
        <a href="#quote-form" className="text-sm font-bold text-brand-deep hover:underline">
          {t(hospitals.allLabel, locale)} &rarr;
        </a>
      </div>
    </Section>
  );
}

export function Doctors({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { doctors } = content;
  return (
    <Section id="doctors" muted>
      <SectionHeading
        eyebrow={t(doctors.eyebrow, locale)}
        title={t(doctors.title, locale)}
        body={t(doctors.body, locale)}
      />

      <ul className="mt-11 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {doctors.items.map((item) => (
          <li key={item.id} className="card link-card flex flex-col p-6 text-center">
            <span
              aria-hidden="true"
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-deep text-lg font-extrabold text-white"
            >
              {item.initials}
            </span>
            <h3 className="mt-4 font-extrabold leading-tight text-ink">{item.name}</h3>
            <p className="mt-0.5 text-sm font-semibold text-brand-deep">{t(item.speciality, locale)}</p>
            <p className="mt-2 text-xs text-ink-muted">
              {item.affiliation} &middot; {item.experience}
            </p>
            <p className="mt-3 flex-1 text-sm text-ink-soft">{t(item.highlight, locale)}</p>
            <a href="#quote-form" className="btn btn-secondary mt-5 w-full !py-2.5 text-sm">
              {t(doctors.consultLabel, locale)} &middot; {item.fee}
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-8 text-center">
        <a href="#quote-form" className="text-sm font-bold text-brand-deep hover:underline">
          {t(doctors.allLabel, locale)} &rarr;
        </a>
      </div>
    </Section>
  );
}

export function Comparison({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { comparison } = content;
  return (
    <Section id="comparison">
      <SectionHeading
        eyebrow={t(comparison.eyebrow, locale)}
        title={t(comparison.title, locale)}
        body={t(comparison.body, locale)}
      />

      <div className="mt-11 overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-left">
          <caption className="sr-only">{t(comparison.subject, locale)}</caption>
          <thead>
            <tr>
              <th scope="col" className="border-b border-line px-4 py-3 text-sm font-extrabold text-ink">
                {t(comparison.subject, locale)}
              </th>
              {comparison.columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="border-b border-line px-4 py-3 text-sm font-extrabold text-brand-deep"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr key={row.id} className="even:bg-surface-muted">
                <th scope="row" className="px-4 py-3.5 text-sm font-semibold text-ink-soft">
                  {t(row.label, locale)}
                </th>
                {row.values.map((value, i) => (
                  <td key={`${row.id}-${i}`} className="px-4 py-3.5 text-sm font-bold text-ink">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-muted">{t(comparison.footnote, locale)}</p>
        <a href="#quote-form" className="btn btn-primary !py-2.5 text-sm">
          {t(comparison.cta, locale)}
        </a>
      </div>
    </Section>
  );
}
