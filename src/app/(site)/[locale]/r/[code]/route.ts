import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { publicUrl } from "@/lib/origin";
import {
  REFERRAL_COOKIE,
  REFERRAL_COOKIE_MAX_AGE,
  countReferralClick,
  partnerByCode,
} from "@/lib/referrals";

/**
 * A partner's short link: /r/CODE. Counts the visit, remembers the partner
 * for the length of the attribution cookie and lands the visitor on the
 * enquiry form. An unknown or retired code still lands them on the homepage.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string; code: string }> },
) {
  const { locale: raw, code } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  const partner = await partnerByCode(code).catch(() => null);
  const response = NextResponse.redirect(publicUrl(request, `/${locale}#quote`), 303);
  if (!partner?.referralCode) return response;

  await countReferralClick(partner._id).catch(() => undefined);
  if (!request.cookies.get(REFERRAL_COOKIE)) {
    response.cookies.set(REFERRAL_COOKIE, partner.referralCode, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: REFERRAL_COOKIE_MAX_AGE,
    });
  }
  return response;
}
