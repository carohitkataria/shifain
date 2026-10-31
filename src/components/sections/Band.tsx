import { Icon } from "../Icon";
import { Eyebrow, SectionHeading } from "./Common";
import { t } from "@/lib/localize";
import { OpenChatButton } from "../OpenChatButton";
import { MESSAGE_US } from "../Header";
import { TelegramGlyph } from "../TelegramGlyph";
import { PlanForm } from "./Hero";
import { botLink } from "@/lib/telegram-login";
import type { SiteContent } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";

/** Dark band inviting a report upload — the design's "not sure where to start". */
export function Upload({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { upload } = content;
  return (
    <section id="upload" className="dark-band">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-20">
        <div>
          <Eyebrow tone="light">{t(upload.eyebrow, locale)}</Eyebrow>
          <h2 className="section-title mt-3 !text-white">{t(upload.title, locale)}</h2>
          <p className="mt-3.5 leading-relaxed text-white/75">{t(upload.body, locale)}</p>

          <ul className="mt-6 flex flex-wrap gap-2">
            {upload.formats.map((format) => (
              <li key={format} className="chip bg-white/10 text-white/80">
                {format}
              </li>
            ))}
          </ul>
        </div>

        <a
          href="#quote-form"
          className="flex flex-col items-center justify-center rounded-xl2 border-2 border-dashed border-white/30 px-6 py-12 text-center transition hover:border-white/60 hover:bg-white/5"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 text-white">
            <Icon name="upload" className="h-7 w-7" />
          </span>
          <span className="mt-4 font-bold text-white">{t(upload.dropTitle, locale)}</span>
          <span className="mt-1 text-sm text-white/60">{t(upload.dropNote, locale)}</span>
        </a>
      </div>
    </section>
  );
}

/** The live case tracker: one file, every team, visible progress. */
export function Tracker({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { tracker } = content;
  const current = tracker.steps.find((step) => step.state === "current");

  return (
    <section id="tracker" className="bg-surface-muted">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <SectionHeading
          eyebrow={t(tracker.eyebrow, locale)}
          title={t(tracker.title, locale)}
          body={t(tracker.body, locale)}
        />

        <div className="dark-band mt-11 rounded-xl2 p-6 shadow-xl shadow-ink/10 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 font-extrabold text-white"
              >
                AK
              </span>
              <div>
                <p className="font-extrabold text-white">{t(tracker.patientName, locale)}</p>
                <p className="text-sm text-white/60">{t(tracker.caseMeta, locale)}</p>
              </div>
            </div>

            {current ? (
              <span className="rounded-full bg-saffron px-3.5 py-1.5 text-sm font-bold text-white">
                {t(tracker.currentLabel, locale)}: {t(current.label, locale)}
              </span>
            ) : null}
          </div>

          <ol className="mt-7 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-5 lg:grid-cols-10">
            {tracker.steps.map((step) => (
              <li key={step.id}>
                <span
                  aria-hidden="true"
                  className={`block h-1.5 rounded-full ${
                    step.state === "done"
                      ? "bg-leaf"
                      : step.state === "current"
                        ? "bg-saffron"
                        : "bg-white/20"
                  }`}
                />
                <span
                  className={`mt-2 block text-xs ${
                    step.state === "todo" ? "text-white/45" : "font-semibold text-white"
                  }`}
                >
                  {t(step.label, locale)}
                  {step.state === "done" ? <span aria-hidden="true"> &#10003;</span> : null}
                </span>
                <span className="sr-only">
                  {step.state === "done" ? "completed" : step.state === "current" ? "in progress" : "upcoming"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

const waHref = (value: string) => `https://wa.me/${value.replace(/\D/g, "")}`;

/**
 * The page's close: the plan request is in the hero, so this sends the
 * patient back up to it, with the chat, Telegram and WhatsApp as the other
 * ways in. With the hero switched off, the form is here instead, so links to
 * #quote-form always have somewhere to land.
 */
export async function Closing({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { closing, hero, contact } = content;
  const telegram = await botLink().catch(() => null);
  const formInHero = content.sections.hero?.enabled !== false;
  return (
    <section id="get-started" className="ui-section scroll-mt-20 bg-hero">
      <div className="ui-container flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
        <div className="max-w-2xl">
          <h2 className="ui-h2">{t(closing.title, locale)}</h2>
          <p className="ui-lead">{t(closing.body, locale)}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-3 lg:w-auto lg:justify-end">
          {formInHero ? (
            <a href="#quote-form" className="ui-btn ui-btn-primary w-full sm:w-auto">
              {t(hero.primaryCta, locale)}
            </a>
          ) : null}
          {telegram ? (
            <a
              href={telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full bg-[#229ed9] px-6 text-[15px] font-semibold text-white transition hover:bg-[#1b8bc0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:w-auto"
            >
              <TelegramGlyph className="h-5 w-5" />
              {t(MESSAGE_US, locale)}
            </a>
          ) : null}
          <span className="flex basis-full flex-wrap gap-x-6 gap-y-1 lg:justify-end">
            <OpenChatButton className="ui-link">{t(closing.primaryCta, locale)}</OpenChatButton>
            {contact.whatsapp ? (
              <a href={waHref(contact.whatsapp)} target="_blank" rel="noopener noreferrer" className="ui-link">
                {t(closing.secondaryCta, locale)}
              </a>
            ) : null}
          </span>
        </div>
      </div>
      {formInHero ? null : (
        <div id="quote-form" className="ui-container mt-8 scroll-mt-24">
          <div className="min-w-0 rounded-[1.25rem] bg-white p-5 ring-1 ring-[#e6e3f4] sm:p-8 lg:ml-auto lg:max-w-3xl">
            <PlanForm content={content} locale={locale} />
          </div>
        </div>
      )}
    </section>
  );
}
