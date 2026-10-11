import { Icon } from "../Icon";
import { PlanRequestForm } from "../PlanRequestForm";
import { OpenChatButton } from "../OpenChatButton";
import { WIZARD_COPY } from "@/lib/intake-copy";
import { t } from "@/lib/localize";
import type { SiteContent } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";

export function Hero({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { hero, specialties } = content;

  return (
    <section id="quote" className="bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 lg:py-14">
        <div className="flex min-w-0 flex-col justify-center">
          <h1 className="text-[clamp(2.2rem,1.4rem+3.2vw,3.6rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-ink">
            {t(hero.headline, locale)}{" "}
            <span className="text-brand-deep">{t(hero.headlineAccent, locale)}</span>
          </h1>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#quote-form" className="btn btn-accent">
              {t(hero.primaryCta, locale)}
              <span aria-hidden="true">&rarr;</span>
            </a>
            <OpenChatButton className="btn btn-secondary">{t(hero.secondaryCta, locale)}</OpenChatButton>
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

        <div
          id="quote-form"
          className="min-w-0 scroll-mt-24 rounded-2xl border border-line/70 bg-white p-5 shadow-xl shadow-brand/[0.06] sm:p-7"
        >
          <h2 className="text-xl font-extrabold leading-tight tracking-tight text-ink [text-wrap:balance] sm:text-[1.4rem]">
            {t(hero.form.title, locale)}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{t(WIZARD_COPY.subtitle, locale)}</p>

          <PlanRequestForm
            locale={locale}
            treatments={specialties.items.map((item) => ({ slug: item.slug, title: item.title }))}
            labels={{
              submit: t(hero.form.submit, locale),
              country: t(hero.form.countryLabel, locale),
              countryPlaceholder: t(hero.form.countryPlaceholder, locale),
              phone: t(hero.form.phoneLabel, locale),
              privacy: t(hero.form.privacy, locale),
            }}
          />
        </div>
      </div>
    </section>
  );
}
