import { Icon } from "../Icon";
import { IntakeForm } from "../IntakeForm";
import { t } from "@/lib/localize";
import type { SiteContent } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";

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

          <form
            action="/api/enquiry"
            method="post"
            encType="multipart/form-data"
            className="mt-5 space-y-4"
          >
            <input type="hidden" name="locale" value={locale} />
            <IntakeForm
              locale={locale}
              treatments={specialties.items.map((item) => ({ slug: item.slug, title: item.title }))}
              labels={{
                name: t(hero.form.nameLabel, locale),
                namePlaceholder: t(hero.form.namePlaceholder, locale),
                phone: t(hero.form.phoneLabel, locale),
                phonePlaceholder: t(hero.form.phonePlaceholder, locale),
                country: t(hero.form.countryLabel, locale),
                countryPlaceholder: t(hero.form.countryPlaceholder, locale),
                treatment: t(hero.form.treatmentLabel, locale),
                treatmentPlaceholder: t(hero.form.treatmentPlaceholder, locale),
                reports: t(hero.form.reportsLabel, locale),
                reportsHint: t(hero.form.reportsHint, locale),
                submit: t(hero.form.submit, locale),
                privacy: t(hero.form.privacy, locale),
              }}
            />
          </form>
          </div>
        </div>
      </div>
    </section>
  );
}
