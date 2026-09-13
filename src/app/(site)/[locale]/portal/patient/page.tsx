import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getContent } from "@/lib/store";
import { currentPatient } from "@/lib/patient-auth";
import { casesForEmail, casesForPhone, type CaseStatus } from "@/lib/cases";
import { isDatabaseConfigured } from "@/lib/db";
import { PATIENT_COPY } from "@/lib/patient-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { patientLogoutAction } from "./actions";

export const dynamic = "force-dynamic";

const TONE: Record<CaseStatus, string> = {
  new: "bg-surface-muted text-ink-soft",
  planning: "bg-brand-tint text-brand-deep",
  planned: "bg-leaf/10 text-leaf",
  "plan-failed": "bg-saffron/15 text-saffron",
  confirmed: "bg-leaf/10 text-leaf",
  closed: "bg-surface-muted text-ink-muted",
};

export default async function PatientPortal({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  if (!isDatabaseConfigured()) redirect(`/${locale}/portal/patient/login`);
  const identity = await currentPatient().catch(() => null);
  if (!identity) redirect(`/${locale}/portal/patient/login`);

  const [content, cases] = await Promise.all([
    getContent(),
    identity.kind === "email" ? casesForEmail(identity.email) : casesForPhone(identity.digits),
  ]);

  return (
    <>
      <Header content={content} locale={locale} path="/portal/patient" />

      <main className="bg-surface-muted px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-ink">
              {t(PATIENT_COPY.title, locale)}
            </h1>
            <form action={patientLogoutAction}>
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="btn btn-secondary">
                {t(PATIENT_COPY.signOut, locale)}
              </button>
            </form>
          </div>

          {cases.length === 0 ? (
            <p className="card mt-8 p-6 text-ink-soft">{t(PATIENT_COPY.empty, locale)}</p>
          ) : (
            <ul className="mt-8 space-y-3">
              {cases.map((item) => (
                <li key={item._id} className="card p-5">
                  <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="font-extrabold text-ink">
                        {item.plan?.recommendedTreatmentCode ?? item.statedNeed ?? item._id}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-soft">
                        {new Date(item.createdAt).toLocaleDateString(locale)} · {item._id}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${TONE[item.status]}`}
                    >
                      {t(PATIENT_COPY.statuses[item.status], locale)}
                    </span>
                    <Link
                      href={`/${locale}/plan/${item._id}`}
                      className="shrink-0 text-sm font-semibold text-brand hover:underline"
                    >
                      {t(PATIENT_COPY.openPlan, locale)}
                    </Link>
                  </div>

                  {item.reports.length > 0 && item.reportsExpireAt ? (
                    <p className="mt-3 border-t border-line pt-3 text-xs text-ink-muted">
                      {item.reports.length} {t(PATIENT_COPY.reportsHeld, locale)}{" "}
                      {t(PATIENT_COPY.reportsUntil, locale)}{" "}
                      {new Date(item.reportsExpireAt).toLocaleDateString(locale)}
                    </p>
                  ) : null}
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
