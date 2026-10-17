import Link from "next/link";
import { PortalIcon } from "./PortalIcon";
import { verifyEmailCodeAction } from "@/app/(site)/[locale]/portal/patient/actions";
import { PATIENT_COPY } from "@/lib/patient-copy";
import { t } from "@/lib/localize";
import type { Locale } from "@/lib/i18n";

export const AUTH_FIELD =
  "min-h-12 w-full rounded-2xl border border-[#dcd8ee] bg-white px-4 text-[16px] text-navy placeholder:text-[#8b93ad] focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet-soft";
export const AUTH_PRIMARY =
  "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-violet px-6 font-semibold text-white transition hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

export function AuthAlert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-2xl bg-[#fdecec] px-4 py-3 text-[15px] font-medium text-[#8f1d1d]">
      {children}
    </p>
  );
}

/** The second step of email sign-in and sign-up: the six-digit code from the inbox. */
export function EmailCodeForm({
  locale,
  email,
  from,
  intro,
  submit,
  failed,
  devCode,
  backHref,
  backLabel,
}: {
  locale: Locale;
  email: string;
  from: "login" | "signup";
  intro: React.ReactNode;
  submit: string;
  failed: boolean;
  devCode?: string;
  backHref: string;
  backLabel: string;
}) {
  // Never in production: there the code only ever travels by email.
  const showDev = process.env.NODE_ENV !== "production" && /^\d{6}$/.test(devCode ?? "");
  return (
    <form action={verifyEmailCodeAction} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="from" value={from} />
      <p className="text-[15px] leading-relaxed text-[#2c3a5e]">{intro}</p>
      {showDev ? (
        <p className="rounded-2xl border border-dashed border-violet-line px-4 py-3 text-sm text-slate">
          {t(PATIENT_COPY.devCode, locale)} <strong className="tracking-widest text-navy">{devCode}</strong>
        </p>
      ) : null}
      {failed ? <AuthAlert>{t(PATIENT_COPY.codeFailed, locale)}</AuthAlert> : null}
      <label className="flex flex-col gap-1.5 text-[15px] font-semibold text-navy">
        {t(PATIENT_COPY.code, locale)}
        <input
          name="code"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          autoFocus
          className={`${AUTH_FIELD} text-center text-2xl font-bold tracking-[0.4em]`}
        />
      </label>
      <button type="submit" className={AUTH_PRIMARY}>
        {submit}
        <PortalIcon name="arrow" />
      </button>
      <Link href={backHref} className="min-h-11 self-center pt-2 text-[15px] font-semibold text-violet hover:underline">
        {backLabel}
      </Link>
    </form>
  );
}
