import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DM_Serif_Display } from "next/font/google";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  Cross,
  FolderHeart,
  Hash,
  HeartHandshake,
  KeyRound,
  Languages,
  Mail,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  UserRoundCheck,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { PasswordInput } from "@/components/patient-app/PasswordInput";
import { LoginIdentifier } from "@/components/patient-app/LoginIdentifier";
import { TelegramTile } from "@/components/patient-app/TelegramSignIn";
import { currentPatient } from "@/lib/patient-auth";
import { canSendPhoneCodes } from "@/lib/phone-codes";
import { isDatabaseConfigured } from "@/lib/db";
import { getContent } from "@/lib/store";
import { botUsername } from "@/lib/telegram-login";
import { APP } from "@/lib/patient-app-copy";
import { LOGIN } from "@/lib/patient-login-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import type { L } from "@/lib/content-types";
import {
  passwordLoginAction,
  patientLoginAction,
  requestEmailCodeAction,
  requestPhoneCodeAction,
  verifyEmailCodeAction,
  verifyPhoneCodeAction,
} from "../actions";
import "./login.css";

export const dynamic = "force-dynamic";

// The design's display face. It has no Cyrillic, so Russian and Uzbek (Cyrillic) headings fall back to Georgia.
const serif = DM_Serif_Display({ weight: "400", subsets: ["latin", "latin-ext"], display: "swap", variable: "--pl-serif" });

/** The welcome photo, once it is in public/patient-login; until then the story card stands on its purple wash alone. */
const PHOTO = ["welcome.webp", "welcome.jpg", "welcome.png"].find((name) => fs.existsSync(path.join(process.cwd(), "public", "patient-login", name)));

const BENEFIT_ICON = { user: UserRoundCheck, plan: ClipboardCheck, languages: Languages } as const;

type Query = { with?: string; otp?: string; sent?: string; email?: string; phone?: string; id?: string; ref?: string; dev?: string; error?: string; then?: string; forgot?: string };

/** What the right-hand column shows. */
type View = "password" | "otp-email" | "code-email" | "otp-whatsapp" | "code-whatsapp" | "forgot" | "reference" | "code-reference";

function viewOf(query: Query): View {
  if (query.otp === "whatsapp") return query.sent && query.phone ? "code-whatsapp" : "otp-whatsapp";
  if (query.sent && query.email) return "code-email";
  if (query.otp === "email") return "otp-email";
  if (query.forgot) return "forgot";
  if (query.with === "reference") return query.sent ? "code-reference" : "reference";
  return "password";
}

const ERRORS: Record<string, L> = {
  password: LOGIN.errPassword,
  slow: LOGIN.errSlow,
  phone: LOGIN.errPhone,
  whatsapp: LOGIN.errWhatsApp,
  code: APP.errors.code,
  mail: APP.errors.mail,
  email: APP.errors.email,
  telegram: APP.errors.telegram,
  plan: LOGIN.errPlan,
  fresh: LOGIN.errFresh,
  "1": APP.errors.reference,
};

/**
 * Sign in, as in the Figma design: email or mobile number with a password;
 * or a one-time code by WhatsApp, Telegram or email; or the case reference and
 * mobile number given at the start. "Forgot password?" signs in by a code and
 * ends on Settings to choose a new password.
 */
