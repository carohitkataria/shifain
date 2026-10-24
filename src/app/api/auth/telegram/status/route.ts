import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { accountForPhone, startPatientEmailSession, startPatientSession } from "@/lib/patient-auth";
import { TG_LOGIN_COOKIE, readTelegramLogin, spendTelegramLogin } from "@/lib/telegram-login";

/**
 * Polled by the sign-in page while the patient is in Telegram. Once the bot has
 * confirmed their number, the browser holding the token is signed in — into
 * their account if one carries that number, otherwise by the number itself.
 */
export async function GET() {
  const jar = await cookies();
  const [token = "", storedLocale, then] = (jar.get(TG_LOGIN_COOKIE)?.value ?? "").split(".");
  const locale = isLocale(storedLocale) ? storedLocale : DEFAULT_LOCALE;
  if (!token) return NextResponse.json({ status: "none" });

  const login = await readTelegramLogin(token).catch(() => null);
  if (!login || login.expiresAt < new Date() || login.status === "used") {
    jar.delete({ name: TG_LOGIN_COOKIE, path: "/api/auth/telegram" });
    return NextResponse.json({ status: "expired" });
  }
  if (login.status === "pending" || !login.digits) return NextResponse.json({ status: "pending" });

  if (!(await spendTelegramLogin(token))) return NextResponse.json({ status: "expired" });
  const account = await accountForPhone(login.digits).catch(() => null);
  if (account) await startPatientEmailSession(account.email);
  else await startPatientSession(login.digits);
  jar.delete({ name: TG_LOGIN_COOKIE, path: "/api/auth/telegram" });
  return NextResponse.json({ status: "done", redirect: then === "password" ? `/${locale}/portal/patient/settings?set=password#password` : `/${locale}/portal/patient` });
}
