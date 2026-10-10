import { Icon } from "../Icon";
import { IntakeForm } from "../IntakeForm";
import { t } from "@/lib/localize";
import type { SiteContent } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";

export function Hero({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { hero, specialties } = content;

  return (
    <section id="quote" className="bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:py-14">
        <div className="flex flex-col justify-center">
          <h1 className="text-[clamp(2.2rem,1.4rem+3.2vw,3.6rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-ink">
            {t(hero.headline, locale)}{" "}
            <span className="text-brand-deep">{t(hero.headlineAccent, locale)}</span>
          </h1>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#quote-form" className="btn btn-accent">
              {t(hero.primaryCta, locale)}
              <span aria-hidden="true">&rarr;</span>
            </a>
            <a href="#journey" className="btn btn-secondary">
              {t(hero.secondaryCta, locale)}
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
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

        <div id="quote-form" className="scroll-mt-28 rounded-2xl border border-line/60 bg-white p-6 shadow-lg shadow-ink/[0.04] sm:p-7">
          <h2 className="text-xl font-extrabold leading-tight text-ink">{t(hero.form.title, locale)}</h2>

          <form
            action="/api/enquiry"
            method="post"
            encType="multipart/form-data"
            className="mt-4 space-y-4"
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
    </section>
  );
}
