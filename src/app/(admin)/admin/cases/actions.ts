"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { CaseStatus, PatientCase } from "@/lib/cases";

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

  revalidatePath("/admin/cases");
  redirect(backTo(formData));
}

export async function deleteCaseAction(formData: FormData) {
  await guard();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/cases");

  const db = await getDb();
  await db.collection<PatientCase>("cases").deleteOne({ _id: id });
  // The stored report files go with it; the TTL would have removed them anyway.
  await db.collection("case_reports").deleteMany({ reference: id }).catch(() => undefined);

  revalidatePath("/admin/cases");
  redirect(`${backTo(formData)}${backTo(formData).includes("?") ? "&" : "?"}saved=deleted`);
}
