import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getContent } from "@/lib/store";
import { listSpecialties, publishedDoctors } from "@/lib/catalogue";
import { HOSPITAL_COPY } from "@/lib/hospital-copy";
import { DOCTOR_LIST_COPY } from "@/lib/directory-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function DoctorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  const [content, doctors, specialties] = await Promise.all([
    getContent(),
    publishedDoctors(),
    listSpecialties(),
  ]);
  const specialtyName = (code: string | null) =>
    code ? t(specialties.find((item) => item._id === code)?.name, locale) || code : "";

  return (
    <>
      <Header content={content} locale={locale} path="/doctors" />

      <main className="bg-surface-muted px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-4xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            {t(DOCTOR_LIST_COPY.title, locale)}
          </h1>
          <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
            {t(DOCTOR_LIST_COPY.body, locale)}
          </p>

          {doctors.length === 0 ? (
            <div className="card mt-8 p-7">
              <p className="leading-relaxed text-ink-soft">{t(DOCTOR_LIST_COPY.none, locale)}</p>
              <Link href={`/${locale}#quote-form`} className="btn btn-primary mt-5">
                {t(HOSPITAL_COPY.cta, locale)}
              </Link>
            </div>
          ) : (
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {doctors.map((doctor) => (
                <li key={doctor._id}>
                  <Link
                    href={`/${locale}/doctors/${doctor._id}`}
                    className="card link-card flex h-full flex-col p-5"
                  >
                    <span className="font-extrabold text-ink">{doctor.name}</span>
                    <span className="mt-1 text-sm text-ink-soft">
                      {specialtyName(doctor.specialtyCode) || doctor.specialtyLabelRaw}
                      {doctor.experienceYears
                        ? ` · ${doctor.experienceYears} ${t(HOSPITAL_COPY.years, locale)}`
                        : ""}
                    </span>
                    {doctor.qualifications ? (
                      <span className="mt-2 text-sm text-ink-muted">{doctor.qualifications}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      <Footer content={content} locale={locale} />
    </>
  );
}
