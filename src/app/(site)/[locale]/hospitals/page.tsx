import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { getContent } from "@/lib/store";
import { publishedHospitals, accreditationLabels } from "@/lib/catalogue";
import { HOSPITAL_COPY } from "@/lib/hospital-copy";
import { DOCTOR_LIST_COPY } from "@/lib/directory-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function HospitalsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ city?: string; country?: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const { city = "", country = "" } = await searchParams;

  const [content, published] = await Promise.all([getContent(), publishedHospitals({ limit: 200 })]);
  // The breadcrumb on a hospital page links here by city or country.
  const same = (a: string | null | undefined, b: string) => (a ?? "").toLowerCase() === b.toLowerCase();
  const hospitals = published.filter((item) => (!city || same(item.city, city)) && (!country || same(item.country, country)));
  const place = city || country;

  return (
    <>
      <Header content={content} locale={locale} path="/hospitals" />

      <main className="bg-surface-muted px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-4xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">
            {t(HOSPITAL_COPY.listTitle, locale)}
          </h1>
          <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
            {t(HOSPITAL_COPY.listBody, locale)}
          </p>

          {place ? (
            <p className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-violet-soft pl-4 pr-1.5 text-sm font-bold text-violet">
              {place}
              <Link href={`/${locale}/hospitals`} aria-label={`${t(DOCTOR_LIST_COPY.clear, locale)}: ${place}`} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white">
                ×
              </Link>
            </p>
          ) : null}

          {hospitals.length === 0 ? (
            <div className="card mt-8 p-7">
              <p className="leading-relaxed text-ink-soft">{t(HOSPITAL_COPY.none, locale)}</p>
              <Link href={`/${locale}#quote-form`} className="btn btn-primary mt-5">
                {t(HOSPITAL_COPY.cta, locale)}
              </Link>
            </div>
          ) : (
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {hospitals.map((hospital) => (
                <li key={hospital._id}>
                  <Link
                    href={`/${locale}/hospitals/${hospital._id}`}
                    className="card link-card flex h-full flex-col p-5"
                  >
                    <span className="font-extrabold text-ink">{hospital.name}</span>
                    <span className="mt-1 text-sm text-ink-soft">
                      {hospital.city}
                      {hospital.state ? `, ${hospital.state}` : ""}
                    </span>
                    <span className="mt-1 text-sm text-ink-muted">
                      {[
                        hospital.hospitalType ? t(HOSPITAL_COPY.types[hospital.hospitalType], locale) || hospital.hospitalType : null,
                        hospital.yearEstablished ? `${t(HOSPITAL_COPY.established, locale)} ${hospital.yearEstablished}` : null,
                        hospital.specialtyCodes?.length ? `${hospital.specialtyCodes.length} ${t(HOSPITAL_COPY.specialtiesCount, locale)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {hospital.accreditations?.length ? (
                      <span className="mt-3 flex flex-wrap gap-1.5">
                        {accreditationLabels(hospital).map((mark) => (
                          <span
                            key={mark}
                            className="rounded-full bg-leaf/10 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wider text-leaf"
                          >
                            {mark}
                          </span>
                        ))}
                      </span>
                    ) : null}
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand">
                      {t(HOSPITAL_COPY.view, locale)}
                      <Icon name="route" className="h-4 w-4" />
                    </span>
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
