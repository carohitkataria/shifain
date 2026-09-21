import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { authorizeUrl, isGoogleConfigured } from "@/lib/google-auth";

export const OAUTH_COOKIE = "shifain_g_oauth";

function origin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const localeRaw = request.nextUrl.searchParams.get("locale") ?? "";
  const locale = isLocale(localeRaw) ? localeRaw : DEFAULT_LOCALE;

  if (!isGoogleConfigured()) {
    return NextResponse.redirect(new URL(`/${locale}/portal/patient/login?error=1`, request.url));
  }

  const nonce = crypto.randomBytes(16).toString("base64url");
  const jar = await cookies();
  jar.set(OAUTH_COOKIE, `${nonce}.${locale}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: 600,
  });

  return NextResponse.redirect(authorizeUrl(nonce, origin(request)));
}
