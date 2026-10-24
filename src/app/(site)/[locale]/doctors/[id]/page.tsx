import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { getContent } from "@/lib/store";
import { isDatabaseConfigured } from "@/lib/db";
import { isVerifiedDoctor, listSpecialties } from "@/lib/catalogue";
import { conditionsFor, doctorSpecialtyCodes, hospitalsForDoctor, listedDoctor, proceduresFor } from "@/lib/directory";
import { mediaUrl } from "@/lib/media";
import { BOOKING_COPY, DOCTOR_LIST_COPY } from "@/lib/directory-copy";
import { BookingPanel } from "@/components/BookingForm";
import { HOSPITAL_COPY } from "@/lib/hospital-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import type { L } from "@/lib/content-types";

export const dynamic = "force-dynamic";

const DAY_LABEL: Record<string, L> = {
  mon: { en: "Mon", ru: "Пн", uz: "Du" },
  tue: { en: "Tue", ru: "Вт", uz: "Se" },
  wed: { en: "Wed", ru: "Ср", uz: "Ch" },
  thu: { en: "Thu", ru: "Чт", uz: "Pa" },
  fri: { en: "Fri", ru: "Пт", uz: "Ju" },
  sat: { en: "Sat", ru: "Сб", uz: "Sh" },
  sun: { en: "Sun", ru: "Вс", uz: "Ya" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-6 sm:p-8">
      <h2 className="text-xl font-extrabold tracking-tight text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const money = (value: number, currency: string) =>
  `${currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "INR" ? "₹" : `${currency} `}${Math.round(value).toLocaleString("en-US")}`;

export default async function DoctorProfile({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: raw, id } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  if (!isDatabaseConfigured()) notFound();
  // Consent and publication both have to be in place. A doctor is a person,
  // not a listing we get to make on their behalf.
  const doctor = await listedDoctor(id);
  if (!doctor) notFound();

  const codes = doctorSpecialtyCodes(doctor);
  const [content, specialties, places, procedures, conditions] = await Promise.all([
    getContent(),
    listSpecialties(),
    hospitalsForDoctor(id),
    proceduresFor(id),
    conditionsFor(codes),
  ]);
  const specialtyName = (code: string) => t(specialties.find((item) => item._id === code)?.name, locale) || code;
  const verified = isVerifiedDoctor(doctor);
  const qualifications = doctor.qualificationRecords?.length
    ? doctor.qualificationRecords
    : doctor.qualifications
      ? doctor.qualifications.split(/,\s*/).map((degree) => ({ degree, institution: null, year: null }))
      : [];
  const initials = doctor.name.replace(/^Dr\.?\s*/i, "").split(/\s+/).slice(0, 2).map((part) => part[0]).join("");

  return (
    <>
      <Header content={content} locale={locale} path={`/doctors/${id}`} />

      <main className="bg-surface-muted px-4 py-10 sm:py-14">
        <div className="mx-auto w-full max-w-6xl">
          <Link href={`/${locale}/doctors`} className="text-sm font-bold text-brand hover:underline">
            &larr; {t(DOCTOR_LIST_COPY.back, locale)}
          </Link>

          <header className="card mt-4 flex flex-wrap items-start gap-5 p-6 sm:p-8">
            {doctor.photoId ? (
              // eslint-disable-next-line @next/next/no-img-element -- stored upload, served by our own route
              <img src={mediaUrl(doctor.photoId)} alt={doctor.name} className="h-24 w-24 flex-none rounded-full object-cover ring-1 ring-line" />
            ) : (
              <span className="flex h-24 w-24 flex-none items-center justify-center rounded-full bg-violet text-2xl font-bold text-white" aria-hidden="true">
                {initials}
              </span>
            )}
            <div className="min-w-0 flex-1 basis-72">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-[clamp(1.8rem,1.4rem+1.6vw,2.5rem)] font-extrabold leading-tight tracking-tight text-ink">{doctor.name}</h1>
                {verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-bold text-leaf">
                    <Icon name="shield" className="h-4 w-4" />
                    {t(DOCTOR_LIST_COPY.verified, locale)}
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 text-lg text-ink-soft">
                {[doctor.designation, codes.map(specialtyName).join(", ") || doctor.specialtyLabelRaw].filter(Boolean).join(" · ")}
              </p>
              {doctor.specialties?.some((item) => item.subSpecialty) ? (
                <p className="mt-0.5 text-ink-soft">
                  {doctor.specialties
                    .map((item) => item.subSpecialty)
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
              <ul className="mt-4 flex flex-wrap gap-2 text-sm">
                {doctor.experienceYears ? (
                  <li className="chip">
                    <Icon name="clock" className="h-4 w-4" />
                    {doctor.experienceYears}+ {t(DOCTOR_LIST_COPY.experience, locale)}
                  </li>
                ) : null}
                {doctor.languages?.length ? (
                  <li className="chip">
                    <Icon name="translate" className="h-4 w-4" />
                    {doctor.languages.map((code) => t(HOSPITAL_COPY.languageNames[code], locale) || code).join(", ")}
                  </li>
                ) : null}
                {places.map(({ hospital }) => (
                  <li key={hospital._id}>
                    <Link href={`/${locale}/hospitals/${hospital._id}`} className="chip hover:!text-brand">
                      <Icon name="hospital" className="h-4 w-4" />
                      {hospital.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <a href="#book" className="btn btn-primary shrink-0">
              {t(BOOKING_COPY.book, locale)}
            </a>
          </header>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0 space-y-5">
              {doctor.about ? (
                <Section title={t(DOCTOR_LIST_COPY.about, locale)}>
                  <p className="max-w-3xl leading-relaxed text-ink-soft">{doctor.about}</p>
                </Section>
              ) : null}

              {procedures.length ? (
                <Section title={t(DOCTOR_LIST_COPY.procedures, locale)}>
                  <ul className="flex flex-wrap gap-2">
                    {procedures.map((item) => (
                      <li key={item._id} className="chip">
                        {t(item.name, locale)}
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              {conditions.length ? (
                <Section title={t(DOCTOR_LIST_COPY.conditions, locale)}>
                  <ul className="flex flex-wrap gap-2">
                    {conditions.map((disease) => (
                      <li key={disease._id}>
                        <Link
                          href={`/${locale}/conditions/${disease._id}`}
                          className="inline-flex min-h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-ink ring-1 ring-line transition hover:text-brand hover:ring-brand"
                        >
                          {t(disease.name, locale)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              {qualifications.length || doctor.experienceHistory?.length ? (
                <Section title={t(DOCTOR_LIST_COPY.qualifications, locale)}>
                  {qualifications.length ? (
                    <ul className="space-y-2">
                      {qualifications.map((item) => (
                        <li key={`${item.degree}-${item.year}`} className="text-ink">
                          <span className="font-semibold">{item.degree}</span>
                          {item.institution ? <span className="text-ink-soft"> · {item.institution}</span> : null}
                          {item.year ? <span className="text-ink-muted"> · {item.year}</span> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {doctor.experienceHistory?.length ? (
                    <>
                      <h3 className="mt-6 text-sm font-bold uppercase tracking-[0.14em] text-ink-soft">{t(DOCTOR_LIST_COPY.workHistory, locale)}</h3>
                      <ul className="mt-3 space-y-2">
                        {doctor.experienceHistory.map((item) => (
                          <li key={`${item.role}-${item.organization}-${item.fromYear}`} className="text-ink">
                            <span className="font-semibold">{item.role}</span>
                            <span className="text-ink-soft"> · {item.organization}</span>
                            {item.fromYear ? (
                              <span className="text-ink-muted">
                                {" "}
                                · {item.fromYear}–{item.toYear ?? t(DOCTOR_LIST_COPY.present, locale)}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </Section>
              ) : null}

              {doctor.memberships?.length || doctor.awards?.length ? (
                <Section title={t(DOCTOR_LIST_COPY.awards, locale)}>
                  {doctor.awards?.length ? (
                    <ul className="space-y-2">
                      {doctor.awards.map((item) => (
                        <li key={`${item.title}-${item.year}`} className="text-ink">
                          <span className="font-semibold">{item.title}</span>
                          {item.awardingBody ? <span className="text-ink-soft"> · {item.awardingBody}</span> : null}
                          {item.year ? <span className="text-ink-muted"> · {item.year}</span> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {doctor.memberships?.length ? (
                    <>
                      <h3 className="mt-6 text-sm font-bold uppercase tracking-[0.14em] text-ink-soft">{t(DOCTOR_LIST_COPY.memberships, locale)}</h3>
                      <ul className="mt-3 space-y-2">
                        {doctor.memberships.map((item) => (
                          <li key={item.body} className="text-ink">
                            {item.body}
                            {item.membershipNo ? <span className="text-ink-muted"> · {item.membershipNo}</span> : null}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </Section>
              ) : null}
            </div>

            <aside className="min-w-0 space-y-5">
              <BookingPanel
                locale={locale}
                from={`/${locale}/doctors/${id}`}
                doctorId={id}
                hospitalId={places[0]?.hospital._id ?? null}
                specialties={codes.map(specialtyName)}
                subject={[doctor.name, places[0] ? `${places[0].hospital.name}, ${places[0].hospital.city}` : null].filter(Boolean).join(" · ")}
              />
              {places.length ? (
                <Section title={t(DOCTOR_LIST_COPY.worksAt, locale)}>
                  <ul className="space-y-4">
                    {places.map(({ hospital, link, rota }) => (
                      <li key={hospital._id}>
                        <Link href={`/${locale}/hospitals/${hospital._id}`} className="font-bold text-brand hover:underline">
                          {hospital.name}
                        </Link>
                        <p className="text-sm text-ink-soft">
                          {[hospital.city, link.designation, link.specialtyCode ? specialtyName(link.specialtyCode) : null].filter(Boolean).join(" · ")}
                        </p>
                        {link.opdLocation ? (
                          <p className="text-sm text-ink-soft">
                            {t(DOCTOR_LIST_COPY.opd, locale)}: {link.opdLocation}
                          </p>
                        ) : null}
                        {rota.length ? (
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {rota.map((row) => (
                              <li key={row._id} className="chip !text-xs">
                                {row.day ? t(DAY_LABEL[row.day], locale) : t(DOCTOR_LIST_COPY.anyDay, locale)}
                                {row.from || row.to ? ` ${row.from ?? ""}–${row.to ?? ""}` : ""}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              {doctor.consultFee != null || doctor.teleconsultFee != null ? (
                <Section title={t(DOCTOR_LIST_COPY.fees, locale)}>
                  <dl className="space-y-1 text-sm">
                    {doctor.consultFee != null ? (
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-soft">{t(DOCTOR_LIST_COPY.inPerson, locale)}</dt>
                        <dd className="font-semibold text-ink">{money(doctor.consultFee, doctor.currency ?? "USD")}</dd>
                      </div>
                    ) : null}
                    {doctor.teleconsultFee != null ? (
                      <div className="flex justify-between gap-3">
                        <dt className="text-ink-soft">{t(DOCTOR_LIST_COPY.video, locale)}</dt>
                        <dd className="font-semibold text-ink">{money(doctor.teleconsultFee, doctor.currency ?? "USD")}</dd>
                      </div>
                    ) : null}
                  </dl>
                </Section>
              ) : null}

              {doctor.registrationNumber ? (
                <section className="card p-6 text-sm">
                  <p className="text-ink-soft">
                    {t(DOCTOR_LIST_COPY.registration, locale)}: <span className="font-semibold text-ink">{doctor.registrationNumber}</span>
                    {doctor.registrationCouncil ? ` · ${doctor.registrationCouncil}` : ""}
                  </p>
                </section>
              ) : null}
            </aside>
          </div>
        </div>
      </main>

      <Footer content={content} locale={locale} />
    </>
  );
}
