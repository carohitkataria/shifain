import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { getContent } from "@/lib/store";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import {
  listSpecialties,
  type Doctor,
  type DoctorSchedule,
  type Hospital,
  type HospitalDoctorLink,
} from "@/lib/catalogue";
import { DOCTOR_LIST_COPY } from "@/lib/directory-copy";
import { HOSPITAL_COPY } from "@/lib/hospital-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

const DAY_LABEL: Record<string, Record<Locale, string>> = {
  mon: { en: "Mon", ru: "Пн", uz: "Du" },
  tue: { en: "Tue", ru: "Вт", uz: "Se" },
  wed: { en: "Wed", ru: "Ср", uz: "Ch" },
  thu: { en: "Thu", ru: "Чт", uz: "Pa" },
  fri: { en: "Fri", ru: "Пт", uz: "Ju" },
  sat: { en: "Sat", ru: "Сб", uz: "Sh" },
  sun: { en: "Sun", ru: "Вс", uz: "Ya" },
};

export default async function DoctorProfile({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  if (!isDatabaseConfigured()) notFound();
  const db = await getDb();

  // Consent and publication both have to be in place. A doctor is a person,
  // not a listing we get to make on their behalf.
  const doctor = await db
    .collection<Doctor>("doctors")
    .findOne({ _id: id, consentToList: true, "publication.state": "published" });
  if (!doctor) notFound();

  const [content, specialties, links, schedules] = await Promise.all([
    getContent(),
    listSpecialties(),
    db.collection<HospitalDoctorLink>("hospital_doctor_map").find({ doctorId: id }).toArray(),
    db.collection<DoctorSchedule>("doctor_schedules").find({ doctorId: id }).toArray(),
  ]);

  const hospitals = links.length
    ? await db
        .collection<Hospital>("hospitals")
        .find({ _id: { $in: links.map((link) => link.hospitalId) }, "publication.state": "published" })
        .toArray()
    : [];

  const specialtyName = (code: string | null) =>
    code ? t(specialties.find((item) => item._id === code)?.name, locale) || code : "";

  return (
    <>
      <Header content={content} locale={locale} path={`/doctors/${id}`} />

      <main className="bg-surface-muted px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-3xl">
          <Link href={`/${locale}/doctors`} className="text-sm font-bold text-brand hover:underline">
            &larr; {t(DOCTOR_LIST_COPY.back, locale)}
          </Link>

          <div className="card mt-4 p-7 sm:p-9">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">{doctor.name}</h1>
            <p className="mt-1.5 text-ink-soft">
              {specialtyName(doctor.specialtyCode) || doctor.specialtyLabelRaw}
              {doctor.experienceYears
                ? ` · ${doctor.experienceYears} ${t(HOSPITAL_COPY.years, locale)}`
                : ""}
            </p>
            {doctor.qualifications ? (
              <p className="mt-1 text-sm text-ink-muted">{doctor.qualifications}</p>
            ) : null}
            {doctor.registrationNumber ? (
              <p className="mt-1 text-sm text-ink-muted">
                {t(DOCTOR_LIST_COPY.registration, locale)}: {doctor.registrationNumber}
              </p>
            ) : null}

            {doctor.about ? (
              <section className="mt-8">
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-ink-soft">
                  {t(DOCTOR_LIST_COPY.about, locale)}
                </h2>
                <p className="mt-3 leading-relaxed text-ink-soft">{doctor.about}</p>
              </section>
            ) : null}

            {hospitals.length > 0 ? (
              <section className="mt-8">
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-ink-soft">
                  {t(DOCTOR_LIST_COPY.worksAt, locale)}
                </h2>
                <ul className="mt-3 space-y-3">
                  {hospitals.map((hospital) => {
                    const rota = schedules.filter((row) => row.hospitalId === hospital._id);
                    return (
                      <li key={hospital._id} className="rounded-xl bg-surface-muted p-4">
                        <Link
                          href={`/${locale}/hospitals/${hospital._id}`}
                          className="font-semibold text-brand hover:underline"
                        >
                          {hospital.name}
                        </Link>
                        <span className="ml-2 text-sm text-ink-soft">{hospital.city}</span>

                        {rota.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {rota.map((row) => (
                              <span key={row._id} className="chip">
                                <Icon name="clock" className="h-4 w-4" />
                                {row.day
                                  ? DAY_LABEL[row.day][locale]
                                  : t(DOCTOR_LIST_COPY.anyDay, locale)}
                                {row.from || row.to ? ` ${row.from ?? ""}–${row.to ?? ""}` : ""}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
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
