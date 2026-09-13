import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { getContent } from "@/lib/store";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { listSpecialties, type Doctor, type Hospital } from "@/lib/catalogue";
import { HOSPITAL_COPY } from "@/lib/hospital-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-ink-soft">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default async function HospitalProfile({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  if (!isDatabaseConfigured()) notFound();
  const db = await getDb();

  // Only a published hospital has a public page. Everything else in the
  // catalogue is research, and research is not a recommendation.
  const hospital = await db
    .collection<Hospital>("hospitals")
    .findOne({ _id: id, "publication.state": "published" });
  if (!hospital) notFound();

  const [content, specialties] = await Promise.all([getContent(), listSpecialties()]);
  const specialtyName = (code: string) =>
    t(specialties.find((item) => item._id === code)?.name, locale) || code;

  const links = await db
    .collection<{ doctorId: string }>("hospital_doctor_map")
    .find({ hospitalId: id, stale: { $ne: true } } as never)
    .toArray();

  const doctors = links.length
    ? await db
        .collection<Doctor>("doctors")
        .find({
          _id: { $in: links.map((link) => link.doctorId) },
          consentToList: true,
          "publication.state": "published",
        })
        .toArray()
    : [];

  return (
    <>
      <Header content={content} locale={locale} path={`/hospitals/${id}`} />

      <main className="bg-surface-muted px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-3xl">
          <Link
            href={`/${locale}/hospitals`}
            className="text-sm font-bold text-brand hover:underline"
          >
            &larr; {t(HOSPITAL_COPY.back, locale)}
          </Link>

          <div className="card mt-4 p-7 sm:p-9">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">{hospital.name}</h1>
            <p className="mt-1.5 text-ink-soft">
              {hospital.city}
              {hospital.state ? `, ${hospital.state}` : ""}
              {hospital.hospitalType ? ` · ${hospital.hospitalType}` : ""}
            </p>

            {hospital.accreditations?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {hospital.accreditations.map((mark) => (
                  <span
                    key={mark}
                    className="rounded-full bg-leaf/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-leaf"
                  >
                    {mark}
                  </span>
                ))}
              </div>
            ) : null}

            {hospital.about ? (
              <Section title={t(HOSPITAL_COPY.about, locale)}>
                <p className="leading-relaxed text-ink-soft">{hospital.about}</p>
              </Section>
            ) : null}

            {hospital.beds || hospital.icuBeds ? (
              <Section title={t(HOSPITAL_COPY.facts, locale)}>
                <div className="flex flex-wrap gap-3">
                  {hospital.beds ? (
                    <span className="chip">
                      <Icon name="bed" className="h-4 w-4" />
                      {hospital.beds} {t(HOSPITAL_COPY.beds, locale)}
                    </span>
                  ) : null}
                  {hospital.icuBeds ? (
                    <span className="chip">
                      <Icon name="stethoscope" className="h-4 w-4" />
                      {hospital.icuBeds} {t(HOSPITAL_COPY.icuBeds, locale)}
                    </span>
                  ) : null}
                </div>
              </Section>
            ) : null}

            {hospital.specialtyCodes?.length ? (
              <Section title={t(HOSPITAL_COPY.specialties, locale)}>
                <div className="flex flex-wrap gap-2">
                  {hospital.specialtyCodes.map((code) => (
                    <span key={code} className="chip">
                      {specialtyName(code)}
                    </span>
                  ))}
                </div>
              </Section>
            ) : null}

            {hospital.capabilities?.length ? (
              <Section title={t(HOSPITAL_COPY.capabilities, locale)}>
                <div className="flex flex-wrap gap-2">
                  {hospital.capabilities.map((code) => (
                    <span key={code} className="chip">
                      {code.replace(/-/g, " ")}
                    </span>
                  ))}
                </div>
              </Section>
            ) : null}

            {hospital.internationalDesk?.exists ? (
              <Section title={t(HOSPITAL_COPY.desk, locale)}>
                <p className="text-ink-soft">
                  {hospital.internationalDesk.contactName ?? ""}
                </p>
                {hospital.internationalDesk.languages?.length ? (
                  <p className="mt-1 text-sm text-ink-soft">
                    {t(HOSPITAL_COPY.deskLanguages, locale)}:{" "}
                    {hospital.internationalDesk.languages.join(", ")}
                  </p>
                ) : null}
              </Section>
            ) : null}

            <Section title={t(HOSPITAL_COPY.doctors, locale)}>
              {doctors.length === 0 ? (
                <p className="text-ink-soft">{t(HOSPITAL_COPY.noDoctors, locale)}</p>
              ) : (
                <ul className="space-y-2">
                  {doctors.map((doctor) => (
                    <li key={doctor._id} className="rounded-xl bg-surface-muted p-4">
                      <p className="font-semibold text-ink">{doctor.name}</p>
                      <p className="mt-0.5 text-sm text-ink-soft">
                        {doctor.specialtyCode ? specialtyName(doctor.specialtyCode) : ""}
                        {doctor.experienceYears
                          ? ` · ${doctor.experienceYears} ${t(HOSPITAL_COPY.years, locale)}`
                          : ""}
                        {doctor.qualifications ? ` · ${doctor.qualifications}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {hospital.officialWebsite ? (
              <p className="mt-8 border-t border-line pt-5 text-sm">
                <a
                  href={hospital.officialWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand hover:underline"
                >
                  {t(HOSPITAL_COPY.website, locale)}
                </a>
              </p>
            ) : null}
          </div>

          <Link href={`/${locale}#quote-form`} className="btn btn-primary mt-6">
            {t(HOSPITAL_COPY.cta, locale)}
          </Link>
        </div>
      </main>

      <Footer content={content} locale={locale} />
    </>
  );
}
