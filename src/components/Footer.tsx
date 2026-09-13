import Link from "next/link";
import { Logo } from "./Logo";
import { t } from "@/lib/localize";
import { localeHref } from "@/lib/href";
import type { SiteContent } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";

export function Footer({ content, locale }: { content: SiteContent; locale: Locale }) {
  return (
    <footer className="border-t border-line bg-surface-muted">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo tagline={t(content.brand.wordmarkTagline, locale)} />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-soft">
              {t(content.footer.about, locale)}
            </p>
            <div className="mt-5 space-y-1 text-sm font-semibold text-ink-soft">
              <p>{content.contact.phone}</p>
              <p>{content.contact.email}</p>
            </div>
          </div>

          {content.footer.columns.map((column) => (
            <div key={column.id}>
              <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-ink">
                {t(column.title, locale)}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={localeHref(link.href, locale)}
                      className="text-sm text-ink-soft transition hover:text-brand-deep"
                    >
                      {t(link.label, locale)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-line pt-6">
          <p className="text-xs leading-relaxed text-ink-muted">{t(content.footer.disclaimer, locale)}</p>
          <p className="mt-4 text-xs font-semibold text-ink-muted">{t(content.footer.copyright, locale)}</p>
        </div>
      </div>
    </footer>
  );
}
