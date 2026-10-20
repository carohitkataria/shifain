import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getContent } from "@/lib/store";
import { listSpecialties } from "@/lib/catalogue";
import { doctorSpecialtyCodes, listedDoctors } from "@/lib/directory";
import { HOSPITAL_COPY } from "@/lib/hospital-copy";
import { DOCTOR_LIST_COPY } from "@/lib/directory-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function DoctorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ specialty?: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const { specialty = "" } = await searchParams;

  const [content, specialties, all] = await Promise.all([getContent(), listSpecialties(), listedDoctors()]);
  const specialtyName = (code: string) => t(specialties.find((item) => item._id === code)?.name, locale) || code;
  // Only the specialties someone listed practises, so every filter returns doctors.
  const offered = specialties.filter((item) => all.some(({ doctor }) => doctorSpecialtyCodes(doctor).includes(item._id)));
  const doctors = specialty ? all.filter(({ doctor }) => doctorSpecialtyCodes(doctor).includes(specialty)) : all;

  return (
    <>
      <Header content={content} locale={locale} path="/doctors" />

      <main className="bg-surface-muted px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t(DOCTOR_LIST_COPY.title, locale)}</h1>
          <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">{t(DOCTOR_LIST_COPY.body, locale)}</p>

          {all.length === 0 ? (
            <div className="card mt-8 p-7">
              <p className="leading-relaxed text-ink-soft">{t(DOCTOR_LIST_COPY.none, locale)}</p>
              <Link href={`/${locale}#quote-form`} className="btn btn-primary mt-5">
                {t(HOSPITAL_COPY.cta, locale)}
              </Link>
            </div>
          ) : (
            <>
              <nav aria-label={t(DOCTOR_LIST_COPY.filterAll, locale)} className="mt-8 flex flex-wrap gap-2">
                {[{ _id: "", label: t(DOCTOR_LIST_COPY.filterAll, locale) }, ...offered.map((item) => ({ _id: item._id, label: t(item.name, locale) }))].map(
                  (item) => (
                    <Link
                      key={item._id || "all"}
                      href={item._id ? `/${locale}/doctors?specialty=${item._id}` : `/${locale}/doctors`}
                      aria-current={specialty === item._id ? "page" : undefined}
                      className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ring-1 transition ${
                        specialty === item._id ? "bg-violet text-white ring-violet" : "bg-white text-ink-soft ring-line hover:text-brand"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ),
                )}
              </nav>
              <p className="mt-4 text-sm text-ink-soft">{doctors.length} {t(DOCTOR_LIST_COPY.title, locale).toLowerCase()}</p>
              <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {doctors.map(({ doctor, hospitals }) => (
                  <li key={doctor._id}>
                    <Link href={`/${locale}/doctors/${doctor._id}`} className="card link-card flex h-full flex-col p-5">
                      <span className="font-extrabold text-ink">{doctor.name}</span>
                      <span className="mt-1 text-sm text-ink-soft">
                        {[doctor.designation, doctorSpecialtyCodes(doctor).map(specialtyName).join(", ") || doctor.specialtyLabelRaw]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      {doctor.experienceYears ? (
                        <span className="mt-1 text-sm text-ink-muted">
                          {doctor.experienceYears}+ {t(HOSPITAL_COPY.years, locale)}
                        </span>
                      ) : null}
                      {doctor.qualifications ? <span className="mt-1 text-sm text-ink-muted">{doctor.qualifications}</span> : null}
                      {hospitals.length ? (
                        <span className="mt-3 text-sm font-semibold text-brand">{hospitals.map((hospital) => `${hospital.name}, ${hospital.city}`).join(" · ")}</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </main>

      <Footer content={content} locale={locale} />
    </>
  );
}
