import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getContent } from "@/lib/store";
import { listCategories, listSpecialties } from "@/lib/catalogue";
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
  searchParams: Promise<{ specialty?: string; category?: string; hospital?: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const { specialty = "", category = "", hospital = "" } = await searchParams;

  const [content, specialties, categories, everyone] = await Promise.all([getContent(), listSpecialties(), listCategories(), listedDoctors()]);
  const specialtyName = (code: string) => t(specialties.find((item) => item._id === code)?.name, locale) || code;
  // A hospital page links here for its own doctors; the filters then stay within that hospital.
  const atHospital = hospital ? everyone.filter(({ hospitals }) => hospitals.some((item) => item._id === hospital)) : everyone;
  const hospitalLabel = hospital
    ? (() => {
        const found = atHospital[0]?.hospitals.find((item) => item._id === hospital);
        return found ? `${found.name}, ${found.city}` : null;
      })()
    : null;
  const all = hospitalLabel ? atHospital : everyone;
  const inCategory = new Set(specialties.filter((item) => item.categoryCode === category).map((item) => item._id));
  const categoryLabel = category && inCategory.size ? t(categories.find((item) => item._id === category)?.name, locale) || category : null;
  // Only the specialties someone listed practises, so every filter returns doctors.
  const offered = specialties.filter((item) => all.some(({ doctor }) => doctorSpecialtyCodes(doctor).includes(item._id)));
  const doctors = all.filter(({ doctor }) => {
    const codes = doctorSpecialtyCodes(doctor);
    if (specialty && !codes.includes(specialty)) return false;
    if (categoryLabel && !codes.some((code) => inCategory.has(code))) return false;
    return true;
  });
  const query = (next: Record<string, string>) => {
    const search = new URLSearchParams(Object.entries({ hospital: hospitalLabel ? hospital : "", ...next }).filter(([, value]) => value));
    return `/${locale}/doctors${search.size ? `?${search}` : ""}`;
  };

  return (
    <>
      <Header content={content} locale={locale} path="/doctors" />

      <main className="bg-surface-muted px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-5xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t(DOCTOR_LIST_COPY.title, locale)}</h1>
          <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">{t(DOCTOR_LIST_COPY.body, locale)}</p>
          {hospitalLabel || categoryLabel ? (
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Filters">
              {hospitalLabel ? (
                <li className="inline-flex min-h-10 items-center gap-2 rounded-full bg-violet-soft pl-4 pr-1.5 text-sm font-bold text-violet">
                  <Link href={`/${locale}/hospitals/${hospital}`} className="hover:underline">
                    {hospitalLabel}
                  </Link>
                  <Link
                    href={`/${locale}/doctors${specialty ? `?specialty=${specialty}` : category ? `?category=${category}` : ""}`}
                    aria-label={`${t(DOCTOR_LIST_COPY.clear, locale)}: ${hospitalLabel}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white"
                  >
                    ×
                  </Link>
                </li>
              ) : null}
              {categoryLabel ? (
                <li className="inline-flex min-h-10 items-center gap-2 rounded-full bg-violet-soft pl-4 pr-1.5 text-sm font-bold text-violet">
                  {categoryLabel}
                  <Link href={query({})} aria-label={`${t(DOCTOR_LIST_COPY.clear, locale)}: ${categoryLabel}`} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white">
                    ×
                  </Link>
                </li>
              ) : null}
            </ul>
          ) : null}

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
                      href={query({ specialty: item._id })}
                      aria-current={specialty === item._id && !categoryLabel ? "page" : undefined}
                      className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ring-1 transition ${
                        specialty === item._id && !categoryLabel ? "bg-violet text-white ring-violet" : "bg-white text-ink-soft ring-line hover:text-brand"
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
