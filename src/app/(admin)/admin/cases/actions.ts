"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { CaseStatus, PatientCase } from "@/lib/cases";
import type { PartnerUser } from "@/lib/partner-auth";
import { attributeCase, syncReferralWithCase, updateReferral } from "@/lib/referrals";
import { answerAppointment } from "@/lib/patient-portal";

const STATUSES: CaseStatus[] = [
  "new",
  "planning",
  "planned",
  "plan-failed",
  "confirmed",
  "closed",
];

async function guard() {
  if (!(await isAuthenticated())) redirect("/admin/login");
}

const text = (v: FormDataEntryValue | null) => String(v ?? "").trim() || null;

/** Keeps the filters the admin had applied when the action redirects back. */
function backTo(formData: FormData): string {
  const back = String(formData.get("back") ?? "").trim();
  return back.startsWith("/admin/cases") ? back : "/admin/cases";
}

export async function saveCaseAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/cases");

  const status = String(formData.get("status") ?? "");
  const set: Record<string, unknown> = {
    "patient.name": String(formData.get("name") ?? "").trim(),
    "patient.phone": String(formData.get("phone") ?? "").trim(),
    "patient.country": String(formData.get("country") ?? "").trim(),
    "patient.email": text(formData.get("email")),
    statedNeed: text(formData.get("statedNeed")),
    updatedAt: new Date().toISOString(),
  };
  if (STATUSES.includes(status as CaseStatus)) set.status = status;

  const db = await getDb();
  await db.collection<PatientCase>("cases").updateOne({ _id: id }, { $set: set as never });
  if (set.status) await syncReferralWithCase(id, set.status as CaseStatus).catch(() => undefined);

  revalidatePath("/admin/cases");
  redirect(`${backTo(formData)}${backTo(formData).includes("?") ? "&" : "?"}saved=1`);
}

/** A quick status change from the list, without opening the edit form. */
export async function setCaseStatusAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !STATUSES.includes(status as CaseStatus)) redirect("/admin/cases");

  const db = await getDb();
  await db
    .collection<PatientCase>("cases")
    .updateOne(
      { _id: id },
      { $set: { status: status as CaseStatus, updatedAt: new Date().toISOString() } },
    );
  await syncReferralWithCase(id, status as CaseStatus).catch(() => undefined);

  revalidatePath("/admin/cases");
  redirect(backTo(formData));
}

/**
 * Credits an existing case to a partner — a patient who rang and said "Dr X
 * sent me". Only for cases nobody has been credited with yet; moving credit
 * from one partner to another is a conversation, not a dropdown.
 */
export async function attributeCaseAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  const partnerId = String(formData.get("partnerId") ?? "");
  if (!id || !partnerId) redirect(backTo(formData));

  const db = await getDb();
  const [record, partner] = await Promise.all([
    db.collection<PatientCase>("cases").findOne({ _id: id }),
    db.collection<PartnerUser>("partner_users").findOne({ _id: partnerId }),
  ]);
  const credited = await db.collection("referrals").findOne({ caseReference: id });
  if (record && partner && !credited) {
    await attributeCase({ record, partner, channel: "manual", by: "admin" });
    if (record.status === "confirmed") await syncReferralWithCase(id, "confirmed").catch(() => undefined);
  }

  revalidatePath("/admin/cases");
  revalidatePath("/admin/referrals");
  redirect(`${backTo(formData)}${backTo(formData).includes("?") ? "&" : "?"}saved=1`);
}

export async function deleteCaseAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/cases");

  const db = await getDb();
  // The referral row stays for the ledger, closed; a settled one is left alone.
  await updateReferral(`ref-${id}`, { status: "cancelled", note: "Case deleted", by: "admin" }).catch(
    () => undefined,
  );
  await db.collection<PatientCase>("cases").deleteOne({ _id: id });
  // The stored report files go with it; the TTL would have removed them anyway.
  await db.collection("case_reports").deleteMany({ reference: id }).catch(() => undefined);

  revalidatePath("/admin/cases");
  redirect(`${backTo(formData)}${backTo(formData).includes("?") ? "&" : "?"}saved=deleted`);
}

/** A coordinator confirms (with the agreed time) or declines a call the patient asked for in the portal. */
export async function answerAppointmentAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  const appointment = String(formData.get("appointment") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (id && appointment && (decision === "confirmed" || decision === "declined")) {
    await answerAppointment(id, appointment, decision, text(formData.get("slot")));
    revalidatePath("/admin/cases");
  }
  redirect(backTo(formData));
}
