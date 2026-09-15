"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { clampRetention, saveSettings } from "@/lib/settings";

export async function saveSettingsAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const email = String(formData.get("opsEmail") ?? "").trim();

  await saveSettings({
    reportRetentionDays: clampRetention(Number(formData.get("reportRetentionDays"))),
    plannerEnabled: formData.get("plannerEnabled") === "on",
    offerTourism: formData.get("offerTourism") === "on",
    opsEmail: email || null,
    partnerApplicationsOpen: formData.get("partnerApplicationsOpen") === "on",
    defaultCurrency: (String(formData.get("defaultCurrency") ?? "USD").trim() || "USD").toUpperCase(),
  });

  // Cases, plans and the apply form all read these on the way through.
  revalidatePath("/", "layout");
  redirect("/admin/system/settings?saved=1");
}
