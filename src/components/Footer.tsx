import Link from "next/link";
import { Logo } from "./Logo";
import { t } from "@/lib/localize";
import { localeHref } from "@/lib/href";
import type { SiteContent } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";

/** Dark footer with the tricolour rule above it, as in the design. */
const FAQ_LINK = { id: "faq", label: { en: "Visa & FAQ", ru: "Виза и вопросы", uz: "Viza va savollar" }, href: "/faq" };

export function Footer({ content, locale }: { content: SiteContent; locale: Locale }) {
  // The FAQ page is always linked, whatever the editor has done to the columns.
  const columns = content.footer.columns.map((column, index) =>
    index === 0 && !content.footer.columns.some((one) => one.links.some((link) => link.href.includes("/faq"))) ? { ...column, links: [...column.links, FAQ_LINK] } : column,
  );
  return (
    <footer id="about" className="scroll-mt-24">
      <div className="tricolour-rule" />
      <div className="bg-ink">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
            <div>
              <Logo tone="dark" markClassName="h-11" wordmarkClassName="h-6" />

              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/65">
                {t(content.footer.about, locale)}
              </p>

              <ul className="mt-5 flex flex-wrap gap-2">
                <li className="chip bg-white/10 text-white/80">JCI / NABH network</li>
                <li className="chip bg-white/10 text-white/80">ISO 27001</li>
              </ul>

              <div className="mt-5 space-y-1 text-sm font-semibold text-white/75">
                <p>{content.contact.phone}</p>
                <p>{content.contact.email}</p>
              </div>
            </div>

            {columns.map((column) => (
              <div key={column.id}>
                <h3 className="text-base font-bold text-white">
                  {t(column.title, locale)}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.id}>
                      <Link
                        href={localeHref(link.href, locale)}
                        className="text-sm text-white/65 transition hover:text-white"
                      >
                        {t(link.label, locale)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex gap-3 rounded-xl2 bg-white/[0.06] p-5 ring-1 ring-white/10">
            <svg viewBox="0 0 24 24" className="h-5 w-5 flex-none text-saffron" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 4 2.5 20h19z" />
              <path d="M12 10v4M12 17h.01" />
            </svg>
            <p className="text-xs leading-relaxed text-white/60">
              {t(content.footer.disclaimer, locale)}
            </p>
          </div>

          <p className="mt-6 text-xs font-semibold text-white/50">{t(content.footer.copyright, locale)}</p>
        </div>
      </div>
    </footer>
  );
}
