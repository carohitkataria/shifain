import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { publicUrl } from "@/lib/origin";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { isDatabaseConfigured } from "@/lib/db";
import { allowHit } from "@/lib/rate-limit";
import { TG_LOGIN_COOKIE, botLink, createTelegramLogin } from "@/lib/telegram-login";

/** Opens the patient bot with a one-time sign-in token; the browser keeps the token in a cookie. */
export async function GET(request: NextRequest) {
  const localeRaw = request.nextUrl.searchParams.get("locale") ?? "";
  const locale = isLocale(localeRaw) ? localeRaw : DEFAULT_LOCALE;
  const failed = publicUrl(request, `/${locale}/portal/patient/login?error=telegram`);

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!isDatabaseConfigured() || !allowHit(`tg-login:${ip}`, 20, 10 * 60_000)) return NextResponse.redirect(failed);

  const token = await createTelegramLogin().catch(() => null);
  const link = token ? await botLink(`login_${token}`) : null;
  if (!token || !link) return NextResponse.redirect(failed);

  const jar = await cookies();
  jar.set(TG_LOGIN_COOKIE, `${token}.${locale}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/telegram",
    maxAge: 600,
  });
  return NextResponse.redirect(link);
}
