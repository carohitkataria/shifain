import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getContent } from "@/lib/store";
import { COUNTRIES } from "@/lib/countries";
import { DOCTOR_COPY } from "@/lib/doctor-copy";
import { PORTAL_BACK } from "@/lib/portal-copy";
import { getSettings } from "@/lib/settings";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { applyToPartnerAction } from "../actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft";

export default async function PartnerApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const { sent, error } = await searchParams;

  const [content, settings] = await Promise.all([getContent(), getSettings()]);
  const copy = DOCTOR_COPY.apply;
  const optional = t(copy.optional, locale);

  return (
    <>
      <Header content={content} locale={locale} path="/portal/doctor/apply" />

      <main className="bg-surface-muted px-4 py-14">
        <div className="mx-auto w-full max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t(copy.title, locale)}</h1>
          <p className="mt-2 leading-relaxed text-ink-soft">{t(copy.body, locale)}</p>

          {sent ? (
            <p
              role="status"
              className="mt-6 rounded-lg bg-leaf-tint px-4 py-3 font-semibold leading-relaxed text-leaf"
            >
              {t(copy.thanks, locale)}
            </p>
          ) : null}
          {error === "closed" || !settings.partnerApplicationsOpen ? (
            <p
              role="alert"
              className="mt-6 rounded-lg bg-saffron/15 px-4 py-3 font-semibold leading-relaxed text-ink"
            >
              {t(copy.closed, locale)}
            </p>
          ) : null}
          {error === "missing" ? (
            <p
              role="alert"
              className="mt-6 rounded-lg bg-red-50 px-4 py-3 font-semibold leading-relaxed text-red-700"
            >
              {t(copy.name, locale)} · {t(copy.email, locale)} · {t(copy.country, locale)}
            </p>
          ) : null}

          {settings.partnerApplicationsOpen && !sent ? (
            <form action={applyToPartnerAction} className="card mt-6 grid gap-4 p-6 sm:grid-cols-2">
              <input type="hidden" name="locale" value={locale} />

              <label className="sm:col-span-2">
                <span className={label}>{t(copy.name, locale)}</span>
                <input name="name" required autoComplete="name" className={field} />
              </label>

              <label>
                <span className={label}>{t(copy.email, locale)}</span>
                <input type="email" name="email" required autoComplete="email" className={field} />
              </label>

              <label>
                <span className={label}>
                  {t(copy.phone, locale)} · {optional}
                </span>
                <input type="tel" name="phone" autoComplete="tel" className={field} />
              </label>

              <label>
                <span className={label}>{t(copy.country, locale)}</span>
                <select name="country" required defaultValue="" className={field}>
                  <option value="" disabled>
                    —
                  </option>
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className={label}>
                  {t(copy.city, locale)} · {optional}
                </span>
                <input name="city" className={field} />
              </label>

              <label>
                <span className={label}>
                  {t(copy.clinic, locale)} · {optional}
                </span>
                <input name="clinic" className={field} />
              </label>

              <label>
                <span className={label}>
                  {t(copy.specialty, locale)} · {optional}
                </span>
                <input name="specialty" className={field} />
              </label>

              <label>
                <span className={label}>
                  {t(copy.registration, locale)} · {optional}
                </span>
                <input name="registrationNumber" className={field} />
              </label>

              <label>
                <span className={label}>
                  {t(copy.patientsPerYear, locale)} · {optional}
                </span>
                <input type="number" name="patientsPerYear" min={0} step={1} className={field} />
              </label>

              <label className="sm:col-span-2">
                <span className={label}>
                  {t(copy.note, locale)} · {optional}
                </span>
                <textarea name="note" rows={3} className={field} />
              </label>

              <p className="text-sm leading-relaxed text-ink-soft sm:col-span-2">
                {t(copy.privacy, locale)}
              </p>

              <div className="sm:col-span-2">
                <button type="submit" className="btn btn-primary">
                  {t(copy.submit, locale)}
                </button>
              </div>
            </form>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href={`/${locale}/portal/doctor/login`}
              className="text-sm font-semibold text-brand hover:underline"
            >
              {t(DOCTOR_COPY.signIn, locale)}
            </Link>
            <Link href={`/${locale}`} className="text-sm font-semibold text-brand hover:underline">
              {t(PORTAL_BACK, locale)}
            </Link>
          </div>
        </div>
      </main>

      <Footer content={content} locale={locale} />
    </>
  );
}
