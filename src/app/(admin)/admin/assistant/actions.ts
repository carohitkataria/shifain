"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getAssistantConfig, newEntryId, saveAssistantConfig, type KnowledgeEntry } from "@/lib/assistant/config";

async function guard() {
  if (!(await isAuthenticated())) redirect("/admin/login");
}

const text = (form: FormData, name: string, max: number) => String(form.get(name) ?? "").trim().slice(0, max);

export async function saveInstructionsAction(form: FormData) {
  await guard();
  const config = await getAssistantConfig();
  await saveAssistantConfig({ ...config, instructions: text(form, "instructions", 6000) });
  revalidatePath("/admin/assistant");
  redirect("/admin/assistant?saved=instructions");
}

/** Adds an entry, or updates the one whose id is posted. */
export async function saveEntryAction(form: FormData) {
  await guard();
  const config = await getAssistantConfig();
  const id = text(form, "id", 40) || newEntryId();
  const entry: KnowledgeEntry = {
    id,
    title: text(form, "title", 160) || "Untitled",
    answer: {
      en: text(form, "answerEn", 2000),
      ru: text(form, "answerRu", 2000) || undefined,
      uz: text(form, "answerUz", 2000) || undefined,
    },
    keywords: text(form, "keywords", 600)
      .split(/[,\n]/)
      .map((keyword) => keyword.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 30),
    instant: form.get("instant") === "on",
    enabled: form.get("enabled") === "on",
  };
  if (!entry.answer.en) redirect("/admin/assistant?error=answer");
  const exists = config.entries.some((item) => item.id === id);
  const entries = exists ? config.entries.map((item) => (item.id === id ? entry : item)) : [entry, ...config.entries];
  await saveAssistantConfig({ ...config, entries });
  revalidatePath("/admin/assistant");
  redirect("/admin/assistant?saved=knowledge");
}

export async function deleteEntryAction(form: FormData) {
  await guard();
  const config = await getAssistantConfig();
  const id = text(form, "id", 40);
  await saveAssistantConfig({ ...config, entries: config.entries.filter((item) => item.id !== id) });
  revalidatePath("/admin/assistant");
  redirect("/admin/assistant?saved=deleted");
}
