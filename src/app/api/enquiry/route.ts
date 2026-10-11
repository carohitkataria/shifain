import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { publicUrl } from "@/lib/origin";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { isDatabaseConfigured } from "@/lib/db";
import { newReference } from "@/lib/cases";
import { hasSomethingToPlanFrom, readIntake } from "@/lib/intake";
import { openCase } from "@/lib/case-flow";
import { attributeFromCookie } from "@/lib/referrals";

const ENQUIRY_LOG =
  process.env.SHIFAIN_ENQUIRY_LOG || path.join(process.cwd(), ".data", "enquiries.jsonl");

/**
 * Fallback record for when the database is not reachable. A patient who has
 * told us about their illness must never hit a dead end, so the enquiry still
 * lands somewhere a coordinator can pick it up.
 */
async function recordToDisk(entry: Record<string, unknown>): Promise<void> {
  await fs.mkdir(path.dirname(ENQUIRY_LOG), { recursive: true });
  await fs.appendFile(ENQUIRY_LOG, `${JSON.stringify(entry)}\n`, "utf8");
}

export async function POST(request: NextRequest) {
  const form = await request.formData();

  const localeField = String(form.get("locale") ?? "");
  const locale = isLocale(localeField) ? localeField : DEFAULT_LOCALE;
  const back = NextResponse.redirect(publicUrl(request, `/${locale}#quote-form`), 303);

  // Name arrives as title + first + last; older callers may still send `name`.
  const name = (
    [form.get("prefix"), form.get("firstName"), form.get("lastName")]
      .map((v) => String(v ?? "").trim())
      .filter(Boolean)
      .join(" ") || String(form.get("name") ?? "").trim()
  ).trim();
  const country = String(form.get("country") ?? "").trim();
  const dial = String(form.get("dial") ?? "").trim();
  const local = String(form.get("phone") ?? "").trim();
  const email = String(form.get("email") ?? "").trim() || null;
  const phone = [dial, local].filter(Boolean).join(" ").trim();

  if (!name || !phone || !country) return back;

  const intake = await readIntake(form);
  if (intake.tooLarge || !hasSomethingToPlanFrom(intake)) return back;

  const patient = { name, phone, country, email };

  if (!isDatabaseConfigured()) {
    const reference = newReference();
    await recordToDisk({
      reference,
      receivedAt: new Date().toISOString(),
      locale,
      ...patient,
      route: intake.route,
      statedNeed: intake.statedNeed,
      reportCount: intake.meta.length,
    }).catch((error) => console.error("[shifain] could not record enquiry", reference, error));
    return NextResponse.redirect(
      publicUrl(request, `/${locale}/enquiry/received?ref=${reference}`),
      303,
    );
  }

  try {
    const record = await openCase({ locale, patient, intake, source: "website", referredBy: null });
    await attributeFromCookie(record, "link");
    return NextResponse.redirect(publicUrl(request, `/${locale}/plan/${record._id}`), 303);
  } catch (error) {
    console.error("[shifain] could not open a case", error);
    const fallback = newReference();
    await recordToDisk({
      reference: fallback,
      receivedAt: new Date().toISOString(),
      locale,
      ...patient,
      route: intake.route,
      statedNeed: intake.statedNeed,
      reportCount: intake.meta.length,
    }).catch(() => undefined);
    return NextResponse.redirect(
      publicUrl(request, `/${locale}/enquiry/received?ref=${fallback}`),
      303,
    );
  }
}
