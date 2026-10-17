import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PortalIcon } from "@/components/portal/PortalIcon";
import { getContent } from "@/lib/store";
import { currentPatient } from "@/lib/patient-auth";
import { isGoogleConfigured } from "@/lib/google-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { PATIENT_COPY } from "@/lib/patient-copy";
import { LOGIN_COPY, PORTAL_COPY, PORTAL_NAV } from "@/lib/portal-patient-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { patientLoginAction, requestEmailCodeAction } from "../actions";
import { AUTH_FIELD, AUTH_PRIMARY, AuthAlert, EmailCodeForm } from "@/components/portal/EmailCodeForm";

export const dynamic = "force-dynamic";

type Query = { with?: string; sent?: string; email?: string; dev?: string; error?: string };

const FIELD = AUTH_FIELD;
const PRIMARY = AUTH_PRIMARY;

const INSIDE = ["plan", "reports", "schedule", "translator", "history", "help"] as const;

export default async function PatientLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Query>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const query = await searchParams;
  const content = await getContent();

  if (isDatabaseConfigured() && (await currentPatient().catch(() => null))) {
    redirect(`/${locale}/portal/patient`);
  }

  const byReference = query.with === "reference";
  const email = (query.email ?? "").slice(0, 200);
  const codeStep = !byReference && Boolean(query.sent) && Boolean(email);
  const google = isGoogleConfigured();
  const here = `/${locale}/portal/patient/login`;

  return (
    <>
      <Header content={content} locale={locale} path="/portal/patient/login" />

      <main className="hero-field">
        <div className="mx-auto grid max-w-[100rem] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-16 lg:px-12 lg:py-16">
          <section aria-labelledby="login-title" className="order-2 lg:order-1">
            <h1 id="login-title" className="text-[clamp(2rem,1.2rem+2.6vw,3.6rem)] font-extrabold leading-[1.1] tracking-[-0.025em] text-navy [text-wrap:balance]">
              {t(LOGIN_COPY.title, locale)}
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-[#2c3a5e]">{t(LOGIN_COPY.lead, locale)}</p>

            <h2 className="mt-10 text-base font-bold text-navy">{t(LOGIN_COPY.insideTitle, locale)}</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {INSIDE.map((item) => (
                <li key={item} className="flex items-start gap-3 rounded-2xl bg-white/70 p-4">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-violet-soft text-violet">
                    <PortalIcon name={item} />
                  </span>
                  <span>
                    <span className="block font-semibold text-navy">{t(PORTAL_NAV[item], locale)}</span>
                    <span className="mt-0.5 block text-[15px] leading-snug text-[#2c3a5e]">{t(PORTAL_COPY.features[item], locale)}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[15px] text-slate">{t(LOGIN_COPY.languages, locale)}</p>
          </section>

          <section aria-label={t(LOGIN_COPY.cardTitle, locale)} className="order-1 w-full max-w-lg justify-self-center rounded-[2rem] bg-white p-6 ring-1 ring-[#e6e3f4] sm:p-9 lg:order-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-navy">{t(LOGIN_COPY.cardTitle, locale)}</h2>
            <p className="mt-1 text-[15px] text-slate">{t(LOGIN_COPY.cardLead, locale)}</p>

            <div role="tablist" className="mt-6 grid grid-cols-2 gap-1 rounded-full bg-surface-muted p-1">
              {[
                { key: "email", href: here, label: LOGIN_COPY.withEmail, active: !byReference },
                { key: "reference", href: `${here}?with=reference`, label: LOGIN_COPY.withReference, active: byReference },
              ].map((tab) => (
                <Link
                  key={tab.key}
                  href={tab.href}
                  role="tab"
                  aria-selected={tab.active}
                  className={`flex min-h-11 items-center justify-center rounded-full px-3 text-center text-[15px] font-semibold transition ${
                    tab.active ? "bg-white text-navy shadow-sm" : "text-slate hover:text-navy"
                  }`}
                >
                  {t(tab.label, locale)}
                </Link>
              ))}
            </div>

            {query.error && query.error !== "code" ? (
              <div className="mt-5">
                <AuthAlert>
                  {t(
                    query.error === "mail" ? PATIENT_COPY.mailFailed : query.error === "email" ? PATIENT_COPY.emailInvalid : PATIENT_COPY.failed,
                    locale,
                  )}
                </AuthAlert>
              </div>
            ) : null}

            {byReference ? (
              <form action={patientLoginAction} className="mt-6 flex flex-col gap-4">
                <input type="hidden" name="locale" value={locale} />
                <p className="text-[15px] leading-relaxed text-[#2c3a5e]">{t(PATIENT_COPY.signInBody, locale)}</p>
                <label className="flex flex-col gap-1.5 text-[15px] font-semibold text-navy">
                  {t(PATIENT_COPY.reference, locale)}
                  <input name="reference" required autoComplete="off" autoCapitalize="characters" placeholder="SH-XXXX-XXXX-XXXX-XXXX" className={`${FIELD} uppercase tracking-wide`} />
                  <span className="text-sm font-normal text-slate">{t(PATIENT_COPY.referenceHint, locale)}</span>
                </label>
                <label className="flex flex-col gap-1.5 text-[15px] font-semibold text-navy">
                  {t(PATIENT_COPY.phone, locale)}
                  <input name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="+998 90 123 45 67" className={FIELD} />
                  <span className="text-sm font-normal text-slate">{t(PATIENT_COPY.phoneHint, locale)}</span>
                </label>
                <button type="submit" className={PRIMARY}>
                  {t(PATIENT_COPY.signIn, locale)}
                  <PortalIcon name="arrow" />
                </button>
              </form>
            ) : codeStep ? (
              <EmailCodeForm
                locale={locale}
                email={email}
                from="login"
                intro={`${t(LOGIN_COPY.codeSentTo, locale)} ${email}. ${t(PATIENT_COPY.codeSent, locale)}`}
                submit={t(PATIENT_COPY.verify, locale)}
                failed={query.error === "code"}
                devCode={query.dev}
                backHref={here}
                backLabel={t(PATIENT_COPY.useAnother, locale)}
              />
            ) : (
              <div className="mt-6 flex flex-col gap-4">
                {google ? (
                  <>
                    <a
                      href={`/api/auth/google?locale=${locale}`}
                      className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-white font-semibold text-navy ring-1 ring-[#dcd8ee] transition hover:bg-surface-muted"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                        <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.4-.2-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.3-4.7 3.3-7.9z" />
                        <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
                        <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9z" />
                        <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
                      </svg>
                      {t(LOGIN_COPY.google, locale)}
                    </a>
                    <p className="flex items-center gap-3 text-sm text-slate" aria-hidden="true">
                      <span className="h-px flex-1 bg-[#e6e3f4]" />
                      {t(LOGIN_COPY.or, locale)}
                      <span className="h-px flex-1 bg-[#e6e3f4]" />
                    </p>
                  </>
                ) : null}
                <form action={requestEmailCodeAction} className="flex flex-col gap-4">
                  <input type="hidden" name="locale" value={locale} />
                  <label className="flex flex-col gap-1.5 text-[15px] font-semibold text-navy">
                    {t(PATIENT_COPY.email, locale)}
                    <input name="email" type="email" required autoComplete="email" defaultValue={email} placeholder="you@example.com" className={FIELD} />
                    <span className="text-sm font-normal text-slate">{t(PATIENT_COPY.emailBody, locale)}</span>
                  </label>
                  <button type="submit" className={PRIMARY}>
                    {t(PATIENT_COPY.sendCode, locale)}
                    <PortalIcon name="arrow" />
                  </button>
                </form>
              </div>
            )}

            <div className="mt-8 rounded-2xl bg-surface-muted p-4">
              <p className="font-semibold text-navy">{t(LOGIN_COPY.newHere, locale)}</p>
              <p className="mt-1 text-[15px] text-[#2c3a5e]">{t(LOGIN_COPY.newHereBody, locale)}</p>
              <Link
                href={`/${locale}/portal/patient/signup`}
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 font-semibold text-violet ring-1 ring-violet-line transition hover:bg-violet-soft"
              >
                {t(LOGIN_COPY.createAccount, locale)}
                <PortalIcon name="arrow" className="h-4 w-4" />
              </Link>
              <Link href={`/${locale}#quote-form`} className="mt-1 flex min-h-11 items-center text-[15px] font-medium text-slate hover:text-violet hover:underline">
                {t(LOGIN_COPY.orPlan, locale)}
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer content={content} locale={locale} />
    </>
  );
}
