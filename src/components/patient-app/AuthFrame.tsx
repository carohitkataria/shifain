import Link from "next/link";
import { AppIcon } from "./AppIcon";
import { verifyEmailCodeAction } from "@/app/(site)/[locale]/portal/patient/actions";
import { APP } from "@/lib/patient-app-copy";
import { t } from "@/lib/localize";
import type { Locale } from "@/lib/i18n";
import type { L } from "@/lib/content-types";
import { Logo } from "@/components/Logo";

const l = (en: string, ru: string, uz: string): L => ({ en, ru, uz });
const WHY = {
  title: l("Your treatment journey, in one place", "Всё о вашем лечении — в одном месте", "Davolanish safaringiz — bir joyda"),
  points: [
    { icon: "case", text: l("Your plan, dates and documents", "План, даты и документы", "Reja, sanalar va hujjatlar") },
    { icon: "user", text: l("A coordinator who speaks your language", "Координатор, который говорит на вашем языке", "Sizning tilingizda gapiradigan koordinator") },
    { icon: "file", text: l("Reports shared safely with your doctors", "Документы надёжно передаются врачам", "Hujjatlar shifokorlarga xavfsiz yetkaziladi") },
    { icon: "car", text: l("Pickup, stay and translator when you arrive", "Встреча, проживание и переводчик по приезде", "Kutib olish, turar joy va tarjimon") },
  ],
  private: l("Private by design — only you and your care team see your case.", "Конфиденциально — ваш случай видите только вы и ваша команда.", "Maxfiy — holatingizni faqat siz va jamoangiz ko'radi."),
};

/** Sign in and sign up, in the app's phone frame: the mark, the two tabs, the form. */
export function AuthFrame({ locale, tab, children }: { locale: Locale; tab: "in" | "up"; children: React.ReactNode }) {
  return (
    <div className="a-device a-authdev">
      <aside className="a-auth-aside">
        <Link href={`/${locale}`} aria-label="Shifain">
          <Logo tone="dark" compact />
        </Link>
        <div>
          <h2>{t(WHY.title, locale)}</h2>
          <ul>
            {WHY.points.map((point) => (
              <li key={point.icon}>
                <i>
                  <AppIcon name={point.icon} />
                </i>
                {t(point.text, locale)}
              </li>
            ))}
          </ul>
        </div>
        <small>{t(WHY.private, locale)}</small>
      </aside>
      <main className="a-auth">
        <div className="a-logo">
          <i>
            <AppIcon name="heart" />
          </i>
          <div>
            <h1 style={{ fontSize: 20 }}>shifain</h1>
            <small className="a-muted a-tiny">{t(APP.appTagline, locale)}</small>
          </div>
        </div>
        <nav className="a-seg" style={{ marginTop: 24 }} aria-label={t(APP.signIn, locale)}>
          <Link href={`/${locale}/portal/patient/login`} aria-current={tab === "in" ? "page" : undefined}>
            {t(APP.signIn, locale)}
          </Link>
          <Link href={`/${locale}/portal/patient/signup`} aria-current={tab === "up" ? "page" : undefined}>
            {t(APP.createAccount, locale)}
          </Link>
        </nav>
        <div style={{ marginTop: 16 }}>{children}</div>
      </main>
    </div>
  );
}

export function AuthError({ children }: { children: React.ReactNode }) {
  return (
    <p className="a-hint a-alert" role="alert" style={{ marginTop: 0, marginBottom: 12 }}>
      <AppIcon name="alert" />
      <span>{children}</span>
    </p>
  );
}

/** The six-digit code from the inbox, for sign-in and sign-up alike. */
export function CodeStep({ locale, email, from, devCode, failed, back }: { locale: Locale; email: string; from: "login" | "signup"; devCode?: string; failed: boolean; back: string }) {
  // Never in production: there the code only ever travels by email.
  const showDev = process.env.NODE_ENV !== "production" && /^\d{6}$/.test(devCode ?? "");
  return (
    <form action={verifyEmailCodeAction}>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="from" value={from} />
      {failed ? <AuthError>{t(APP.errors.code, locale)}</AuthError> : null}
      <p className="a-tiny a-muted">
        {t(APP.codeSent, locale)} · <b>{email}</b>
      </p>
      {showDev ? (
        <p className="a-hint">
          <AppIcon name="key" />
          <span>
            {t(APP.devCode, locale)}: <b style={{ letterSpacing: 3 }}>{devCode}</b>
          </span>
        </p>
      ) : null}
      <input className="a-input a-otp" name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} autoFocus aria-label="Code" style={{ marginTop: 10 }} />
      <button className="a-btn a-btn-p a-w" style={{ marginTop: 12 }}>
        {t(APP.openAccount, locale)}
      </button>
      <Link href={back} className="a-link" style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
        {t(APP.back, locale)}
      </Link>
    </form>
  );
}
