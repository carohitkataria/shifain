import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getContent } from "@/lib/store";
import { t } from "@/lib/localize";
import { LEGAL_COMMON, LEGAL_UPDATED, type LegalDoc } from "@/lib/legal-copy";
import { LOCALE_META, type Locale } from "@/lib/i18n";

/** The privacy policy and terms: one readable column, sections in order, a way to ask. */
export async function LegalPage({ doc, locale, path }: { doc: LegalDoc; locale: Locale; path: string }) {
  const content = await getContent();
  const email = content.contact.email?.trim();
  return (
    <>
      <Header content={content} locale={locale} path={path} />
      <main className="bg-white">
        <section className="ui-section bg-hero">
          <div className="ui-container max-w-3xl">
            <h1 className="ui-h2">{t(doc.title, locale)}</h1>
            <p className="mt-2 text-sm font-semibold text-slate">
              {t(LEGAL_COMMON.updated, locale)}:{" "}
              {new Intl.DateTimeFormat(LOCALE_META[locale].htmlLang, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${LEGAL_UPDATED}T00:00:00Z`))}
            </p>
            <p className="ui-lead mt-4">{t(doc.lead, locale)}</p>
          </div>
        </section>
        <div className="ui-container flex max-w-3xl flex-col gap-10 py-12 sm:py-16">
          {doc.sections.map((section) => (
            <section key={section.title.en} className="flex flex-col gap-3">
              <h2 className="text-xl font-extrabold text-navy sm:text-2xl">{t(section.title, locale)}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph.en} className="text-[17px] leading-relaxed text-[#2c3a5e]">
                  {t(paragraph, locale)}
                </p>
              ))}
            </section>
          ))}
          <p className="rounded-[1.25rem] bg-hero p-6 text-[17px] leading-relaxed text-navy">
            {t(LEGAL_COMMON.questions, locale)} {email ? <b className="select-all">{email}</b> : null} {t(LEGAL_COMMON.orChat, locale)}
          </p>
        </div>
      </main>
      <Footer content={content} locale={locale} />
    </>
  );
}
