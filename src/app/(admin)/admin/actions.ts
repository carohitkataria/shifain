"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, endSession, isAuthenticated, startSession } from "@/lib/auth";
import { getContent, resetContent, saveContent } from "@/lib/store";
import { buildEditor, collectBooleanPaths, setAtPath } from "@/lib/editor";
import { findGroup } from "@/lib/admin-groups";
import { SECTION_IDS, type SectionId } from "@/lib/content-types";

/** Static pages are prerendered per locale, so publishing has to refresh them. */
function refreshSite() {
  revalidatePath("/", "layout");
}

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    redirect("/admin/login?error=1");
  }
  await startSession();
  redirect("/admin");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

export async function saveGroupAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const key = String(formData.get("__group") ?? "");
  const group = findGroup(key);
  if (!group) redirect("/admin");

  const content = await getContent();
  const editor = buildEditor(content[group.key], group.label, group.key);
  if (!editor) redirect("/admin");

  // Unchecked checkboxes are absent from the payload, so clear them first.
  for (const path of collectBooleanPaths(editor)) {
    setAtPath(content, path, false);
  }

  const allowed = new Set<string>();
  const walk = (node: ReturnType<typeof buildEditor>) => {
    if (!node) return;
    if (node.kind === "group") {
      node.children.forEach(walk);
    } else if (node.kind === "localized") {
      allowed.add(`${node.path}.en`);
      allowed.add(`${node.path}.ru`);
      allowed.add(`${node.path}.uz`);
    } else {
      allowed.add(node.path);
    }
  };
  walk(editor);

  for (const [field, value] of formData.entries()) {
    if (!allowed.has(field) || typeof value !== "string") continue;
    setAtPath(content, field, value);
  }

  await saveContent(content);
  refreshSite();
  redirect(`/admin/${group.key}?saved=1`);
}

export async function saveSectionsAction(formData: FormData) {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const content = await getContent();
  const next = { ...content.sections };

  SECTION_IDS.forEach((id: SectionId, index) => {
    const order = Number(formData.get(`order.${id}`));
    next[id] = {
      enabled: formData.get(`enabled.${id}`) === "on",
      order: Number.isFinite(order) ? order : index,
    };
  });

  await saveContent({ ...content, sections: next });
  refreshSite();
  redirect("/admin?saved=1");
}

export async function resetAction() {
  if (!(await isAuthenticated())) redirect("/admin/login");
  await resetContent();
  refreshSite();
  redirect("/admin?reset=1");
}
