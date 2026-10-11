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
  if (hasLocale) return rememberReferral(request, applyIndexingPolicy(NextResponse.next(), pathname));

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

  const path = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;

  // Redirect to the host the visitor actually asked for. request.nextUrl
  // resolves to whatever Next decided the origin is — on a deployment reached
  // by more than one hostname, or behind a proxy, that is not the host in the
  // request, and bouncing someone to a different origin breaks the page they
  // were on. The forwarded headers, then Host, are the visitor's own.
  //
  // A plain URL, not the cloned NextURL: NextResponse.redirect serialises a
  // NextURL from the origin it was built with, so a host set on the clone is
  // quietly dropped.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const target = host
    ? new URL(`${proto}://${host}${path}${request.nextUrl.search}`)
    : new URL(`${path}${request.nextUrl.search}`, request.nextUrl.origin);

  return rememberReferral(request, applyIndexingPolicy(NextResponse.redirect(target), path));
}

const REF_COOKIE = "shifain_ref";
const REF_PATTERN = /^[A-Z0-9][A-Z0-9-]{3,23}$/;

/**
 * A partner's link can be any page with ?ref=CODE. The first partner to send
 * a visitor keeps the credit: an existing code is never overwritten. The code
 * is only checked for shape here; it is resolved to a partner at intake.
 */
function rememberReferral(request: NextRequest, response: NextResponse): NextResponse {
  const code = request.nextUrl.searchParams.get("ref")?.trim().toUpperCase();
  if (!code || !REF_PATTERN.test(code) || request.cookies.get(REF_COOKIE)) return response;
  response.cookies.set(REF_COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
  return response;
}

export const config = {
  matcher: ["/((?!api|admin|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};
