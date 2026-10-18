import Link from "next/link";
import { Icon } from "../Icon";
import { accreditationLabels, listCities, listSpecialties, listTreatments, publishedDoctors, publishedHospitals } from "@/lib/catalogue";
import { PORTAL_LANGUAGES } from "@/lib/patient-portal";
import { Section, SectionHeading } from "./Common";
import { t } from "@/lib/localize";
import type { L, SiteContent } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";

const SEE_ALL_TREATMENTS: L = {
  en: "See all treatments",
  ru: "Все направления",
  uz: "Barcha yo'nalishlar",
};

const STAT_LABELS: Record<"treatments" | "specialties" | "cities" | "languages", L> = {
  treatments: { en: "treatments in our catalogue", ru: "видов лечения в каталоге", uz: "katalogdagi davolash turlari" },
  specialties: { en: "medical specialties", ru: "медицинских направлений", uz: "tibbiy yo'nalishlar" },
  cities: { en: "cities in India", ru: "городов Индии", uz: "Hindiston shaharlari" },
  languages: { en: "languages in the live translator", ru: "языков в живом переводчике", uz: "jonli tarjimondagi tillar" },
};

/** The proof strip under the hero: figures counted from the catalogue, so never more than the truth. */
export async function Stats({ locale }: { content: SiteContent; locale: Locale }) {
  const [treatments, specialties, cities] = await Promise.all([
    listTreatments().catch(() => []),
    listSpecialties().catch(() => []),
    listCities().catch(() => []),
  ]);
  const figures = [
    { id: "treatments", value: treatments.length },
    { id: "specialties", value: specialties.length },
    { id: "cities", value: cities.length },
    { id: "languages", value: PORTAL_LANGUAGES.length },
  ].filter((item) => item.value > 0) as { id: keyof typeof STAT_LABELS; value: number }[];
  if (figures.length === 0) return null;

  return (
    <section aria-label="Shifain in numbers" className="bg-white">
      <dl className="ui-container grid grid-cols-2 gap-x-4 gap-y-6 py-8 sm:py-10 lg:grid-cols-4">
        {figures.map((item) => (
          <div key={item.id} className="flex flex-col">
            <dt className="order-2 mt-1 text-sm font-medium leading-snug text-slate sm:text-base">{t(STAT_LABELS[item.id], locale)}</dt>
            <dd className="order-1 text-[2rem] font-extrabold leading-none tracking-[-0.03em] text-navy sm:text-[2.5rem]">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Treatment categories: the quickest way in, like a clinic's directory board. */
export function Specialties({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { specialties } = content;
  const all = (
    <Link href={`/${locale}/treatments`} className="ui-link">
      {t(SEE_ALL_TREATMENTS, locale)}
    </Link>
  );
  return (
    <Section id="specialties" muted>
      <SectionHeading title={t(specialties.title, locale)} body={t(specialties.body, locale)} action={all} />

      <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:mt-10 lg:grid-cols-3">
        {specialties.items.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/${locale}/treatments/${item.slug}`}
              className="group flex h-full flex-col gap-3 rounded-[1.25rem] bg-white p-4 ring-1 ring-[#e6e3f4] transition hover:ring-violet/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet sm:flex-row sm:items-start sm:gap-4 sm:p-6"
            >
              <span aria-hidden="true" className="ui-tile h-11 w-11 flex-none sm:h-12 sm:w-12">
                <Icon name={item.icon} className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-bold leading-snug text-navy sm:text-lg">{t(item.title, locale)}</span>
                <span className="mt-1 hidden text-[15px] leading-relaxed text-[#2c3a5e] sm:block">{t(item.body, locale)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}

const COSTS_COPY: Record<"exact" | "stay", L> = {
  exact: { en: "Get my exact estimate", ru: "Узнать точную смету", uz: "Aniq smetani olish" },
  stay: { en: "Stay", ru: "Пребывание", uz: "Turish" },
};

/** Starting prices as a short price list: a row each on a phone, four columns on a wide screen. */
export function Costs({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { costs } = content;
  return (
    <Section id="costs">
      <SectionHeading title={t(costs.title, locale)} body={t(costs.body, locale)} />

      <ul className="mt-8 divide-y divide-[#eeebf7] rounded-[1.25rem] bg-white ring-1 ring-[#e6e3f4] lg:mt-10 lg:grid lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        {costs.items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 p-4 sm:p-5 lg:flex-col lg:items-start lg:gap-5 lg:p-7">
            <span aria-hidden="true" className="ui-tile h-11 w-11 flex-none">
              <Icon name={item.icon} className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-bold leading-snug text-navy lg:text-lg">{t(item.title, locale)}</span>
              <span className="mt-0.5 block text-sm text-slate">{t(item.note, locale)}</span>
            </span>
            <span className="text-right lg:text-left">
              <span className="block text-sm text-slate">{t(costs.fromLabel, locale)}</span>
              <span className="block text-xl font-extrabold tracking-tight text-navy lg:text-[1.75rem]">{item.amount}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate">{t(costs.footnote, locale)}</p>
        <a href="#quote-form" className="ui-btn ui-btn-primary">
          {t(COSTS_COPY.exact, locale)}
        </a>
      </div>
    </Section>
  );
}

const NETWORK_COPY: Record<"empty" | "doctorsEmpty" | "years" | "specialties" | "planCta" | "hospitals" | "doctors", L> = {
  empty: {
    en: "We name a hospital or doctor here only once they have signed with us and agreed to be listed. Until then, your plan describes the kind of accredited centre that suits you, and your coordinator goes through the options with you.",
    ru: "Мы называем здесь клинику или врача только после подписания договора и с их согласия. До тех пор план описывает подходящий тип аккредитованного центра, а координатор обсуждает варианты с вами.",
    uz: "Shifoxona yoki shifokorni bu yerda faqat ular biz bilan shartnoma imzolab, rozilik bergandan keyin ko'rsatamiz. Shungacha reja sizga mos akkreditatsiyalangan markaz turini tasvirlaydi, koordinator esa variantlarni siz bilan ko'rib chiqadi.",
  },
  doctorsEmpty: {
    en: "Specialists appear here only when they have agreed to be listed. Your coordinator arranges a consultation with the treating specialist once your plan is ready.",
    ru: "Специалисты появляются здесь только с их согласия. Когда план будет готов, координатор организует консультацию с лечащим специалистом.",
    uz: "Mutaxassislar bu yerda faqat roziliklari bilan paydo bo'ladi. Reja tayyor bo'lgach, koordinator davolovchi mutaxassis bilan maslahatni tashkil qiladi.",
  },
  years: { en: "years' experience", ru: "лет опыта", uz: "yillik tajriba" },
  specialties: { en: "specialties", ru: "направлений", uz: "yo'nalish" },
  planCta: { en: "Get my free plan", ru: "Получить бесплатный план", uz: "Bepul rejani olish" },
  hospitals: { en: "Hospitals", ru: "Клиники", uz: "Shifoxonalar" },
  doctors: { en: "Doctors", ru: "Врачи", uz: "Shifokorlar" },
};

function NetworkEmpty({ text, href, label }: { text: string; href: string; label: string }) {
  return (
    <div className="mt-6 flex flex-col gap-5 rounded-[1.25rem] bg-white p-5 ring-1 ring-[#e6e3f4] sm:flex-row sm:items-center sm:justify-between sm:p-8 lg:mt-8">
      <p className="max-w-2xl text-base leading-relaxed text-navy sm:text-lg">{text}</p>
      <a href={href} className="ui-btn ui-btn-secondary shrink-0">
        {label}
      </a>
    </div>
  );
}

function initialsOf(name: string): string {
  return name
    .replace(/^Dr\.?\s*/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}

/**
 * Hospitals and doctors, from signed tie-ups only: the catalogue decides who
 * may be named. With nobody listed yet it is one honest line, not two empty sections.
 */
export async function Hospitals({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { hospitals } = content;
  const [places, doctors] = await Promise.all([
    publishedHospitals({ limit: 6 }).catch(() => []),
    publishedDoctors(4).catch(() => []),
  ]);

  return (
    <Section id="hospitals" muted>
      {/* With nobody listed yet the panel says it all; the intro would only repeat it. */}
      <SectionHeading title={t(hospitals.title, locale)} body={places.length || doctors.length ? t(hospitals.body, locale) : undefined} />
      {places.length === 0 && doctors.length === 0 ? (
        <NetworkEmpty text={t(NETWORK_COPY.empty, locale)} href="#quote-form" label={t(NETWORK_COPY.planCta, locale)} />
      ) : null}

      {places.length ? (
        <div className="mt-8 lg:mt-10">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-navy">{t(NETWORK_COPY.hospitals, locale)}</h3>
            <Link href={`/${locale}/hospitals`} className="ui-link">
              {t(hospitals.allLabel, locale)}
            </Link>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {places.map((item) => (
              <li key={item._id}>
                <Link
                  href={`/${locale}/hospitals/${item._id}`}
                  className="flex h-full flex-col gap-2 rounded-[1.25rem] bg-white p-5 ring-1 ring-[#e6e3f4] transition hover:ring-violet/50"
                >
                  <span className="text-sm text-slate">{item.city}</span>
                  <span className="text-lg font-bold leading-snug text-navy">{item.name}</span>
                  <span className="text-sm text-slate">
                    {[...accreditationLabels(item), `${item.specialtyCodes.length} ${t(NETWORK_COPY.specialties, locale)}`].join(", ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {doctors.length ? (
        <div className="mt-8 lg:mt-10">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-navy">{t(NETWORK_COPY.doctors, locale)}</h3>
            <Link href={`/${locale}/doctors`} className="ui-link">
              {t(content.doctors.allLabel, locale)}
            </Link>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {doctors.map((doctor) => (
              <li key={doctor._id}>
                <Link
                  href={`/${locale}/doctors/${doctor._id}`}
                  className="flex h-full items-start gap-4 rounded-[1.25rem] bg-white p-5 ring-1 ring-[#e6e3f4] transition hover:ring-violet/50"
                >
                  <span aria-hidden="true" className="ui-tile h-12 w-12 flex-none rounded-full font-bold">
                    {initialsOf(doctor.name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-bold leading-snug text-navy">{doctor.name}</span>
                    {doctor.specialtyLabelRaw ? <span className="block text-sm text-violet">{doctor.specialtyLabelRaw}</span> : null}
                    {doctor.experienceYears ? (
                      <span className="block text-sm text-slate">
                        {doctor.experienceYears} {t(NETWORK_COPY.years, locale)}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Section>
  );
}

/** The standalone doctors section; off by default since doctors now show beside hospitals. */
export async function Doctors({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { doctors } = content;
  const items = await publishedDoctors(8).catch(() => []);
  return (
    <Section id="doctors">
      <SectionHeading title={t(doctors.title, locale)} body={t(doctors.body, locale)} />
      {items.length === 0 ? (
        <NetworkEmpty text={t(NETWORK_COPY.doctorsEmpty, locale)} href="#quote-form" label={t(NETWORK_COPY.planCta, locale)} />
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((doctor) => (
            <li key={doctor._id}>
              <Link
                href={`/${locale}/doctors/${doctor._id}`}
                className="flex h-full flex-col gap-1 rounded-[1.25rem] bg-white p-5 ring-1 ring-[#e6e3f4] transition hover:ring-violet/50"
              >
                <span className="font-bold text-navy">{doctor.name}</span>
                {doctor.specialtyLabelRaw ? <span className="text-sm text-violet">{doctor.specialtyLabelRaw}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
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
            {comparison.rows.map((row, rowIndex) => (
              <tr key={row.id} className="border-b border-line last:border-0">
                <th scope="row" className="bg-surface-muted px-4 py-3.5 text-left text-sm font-semibold text-ink-soft">
                  {t(row.label, locale)}
                </th>
                {row.values.map((value, i) => {
                  const affirmative = /^(yes|да|ha)$/i.test(value.trim());
                  return (
                    <td
                      key={`${row.id}-${i}`}
                      className={`px-4 py-3.5 text-sm font-bold ${
                        rowIndex === 0 ? "text-brand-deep" : affirmative ? "text-leaf" : "text-ink"
                      }`}
                    >
                      {affirmative ? `\u2713 ${value}` : value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-muted">{t(comparison.footnote, locale)}</p>
        <a href="#quote-form" className="btn btn-accent !py-2.5 text-sm">
          {t(comparison.cta, locale)}
        </a>
      </div>
    </Section>
  );
}