export default async function PatientLoginPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Query> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const query = await searchParams;
  // A signed-in patient is sent on — unless they are here to verify again for a sensitive action.
  if (query.error !== "fresh" && isDatabaseConfigured() && (await currentPatient().catch(() => null))) redirect(`/${locale}/portal/patient`);

  const here = `/${locale}/portal/patient/login`;
  const view = viewOf(query);
  const reset = query.then === "password" || view === "forgot";
  const thenField = reset ? <input type="hidden" name="then" value="password" /> : null;
  const thenQuery = reset ? "&then=password" : "";
  const email = (query.email ?? "").slice(0, 200);
  const phone = (query.phone ?? "").slice(0, 30);
  const id = (query.id ?? "").slice(0, 200);
  const ref = (query.ref ?? "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);
  const whatsapp = canSendPhoneCodes();
  const telegram = isDatabaseConfigured() && Boolean(await botUsername().catch(() => null));
  const { brand } = await getContent();
  // Never in production: there a code only ever travels by email or WhatsApp.
  const devCode = process.env.NODE_ENV !== "production" && /^\d{6}$/.test(query.dev ?? "") ? query.dev : null;
  const error = query.error ? ERRORS[query.error] ?? APP.errors.reference : null;

  const heading: Record<View, [L, React.ReactNode]> = {
    password: [LOGIN.title, null],
    "otp-email": [reset ? LOGIN.forgotTitle : LOGIN.otpEmailTitle, t(LOGIN.otpEmailLead, locale)],
    "code-email": [
      LOGIN.codeTitle,
      <>
        {t(LOGIN.codeLead, locale)} <b>{email}</b>
      </>,
    ],
    "otp-whatsapp": [reset ? LOGIN.forgotTitle : LOGIN.otpWhatsTitle, t(LOGIN.otpWhatsLead, locale)],
    "code-whatsapp": [
      LOGIN.codeTitleWhats,
      <>
        {t(LOGIN.codeLeadWhats, locale)} <b>{phone}</b>
      </>,
    ],
    forgot: [LOGIN.forgotTitle, t(LOGIN.forgotLead, locale)],
    reference: [LOGIN.refTitle, t(LOGIN.refLead, locale)],
    "code-reference": [LOGIN.caseCodeTitle, t(LOGIN.caseCodeLead, locale)],
  };
  const [title, lead] = heading[view];

  const back = (
    <Link href={here} className="pl-back">
      <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
      {t(LOGIN.back, locale)}
    </Link>
  );

  /**
   * The ways in without a password: a one-time code by WhatsApp, Telegram or
   * email, or the case number. On "Forgot password?" each code ends on
   * Settings, and the case number is left out.
   */
  const tileCount = Number(whatsapp) + Number(telegram) + 1 + Number(!reset);
  const codeTiles = (
    <div className={`pl-tiles ${tileCount === 4 ? "pl-tiles-4" : ""}`}>
      {whatsapp ? (
        <Link href={`${here}?otp=whatsapp${thenQuery}`} className="pl-tile">
          <MessageCircle size={19} strokeWidth={1.75} aria-hidden="true" />
          WhatsApp
        </Link>
      ) : null}
      {telegram ? <TelegramTile locale={locale} reset={reset} className="pl-tile" statusClassName="pl-tile-status" /> : null}
      <Link href={`${here}?otp=email${thenQuery}`} className="pl-tile">
        <Mail size={19} strokeWidth={1.75} aria-hidden="true" />
        {t(LOGIN.byEmail, locale)}
      </Link>
      {reset ? null : (
        <Link href={`${here}?with=reference`} className="pl-tile">
          <FolderHeart size={19} strokeWidth={1.75} aria-hidden="true" />
          {t(LOGIN.caseTile, locale)}
        </Link>
      )}
    </div>
  );

  const codeForm = (action: (formData: FormData) => Promise<void>, hidden: React.ReactNode, again: string) => (
    <form action={action} className="pl-form">
      <input type="hidden" name="locale" value={locale} />
      {hidden}
      {thenField}
      {devCode ? (
        <p className="pl-dev">
          {t(APP.devCode, locale)}: <b>{devCode}</b>
        </p>
      ) : null}
      <label className="pl-field">
        <span className="pl-label">{t(LOGIN.code, locale)}</span>
        <span className="pl-input">
          <KeyRound size={18} strokeWidth={1.75} aria-hidden="true" />
          <input name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} autoFocus placeholder="••••••" className="pl-otp" />
        </span>
      </label>
      <button className="pl-primary">
        {t(LOGIN.verify, locale)}
        <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
      </button>
      <div className="pl-row-links">
        {back}
        <Link href={again} className="pl-text-link">
          {t(LOGIN.sendAgain, locale)}
        </Link>
      </div>
    </form>
  );

  return (
    <div className={`pl ${serif.variable}`}>
      <header className="pl-nav">
        <Link href={`/${locale}`} className="pl-brand" aria-label="Shifain">
          {/* The strapline is part of the logo: the same words as the site header. */}
          <Logo compact tagline={t(brand.wordmarkTagline, locale)} />
        </Link>
        {/* Talking to the team is the floating "Need help?" button, as on the rest of the site. */}
        <LanguageSwitcher locale={locale} path="/portal/patient/login" />
      </header>

      <div className="pl-main">
        <section className="pl-story-card" aria-label={t(LOGIN.promise, locale)}>
          <div className="pl-story">
            {PHOTO ? <Image src={`/patient-login/${PHOTO}`} alt="" fill priority sizes="(min-width: 900px) 624px, 100vw" className="pl-photo" /> : null}
            <div className={`pl-scrim ${PHOTO ? "" : "pl-scrim-solid"}`} aria-hidden="true" />
            <span className="pl-promise">
              <HeartHandshake size={16} strokeWidth={1.75} aria-hidden="true" />
              {t(LOGIN.promise, locale)}
            </span>
            <div className="pl-editorial">
              <h2 className="pl-story-title">
                {LOGIN.storyTitle.map((line) => (
                  <span key={line.en}>{t(line, locale)}</span>
                ))}
              </h2>
              <p className="pl-story-body">{t(LOGIN.storyBody, locale)}</p>
            </div>
          </div>
          <div className="pl-journey">
            <p className="pl-caps">{t(LOGIN.journey, locale)}</p>
            <ul className="pl-benefits">
              {LOGIN.benefits.map((benefit) => {
                const Icon = BENEFIT_ICON[benefit.icon as keyof typeof BENEFIT_ICON];
                return (
                  <li key={benefit.icon}>
                    <b>
                      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                      {t(benefit.title, locale)}
                    </b>
                    <span>{t(benefit.body, locale)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <main className="pl-login" id="main">
          <div className="pl-welcome">
            <p className="pl-eyebrow">{t(LOGIN.eyebrow, locale)}</p>
            <h1 className="pl-title">{t(title, locale)}</h1>
            {lead ? <p className="pl-lead">{lead}</p> : null}
          </div>

          {error ? (
            <p className="pl-alert" role="alert">
              <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
              {t(error, locale)}
            </p>
          ) : null}

          {view === "password" ? (
            <>
              <form action={passwordLoginAction} className="pl-form">
                <input type="hidden" name="locale" value={locale} />
                <LoginIdentifier
                  locale={locale}
                  initial={id}
                  labels={{
                    email: t(LOGIN.byEmail, locale),
                    mobile: t(LOGIN.byMobile, locale),
                    emailLabel: t(LOGIN.email, locale),
                    mobileLabel: t(LOGIN.byMobile, locale),
                    code: t(LOGIN.countryCode, locale),
                    number: t(LOGIN.mobileNumber, locale),
                  }}
                />
                <div className="pl-field">
                  <div className="pl-label-row">
                    <label htmlFor="pl-password" className="pl-label">
                      {t(LOGIN.password, locale)}
                    </label>
                    <Link href={`${here}?forgot=1`} className="pl-forgot">
                      {t(LOGIN.forgot, locale)}
                    </Link>
                  </div>
                  <PasswordInput show={t(LOGIN.showPassword, locale)} hide={t(LOGIN.hidePassword, locale)} placeholder={t(LOGIN.passwordPlaceholder, locale)} />
                </div>
                <label className="pl-check">
                  <input type="checkbox" name="remember" value="yes" />
                  <span>{t(LOGIN.remember, locale)}</span>
                </label>
                <button className="pl-primary">
                  {t(LOGIN.login, locale)}
                  <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
                </button>
              </form>

              <div className="pl-alt">
                <div className="pl-divider">
                  <span />
                  <small>{t(LOGIN.otpDivider, locale)}</small>
                  <span />
                </div>
                {codeTiles}
              </div>
            </>
          ) : null}

          {view === "forgot" ? (
            <div className="pl-alt">
              {codeTiles}
              <p className="pl-note">{t(LOGIN.otpNote, locale)}</p>
              {back}
            </div>
          ) : null}

          {view === "otp-email" ? (
            <form action={requestEmailCodeAction} className="pl-form">
              <input type="hidden" name="locale" value={locale} />
              {thenField}
              <label className="pl-field">
                <span className="pl-label">{t(LOGIN.email, locale)}</span>
                <span className="pl-input">
                  <Mail size={18} strokeWidth={1.75} aria-hidden="true" />
                  <input name="email" type="email" required autoComplete="email" autoFocus defaultValue={email} placeholder="you@example.com" />
                </span>
              </label>
              <button className="pl-primary">
                {t(LOGIN.sendCode, locale)}
                <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
              </button>
              {back}
            </form>
          ) : null}

          {view === "code-email"
            ? codeForm(
                verifyEmailCodeAction,
                <>
                  <input type="hidden" name="email" value={email} />
                  <input type="hidden" name="from" value="login" />
                </>,
                `${here}?otp=email${thenQuery}`,
              )
            : null}

          {view === "otp-whatsapp" ? (
            <form action={requestPhoneCodeAction} className="pl-form">
              <input type="hidden" name="locale" value={locale} />
              {thenField}
              <label className="pl-field">
                <span className="pl-label">{t(LOGIN.byMobile, locale)}</span>
                <span className="pl-input">
                  <Smartphone size={18} strokeWidth={1.75} aria-hidden="true" />
                  <input name="phone" type="tel" inputMode="tel" required autoComplete="tel" autoFocus defaultValue={phone} placeholder={t(LOGIN.mobilePlaceholder, locale)} />
                </span>
              </label>
              <button className="pl-primary">
                {t(LOGIN.sendWhats, locale)}
                <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
              </button>
              {back}
            </form>
          ) : null}

          {view === "code-whatsapp" ? codeForm(verifyPhoneCodeAction, <input type="hidden" name="phone" value={phone} />, `${here}?otp=whatsapp${thenQuery}`) : null}

          {view === "code-reference" ? codeForm(patientLoginAction, <input type="hidden" name="reference" value={ref} />, `${here}?with=reference&ref=${encodeURIComponent(ref)}`) : null}

          {view === "reference" ? (
            <form action={patientLoginAction} className="pl-form">
              <input type="hidden" name="locale" value={locale} />
              <label className="pl-field">
                <span className="pl-label">{t(LOGIN.reference, locale)}</span>
                <span className="pl-input">
                  <Hash size={18} strokeWidth={1.75} aria-hidden="true" />
                  <input name="reference" required autoComplete="off" autoCapitalize="characters" defaultValue={ref} autoFocus={!ref} placeholder={t(LOGIN.referencePlaceholder, locale)} className="pl-upper" />
                </span>
              </label>
              <label className="pl-field">
                <span className="pl-label">{t(LOGIN.mobile, locale)}</span>
                <span className="pl-input">
                  <Smartphone size={18} strokeWidth={1.75} aria-hidden="true" />
                  <input name="phone" required type="tel" inputMode="tel" autoComplete="tel" autoFocus={Boolean(ref)} placeholder={t(LOGIN.mobilePlaceholder, locale)} />
                </span>
              </label>
              <button className="pl-primary">
                {t(LOGIN.verify, locale)}
                <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
              </button>
              {back}
            </form>
          ) : null}

          <div className="pl-account">
            <p>
              {t(LOGIN.newHere, locale)}{" "}
              <Link href={`/${locale}/portal/patient/signup`} className="pl-text-link">
                {t(LOGIN.signUp, locale)}
              </Link>
            </p>
            <p className="pl-privacy">
              <ShieldCheck size={15} strokeWidth={1.75} aria-hidden="true" />
              <span>{t(LOGIN.privacy, locale)}</span>
            </p>
          </div>
        </main>
      </div>

      <footer className="pl-footer">
        <p>
          <Cross size={12} strokeWidth={2} aria-hidden="true" className="pl-foot-mark" />
          {t(LOGIN.footer, locale)}
        </p>
        <nav aria-label="Shifain">
          <Link href={`/${locale}/faq`}>{t(LOGIN.faq, locale)}</Link>
          <Link href={`/${locale}`}>{t(LOGIN.home, locale)}</Link>
        </nav>
      </footer>
    </div>
  );
}
