import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { getContent } from "@/lib/store";
import { currentPartner } from "@/lib/partner-auth";
import { casesReferredBy, type CaseStatus } from "@/lib/cases";
import { isDatabaseConfigured } from "@/lib/db";
import { DOCTOR_COPY } from "@/lib/doctor-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { doctorLogoutAction, referPatientAction } from "./actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint";

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

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block min-w-0">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                    {t(DOCTOR_COPY.patientName, locale)}
                  </span>
                  <input type="text" name="name" required className={field} />
                </label>
                <label className="block min-w-0">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                    {t(DOCTOR_COPY.patientPhone, locale)}
                  </span>
                  <input type="tel" name="phone" required className={field} />
                </label>
                <label className="block min-w-0">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                    {t(DOCTOR_COPY.patientCountry, locale)}
                  </span>
                  <input type="text" name="country" required className={field} />
                </label>
                <label className="block min-w-0">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                    {t(DOCTOR_COPY.need, locale)}
                  </span>
                  <input
                    type="text"
                    name="need"
                    required
                    placeholder={t(DOCTOR_COPY.needPlaceholder, locale)}
                    className={field}
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                  {t(DOCTOR_COPY.reports, locale)}
                </span>
                <input
                  type="file"
                  name="reports"
                  multiple
                  accept="application/pdf,image/png,image/jpeg,image/gif,image/webp"
                  className={`${field} file:mr-3 file:rounded-md file:border-0 file:bg-brand-tint file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand`}
                />
                <span className="mt-1.5 block text-sm text-ink-soft">
                  {t(DOCTOR_COPY.reportsNote, locale)}
                </span>
              </label>

              <button type="submit" className="btn btn-primary">
                {t(DOCTOR_COPY.submit, locale)}
              </button>

              <p className="flex gap-2 text-sm leading-relaxed text-ink-soft">
                <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                {t(DOCTOR_COPY.privacy, locale)}
              </p>
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
