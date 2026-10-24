import Link from "next/link";
import { redirect } from "next/navigation";
import { AppIcon } from "@/components/patient-app/AppIcon";
import { AuthError, AuthFrame, CodeStep } from "@/components/patient-app/AuthFrame";
import { currentPatient } from "@/lib/patient-auth";
import { isGoogleConfigured } from "@/lib/google-auth";
import { botUsername } from "@/lib/telegram-login";
import { TelegramSignIn } from "@/components/patient-app/TelegramSignIn";
import { isDatabaseConfigured } from "@/lib/db";
import { APP } from "@/lib/patient-app-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { patientLoginAction, requestEmailCodeAction } from "../actions";

export const dynamic = "force-dynamic";

type Query = { with?: string; sent?: string; email?: string; dev?: string; error?: string };

/** Sign in: by email code, or with the phone number and case reference given at the start. */
export default async function PatientLoginPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Query> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const query = await searchParams;
  if (isDatabaseConfigured() && (await currentPatient().catch(() => null))) redirect(`/${locale}/portal/patient`);

  const byPhone = query.with === "reference";
  const email = (query.email ?? "").slice(0, 200);
  const here = `/${locale}/portal/patient/login`;
  const google = isGoogleConfigured();
  const telegram = isDatabaseConfigured() && Boolean(await botUsername().catch(() => null));

  return (
    <AuthFrame locale={locale} tab="in">
      {query.sent && email && !byPhone ? (
        <CodeStep locale={locale} email={email} from="login" devCode={query.dev} failed={query.error === "code"} back={here} />
      ) : (
        <>
          {telegram ? (
            <>
              <TelegramSignIn locale={locale} />
              <div className="a-or" aria-hidden="true">
                <span />
                <small className="a-tiny a-muted">{t(APP.or, locale)}</small>
                <span />
              </div>
            </>
          ) : null}
          <div className="a-g3">
            <Link href={here} className={`a-ch ${!byPhone ? "on" : ""}`} aria-current={!byPhone ? "page" : undefined}>
              <AppIcon name="mail" />
              {t(APP.byEmail, locale)}
            </Link>
            <Link href={`${here}?with=reference`} className={`a-ch ${byPhone ? "on" : ""}`} aria-current={byPhone ? "page" : undefined}>
              <AppIcon name="phone" />
              {t(APP.byPhone, locale)}
            </Link>
            <Link href={`${here}?with=reference`} className="a-ch">
              <AppIcon name="case" />
              {t(APP.byRef, locale)}
            </Link>
          </div>
          {query.error && query.error !== "code" ? (
            <div style={{ marginTop: 12 }}>
              <AuthError>{t(query.error === "mail" ? APP.errors.mail : query.error === "email" ? APP.errors.email : query.error === "telegram" ? APP.errors.telegram : APP.errors.reference, locale)}</AuthError>
            </div>
          ) : null}
          {byPhone ? (
            <form action={patientLoginAction}>
              <input type="hidden" name="locale" value={locale} />
              <label className="a-field">
                <span>{t(APP.phoneSignIn, locale)}</span>
                <input className="a-input" name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="+" />
              </label>
              <label className="a-field">
                <span>{t(APP.byRef, locale)}</span>
                <input className="a-input" name="reference" required autoComplete="off" autoCapitalize="characters" placeholder={t(APP.refPlaceholder, locale)} style={{ textTransform: "uppercase", letterSpacing: 1 }} />
              </label>
              <p className="a-tiny a-muted" style={{ marginTop: 6 }}>
                {t(APP.refNeeded, locale)}
              </p>
              <button className="a-btn a-btn-p a-w" style={{ marginTop: 12 }}>
                {t(APP.openAccount, locale)}
              </button>
            </form>
          ) : (
            <form action={requestEmailCodeAction}>
              <input type="hidden" name="locale" value={locale} />
              <label className="a-field">
                <span>{t(APP.byEmail, locale)}</span>
                <input className="a-input" name="email" type="email" required autoComplete="email" defaultValue={email} placeholder="you@example.com" />
              </label>
              <button className="a-btn a-btn-p a-w" style={{ marginTop: 12 }}>
                {t(APP.sendCode, locale)}
              </button>
            </form>
          )}
          {google ? (
            <>
              <div className="a-or" aria-hidden="true">
                <span />
                <small className="a-tiny a-muted">{t(APP.or, locale)}</small>
                <span />
              </div>
              <a href={`/api/auth/google?locale=${locale}`} className="a-btn a-btn-s a-w">
                <AppIcon name="globe" />
                {t(APP.google, locale)}
              </a>
            </>
          ) : null}
        </>
      )}
    </AuthFrame>
  );
}
