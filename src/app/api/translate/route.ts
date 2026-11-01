import { NextResponse } from "next/server";
import { isTranslatedLocale } from "@/lib/i18n";
import { cleanBatch } from "@/lib/page-translation-rules";
import { translateTexts } from "@/lib/page-translation";
import { allowHit } from "@/lib/rate-limit";

function clientAddress(request: Request): string {
  return (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

/**
 * POST /api/translate { locale, texts, page } → { translations: { [english]: translated } }
 *
 * The page translator's one call: the English texts on the page in a
 * translated language. Stored translations come back at once; new ones are
 * made by the AI within a budget. Only site text is sent, never a patient's.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { locale?: unknown; texts?: unknown; page?: unknown };
  const locale = typeof body.locale === "string" ? body.locale : "";
  if (!isTranslatedLocale(locale)) return NextResponse.json({ error: "Unknown language." }, { status: 400 });
  const ip = clientAddress(request);
  if (!allowHit(`translate-calls:${ip}`, 120, 10 * 60_000)) return NextResponse.json({ translations: {} }, { status: 429 });

  const texts = cleanBatch(body.texts, locale);
  const page = typeof body.page === "string" && body.page.startsWith("/") ? body.page.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/" : "/";
  const found = await translateTexts(locale, texts, { page, visitor: ip }).catch(() => new Map<string, string>());
  return NextResponse.json({ translations: Object.fromEntries(found) }, { headers: { "Cache-Control": "no-store" } });
}
