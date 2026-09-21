import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LogoMark } from "@/components/Logo";
import { getContent } from "@/lib/store";
import { currentPatient } from "@/lib/patient-auth";
import { isGoogleConfigured } from "@/lib/google-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { PATIENT_COPY } from "@/lib/patient-copy";
import { PORTAL_BACK } from "@/lib/portal-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import {
  patientLoginAction,
  requestEmailCodeAction,
  verifyEmailCodeAction,
} from "../actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint";

export default async function PatientLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; sent?: string; email?: string; code?: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const { error, sent, email, code } = await searchParams;
  const content = await getContent();

  if (isDatabaseConfigured() && (await currentPatient().catch(() => null))) {
    redirect(`/${locale}/portal/patient`);
  }

  return (
    <>
      <Header content={content} locale={locale} path="/portal/patient/login" />

      <main className="flex min-h-[60vh] items-center justify-center bg-surface-muted px-4 py-16">
        <div className="card w-full max-w-md p-8 shadow-xl shadow-ink/5">
          <LogoMark className="h-12 w-12" title="ShifaIn" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">
            {t(PATIENT_COPY.signInTitle, locale)}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            {t(PATIENT_COPY.signInBody, locale)}
          </p>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
            >
              {t(error === "code" ? PATIENT_COPY.codeFailed : PATIENT_COPY.failed, locale)}
            </p>
          ) : null}

          {sent ? (
            <>
              <p className="mt-4 rounded-lg bg-brand-tint px-3 py-2.5 text-sm leading-relaxed text-ink">
                {t(sent === "code" ? PATIENT_COPY.codeShown : PATIENT_COPY.codeSent, locale)}
              </p>
              {sent === "code" && code ? (
                <p className="mt-3 rounded-lg border border-dashed border-brand/50 bg-white px-3 py-3 text-center font-mono text-2xl font-bold tracking-[0.3em] text-brand-deep">
                  {code}
                </p>
              ) : null}
              <form action={verifyEmailCodeAction} className="mt-5 space-y-4">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="email" value={email ?? ""} />
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                    {t(PATIENT_COPY.code, locale)}
                  </span>
                  <input
                    name="code"
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    defaultValue={sent === "code" ? code : undefined}
                    className={`${field} text-center font-mono text-lg tracking-[0.3em]`}
                  />
                </label>
                <button type="submit" className="btn btn-primary w-full">
                  {t(PATIENT_COPY.verify, locale)}
                </button>
              </form>
              <Link
                href={`/${locale}/portal/patient/login`}
                className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
              >
                {t(PATIENT_COPY.useAnother, locale)}
              </Link>
            </>
          ) : (
            <>
          {isGoogleConfigured() ? (
            <div className="mt-5">
              <a
                href={`/api/auth/google?locale=${locale}`}
                className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-bold text-ink transition hover:bg-surface-muted"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9z" />
                  <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3 0-5.6-2-6.6-4.8h-4v3.1A12 12 0 0 0 12 24z" />
                  <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6v-3H1.4a12 12 0 0 0 0 10.7z" />
                  <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 12 0 12 12 0 0 0 1.4 6.6l4 3.1C6.4 6.8 9 4.8 12 4.8z" />
                </svg>
                Continue with Google
              </a>
              <div className="my-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                <span className="h-px flex-1 bg-line" />
                or
                <span className="h-px flex-1 bg-line" />
              </div>
            </div>
          ) : null}

          <form action={requestEmailCodeAction} className={isGoogleConfigured() ? "space-y-4" : "mt-5 space-y-4"}>
            <input type="hidden" name="locale" value={locale} />
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                {t(PATIENT_COPY.email, locale)}
              </span>
              <input name="email" type="email" required autoComplete="email" className={field} />
              <span className="mt-1.5 block text-xs text-ink-muted">
                {t(PATIENT_COPY.emailBody, locale)}
              </span>
            </label>
            <button type="submit" className="btn btn-primary w-full">
              {t(PATIENT_COPY.sendCode, locale)}
            </button>
          </form>

          <p className="mt-6 border-t border-line pt-5 text-xs font-bold uppercase tracking-wider text-ink-soft">
            {t(PATIENT_COPY.referenceTab, locale)}
          </p>

          <form action={patientLoginAction} className="mt-3 space-y-4">
            <input type="hidden" name="locale" value={locale} />
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                {t(PATIENT_COPY.reference, locale)}
              </span>
              <input name="reference" required placeholder="SH-" className={field} />
              <span className="mt-1.5 block text-xs text-ink-muted">
                {t(PATIENT_COPY.referenceHint, locale)}
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                {t(PATIENT_COPY.phone, locale)}
              </span>
              <input name="phone" type="tel" required autoComplete="tel" className={field} />
              <span className="mt-1.5 block text-xs text-ink-muted">
                {t(PATIENT_COPY.phoneHint, locale)}
              </span>
            </label>
            <button type="submit" className="btn btn-secondary w-full">
              {t(PATIENT_COPY.signIn, locale)}
            </button>
          </form>
            </>
          )}

          <p className="mt-5 text-sm leading-relaxed text-ink-soft">
            {t(PATIENT_COPY.noReference, locale)}
          </p>
          <Link
            href={`/${locale}#quote-form`}
            className="mt-3 inline-block text-sm font-semibold text-brand hover:underline"
          >
            {t(PORTAL_BACK, locale)}
          </Link>
        </div>
      </main>

      <Footer content={content} locale={locale} />
    </>
  );
}
