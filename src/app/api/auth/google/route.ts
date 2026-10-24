import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { publicOrigin, publicUrl } from "@/lib/origin";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { OAUTH_COOKIE, authorizeUrl, isGoogleConfigured } from "@/lib/google-auth";

export async function GET(request: NextRequest) {
  const localeRaw = request.nextUrl.searchParams.get("locale") ?? "";
  const locale = isLocale(localeRaw) ? localeRaw : DEFAULT_LOCALE;

  if (!isGoogleConfigured()) {
    return NextResponse.redirect(publicUrl(request, `/${locale}/portal/patient/login?error=1`));
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

  return NextResponse.redirect(authorizeUrl(nonce, publicOrigin(request)));
}
