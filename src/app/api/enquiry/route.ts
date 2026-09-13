import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse, after, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { isDatabaseConfigured } from "@/lib/db";
import { loadGrounding } from "@/lib/catalogue";
import { createCase, newReference, savePlan, savePlanFailure, type CaseReport } from "@/lib/cases";
import { generatePlan, type PlanReport } from "@/lib/ai/plan";

const ENQUIRY_LOG =
  process.env.SHIFAIN_ENQUIRY_LOG || path.join(process.cwd(), ".data", "enquiries.jsonl");

const MAX_FILES = 10;
const MAX_TOTAL_BYTES = 25 * 1024 * 1024;
const READABLE = /^(application\/pdf|image\/(png|jpeg|gif|webp))$/;

/**
 * Fallback record for when the database is not reachable. A patient who has
 * uploaded their reports must never hit a dead end, so the enquiry still lands
 * somewhere a coordinator can pick it up.
 */
async function recordToDisk(entry: Record<string, unknown>): Promise<void> {
  await fs.mkdir(path.dirname(ENQUIRY_LOG), { recursive: true });
  await fs.appendFile(ENQUIRY_LOG, `${JSON.stringify(entry)}\n`, "utf8");
}

export async function POST(request: NextRequest) {
  const form = await request.formData();

  const localeField = String(form.get("locale") ?? "");
  const locale = isLocale(localeField) ? localeField : DEFAULT_LOCALE;
  const back = NextResponse.redirect(new URL(`/${locale}#quote-form`, request.url), 303);

  const name = String(form.get("name") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const country = String(form.get("country") ?? "").trim();
  const treatment = String(form.get("treatment") ?? "").trim();
  const email = String(form.get("email") ?? "").trim() || null;

  if (!name || !phone || !country || !treatment) return back;

  const uploads = form
    .getAll("reports")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const totalBytes = uploads.reduce((sum, file) => sum + file.size, 0);
  if (uploads.length > MAX_FILES || totalBytes > MAX_TOTAL_BYTES) return back;

  const files: { meta: CaseReport; body: PlanReport }[] = await Promise.all(
    uploads.map(async (file) => {
      const mediaType = READABLE.test(file.type) ? file.type : "application/octet-stream";
      const data = READABLE.test(file.type)
        ? Buffer.from(await file.arrayBuffer()).toString("base64")
        : "";
      return {
        meta: { filename: file.name, mediaType, bytes: file.size },
        body: { filename: file.name, mediaType, data },
      };
    }),
  );

  if (!isDatabaseConfigured()) {
    const reference = newReference();
    await recordToDisk({
      reference,
      receivedAt: new Date().toISOString(),
      locale,
      name,
      phone,
      country,
      treatment,
      reportCount: uploads.length,
      reportBytes: totalBytes,
    }).catch((error) => console.error("[shifain] could not record enquiry", reference, error));
    return NextResponse.redirect(
      new URL(`/${locale}/enquiry/received?ref=${reference}`, request.url),
      303,
    );
  }

  let reference: string;
  try {
    const record = await createCase({
      status: "planning",
      locale,
      patient: { name, phone, country, email },
      statedNeed: treatment,
      reports: files.map((f) => f.meta),
      referredBy: null,
    });
    reference = record._id;
  } catch (error) {
    console.error("[shifain] could not open a case", error);
    const fallback = newReference();
    await recordToDisk({
      reference: fallback,
      receivedAt: new Date().toISOString(),
      locale,
      name,
      phone,
      country,
      treatment,
      reportCount: uploads.length,
    }).catch(() => undefined);
    return NextResponse.redirect(
      new URL(`/${locale}/enquiry/received?ref=${fallback}`, request.url),
      303,
    );
  }

  // The plan takes a minute to produce; the patient should not sit on a blank
  // POST while it does. Hand them the plan page now and fill it in behind them.
  after(async () => {
    try {
      const plan = await generatePlan(
        {
          statedNeed: treatment,
          country,
          locale,
          reports: files.map((f) => f.body),
        },
        await loadGrounding(),
      );
      await savePlan(reference, plan);
    } catch (error) {
      console.error("[shifain] could not plan case", reference, error);
      await savePlanFailure(
        reference,
        error instanceof Error ? error.message : "The planner did not complete.",
      ).catch(() => undefined);
    }
  });

  return NextResponse.redirect(new URL(`/${locale}/plan/${reference}`, request.url), 303);
}
