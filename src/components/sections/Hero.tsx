import { Icon } from "../Icon";
import { COUNTRIES } from "@/lib/countries";
import { t } from "@/lib/localize";
import type { SiteContent } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft">
        {label}
      </label>
      {children}
    </div>
  );
}

export function Hero({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { hero, specialties } = content;

  return (
    <section id="quote" className="relative overflow-hidden bg-surface-muted">
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand-tint blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -left-32 h-[30rem] w-[30rem] rounded-full bg-[#efe9fd] blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 lg:py-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-deep">
            <Icon name="spark" className="h-4 w-4" />
            {t(hero.eyebrow, locale)}
          </p>

          <h1 className="mt-5 text-[clamp(2rem,1.3rem+2.6vw,3.1rem)] font-extrabold leading-[1.08] tracking-[-0.025em] text-ink">
            {t(hero.headline, locale)} <span className="text-brand-deep">{t(hero.headlineAccent, locale)}</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">{t(hero.body, locale)}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#quote-form" className="btn btn-accent">
              {t(hero.primaryCta, locale)}
              <span aria-hidden="true">&rarr;</span>
            </a>
            <a href="#journey" className="btn btn-secondary">
              {t(hero.secondaryCta, locale)}
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            {hero.badges.map((badge) => (
              <li key={badge.id} className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-leaf-tint text-leaf">
                  <Icon name="check" className="h-3.5 w-3.5" />
                </span>
                {t(badge.label, locale)}
              </li>
            ))}
          </ul>
        </div>

        <div id="quote-form" className="card scroll-mt-28 overflow-hidden p-0 shadow-xl shadow-ink/5">
          <div className="tricolour-rule" />
          <div className="p-6 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-brand-tint text-brand-deep">
              <Icon name="spark" className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold leading-tight text-ink">{t(hero.form.title, locale)}</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">{t(hero.form.subtitle, locale)}</p>
            </div>
          </div>

          <p className="mt-4 flex items-center gap-2 rounded-lg bg-leaf-tint px-3 py-2 text-xs font-bold text-leaf">
            <Icon name="check" className="h-4 w-4" />
            {t(hero.form.freeNote, locale)}
          </p>

          <form action="/api/enquiry" method="post" encType="multipart/form-data" className="mt-5 space-y-4">
            <input type="hidden" name="locale" value={locale} />

            <Field label={t(hero.form.nameLabel, locale)} htmlFor="name">
              <input id="name" name="name" required autoComplete="name" placeholder={t(hero.form.namePlaceholder, locale)} className={inputClass} />
            </Field>

            <Field label={t(hero.form.phoneLabel, locale)} htmlFor="phone">
              <input id="phone" name="phone" type="tel" required autoComplete="tel" placeholder={t(hero.form.phonePlaceholder, locale)} className={inputClass} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t(hero.form.countryLabel, locale)} htmlFor="country">
                <select id="country" name="country" required defaultValue="" className={inputClass}>
                  <option value="" disabled>
                    {t(hero.form.countryPlaceholder, locale)}
                  </option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                  <option value="other">Other</option>
                </select>
              </Field>

              <Field label={t(hero.form.treatmentLabel, locale)} htmlFor="treatment">
                <select id="treatment" name="treatment" required defaultValue="" className={inputClass}>
                  <option value="" disabled>
                    {t(hero.form.treatmentPlaceholder, locale)}
                  </option>
                  {specialties.items.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {t(item.title, locale)}
                    </option>
                  ))}
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>

            <Field label={t(hero.form.reportsLabel, locale)} htmlFor="reports">
              <input
                id="reports"
                name="reports"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                className="block w-full cursor-pointer rounded-lg border border-dashed border-brand/40 bg-brand-tint/40 px-3 py-3 text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-brand-deep file:px-3.5 file:py-1.5 file:text-xs file:font-bold file:text-white"
              />
              <p className="mt-1.5 text-xs text-ink-muted">{t(hero.form.reportsHint, locale)}</p>
            </Field>

            <button type="submit" className="btn btn-primary w-full">
              {t(hero.form.submit, locale)}
              <span aria-hidden="true">&rarr;</span>
            </button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-ink-muted">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
                <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
              </svg>
              {t(hero.form.privacy, locale)}
            </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
