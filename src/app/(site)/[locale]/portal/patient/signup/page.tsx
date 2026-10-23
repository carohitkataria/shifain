import Link from "next/link";
import { redirect } from "next/navigation";
import { AppIcon } from "@/components/patient-app/AppIcon";
import { AuthError, AuthFrame, CodeStep } from "@/components/patient-app/AuthFrame";
import { SignUpFields } from "@/components/patient-app/SignUpFields";
import { currentPatient } from "@/lib/patient-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { APP } from "@/lib/patient-app-copy";
import { LOCALES, LOCALE_META, DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { t } from "@/lib/localize";
import { signUpAction } from "../actions";

export const dynamic = "force-dynamic";

/** Create an account: name, country, phone, email and how to be reached; then a code to the email. */
export default async function PatientSignUpPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ sent?: string; email?: string; dev?: string; error?: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const query = await searchParams;
  if (isDatabaseConfigured() && (await currentPatient().catch(() => null))) redirect(`/${locale}/portal/patient`);
  const email = (query.email ?? "").slice(0, 200);
  const here = `/${locale}/portal/patient/signup`;

  return (
    <AuthFrame locale={locale} tab="up">
      {query.sent && email ? (
        <CodeStep locale={locale} email={email} from="signup" devCode={query.dev} failed={query.error === "code"} back={here} />
      ) : (
        <form action={signUpAction}>
          <input type="hidden" name="locale" value={locale} />
          {query.error ? <AuthError>{t(query.error === "mail" ? APP.errors.mail : APP.errors.details, locale)}</AuthError> : null}
          <div className="a-row">
            <label className="a-field" style={{ flex: 1, marginTop: 0 }}>
              <span>{t(APP.fullName, locale)}</span>
              <input className="a-input" name="firstName" required autoComplete="given-name" placeholder={t(APP.asInPassport, locale)} />
            </label>
            <label className="a-field" style={{ flex: 1, marginTop: 0 }}>
              <span>{t(APP.lastName, locale)}</span>
              <input className="a-input" name="lastName" autoComplete="family-name" />
            </label>
          </div>
          <SignUpFields
            labels={{
              country: t(APP.country, locale),
              choose: t(APP.choose, locale),
              phone: t(APP.phone, locale),
              mobile: t(APP.mobile, locale),
              reachMe: t(APP.reachMeSignup, locale),
              tapToChange: t(APP.tapToChange, locale),
              suggested: t(APP.suggested, locale),
              hintPick: t(APP.channelHintPick, locale),
              hintTelegram: t(APP.channelHintTelegram, locale),
              hintWhatsapp: t(APP.channelHintWhatsapp, locale),
              telegram: t(APP.telegram, locale),
              whatsapp: t(APP.whatsapp, locale),
              call: t(APP.call, locale),
              email: t(APP.email, locale),
            }}
          />
          <label className="a-field">
            <span>{t(APP.email, locale)}</span>
            <input className="a-input" name="email" type="email" required autoComplete="email" defaultValue={email} placeholder="you@example.com" />
          </label>
          <div className="a-field">
            <span>{t(APP.language, locale)}</span>
            <div className="a-seg">
              {LOCALES.map((code) => (
                <Link key={code} href={`/${code}/portal/patient/signup`} aria-current={code === locale ? "page" : undefined}>
                  {LOCALE_META[code].label}
                </Link>
              ))}
            </div>
          </div>
          <label className="a-row a-tiny" style={{ marginTop: 14, alignItems: "flex-start" }}>
            <input type="checkbox" name="agree" value="yes" required style={{ marginTop: 2 }} />
            <span>{t(APP.agree, locale)}</span>
          </label>
          <button className="a-btn a-btn-p a-w" style={{ marginTop: 14 }}>
            {t(APP.createAccount, locale)}
          </button>
          <p className="a-tiny a-muted a-row" style={{ justifyContent: "center", marginTop: 8, gap: 4 }}>
            <AppIcon name="lock" />
            {t(APP.verifiedByCode, locale)}
          </p>
        </form>
      )}
    </AuthFrame>
  );
}
