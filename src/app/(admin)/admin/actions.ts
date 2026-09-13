"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, endSession, isAuthenticated, startSession } from "@/lib/auth";
import { getContent, resetContent, saveContent } from "@/lib/store";
import { addListItem, buildEditor, collectBooleanPaths, removeListItem, setAtPath } from "@/lib/editor";
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
    } else if (node.kind === "list") {
      node.items.forEach(walk);
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

  // The section's own visibility rides along with its content, so an editor
  // hiding a section never has to remember a second page.
  if (group.section) {
    const current = content.sections[group.section];
    content.sections[group.section] = {
      enabled: formData.get("__visible") === "on",
      order: current?.order ?? 0,
    };
  }

  // Adding or removing a list entry is submitted by the same form, so whatever
  // the editor had typed is saved alongside the structural change.
  const intent = String(formData.get("__intent") ?? "");
  const [verb, path, index] = intent.split(":");

  if (verb === "add" && path?.startsWith(`${group.key}.`)) {
    addListItem(content, path);
  } else if (verb === "remove" && path?.startsWith(`${group.key}.`)) {
    removeListItem(content, path, Number(index));
  }

  await saveContent(content);
  refreshSite();
  redirect(`/admin/${group.key}?saved=${verb === "add" ? "added" : verb === "remove" ? "removed" : "1"}`);
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
