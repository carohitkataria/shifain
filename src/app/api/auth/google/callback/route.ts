import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { publicOrigin, publicUrl } from "@/lib/origin";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { emailFromCode } from "@/lib/google-auth";
import { ensureAccount, startPatientEmailSession } from "@/lib/patient-auth";
import { OAUTH_COOKIE } from "../route";

export async function GET(request: NextRequest) {
  const jar = await cookies();
  const stored = jar.get(OAUTH_COOKIE)?.value ?? "";
  const [nonce, storedLocale] = stored.split(".");
  const locale = isLocale(storedLocale) ? storedLocale : DEFAULT_LOCALE;
  jar.delete({ name: OAUTH_COOKIE, path: "/api/auth/google" });

  const loginUrl = publicUrl(request, `/${locale}/portal/patient/login`);
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  // The state must match the nonce we set, or this is not a flow we started.
  if (!code || !state || !nonce || state !== nonce) {
    loginUrl.searchParams.set("error", "1");
    return NextResponse.redirect(loginUrl);
  }

  const email = await emailFromCode(code, publicOrigin(request)).catch((error) => {
    console.error("[shifain] google sign-in failed", error);
    return null;
  });
  if (!email) {
    loginUrl.searchParams.set("error", "1");
    return NextResponse.redirect(loginUrl);
  }

  await ensureAccount(email, "", locale).catch((error) => console.error("[shifain] could not record a Google account", error));
  await startPatientEmailSession(email);
  return NextResponse.redirect(publicUrl(request, `/${locale}/portal/patient`));
}
