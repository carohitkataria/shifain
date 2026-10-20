import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { getContent } from "@/lib/store";
import { accreditationLabels, listSpecialties } from "@/lib/catalogue";
import { conditionsFor, doctorSpecialtyCodes, doctorsFor, hospitalsFor, specialtiesInCategory } from "@/lib/directory";
import { CONDITION_COPY } from "@/lib/directory-copy";
import { HOSPITAL_COPY } from "@/lib/hospital-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

/** A treatment page covers one catalogue category; most slugs are the category's own id. */
const CATEGORY_OF: Record<string, string> = { neurosurgery: "neurosciences", "organ-transplant": "transplant", "fertility-ivf": "fertility" };

async function findSpecialty(slug: string) {
  const content = await getContent();
  return { content, specialty: content.specialties.items.find((item) => item.slug === slug) };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const { content, specialty } = await findSpecialty(slug);
  if (!specialty) return { title: content.brand.name };

  return {
    title: `${t(specialty.title, locale)} — ${content.brand.name}`,
    description: t(specialty.body, locale),
  };
}

export default async function TreatmentPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const { content, specialty } = await findSpecialty(slug);
  if (!specialty) notFound();

  const related = content.specialties.items.filter((item) => item.slug !== slug);
  const specialties = await listSpecialties();
  const codes = specialtiesInCategory(specialties, CATEGORY_OF[slug] ?? slug);
  const [conditions, hospitals, doctors] = await Promise.all([conditionsFor(codes), hospitalsFor(codes), doctorsFor(codes, 12)]);
  const specialtyName = (code: string) => t(specialties.find((item) => item._id === code)?.name, locale) || code;

  return (
    <>
      <Header content={content} locale={locale} path={`/treatments/${slug}`} />

      <main>
        <section className="border-b border-line bg-surface-muted">
          <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:py-18">
            <nav aria-label="Breadcrumb" className="text-sm font-semibold text-ink-muted">
              <Link href={`/${locale}`} className="hover:text-brand-deep">
                {content.brand.name}
              </Link>
              <span className="mx-2" aria-hidden="true">
                /
              </span>
              <Link href={`/${locale}#specialties`} className="hover:text-brand-deep">
                {t(content.specialties.eyebrow, locale)}
              </Link>
            </nav>

            <span aria-hidden="true" className="mt-6 block text-4xl">
              {specialty.icon}
            </span>
            <h1 className="mt-3 text-[clamp(2rem,1.4rem+2.4vw,3rem)] font-extrabold leading-tight tracking-tight text-ink">
              {t(specialty.title, locale)}
            </h1>
            <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-soft">{t(specialty.body, locale)}</p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link href={`/${locale}#quote-form`} className="btn btn-primary">
                {t(content.hero.primaryCta, locale)}
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link href={`/${locale}#costs`} className="btn btn-secondary">
                {t(content.nav.costEstimate, locale)}
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
          <p className="text-lg leading-relaxed text-ink-soft">{t(specialty.detail, locale)}</p>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {content.usps.points.slice(0, 4).map((point) => (
              <li key={point.id} className="card flex gap-3 p-5">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-tint text-brand-deep">
                  <Icon name={point.icon} className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-bold text-ink">{t(point.title, locale)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{t(point.body, locale)}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-10 rounded-xl2 border border-line bg-surface-muted p-5 text-sm leading-relaxed text-ink-soft">
            {t(content.specialties.body, locale)}
          </p>

          {conditions.length ? (
            <>
              <h2 className="mt-14 text-xl font-extrabold tracking-tight text-ink">{t(CONDITION_COPY.title, locale)}</h2>
              <ul className="mt-5 flex flex-wrap gap-2.5">
                {conditions.map((disease) => (
                  <li key={disease._id}>
                    <Link
                      href={`/${locale}/conditions/${disease._id}`}
                      className="inline-flex min-h-10 items-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand-deep"
                    >
                      {t(disease.name, locale)}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {hospitals.length ? (
            <>
              <h2 className="mt-14 text-xl font-extrabold tracking-tight text-ink">{t(CONDITION_COPY.hospitals, locale)}</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {hospitals.map((hospital) => (
                  <li key={hospital._id}>
                    <Link href={`/${locale}/hospitals/${hospital._id}`} className="card link-card flex h-full flex-col p-5">
                      <span className="font-bold text-ink">{hospital.name}</span>
                      <span className="text-sm text-ink-soft">{[hospital.city, ...accreditationLabels(hospital)].filter(Boolean).join(" · ")}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {doctors.length ? (
            <>
              <h2 className="mt-14 text-xl font-extrabold tracking-tight text-ink">{t(CONDITION_COPY.doctors, locale)}</h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {doctors.map((doctor) => (
                  <li key={doctor._id}>
                    <Link href={`/${locale}/doctors/${doctor._id}`} className="card link-card flex h-full flex-col p-5">
                      <span className="font-bold text-ink">{doctor.name}</span>
                      <span className="text-sm text-ink-soft">
                        {[doctor.designation, doctorSpecialtyCodes(doctor).map(specialtyName).join(", ")].filter(Boolean).join(" · ")}
                      </span>
                      {doctor.experienceYears ? (
                        <span className="text-sm text-ink-muted">
                          {doctor.experienceYears}+ {t(HOSPITAL_COPY.years, locale)}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <h2 className="mt-14 text-xl font-extrabold tracking-tight text-ink">
            {t(content.specialties.title, locale)}
          </h2>
          <ul className="mt-5 flex flex-wrap gap-2.5">
            {related.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/${locale}/treatments/${item.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink-soft transition hover:border-brand hover:text-brand-deep"
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {t(item.title, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <Footer content={content} locale={locale} />
    </>
  );
}
