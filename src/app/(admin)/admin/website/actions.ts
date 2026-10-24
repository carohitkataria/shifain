"use server";

import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { defaultContent } from "@/lib/default-content";
import { discardDraft, getDraft, resetContent, saveContent, saveDraft } from "@/lib/store";
import type { SiteContent } from "@/lib/content-types";

type Result = { ok: true; at: string; content?: SiteContent } | { ok: false; error: string };

/** The editor sends the whole homepage; only an object of a sane size is taken. */
function parse(json: string): SiteContent | null {
  if (typeof json !== "string" || json.length > 2_000_000) return null;
  try {
    const value = JSON.parse(json) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) && "sections" in value ? (value as SiteContent) : null;
  } catch {
    return null;
  }
}

/** Keeps the editor's work between visits; the site does not change. */
export async function saveDraftAction(json: string): Promise<Result> {
  if (!(await isAuthenticated())) return { ok: false, error: "Signed out — sign in again to keep editing." };
  const content = parse(json);
  if (!content) return { ok: false, error: "That draft could not be read." };
  try {
    return { ok: true, at: await saveDraft(content) };
  } catch (error) {
    console.error("[shifain] could not save the homepage draft:", error);
    return { ok: false, error: "The draft could not be saved — is the database reachable?" };
  }
}

/** Puts the draft live in all three languages and refreshes every page that reads it. */
export async function publishAction(json: string): Promise<Result> {
  if (!(await isAuthenticated())) return { ok: false, error: "Signed out — sign in again to publish." };
  const content = parse(json);
  if (!content) return { ok: false, error: "That page could not be read." };
  try {
    await saveContent(content);
  } catch (error) {
    console.error("[shifain] could not publish the homepage:", error);
    return { ok: false, error: "Publishing failed — is the database reachable?" };
  }
  revalidatePath("/", "layout");
  const { live } = await getDraft();
  return { ok: true, at: new Date().toISOString(), content: live };
}

/** Throws the draft away; the editor goes back to what is live. */
export async function discardDraftAction(): Promise<Result> {
  if (!(await isAuthenticated())) return { ok: false, error: "Signed out." };
  await discardDraft();
  const { live } = await getDraft();
  return { ok: true, at: new Date().toISOString(), content: live };
}

/** The homepage as it shipped, live at once. */
export async function restoreDefaultsAction(): Promise<Result> {
  if (!(await isAuthenticated())) return { ok: false, error: "Signed out." };
  await resetContent();
  revalidatePath("/", "layout");
  return { ok: true, at: new Date().toISOString(), content: structuredClone(defaultContent) };
}
