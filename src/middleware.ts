import { NextResponse, type NextRequest } from "next/server";
import { LOCALES, LOCALE_COOKIE, isLocale, resolveLocale } from "@/lib/i18n";

/** Pages that must never be indexed regardless of which deployment this is. */
const PRIVATE = /^\/[a-z]{2}\/(plan|portal)\//;

/**
 * Preview deployments must not be indexed; decided per request, not at build.
 * A case plan or a partner portal is private on every deployment — robots.txt
 * is only a request, so the header says it too.
 */
function applyIndexingPolicy(response: NextResponse, pathname: string): NextResponse {
  if (process.env.SHIFAIN_NOINDEX === "1" || PRIVATE.test(pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

/**
 * Sends visitors to the language that fits the country they are browsing from,
 * unless they have already chosen one. English is the fallback everywhere.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return applyIndexingPolicy(NextResponse.next(), pathname);

  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    request.headers.get("x-country-code");

  const locale = resolveLocale({
    cookie: isLocale(cookie) ? cookie : null,
    country,
    acceptLanguage: request.headers.get("accept-language"),
  });

  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
  return applyIndexingPolicy(NextResponse.redirect(url), url.pathname);
}

export const config = {
  matcher: ["/((?!api|admin|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};
