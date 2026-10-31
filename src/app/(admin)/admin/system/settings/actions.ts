"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { clampRetention, clampVerifyWindow, saveSettings } from "@/lib/settings";
import { VOICE_ID_PATTERN } from "@/lib/voice/voices";

export async function saveSettingsAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const email = String(formData.get("opsEmail") ?? "").trim();
  const chosenVoice = String(formData.get("voiceId") ?? "");
  const customVoice = String(formData.get("voiceIdCustom") ?? "").trim();
  const voiceId = chosenVoice === "custom" ? customVoice : chosenVoice;

  await saveSettings({
    reportRetentionDays: clampRetention(Number(formData.get("reportRetentionDays"))),
    plannerEnabled: formData.get("plannerEnabled") === "on",
    offerTourism: formData.get("offerTourism") === "on",
    opsEmail: email || null,
    partnerApplicationsOpen: formData.get("partnerApplicationsOpen") === "on",
    defaultCurrency: (String(formData.get("defaultCurrency") ?? "USD").trim() || "USD").toUpperCase(),
    referralWindowDays: Math.min(730, Math.max(30, Math.round(Number(formData.get("referralWindowDays")) || 180))),
    voiceEngine: formData.get("voiceEngine") === "device" ? "device" : "natural",
    voiceId: VOICE_ID_PATTERN.test(voiceId) ? voiceId : null,
    serverListening: formData.get("serverListening") === "on",
    verifyWindowHours: clampVerifyWindow(Number(formData.get("verifyWindowHours"))),
  });

  // Cases, plans and the apply form all read these on the way through.
  revalidatePath("/", "layout");
  redirect("/admin/system/settings?saved=1");
}
