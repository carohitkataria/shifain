import type { Metadata } from "next";
import { Header, MESSAGE_US } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { FaqList } from "@/components/FaqList";
import { OpenChatButton } from "@/components/OpenChatButton";
import { TelegramGlyph } from "@/components/TelegramGlyph";
import { getContent } from "@/lib/store";
import { groupFaqs, listFaqs } from "@/lib/faqs";
import { botLink } from "@/lib/telegram-login";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import type { L } from "@/lib/content-types";

export const revalidate = 60;

const COPY = {
  title: { en: "Frequently asked questions", ru: "Часто задаваемые вопросы", uz: "Koʻp soʻraladigan savollar" } as L,
  body: {
    en: "Visas, documents and travel for treatment in India — straight answers. Rules can change, so your coordinator always confirms what applies to your passport.",
    ru: "Визы, документы и поездка на лечение в Индию — прямые ответы. Правила могут меняться, поэтому координатор всегда уточнит, что относится к вашему паспорту.",
    uz: "Hindistonda davolanish uchun viza, hujjatlar va safar — aniq javoblar. Qoidalar oʻzgarishi mumkin, shuning uchun koordinator har doim pasportingizga nima tegishli ekanini tasdiqlaydi.",
  } as L,
  still: { en: "Still have a question?", ru: "Остались вопросы?", uz: "Savolingiz qoldimi?" } as L,
  stillBody: {
    en: "Ask our assistant in your language, or write to a coordinator.",
    ru: "Спросите нашего помощника на своём языке или напишите координатору.",
    uz: "Yordamchimizdan oʻz tilingizda soʻrang yoki koordinatorga yozing.",
  } as L,
  ask: { en: "Ask the assistant", ru: "Спросить помощника", uz: "Yordamchidan soʻrash" } as L,
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  return { title: `${t(COPY.title, locale)} · Shifain`, description: t(COPY.body, locale) };
}

/** The FAQ page: every published question, by category. The console's FAQs tab edits it. */
export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const [content, faqs, telegram] = await Promise.all([getContent(), listFaqs(), botLink().catch(() => null)]);
  const groups = groupFaqs(faqs);
  const structured = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({ "@type": "Question", name: t(faq.question, locale), acceptedAnswer: { "@type": "Answer", text: t(faq.answer, locale) } })),
  };

  return (
    <>
      <Header content={content} locale={locale} path="/faq" />
      <main className="bg-white">
        <section className="ui-section bg-hero">
          <div className="ui-container">
            <h1 className="ui-h2">{t(COPY.title, locale)}</h1>
            <p className="ui-lead max-w-3xl">{t(COPY.body, locale)}</p>
            {groups.length > 1 ? (
              <nav aria-label={t(COPY.title, locale)} className="mt-6 flex flex-wrap gap-2">
                {groups.map((group) => (
                  <a key={group.key} href={`#${group.key}`} className="inline-flex min-h-11 items-center rounded-full bg-white px-4 text-[15px] font-semibold text-violet ring-1 ring-[#e6e3f4] hover:bg-violet-soft">
                    {t(group.label, locale)}
                  </a>
                ))}
              </nav>
            ) : null}
          </div>
        </section>

        <div className="ui-container flex flex-col gap-12 py-12 sm:py-16">
          {groups.map((group) => (
            <section key={group.key} id={group.key} aria-labelledby={`${group.key}-title`} className="grid scroll-mt-24 gap-6 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,1.4fr)] lg:gap-16">
              <h2 id={`${group.key}-title`} className="text-xl font-extrabold text-navy sm:text-2xl lg:sticky lg:top-28 lg:self-start">
                {t(group.label, locale)}
              </h2>
              <FaqList items={group.items} locale={locale} />
            </section>
          ))}

          <section className="rounded-[1.25rem] bg-hero p-6 sm:p-8">
            <h2 className="text-xl font-extrabold text-navy">{t(COPY.still, locale)}</h2>
            <p className="mt-1 text-[#2c3a5e]">{t(COPY.stillBody, locale)}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <OpenChatButton className="inline-flex min-h-12 items-center justify-center rounded-full bg-violet px-6 font-semibold text-white transition hover:bg-brand-deep">{t(COPY.ask, locale)}</OpenChatButton>
              {telegram ? (
                <a href={telegram} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#229ed9] px-6 font-semibold text-white transition hover:bg-[#1b8bc0]">
                  <TelegramGlyph className="h-5 w-5" />
                  {t(MESSAGE_US, locale)}
                </a>
              ) : null}
            </div>
          </section>
        </div>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g, "\\u003c") }} />
      </main>
      <Footer content={content} locale={locale} />
    </>
  );
}
