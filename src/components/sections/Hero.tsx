import Image from "next/image";
import Link from "next/link";
import { OpenChatButton } from "../OpenChatButton";
import { PlanRequestForm } from "../PlanRequestForm";
import { t } from "@/lib/localize";
import type { SiteContent } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";

type IconProps = { className?: string };

const svg = (className: string | undefined, children: React.ReactNode, strokeWidth = 1.8) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const GlobeCheck = ({ className }: IconProps) =>
  svg(
    className,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 9h17M3.5 15h17M12 3c2.3 2.4 3.4 5.4 3.4 9s-1.1 6.6-3.4 9c-2.3-2.4-3.4-5.4-3.4-9S9.7 5.4 12 3z" />
    </>,
  );
const ChatBubble = ({ className }: IconProps) =>
  svg(
    className,
    <>
      <path d="M12 3.5c5 0 8.5 3.4 8.5 7.6s-3.5 7.6-8.5 7.6c-1 0-2-.1-2.9-.4L4.5 20l1.2-3.7c-1.4-1.4-2.2-3.2-2.2-5.2 0-4.2 3.5-7.6 8.5-7.6z" />
      <path d="M8.5 12.6c.9 1.1 2.1 1.7 3.5 1.7s2.6-.6 3.5-1.7" />
    </>,
    2,
  );
const Arrow = ({ className }: IconProps) => svg(className, <path d="M5 12h14M13 6l6 6-6 6" />, 2.2);
const Mic = ({ className }: IconProps) =>
  svg(
    className,
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </>,
  );
const User = ({ className }: IconProps) =>
  svg(
    className,
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1.2-3.8 4.2-5.8 7.5-5.8s6.3 2 7.5 5.8" />
    </>,
  );
const ShieldCheck = ({ className }: IconProps) =>
  svg(
    className,
    <>
      <path d="M12 2.8 4.5 5.8v5.6c0 4.6 3.1 8.4 7.5 9.8 4.4-1.4 7.5-5.2 7.5-9.8V5.8z" />
      <path d="m8.6 12 2.4 2.4 4.6-4.8" />
    </>,
    2,
  );
const Plane = ({ className }: IconProps) =>
  svg(
    className,
    <path d="M21 4.2c-.6-.6-1.7-.6-2.5.1L14.7 8 5.8 5.4 4 7.2l7.2 4.2-3.5 3.6-2.6-.4-1.4 1.4 3.4 1.9 1.9 3.4 1.4-1.4-.4-2.6 3.6-3.5 4.2 7.2 1.8-1.8-2.6-8.9 3.7-3.8c.7-.8.7-1.9.1-2.5z" />,
  );
const Heart = ({ className }: IconProps) =>
  svg(className, <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z" />, 2);
const People = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="7.5" r="3.2" />
    <circle cx="5.6" cy="9" r="2.4" />
    <circle cx="18.4" cy="9" r="2.4" />
    <path d="M12 12c3.4 0 5.6 2.1 5.9 6H6.1c.3-3.9 2.5-6 5.9-6zM5.4 12.6c.7 0 1.3.1 1.9.4-1.2 1.2-1.9 2.9-2.1 5H1.6c.2-3.3 1.6-5.4 3.8-5.4zm13.2 0c2.2 0 3.6 2.1 3.8 5.4h-3.6c-.2-2.1-.9-3.8-2.1-5 .6-.3 1.2-.4 1.9-.4z" />
  </svg>
);
const Globe = ({ className }: IconProps) =>
  svg(
    className,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
    </>,
  );
const HeartFilled = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12 21s-8.5-5.1-8.5-11.4A4.8 4.8 0 0 1 12 6.8a4.8 4.8 0 0 1 8.5 2.8C20.5 15.9 12 21 12 21z" />
  </svg>
);

