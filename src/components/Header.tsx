import Link from "next/link";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { t } from "@/lib/localize";
import type { SiteContent } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";

const telHref = (value: string) => `tel:${value.replace(/[^\d+]/g, "")}`;
const waHref = (value: string) => `https://wa.me/${value.replace(/\D/g, "")}`;

export function Header({
  content,
  locale,
  path = "",
}: {
  content: SiteContent;
  locale: Locale;
  path?: string;
}) {
  const nav = [
    { href: "#specialties", label: t(content.nav.treatments, locale) },
    { href: "#hospitals", label: t(content.nav.hospitals, locale) },
    { href: "#doctors", label: t(content.nav.doctors, locale) },
    { href: "#costs", label: t(content.nav.costEstimate, locale) },
    { href: "#planner", label: t(content.nav.packages, locale) },
    { href: "#stories", label: t(content.nav.stories, locale) },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3.5 sm:px-6">
        <Link href={`/${locale}`} className="shrink-0">
          <Logo tagline={t(content.brand.wordmarkTagline, locale)} />
        </Link>

        <nav
          aria-label="Primary"
          className="hidden flex-1 items-center justify-center gap-1 lg:flex"
        >
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-[13px] font-semibold text-ink-soft transition hover:bg-surface-muted hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <LanguageSwitcher locale={locale} path={path} />

          <a
            href={waHref(content.contact.whatsapp)}
            className="hidden rounded-full px-3 py-2 text-[13px] font-semibold text-ink-soft transition hover:text-ink sm:inline"
          >
            WhatsApp
          </a>
          <a
            href={telHref(content.contact.phone)}
            className="hidden rounded-full px-3 py-2 text-[13px] font-semibold text-ink-soft transition hover:text-ink md:inline"
          >
            {content.contact.phone}
          </a>

          <Link
            href={`/${locale}/portal/patient`}
            className="rounded-full bg-brand-deep px-5 py-2 text-sm font-bold text-white transition hover:bg-brand"
          >
            {t(content.nav.patientLogin, locale)}
          </Link>
        </div>
      </div>
    </header>
  );
}
