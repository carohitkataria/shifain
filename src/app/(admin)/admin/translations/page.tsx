import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, NotConfigured, Saved, adminField } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { LOCALE_META, REVIEWED_LOCALES, TRANSLATED_LOCALES, isTranslatedLocale, type TranslatedLocale } from "@/lib/i18n";
import { listTranslations, translationCounts, translationPages } from "@/lib/page-translation";
import { resetTranslationAction, saveTranslationAction } from "./actions";

export const dynamic = "force-dynamic";

const PER_PAGE = 40;

/**
 * The site in the translated languages: every sentence the AI translated,
 * by page, for the team to read and correct. A corrected sentence is marked
 * "Edited" and is never replaced by the AI again.
 */
export default async function TranslationsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; page?: string; q?: string; show?: string; from?: string; saved?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const query = await searchParams;
  const locale: TranslatedLocale = isTranslatedLocale(query.lang) ? query.lang : REVIEWED_LOCALES[0];
  const skip = Math.max(0, Number.parseInt(query.from ?? "0", 10) || 0);
  const edited = query.show === "edited" ? true : query.show === "ai" ? false : undefined;
  const ready = isDatabaseConfigured();
  const [counts, pages, list] = ready
    ? await Promise.all([
        translationCounts(),
        translationPages(locale),
        listTranslations({ locale, page: query.page || undefined, q: query.q?.trim() || undefined, edited, skip, limit: PER_PAGE }),
      ])
    : [{}, [], { rows: [], total: 0 }];

  const params = (change: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged = { lang: locale, page: query.page, q: query.q, show: query.show, from: undefined, ...change };
    for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value);
    return next.toString();
  };
  const here = params({ from: skip ? String(skip) : undefined });

  return (
    <AdminShell title="Translations">
      {!ready ? <NotConfigured /> : null}
      {query.saved === "1" ? <Saved what="your wording is kept and the AI will not change it" /> : null}
      {query.saved === "reset" ? <Saved what="the AI will translate it again the next time someone opens that page" /> : null}

      <Card
        title="Languages"
        hint="English, Russian and Uzbek are written by hand. These are translated by the AI from English the first time a visitor opens a page, and kept. Arabic, Hindi and Bengali are the ones to review: open the key pages once in each (homepage, sign-in, plan request, chat), then read and correct them here."
      >
        <ul className="flex flex-wrap gap-2">
          {TRANSLATED_LOCALES.map((code) => {
            const count = (counts as Record<string, { total: number; edited: number }>)[code];
            const active = code === locale;
            return (
              <li key={code}>
                <Link
                  href={`/admin/translations?lang=${code}`}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                    active ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-brand/50"
                  }`}
                >
                  <span lang={LOCALE_META[code].htmlLang}>{LOCALE_META[code].label}</span>
                  <span className={active ? "text-white/80" : "text-ink-soft"}>{LOCALE_META[code].english}</span>
                  <span className={`rounded-full px-1.5 text-[11px] ${active ? "bg-white/20" : "bg-surface-muted text-ink-soft"}`}>
                    {count?.total ?? 0}
                    {count?.edited ? ` · ${count.edited} edited` : ""}
                  </span>
                  {REVIEWED_LOCALES.includes(code) ? (
                    <span className={`rounded-full px-1.5 text-[10px] font-bold uppercase ${active ? "bg-white/20" : "bg-saffron/15 text-saffron"}`}>Review</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="mt-6">
        <Card title={`${LOCALE_META[locale].english} — ${list.total} ${list.total === 1 ? "sentence" : "sentences"}`} hint="Change the wording and save. “Ask the AI again” removes the sentence; it is translated afresh the next time someone opens its page.">
          <form method="get" className="mb-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
            <input type="hidden" name="lang" value={locale} />
            <input name="q" defaultValue={query.q} placeholder="Search English or translation" className={adminField} />
            <select name="page" defaultValue={query.page ?? ""} className={adminField}>
              <option value="">Every page</option>
              {pages.map((page) => (
                <option key={page} value={page}>
                  {page}
                </option>
              ))}
            </select>
            <select name="show" defaultValue={query.show ?? ""} className={adminField}>
              <option value="">AI and edited</option>
              <option value="ai">Not checked yet</option>
              <option value="edited">Edited</option>
            </select>
            <button type="submit" className="btn btn-primary !py-2 text-sm">
              Show
            </button>
          </form>

          {list.rows.length === 0 ? (
            <p className="text-sm text-ink-soft">
              Nothing yet. Open the site in {LOCALE_META[locale].english} (switch the language in the header) and the pages you visit appear here.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {list.rows.map((row) => (
                <li key={row._id} className="grid gap-3 py-4 lg:grid-cols-2 lg:gap-6">
                  <div className="min-w-0">
                    <p className="text-sm text-ink">{row.source}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {row.page} ·{" "}
                      {row.by === "edited" ? <span className="font-bold text-leaf">Edited</span> : <span>AI</span>}
                    </p>
                  </div>
                  <form action={saveTranslationAction} className="min-w-0">
                    <input type="hidden" name="id" value={row._id} />
                    <input type="hidden" name="back" value={here} />
                    <textarea
                      name="text"
                      defaultValue={row.text}
                      rows={Math.min(6, Math.max(1, Math.ceil(row.text.length / 60)))}
                      lang={LOCALE_META[locale].htmlLang}
                      dir={LOCALE_META[locale].dir}
                      className={adminField}
                      aria-label={`${LOCALE_META[locale].english} for: ${row.source}`}
                    />
                    <div className="mt-2 flex items-center gap-4">
                      <button type="submit" className="btn btn-primary !py-1.5 text-sm">
                        Save
                      </button>
                      <button type="submit" formAction={resetTranslationAction} className="text-sm font-semibold text-ink-soft hover:underline">
                        Ask the AI again
                      </button>
                    </div>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {list.total > PER_PAGE ? (
            <div className="mt-5 flex items-center justify-between text-sm">
              {skip > 0 ? <Link className="font-semibold text-brand" href={`/admin/translations?${params({ from: String(Math.max(0, skip - PER_PAGE)) })}`}>← Previous</Link> : <span />}
              <span className="text-ink-soft">
                {skip + 1}–{Math.min(skip + PER_PAGE, list.total)} of {list.total}
              </span>
              {skip + PER_PAGE < list.total ? <Link className="font-semibold text-brand" href={`/admin/translations?${params({ from: String(skip + PER_PAGE) })}`}>Next →</Link> : <span />}
            </div>
          ) : null}
        </Card>
      </div>
    </AdminShell>
  );
}
