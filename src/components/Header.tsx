import Link from "next/link";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MobileMenu } from "./MobileMenu";
import { t } from "@/lib/localize";
import type { SiteContent } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";

const UserIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5c1.2-3.8 4.2-5.8 7.5-5.8s6.3 2 7.5 5.8" />
  </svg>
);

export function Header({
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
    { href: `${home}#stories`, label: t(content.nav.stories, locale) },
    { href: `${home}#about`, label: t(content.nav.aboutUs, locale) },
  ];
  const login = { href: `${home}/portal/patient`, label: account ?? t(content.nav.loginSignup, locale) };

  return (
    <header className="sticky top-0 z-40 bg-hero/95 backdrop-blur">
      <div className="mx-auto flex max-w-[100rem] items-center gap-3 px-4 py-3 sm:px-6 lg:px-12 lg:py-4">
        <Link href={home} className="shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand">
          <Logo
            tagline={t(content.brand.wordmarkTagline, locale)}
            markClassName="h-10 sm:h-14"
            wordmarkClassName="h-7 sm:h-9"
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
