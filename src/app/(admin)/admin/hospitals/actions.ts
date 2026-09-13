"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { Hospital } from "@/lib/catalogue";

const PARTNER_STATUS = ["prospect", "contacted", "negotiating", "signed", "suspended"];
const PUBLICATION = ["research", "verified", "published", "withdrawn"];

const list = (value: FormDataEntryValue | null): string[] =>
  String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const numberOrNull = (value: FormDataEntryValue | null): number | null => {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
};

export async function saveHospitalAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/hospitals");

  const db = await getDb();
  const hospitals = db.collection<Hospital>("hospitals");
  const current = await hospitals.findOne({ _id: id });
  if (!current) redirect("/admin/hospitals");

  const partnerStatus = String(formData.get("partnerStatus") ?? current.partnerStatus);
  const state = String(formData.get("publicationState") ?? current.publication.state);
  const tieupId = String(formData.get("tieupId") ?? "").trim() || null;

  if (!PARTNER_STATUS.includes(partnerStatus) || !PUBLICATION.includes(state)) {
    redirect(`/admin/hospitals/${id}?error=1`);
  }

  // The gate the whole catalogue rests on: nothing is published to patients
  // without a signed tie-up behind it.
  if (state === "published" && (!tieupId || partnerStatus !== "signed")) {
    redirect(`/admin/hospitals/${id}?error=tieup`);
  }

  await hospitals.updateOne(
    { _id: id },
    {
      $set: {
        legalName: String(formData.get("legalName") ?? "").trim() || null,
        hospitalType: String(formData.get("hospitalType") ?? "").trim() || null,
        beds: numberOrNull(formData.get("beds")),
        icuBeds: numberOrNull(formData.get("icuBeds")),
        accreditations: list(formData.get("accreditations")),
        specialtyCodes: list(formData.get("specialtyCodes")),
        capabilities: list(formData.get("capabilities")),
        officialWebsite: String(formData.get("officialWebsite") ?? "").trim() || null,
        about: String(formData.get("about") ?? "").trim() || null,
        internationalDesk: {
          exists: formData.get("deskExists") === "on",
          contactName: String(formData.get("deskName") ?? "").trim() || null,
          email: String(formData.get("deskEmail") ?? "").trim() || null,
          phone: String(formData.get("deskPhone") ?? "").trim() || null,
          languages: list(formData.get("deskLanguages")),
        },
        partnerStatus,
        publication: {
          state,
          publishedAt:
            state === "published"
              ? (current.publication.publishedAt ?? new Date().toISOString())
              : null,
          tieupId,
        },
      },
    },
  );

  revalidatePath("/admin/hospitals");
  revalidatePath("/", "layout");
  redirect(`/admin/hospitals/${id}?saved=1`);
}