/** Icons for the three promises under the buttons, in order. */
const TRUST = [
  { Icon: ShieldCheck, colour: "text-leaf" },
  { Icon: Plane, colour: "text-[#2f6fe0]" },
  { Icon: Heart, colour: "text-violet" },
];
/** Icons for the band under the hero, in order. */
const VALUES = [
  { Icon: People, colour: "text-violet" },
  { Icon: Globe, colour: "text-slate" },
  { Icon: HeartFilled, colour: "text-violet" },
];

/** The plan request, as the hero shows it — or the closing section, when the hero is switched off. */
export function PlanForm({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { hero, specialties } = content;
  return (
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
  );
}

export function Hero({ content, locale }: { content: SiteContent; locale: Locale }) {
  const { hero, closing } = content;

  return (
    <>
      <section id="quote" aria-labelledby="hero-title" className="hero-field relative overflow-hidden">
        {/* The journey picture sits behind everything, faint, so the words and the form read first. */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[62%]" aria-hidden="true">
          <Image
            src="/home/hero-journey.webp"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 62vw, 100vw"
            className="hero-backdrop object-cover object-[70%_30%] opacity-[0.16] lg:opacity-[0.24]"
          />
        </div>
        <div className="relative mx-auto max-w-[100rem] px-4 sm:px-6 lg:px-12">
          <div className="grid items-center gap-x-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] 2xl:gap-x-20">
            <div className="relative z-10 min-w-0 pb-6 pt-6 sm:pt-10 lg:pb-8 lg:pt-10">
              {/* The badge shows only when the content sets one. */}
              {t(hero.eyebrow, locale) ? (
                <p
                  className="hero-rise mb-6 hidden max-w-full items-center gap-2 rounded-full border border-violet-line bg-violet-soft px-4 py-2 text-sm font-medium text-violet sm:inline-flex sm:text-[15px]"
                  style={{ "--i": 0 } as React.CSSProperties}
                >
                  <GlobeCheck className="h-5 w-5 flex-none" />
                  <span>{t(hero.eyebrow, locale)}</span>
                </p>
              ) : null}

              <h1
                id="hero-title"
                className="hero-rise mt-0 text-[clamp(2.1rem,0.55rem+3.45vw,4.15rem)] font-extrabold leading-[1.13] tracking-[-0.025em] text-navy [text-wrap:balance]"
                style={{ "--i": 1 } as React.CSSProperties}
              >
                {t(hero.headline, locale).replace(/ ([—–])/g, "\u00a0$1")}
                {t(hero.headlineAccent, locale) ? <span className="text-violet"> {t(hero.headlineAccent, locale)}</span> : null}
              </h1>

              <p
                className="hero-rise mt-5 max-w-[43rem] text-[clamp(1.05rem,0.92rem+0.45vw,1.4rem)] leading-[1.5] text-[#2c3a5e]"
                style={{ "--i": 2 } as React.CSSProperties}
              >
                {t(hero.body, locale)}
              </p>

              <div className="hero-rise mt-8 max-w-[43rem]" style={{ "--i": 3 } as React.CSSProperties}>
                <OpenChatButton className="hero-chat-card group flex w-full items-center gap-4 rounded-full border-2 border-violet-line bg-white p-2.5 pr-3 text-left transition hover:border-violet/50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand sm:gap-5 sm:p-3 sm:pr-4">
                  <span className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-violet-soft text-violet sm:h-[4.5rem] sm:w-[4.5rem]">
                    <ChatBubble className="h-7 w-7 sm:h-9 sm:w-9" />
                  </span>
                  <span className="min-w-0 flex-1 border-l border-violet-line/80 pl-4 sm:pl-5">
                    <span className="block text-lg font-bold text-navy sm:text-[1.4rem]">{t(hero.chatTitle, locale)}</span>
                    <span className="mt-0.5 block text-sm leading-snug text-slate sm:text-base">{t(hero.chatBody, locale)}</span>
                  </span>
                  <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-violet text-white transition group-hover:translate-x-0.5 sm:h-14 sm:w-14">
                    <Arrow className="h-6 w-6" />
                  </span>
                </OpenChatButton>

                <div className="my-4 flex items-center gap-4 px-8 sm:px-16" aria-hidden="true">
                  <span className="h-px flex-1 bg-[#d9dcec]" />
                  <span className="text-lg font-medium text-navy">{t(hero.orLabel, locale)}</span>
                  <span className="h-px flex-1 bg-[#d9dcec]" />
                </div>

                <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-0">
                  <OpenChatButton
                    voice
                    className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full border border-[#e3e1f1] bg-white/80 px-5 py-2 text-center text-[15px] leading-tight font-medium text-navy transition hover:border-violet/40 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:flex-1 sm:text-base"
                  >
                    <Mic className="h-5 w-5 text-violet" />
                    {t(hero.voiceCta, locale)}
                    <span className="rounded-full bg-violet-soft px-2.5 py-0.5 text-sm font-semibold text-violet">
                      {t(hero.voiceBadge, locale)}
                    </span>
                  </OpenChatButton>
                  <span className="mx-5 hidden h-9 w-px bg-[#d9dcec] sm:block" aria-hidden="true" />
                  <Link
                    href={`/${locale}/portal/patient`}
                    className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full border border-[#e3e1f1] bg-white/80 px-5 py-2 text-center text-[15px] leading-tight font-medium text-navy transition hover:border-violet/40 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:flex-1 sm:text-base"
                  >
                    <User className="h-5 w-5 text-violet" />
                    {t(hero.loginCta, locale)}
                  </Link>
                </div>
              </div>

              <ul
                className="hero-rise mt-9 hidden max-w-[43rem] grid-cols-3 sm:grid"
                style={{ "--i": 4 } as React.CSSProperties}
              >
                {hero.badges.slice(0, 3).map((badge, index) => {
                  const { Icon, colour } = TRUST[index] ?? TRUST[0];
                  return (
                    <li
                      key={badge.id}
                      className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-3 sm:border-l sm:border-[#d9dcec] sm:px-3 sm:first:justify-start sm:first:border-l-0 sm:first:pl-0"
                    >
                      <Icon className={`h-7 w-7 flex-none sm:h-9 sm:w-9 ${colour}`} />
                      <span className="text-sm font-medium leading-snug text-navy sm:text-base">{t(badge.label, locale)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* The plan request, where the picture used to be: the page's one form, so links to #quote-form land here. */}
            <div
              id="quote-form"
              className="hero-rise relative z-10 mb-8 min-w-0 scroll-mt-24 rounded-[1.5rem] bg-white/95 p-5 shadow-[0_24px_60px_-28px_rgb(40_40_120/0.35)] ring-1 ring-[#e6e3f4] backdrop-blur sm:p-7 lg:my-8"
              style={{ "--i": 3 } as React.CSSProperties}
            >
              <h2 className="text-xl font-extrabold leading-tight tracking-[-0.01em] text-navy sm:text-[1.55rem]">{t(closing.title, locale)}</h2>
              <p className="mt-1.5 mb-5 text-sm leading-snug text-slate sm:text-[15px]">{t(closing.body, locale)}</p>
              <PlanForm content={content} locale={locale} />
            </div>
          </div>

          <ul className="relative z-10 mb-10 hidden rounded-3xl bg-hero-band px-4 py-5 xl:-mt-2 xl:grid xl:grid-cols-3">
            {hero.values.map((value, index) => {
              const { Icon, colour } = VALUES[index] ?? VALUES[0];
              return (
                <li
                  key={value.id}
                  className="flex items-center gap-4 sm:justify-center sm:border-l sm:border-[#d6d3ea] sm:px-4 sm:first:border-l-0"
                >
                  <Icon className={`h-7 w-7 flex-none sm:h-8 sm:w-8 ${colour}`} />
                  <span className="text-[15px] font-semibold leading-snug text-navy xl:text-[1.1rem]">{t(value.label, locale)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

    </>
  );
}
