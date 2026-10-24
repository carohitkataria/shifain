"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { FAQ_CATEGORIES, deleteFaq, saveFaq, type FaqCategory } from "@/lib/faqs";

const text = (formData: FormData, name: string, max: number) => String(formData.get(name) ?? "").trim().slice(0, max);

function refresh() {
  revalidatePath("/admin/faqs");
  revalidatePath("/[locale]/faq", "page");
  revalidatePath("/[locale]", "page");
}

export async function saveFaqAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const category = (FAQ_CATEGORIES.find((item) => item.key === formData.get("category"))?.key ?? "general") as FaqCategory;
  const question = { en: text(formData, "q_en", 300), ru: text(formData, "q_ru", 300), uz: text(formData, "q_uz", 300) };
  const answer = { en: text(formData, "a_en", 3000), ru: text(formData, "a_ru", 3000), uz: text(formData, "a_uz", 3000) };
  if (!question.en || !answer.en) redirect(`/admin/faqs?cat=${category}&error=1`);
  const order = Number(text(formData, "order", 6));
  await saveFaq({
    _id: text(formData, "id", 60) || null,
    category,
    question,
    answer,
    keywords: text(formData, "keywords", 600)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 20),
    order: Number.isFinite(order) ? order : 999,
    published: formData.get("published") !== "off",
  });
  refresh();
  redirect(`/admin/faqs?cat=${category}&saved=1`);
}

export async function deleteFaqAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const id = text(formData, "id", 60);
  if (id) await deleteFaq(id);
  refresh();
  redirect(`/admin/faqs?cat=${text(formData, "category", 20)}&saved=1`);
}
