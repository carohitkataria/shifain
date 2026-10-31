import Link from "next/link";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { TelegramGlyph } from "./TelegramGlyph";
import { WhatsAppGlyph } from "./WhatsAppGlyph";
import { t } from "@/lib/localize";
import { botLink } from "@/lib/telegram-login";
import type { L, SiteContent } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";

const UserIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5c1.2-3.8 4.2-5.8 7.5-5.8s6.3 2 7.5 5.8" />
  </svg>
);

export const MESSAGE_US: L = { en: "Message us on Telegram", ru: "Написать нам в Telegram", uz: "Telegramda yozing" };
const FAQ_NAV: L = { en: "FAQ", ru: "Вопросы", uz: "Savollar" };
const WHATSAPP_US: L = { en: "Message us on WhatsApp", ru: "Написать нам в WhatsApp", uz: "WhatsAppda yozing" };
/** Round icon buttons for the messengers: the brand colour says which is which, the label says it to screen readers. */
const MESSENGER = "inline-flex h-10 w-10 flex-none items-center justify-center rounded-full text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:h-11 sm:w-11 lg:h-12 lg:w-12";

export async function Header({
  content,
  locale,
  path = "",
  account,
}: {
  content: SiteContent;
  locale: Locale;
  path?: string;
  /** Set on pages a signed-in patient sees: the button then leads to their space, not to sign-in. */
  account?: string;
}) {
  const home = `/${locale}`;
  const nav = [
    { href: `${home}/treatments`, label: t(content.nav.treatments, locale) },
    { href: `${home}/hospitals`, label: t(content.nav.hospitals, locale) },
    { href: `${home}#journey`, label: t(content.nav.ourProcess, locale) },
    { href: `${home}#why-india`, label: t(content.nav.whyIndia, locale) },
    { href: `${home}#costs`, label: t(content.nav.costEstimate, locale) },
    { href: `${home}#about`, label: t(content.nav.aboutUs, locale) },
    { href: `${home}/faq`, label: t(FAQ_NAV, locale) },
  ];
  const login = { href: `${home}/portal/patient`, label: account ?? t(content.nav.loginSignup, locale) };
  const telegram = await botLink().catch(() => null);
  const whatsapp = content.contact.whatsapp ? `https://wa.me/${content.contact.whatsapp.replace(/\D/g, "")}` : null;

  return (
    <header className="sticky top-0 z-40 bg-hero/95 backdrop-blur">
      <div className="mx-auto flex max-w-[100rem] items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 lg:px-12 lg:py-4">
        <Link href={home} className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
          <Logo
            tagline={t(content.brand.wordmarkTagline, locale)}
            markClassName="h-9 sm:h-14"
            wordmarkClassName="h-6 sm:h-9"
          />
        </Link>

        <nav aria-label="Primary" className="hidden flex-1 items-center justify-center gap-1 xl:flex 2xl:gap-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full px-3 py-2.5 text-[15px] font-medium text-navy transition-colors hover:bg-white/70 hover:text-violet focus-visible:outline-2 focus-visible:outline-brand"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2 xl:ml-0">
          <LanguageSwitcher locale={locale} path={path} />

          {telegram ? (
            <a
              href={telegram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t(MESSAGE_US, locale)}
              title={t(MESSAGE_US, locale)}
              className={`${MESSENGER} bg-[#229ed9] hover:bg-[#1b8bc0]`}
            >
              <TelegramGlyph className="h-5 w-5 lg:h-[1.35rem] lg:w-[1.35rem]" />
            </a>
          ) : null}
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t(WHATSAPP_US, locale)}
              title={t(WHATSAPP_US, locale)}
              className={`${MESSENGER} bg-[#25d366] hover:bg-[#1ebe5b]`}
            >
              <WhatsAppGlyph className="h-[1.35rem] w-[1.35rem] lg:h-6 lg:w-6" />
            </a>
          ) : null}

          <Link
            href={login.href}
            className="hidden min-h-12 items-center gap-2 whitespace-nowrap rounded-full border-[1.5px] border-violet/70 bg-white/40 px-6 text-[15px] font-semibold text-violet transition hover:bg-violet hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:inline-flex"
          >
            <UserIcon className="h-5 w-5" />
            {login.label}
          </Link>

          <MobileMenu items={nav} cta={login} />
        </div>
      </div>
    </header>
  );
}
