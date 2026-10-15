import Link from "next/link";
import { Icon } from "../Icon";
import { listCities, listSpecialties, listTreatments, publishedDoctors, publishedHospitals } from "@/lib/catalogue";
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

/** Figures counted from the catalogue on every render, so they are never more than the truth. */
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
    <section className="bg-navy">
      <div className="mx-auto grid max-w-[88rem] grid-cols-2 gap-x-6 gap-y-10 px-4 py-14 sm:px-6 lg:grid-cols-4 lg:px-12">
        {figures.map((item) => (
          <div key={item.id}>
            <p className="text-[clamp(2.4rem,1.6rem+2.4vw,4rem)] font-extrabold leading-none tracking-[-0.03em] text-white">{item.value}</p>
            <p className="mt-2 max-w-[14rem] text-base font-medium leading-snug text-white/75">{t(STAT_LABELS[item.id], locale)}</p>
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
              <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-soft text-violet">
                <Icon name={item.icon} className="h-6 w-6" />
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

      <div className="mt-9 text-center">
        <Link href={`/${locale}/treatments`} className="btn btn-ink">
          {t(SEE_ALL_TREATMENTS, locale)}
        </Link>
      </div>
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
          <li key={item.id} className="card flex flex-col p-4 text-center">
            <span aria-hidden="true" className="flex h-20 items-center justify-center rounded-2xl bg-violet-soft text-violet">
              <Icon name={item.icon} className="h-9 w-9" />
            </span>
            <h3 className="mt-4 font-extrabold leading-tight text-ink">{t(item.title, locale)}</h3>
            <p className="mt-2 text-xs text-ink-muted">{t(costs.fromLabel, locale)}</p>
            <p className="text-2xl font-extrabold tracking-tight text-brand-deep">{item.amount}</p>
            <p className="mt-1 flex-1 text-xs text-ink-muted">{t(item.note, locale)}</p>
            <Link href={`/${locale}/conditions`} className="btn btn-tint mt-4 w-full !py-2.5 text-sm">
              {t(costs.ctaLabel, locale)}
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-center text-xs text-ink-muted">{t(costs.footnote, locale)}</p>
    </Section>
  );
}

const NETWORK_COPY: Record<"hospitalsEmpty" | "doctorsEmpty" | "years" | "specialties" | "planCta", L> = {
  hospitalsEmpty: {
    en: "We list a hospital here only once it has signed with us. Until then, your plan describes the kind of accredited centre that suits you, and your coordinator names the options with you.",
    ru: "Мы показываем клинику здесь только после подписания договора с ней. До тех пор план описывает подходящий тип аккредитованного центра, а координатор называет варианты вместе с вами.",
    uz: "Shifoxonani bu yerda faqat u biz bilan shartnoma imzolagandan keyin ko'rsatamiz. Shungacha reja sizga mos akkreditatsiyalangan markaz turini tasvirlaydi, koordinator esa variantlarni siz bilan birga aytadi.",
  },
  doctorsEmpty: {
    en: "Specialists appear here only when they have agreed to be listed. Your coordinator arranges a consultation with the treating specialist once your plan is ready.",
    ru: "Специалисты появляются здесь только с их согласия. Когда план будет готов, координатор организует консультацию с лечащим специалистом.",
    uz: "Mutaxassislar bu yerda faqat roziliklari bilan paydo bo'ladi. Reja tayyor bo'lgach, koordinator davolovchi mutaxassis bilan maslahatni tashkil qiladi.",
  },
  years: { en: "years' experience", ru: "лет опыта", uz: "yillik tajriba" },
  specialties: { en: "specialties", ru: "направлений", uz: "yo'nalish" },
  planCta: { en: "Get my free plan", ru: "Получить бесплатный план", uz: "Bepul rejani olish" },
};

function NetworkEmpty({ text, href, label }: { text: string; href: string; label: string }) {
  return (
    <div className="mt-12 grid gap-6 rounded-3xl bg-white p-7 ring-1 ring-[#e6e3f4] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-10">
      <p className="max-w-2xl text-lg leading-relaxed text-navy">{text}</p>
      <Link href={href} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-violet px-6 font-semibold text-white transition hover:bg-brand-deep">
        {label}
        <span aria-hidden="true">&rarr;</span>
      </Link>
    </div>
  );
}

/** Hospitals with a signed tie-up only; the catalogue decides what may be named. */
export async function Hospitals({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { hospitals } = content;
  const items = await publishedHospitals({ limit: 6 }).catch(() => []);
  return (
    <Section id="hospitals">
      <SectionHeading eyebrow={t(hospitals.eyebrow, locale)} title={t(hospitals.title, locale)} body={t(hospitals.body, locale)} />
      {items.length === 0 ? (
        <NetworkEmpty text={t(NETWORK_COPY.hospitalsEmpty, locale)} href={`/${locale}#quote-form`} label={t(NETWORK_COPY.planCta, locale)} />
      ) : (
        <>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li key={item._id}>
                <Link
                  href={`/${locale}/hospitals/${item._id}`}
                  className="group flex h-full flex-col gap-3 rounded-3xl bg-white p-6 ring-1 ring-[#e6e3f4] transition hover:ring-violet/40"
                >
                  <span className="flex items-center gap-2 text-sm font-medium text-slate">
                    <Icon name="hospital" className="h-4 w-4" />
                    {item.city}
                  </span>
                  <span className="text-xl font-bold leading-snug text-navy">{item.name}</span>
                  <span className="flex flex-wrap gap-2">
                    {item.accreditations.map((badge) => (
                      <span key={badge} className="rounded-full bg-violet-soft px-3 py-1 text-sm font-semibold text-violet">
                        {badge}
                      </span>
                    ))}
                  </span>
                  <span className="mt-auto flex items-center justify-between pt-2 text-sm text-slate">
                    {item.specialtyCodes.length} {t(NETWORK_COPY.specialties, locale)}
                    {item.beds ? ` · ${item.beds} ${t(hospitals.bedsLabel, locale).toLowerCase()}` : ""}
                    <span aria-hidden="true" className="text-violet transition group-hover:translate-x-0.5">
                      &rarr;
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <Link href={`/${locale}/hospitals`} className="btn btn-ink">
              {t(hospitals.allLabel, locale)}
            </Link>
          </div>
        </>
      )}
    </Section>
  );
}

/** Doctors who consented to be listed, at hospitals we work with. Never typed in by hand. */
export async function Doctors({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { doctors } = content;
  const items = await publishedDoctors(8).catch(() => []);
  return (
    <Section id="doctors" muted>
      <SectionHeading eyebrow={t(doctors.eyebrow, locale)} title={t(doctors.title, locale)} body={t(doctors.body, locale)} />
      {items.length === 0 ? (
        <NetworkEmpty text={t(NETWORK_COPY.doctorsEmpty, locale)} href={`/${locale}#quote-form`} label={t(NETWORK_COPY.planCta, locale)} />
      ) : (
        <>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((doctor) => (
              <li key={doctor._id}>
                <Link
                  href={`/${locale}/doctors/${doctor._id}`}
                  className="flex h-full flex-col gap-2 rounded-3xl bg-white p-6 ring-1 ring-[#e6e3f4] transition hover:ring-violet/40"
                >
                  <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-soft font-bold text-violet">
                    {doctor.name
                      .replace(/^Dr\.?\s*/i, "")
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")}
                  </span>
                  <span className="text-lg font-bold leading-snug text-navy">{doctor.name}</span>
                  {doctor.specialtyLabelRaw ? <span className="text-[15px] font-medium text-violet">{doctor.specialtyLabelRaw}</span> : null}
                  {doctor.qualifications ? <span className="text-sm text-slate">{doctor.qualifications}</span> : null}
                  {doctor.experienceYears ? (
                    <span className="mt-auto pt-2 text-sm text-slate">
                      {doctor.experienceYears} {t(NETWORK_COPY.years, locale)}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <Link href={`/${locale}/doctors`} className="btn btn-ink">
              {t(doctors.allLabel, locale)}
            </Link>
          </div>
        </>
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
