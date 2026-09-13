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
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="border-b border-line/70 bg-surface-muted">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5 sm:px-6">
          <LanguageSwitcher locale={locale} path={path} />

          <div className="flex items-center gap-1 text-sm">
            <a
              href={telHref(content.contact.phone)}
              className="hidden rounded-full px-2.5 py-1.5 font-semibold text-ink-soft transition hover:text-brand-deep sm:inline"
            >
              {content.contact.phone}
            </a>
            <a
              href={waHref(content.contact.whatsapp)}
              className="rounded-full px-2.5 py-1.5 font-semibold text-ink-soft transition hover:text-leaf"
            >
              WhatsApp
            </a>
            <Link
              href={`/${locale}/portal/patient`}
              className="rounded-full border border-brand/30 bg-white px-3.5 py-1.5 font-bold text-brand-deep transition hover:border-brand hover:bg-brand-tint"
            >
              {t(content.nav.patientLogin, locale)}
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6">
        <Link href={`/${locale}`} className="shrink-0">
          <Logo tagline={t(content.brand.wordmarkTagline, locale)} />
        </Link>

        <nav
          aria-label="Primary"
          className="-mx-4 flex flex-1 items-center gap-1 overflow-x-auto px-4 lg:mx-0 lg:justify-end lg:overflow-visible lg:px-0"
        >
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-ink-soft transition hover:bg-brand-tint hover:text-brand-deep"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
