import { Icon } from "../Icon";
import { Eyebrow, SectionHeading } from "./Common";
import { t } from "@/lib/localize";
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

/** Closing call to action, as a full-width dark band. */
export function Closing({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { closing } = content;
  return (
    <section className="dark-band">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h2 className="section-title !text-white">{t(closing.title, locale)}</h2>
        <p className="mt-4 text-lg leading-relaxed text-white/75">{t(closing.body, locale)}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="#quote-form" className="btn btn-accent">
            {t(closing.primaryCta, locale)}
          </a>
          <a
            href="#quote-form"
            className="btn border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
          >
            {t(closing.secondaryCta, locale)}
          </a>
        </div>
      </div>
    </section>
  );
}
