import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { clientAddress, publicUrl } from "@/lib/origin";
import { allowHit } from "@/lib/rate-limit";
import { declaredTooLarge } from "@/lib/upload-guard";
import { DEFAULT_LOCALE, LOCALE_PATTERN, isLocale } from "@/lib/i18n";
import { isDatabaseConfigured } from "@/lib/db";
import { linkCaseToAccount, newReference, type CaseRequest } from "@/lib/cases";
import { OPENED_COOKIE, openedCookie } from "@/lib/case-access";
import { listedDoctor, listedHospital } from "@/lib/directory";
import { currentPatient, getPatientAccount } from "@/lib/patient-auth";
import { setPreferences } from "@/lib/journey";
import { CHANNELS, type ContactChannel } from "@/lib/journey-rules";
import { MAX_TOTAL_BYTES, hasSomethingToPlanFrom, readIntake } from "@/lib/intake";
import { openCase } from "@/lib/case-flow";
import { attributeFromCookie } from "@/lib/referrals";
import { alertTeamPlain } from "@/lib/team-alerts";

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
  // The file does not survive a redeploy, so the team hears now: who to call back, nothing clinical.
  await alertTeamPlain(`Enquiry ${String(entry.reference)} could not be saved`, [
    "The database was not reachable, so this enquiry was kept only in a local file on the server.",
    `Reference: ${String(entry.reference)}`,
    `Name: ${String(entry.name ?? "")}`,
    `Phone: ${String(entry.phone ?? "")}`,
    `Country: ${String(entry.country ?? "")}`,
    "Please call the patient back and open the case by hand.",
  ]).catch((error) => console.error("[shifain] could not alert the team about a fallback enquiry", error));
}

/**
 * The partner the patient asked for from a hospital or doctor page. Only a
 * listed hospital or doctor counts, so a hand-edited form cannot put a name
 * on the case that the directory would not show.
 */
async function requestedFrom(form: FormData): Promise<CaseRequest | null> {
  const hospitalId = String(form.get("hospitalId") ?? "").trim();
  const doctorId = String(form.get("doctorId") ?? "").trim();
  if (!hospitalId && !doctorId) return null;
  const [hospital, doctor] = await Promise.all([
    hospitalId ? listedHospital(hospitalId) : null,
    doctorId ? listedDoctor(doctorId) : null,
  ]);
  if (!hospital && !doctor) return null;
  return {
    hospitalId: hospital?._id ?? null,
    hospitalName: hospital ? [hospital.name, hospital.city].filter(Boolean).join(", ") : null,
    doctorId: doctor?._id ?? null,
    doctorName: doctor?.name ?? null,
  };
}

/** Each enquiry opens a case, a paid AI plan and a team alert: per address, and for the whole site, per hour. */
const PER_ADDRESS = { limit: 5, windowMs: 60 * 60_000 };
const SITE_WIDE = { limit: 120, windowMs: 60 * 60_000 };
/** The files, plus room for the text fields and the form's own framing. */
const MAX_BODY_BYTES = MAX_TOTAL_BYTES + 2 * 1024 * 1024;

const cap = (value: FormDataEntryValue | null, length: number) => String(value ?? "").trim().slice(0, length);

