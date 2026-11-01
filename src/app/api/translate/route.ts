import { NextResponse, after } from "next/server";
import { isTranslatedLocale } from "@/lib/i18n";
import { cleanBatch, isPrivatePage } from "@/lib/page-translation-rules";
import { translateTexts, warmAppText } from "@/lib/page-translation";
import { allowHit } from "@/lib/rate-limit";

function clientAddress(request: Request): string {
  return (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

/**
 * POST /api/translate { locale, texts, page } → { translations: { [english]: translated } }
 *
 * The page translator's one call: the English texts on the page in a
 * translated language. Stored translations come back at once; new ones are
 * made by the AI within a budget. On a patient's own pages (their account, a
 * plan) only stored translations come back — their interface text is
 * translated from the code's copy instead (warmAppText) — so a patient's
 * notes, names or plans never reach the AI or the shared store.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { locale?: unknown; texts?: unknown; page?: unknown };
  const locale = typeof body.locale === "string" ? body.locale : "";
  if (!isTranslatedLocale(locale)) return NextResponse.json({ error: "Unknown language." }, { status: 400 });
  const ip = clientAddress(request);
  if (!allowHit(`translate-calls:${ip}`, 120, 10 * 60_000)) return NextResponse.json({ translations: {} }, { status: 429 });

  const texts = cleanBatch(body.texts, locale);
  const page = typeof body.page === "string" && body.page.startsWith("/") ? body.page.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/" : "/";
  const isPrivate = isPrivatePage(page);
  if (isPrivate) after(() => warmAppText(locale));
  const found = await translateTexts(locale, texts, { page, visitor: ip, ai: !isPrivate }).catch(() => new Map<string, string>());
  return NextResponse.json({ translations: Object.fromEntries(found) }, { headers: { "Cache-Control": "no-store" } });
}
