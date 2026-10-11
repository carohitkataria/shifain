import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LogoMark } from "@/components/Logo";
import { getContent } from "@/lib/store";
import { currentPartner } from "@/lib/partner-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { DOCTOR_COPY } from "@/lib/doctor-copy";
import { PORTAL_BACK } from "@/lib/portal-copy";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { doctorLoginAction } from "../actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint";

export default async function DoctorLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const { error } = await searchParams;
  const content = await getContent();

  if (isDatabaseConfigured()) {
    const signedIn = await currentPartner().catch(() => null);
    if (signedIn?.role === "doctor") redirect(`/${locale}/portal/doctor`);
  }

  return (
    <>
      <Header content={content} locale={locale} path="/portal/doctor/login" />

      <main className="flex min-h-[60vh] items-center justify-center bg-surface-muted px-4 py-16">
        <div className="card w-full max-w-md p-8 shadow-xl shadow-ink/5">
          <LogoMark className="h-14" />
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">
            {t(DOCTOR_COPY.signInTitle, locale)}
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
            {t(DOCTOR_COPY.signInBody, locale)}
          </p>

          {error ? (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
            >
              {t(DOCTOR_COPY.signInFailed, locale)}
            </p>
          ) : null}

          <form action={doctorLoginAction} className="mt-5 space-y-4">
            <input type="hidden" name="locale" value={locale} />
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                {t(DOCTOR_COPY.email, locale)}
              </span>
              <input type="email" name="email" required autoComplete="username" className={field} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
                {t(DOCTOR_COPY.password, locale)}
              </span>
              <input
                type="password"
                name="password"
                required
                autoComplete="current-password"
                className={field}
              />
            </label>
            <button type="submit" className="btn btn-primary w-full">
              {t(DOCTOR_COPY.signIn, locale)}
            </button>
          </form>

          <p className="mt-5 text-sm leading-relaxed text-ink-soft">
            {t(DOCTOR_COPY.noAccount, locale)}{" "}
            <Link
              href={`/${locale}/portal/doctor/apply`}
              className="font-semibold text-brand hover:underline"
            >
              {t(DOCTOR_COPY.applyLink, locale)}
            </Link>
          </p>
          <Link href={`/${locale}`} className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
            {t(PORTAL_BACK, locale)}
          </Link>
        </div>
      </main>

      <Footer content={content} locale={locale} />
    </>
  );
}