export async function POST(request: NextRequest) {
  const homeBack = (why: string) => NextResponse.redirect(publicUrl(request, `/${DEFAULT_LOCALE}?enquiry=${why}#quote-form`), 303);
  // Refused before the body is read, so an oversized post never sits in memory.
  if (declaredTooLarge(request.headers, MAX_BODY_BYTES)) return homeBack("files");
  const form = await request.formData();

  const localeField = String(form.get("locale") ?? "");
  const locale = isLocale(localeField) ? localeField : DEFAULT_LOCALE;
  // A hospital or doctor page sends the patient back to its own form, not the homepage's.
  const from = String(form.get("from") ?? "");
  const onPage = new RegExp(`^/(${LOCALE_PATTERN})/(hospitals|doctors)/[\\w-]+$`).test(from);
  // Back to the form with the reason, which the form shows: never a silent bounce.
  const back = (why: "missing" | "files" | "empty" | "slow" | "consent") =>
    NextResponse.redirect(publicUrl(request, `${onPage ? from : `/${locale}`}?enquiry=${why}${onPage ? "#book" : "#quote-form"}`), 303);

  // A field people never see: only a script fills it in. It is sent on as if
  // all went well, so it learns nothing, and nothing is opened.
  if (String(form.get("website") ?? "").trim()) return NextResponse.redirect(publicUrl(request, `/${locale}`), 303);

  // Name arrives as title + first + last; older callers may still send `name`.
  const name = (
    [form.get("prefix"), form.get("firstName"), form.get("lastName")]
      .map((v) => cap(v, 60))
      .filter(Boolean)
      .join(" ") || cap(form.get("name"), 120)
  ).trim();
  const country = cap(form.get("country"), 80);
  const dial = cap(form.get("dial"), 6);
  const local = cap(form.get("phone"), 30);
  const signedIn = isDatabaseConfigured() ? await currentPatient().catch(() => null) : null;
  const accountEmail = signedIn?.kind === "email" ? signedIn.email : null;
  // A signed-in patient who leaves the email blank is reached at their account's.
  const email = cap(form.get("email"), 200).toLowerCase() || accountEmail;
  const phone = [dial, local].filter(Boolean).join(" ").trim();

  if (!name || !phone || !country) return back("missing");
  // Health details are kept only with the patient's explicit agreement, recorded with its time.
  if (form.get("consent") !== "yes") return back("consent");
  const consentAt = new Date().toISOString();

  const intake = await readIntake(form);
  if (intake.tooLarge) return back("files");
  if (!hasSomethingToPlanFrom(intake)) return back("empty");
  // Counted only once the form is complete, so a patient correcting a mistake is not held back.
  const ip = clientAddress(request);
  if (!allowHit(`enquiry:${ip}`, PER_ADDRESS.limit, PER_ADDRESS.windowMs) || !allowHit("enquiry:site", SITE_WIDE.limit, SITE_WIDE.windowMs)) {
    return back("slow");
  }

  const patient = { name, phone, country, email };

  if (!isDatabaseConfigured()) {
    const reference = newReference(patient);
    await recordToDisk({
      reference,
      receivedAt: new Date().toISOString(),
      locale,
      ...patient,
      route: intake.route,
      statedNeed: intake.statedNeed,
      reportCount: intake.meta.length,
      askedFor: [form.get("hospitalId"), form.get("doctorId")].filter(Boolean).join(" / ") || null,
    }).catch((error) => console.error("[shifain] could not record enquiry", reference, error));
    return NextResponse.redirect(
      publicUrl(request, `/${locale}/enquiry/received?ref=${reference}`),
      303,
    );
  }

  try {
    const requested = await requestedFrom(form);
    const record = await openCase({ locale, patient, intake, source: "website", referredBy: null, requested, consentAt });
    await attributeFromCookie(record, "link");
    if (accountEmail && accountEmail !== email) await linkCaseToAccount(record._id, accountEmail).catch(() => undefined);
    // The ways to reach them chosen at sign-up travel with every case they open.
    const account = accountEmail ? await getPatientAccount(accountEmail).catch(() => null) : null;
    // What they picked on this form wins; otherwise what they chose at sign-up.
    const picked = String(form.get("channel") ?? "");
    if ((CHANNELS as readonly string[]).includes(picked)) {
      const channel = picked as ContactChannel;
      const others = (account?.channels ?? []).filter((item) => item !== channel);
      await setPreferences(record._id, { channels: [channel, ...others], mainChannel: channel }).catch(() => undefined);
    } else if (account?.channels?.length) {
      await setPreferences(record._id, { channels: account.channels, mainChannel: account.mainChannel ?? account.channels[0] }).catch(() => undefined);
    }
    // This browser opened the case, so it may see the plan without signing in.
    const response = NextResponse.redirect(publicUrl(request, `/${locale}/plan/${record._id}`), 303);
    const opened = openedCookie(request.cookies.get(OPENED_COOKIE)?.value, record._id);
    response.cookies.set(opened.name, opened.value, opened.options);
    return response;
  } catch (error) {
    console.error("[shifain] could not open a case", error);
    const fallback = newReference(patient);
    await recordToDisk({
      reference: fallback,
      receivedAt: new Date().toISOString(),
      locale,
      ...patient,
      route: intake.route,
      statedNeed: intake.statedNeed,
      reportCount: intake.meta.length,
      askedFor: [form.get("hospitalId"), form.get("doctorId")].filter(Boolean).join(" / ") || null,
    }).catch(() => undefined);
    return NextResponse.redirect(
      publicUrl(request, `/${locale}/enquiry/received?ref=${fallback}`),
      303,
    );
  }
}
