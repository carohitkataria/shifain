import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PortalIcon } from "@/components/portal/PortalIcon";
import { AUTH_FIELD, AUTH_PRIMARY, AuthAlert, EmailCodeForm } from "@/components/portal/EmailCodeForm";
import { CountryPhoneFields } from "@/components/portal/CountryPhoneFields";
import { getContent } from "@/lib/store";
import { currentPatient } from "@/lib/patient-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { PATIENT_COPY } from "@/lib/patient-copy";
import { LOGIN_COPY, PORTAL_COPY, PORTAL_NAV, SIGNUP_COPY } from "@/lib/portal-patient-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { signUpAction } from "../actions";

export const dynamic = "force-dynamic";

type Query = { sent?: string; email?: string; dev?: string; error?: string };

const INSIDE = ["plan", "reports", "schedule", "translator", "history", "help"] as const;

export default async function PatientSignUpPage({
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

  const email = (query.email ?? "").slice(0, 200);
  const codeStep = Boolean(query.sent) && Boolean(email);
  const here = `/${locale}/portal/patient/signup`;
  const label = "flex flex-col gap-1.5 text-[15px] font-semibold text-navy";

  return (
    <>
      <Header content={content} locale={locale} path="/portal/patient/signup" />

      <main className="hero-field">
        <div className="mx-auto grid max-w-[100rem] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-16 lg:px-12 lg:py-16">
          <section aria-labelledby="signup-title" className="order-2 lg:order-1">
            <h1 id="signup-title" className="text-[clamp(2rem,1.2rem+2.6vw,3.6rem)] font-extrabold leading-[1.1] tracking-[-0.025em] text-navy [text-wrap:balance]">
              {t(SIGNUP_COPY.title, locale)}
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-[#2c3a5e]">{t(SIGNUP_COPY.lead, locale)}</p>

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
          </section>

          <section aria-label={t(SIGNUP_COPY.cardTitle, locale)} className="order-1 w-full max-w-lg justify-self-center rounded-[2rem] bg-white p-6 ring-1 ring-[#e6e3f4] sm:p-9 lg:order-2">
            <h2 className="text-2xl font-extrabold tracking-tight text-navy">{t(SIGNUP_COPY.cardTitle, locale)}</h2>
            <p className="mt-1 text-[15px] text-slate">{t(SIGNUP_COPY.cardLead, locale)}</p>

            {query.error === "details" || query.error === "mail" ? (
              <div className="mt-5">
                <AuthAlert>{t(query.error === "mail" ? PATIENT_COPY.mailFailed : SIGNUP_COPY.detailsError, locale)}</AuthAlert>
              </div>
            ) : null}

            {codeStep ? (
              <EmailCodeForm
                locale={locale}
                email={email}
                from="signup"
                intro={
                  <>
                    {t(SIGNUP_COPY.codeSent, locale)} <strong className="break-all text-navy">{email}</strong>. {t(SIGNUP_COPY.codeNote, locale)}
                  </>
                }
                submit={t(SIGNUP_COPY.verify, locale)}
                failed={query.error === "code"}
                devCode={query.dev}
                backHref={here}
                backLabel={t(SIGNUP_COPY.startOver, locale)}
              />
            ) : (
              <form action={signUpAction} className="mt-6 flex flex-col gap-4">
                <input type="hidden" name="locale" value={locale} />
                <div className="grid grid-cols-2 gap-3">
                  <label className={label}>
                    {t(SIGNUP_COPY.firstName, locale)}
                    <input name="firstName" required autoComplete="given-name" className={AUTH_FIELD} />
                  </label>
                  <label className={label}>
                    {t(SIGNUP_COPY.lastName, locale)}
                    <input name="lastName" autoComplete="family-name" className={AUTH_FIELD} />
                  </label>
                </div>
                <CountryPhoneFields
                  fieldClass={AUTH_FIELD}
                  labels={{
                    country: t(SIGNUP_COPY.country, locale),
                    countryPick: t(SIGNUP_COPY.countryPick, locale),
                    phone: t(SIGNUP_COPY.phone, locale),
                    dial: t(SIGNUP_COPY.dial, locale),
                  }}
                />
                <label className={label}>
                  {t(SIGNUP_COPY.email, locale)}
                  <input name="email" type="email" required autoComplete="email" inputMode="email" defaultValue={email} placeholder="you@example.com" className={AUTH_FIELD} />
                  <span className="text-sm font-normal text-slate">{t(SIGNUP_COPY.emailHint, locale)}</span>
                </label>
                <label className="flex items-start gap-3 text-sm leading-relaxed text-[#2c3a5e]">
                  <input type="checkbox" name="agree" value="yes" required className="mt-0.5 h-5 w-5 flex-none accent-[#722be4]" />
                  {t(SIGNUP_COPY.agree, locale)}
                </label>
                <button type="submit" className={AUTH_PRIMARY}>
                  {t(SIGNUP_COPY.submit, locale)}
                  <PortalIcon name="arrow" />
                </button>
              </form>
            )}

            <p className="mt-8 rounded-2xl bg-surface-muted p-4 text-[15px] text-[#2c3a5e]">
              {t(LOGIN_COPY.haveAccount, locale)}{" "}
              <Link href={`/${locale}/portal/patient/login`} className="font-semibold text-violet hover:underline">
                {t(LOGIN_COPY.signInLink, locale)}
              </Link>
            </p>
          </section>
        </div>
      </main>

      <Footer content={content} locale={locale} />
    </>
  );
}
