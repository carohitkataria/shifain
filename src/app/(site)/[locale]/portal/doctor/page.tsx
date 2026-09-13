import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { IntakeForm } from "@/components/IntakeForm";
import { getContent } from "@/lib/store";
import { currentPartner } from "@/lib/partner-auth";
import { casesReferredBy, type CaseStatus } from "@/lib/cases";
import { isDatabaseConfigured } from "@/lib/db";
import { DOCTOR_COPY } from "@/lib/doctor-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { doctorLogoutAction, referPatientAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<CaseStatus, string> = {
  new: "bg-surface-muted text-ink-soft",
  planning: "bg-brand-tint text-brand",
  planned: "bg-leaf/10 text-leaf",
  "plan-failed": "bg-saffron/15 text-saffron",
  confirmed: "bg-leaf/10 text-leaf",
  closed: "bg-surface-muted text-ink-soft",
};

export default async function DoctorPortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  if (!isDatabaseConfigured()) redirect(`/${locale}/portal/doctor/login`);
  const doctor = await currentPartner().catch(() => null);
  if (!doctor || doctor.role !== "doctor") redirect(`/${locale}/portal/doctor/login`);

  const [content, referrals] = await Promise.all([getContent(), casesReferredBy(doctor._id)]);

  return (
    <>
      <Header content={content} locale={locale} path="/portal/doctor" />

      <main className="bg-surface-muted px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand">
                {t(DOCTOR_COPY.signInTitle, locale)}
              </p>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink">{doctor.name}</h1>
            </div>
            <form action={doctorLogoutAction}>
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="btn btn-secondary">
                {t(DOCTOR_COPY.signOut, locale)}
              </button>
            </form>
          </div>

          <section className="card mt-8 p-7">
            <h2 className="text-xl font-extrabold tracking-tight text-ink">
              {t(DOCTOR_COPY.referTitle, locale)}
            </h2>
            <p className="mt-1.5 leading-relaxed text-ink-soft">{t(DOCTOR_COPY.referBody, locale)}</p>

            <form action={referPatientAction} className="mt-6 space-y-4">
              <input type="hidden" name="locale" value={locale} />
              <IntakeForm
                locale={locale}
                treatments={content.specialties.items.map((item) => ({
                  slug: item.slug,
                  title: item.title,
                }))}
                labels={{
                  name: t(DOCTOR_COPY.patientName, locale),
                  namePlaceholder: "",
                  phone: t(DOCTOR_COPY.patientPhone, locale),
                  phonePlaceholder: "",
                  country: t(DOCTOR_COPY.patientCountry, locale),
                  countryPlaceholder: t(DOCTOR_COPY.patientCountry, locale),
                  treatment: t(DOCTOR_COPY.need, locale),
                  treatmentPlaceholder: t(DOCTOR_COPY.needPlaceholder, locale),
                  reports: t(DOCTOR_COPY.reports, locale),
                  reportsHint: t(DOCTOR_COPY.reportsNote, locale),
                  submit: t(DOCTOR_COPY.submit, locale),
                  privacy: t(DOCTOR_COPY.privacy, locale),
                }}
              />
            </form>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-extrabold tracking-tight text-ink">
              {t(DOCTOR_COPY.dashboardTitle, locale)}
            </h2>

            {referrals.length === 0 ? (
              <p className="card mt-4 p-6 leading-relaxed text-ink-soft">
                {t(DOCTOR_COPY.empty, locale)}
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {referrals.map((item) => (
                  <li key={item._id} className="card flex flex-wrap items-center gap-x-4 gap-y-3 p-5">
                    <span className="min-w-0 flex-1 basis-48">
                      <span className="block font-semibold text-ink">{item.patient.name}</span>
                      <span className="mt-0.5 block text-sm text-ink-soft">
                        {item.statedNeed} · {item.patient.country} · {item._id}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${STATUS_TONE[item.status]}`}
                    >
                      {t(DOCTOR_COPY.statuses[item.status], locale)}
                    </span>
                    <Link
                      href={`/${locale}/plan/${item._id}`}
                      className="shrink-0 text-sm font-semibold text-brand hover:underline"
                    >
                      {t(DOCTOR_COPY.viewPlan, locale)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      <Footer content={content} locale={locale} />
    </>
  );
}
