import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { getContent } from "@/lib/store";
import { t } from "@/lib/localize";
import { ENQUIRY_RECEIVED, PORTAL_BACK } from "@/lib/portal-copy";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";

export default async function EnquiryReceivedPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const content = await getContent();
  const { ref } = await searchParams;

  return (
    <>
      <Header content={content} locale={locale} path="/enquiry/received" />

      <main className="flex min-h-[60vh] items-center justify-center bg-surface-muted px-4 py-20">
        <div className="card max-w-lg p-8 text-center shadow-xl shadow-ink/5">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-leaf-tint text-leaf">
            <Icon name="check" className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink">
            {t(ENQUIRY_RECEIVED.title, locale)}
          </h1>
          <p className="mt-3 leading-relaxed text-ink-soft">{t(ENQUIRY_RECEIVED.body, locale)}</p>

          {ref ? (
            <p className="mt-5 inline-flex flex-col rounded-xl bg-surface-muted px-5 py-3">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                {t(ENQUIRY_RECEIVED.reference, locale)}
              </span>
              <span className="mt-0.5 font-extrabold tracking-tight text-ink">{ref}</span>
            </p>
          ) : null}

          <div className="mt-7">
            <Link href={`/${locale}`} className="btn btn-secondary">
              {t(PORTAL_BACK, locale)}
            </Link>
          </div>
        </div>
      </main>

      <Footer content={content} locale={locale} />
    </>
  );
}
