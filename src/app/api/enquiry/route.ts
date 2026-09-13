import { promises as fs } from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";

const ENQUIRY_LOG =
  process.env.SHIFAIN_ENQUIRY_LOG || path.join(process.cwd(), ".data", "enquiries.jsonl");

const MAX_FILES = 10;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

/**
 * Records an enquiry so a coordinator can pick it up. Attachments are counted
 * but not stored here — wire this to your case system and object storage when
 * the backend is ready.
 */
async function record(entry: Record<string, unknown>): Promise<void> {
  await fs.mkdir(path.dirname(ENQUIRY_LOG), { recursive: true });
  await fs.appendFile(ENQUIRY_LOG, `${JSON.stringify(entry)}\n`, "utf8");
}

export async function POST(request: NextRequest) {
  const form = await request.formData();

  const localeField = String(form.get("locale") ?? "");
  const locale = isLocale(localeField) ? localeField : DEFAULT_LOCALE;

  const name = String(form.get("name") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const country = String(form.get("country") ?? "").trim();
  const treatment = String(form.get("treatment") ?? "").trim();

  if (!name || !phone || !country || !treatment) {
    return NextResponse.redirect(new URL(`/${locale}#quote-form`, request.url), 303);
  }

  const uploads = form.getAll("reports").filter((value): value is File => value instanceof File && value.size > 0);
  const totalBytes = uploads.reduce((sum, file) => sum + file.size, 0);
  if (uploads.length > MAX_FILES || totalBytes > MAX_TOTAL_BYTES) {
    return NextResponse.redirect(new URL(`/${locale}#quote-form`, request.url), 303);
  }

  const reference = `SH-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

  try {
    await record({
      reference,
      receivedAt: new Date().toISOString(),
      locale,
      name,
      phone,
      country,
      treatment,
      reportCount: uploads.length,
      reportBytes: totalBytes,
    });
  } catch (error) {
    // A storage failure must not lose the patient — surface it and let the
    // coordinator follow up from the phone call instead.
    console.error("[shifain] could not record enquiry", reference, error);
  }

  return NextResponse.redirect(new URL(`/${locale}/enquiry/received?ref=${reference}`, request.url), 303);
}
