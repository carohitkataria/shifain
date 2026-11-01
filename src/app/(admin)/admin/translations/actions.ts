"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { resetTranslation, saveTranslation } from "@/lib/page-translation";

async function guard() {
  if (!(await isAuthenticated())) redirect("/admin/login");
}

const field = (form: FormData, name: string, max: number) => String(form.get(name) ?? "").trim().slice(0, max);
/** Back to the list as it was: same language, page, search and place. */
const back = (form: FormData, saved: string) => {
  const params = new URLSearchParams(field(form, "back", 400));
  params.set("saved", saved);
  return `/admin/translations?${params.toString()}`;
};

export async function saveTranslationAction(form: FormData) {
  await guard();
  const id = field(form, "id", 80);
  const text = field(form, "text", 2400);
  if (id && text) await saveTranslation(id, text);
  revalidatePath("/admin/translations");
  redirect(back(form, "1"));
}

export async function resetTranslationAction(form: FormData) {
  await guard();
  const id = field(form, "id", 80);
  if (id) await resetTranslation(id);
  revalidatePath("/admin/translations");
  redirect(back(form, "reset"));
}
