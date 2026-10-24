"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { createCase, type CaseStatus, type PatientCase } from "@/lib/cases";
import { addCaseFiles, sendPortalMessage, setCare, setPreferences } from "@/lib/journey";
import { syncReferralWithCase } from "@/lib/referrals";
import { sendCoordinatorReply } from "@/lib/telegram-notify";
import { coordinatorReply, setWebIntakeProfileExtras } from "@/lib/web-intake";
import { currentActor } from "@/lib/onboarding";
import { getSettings } from "@/lib/settings";
import { CHANNELS, type ContactChannel } from "@/lib/journey-rules";
import { STATUSES } from "@/lib/console";
import { withDrawer, withoutDrawer } from "@/lib/console-url";

async function guard() {
  if (!(await isAuthenticated())) redirect("/admin/login");
}

const text = (formData: FormData, name: string, max = 300) => String(formData.get(name) ?? "").trim().slice(0, max) || null;

/** Where the form came from, inside the console only. */
const backOf = (formData: FormData) => {
  const back = String(formData.get("back") ?? "");
  return /^\/admin(\/[\w-]+)*(\?[\w=&%.:+-]*)?$/.test(back) ? back : "/admin";
};

const finish = (back: string, note: string, drawer?: Record<string, string>): never => {
  const target = drawer ? withDrawer(back, drawer) : back;
  const [path, query = ""] = target.split("?");
  const params = new URLSearchParams(query);
  params.set("done", note);
  revalidatePath(path);
  redirect(`${path}?${params}`);
};

/** A reply from the inbox, on the channel the conversation is on. */
export async function inboxReplyAction(formData: FormData) {
  await guard();
  const back = backOf(formData);
  const key = String(formData.get("key") ?? "");
  const message = text(formData, "text", 2000);
  if (!message) finish(back, "Write a message first");
  const [channel, id] = [key.slice(0, key.indexOf(":")), key.slice(key.indexOf(":") + 1)];
  let sent = false;
  if (channel === "telegram") {
    const role = text(formData, "botRole") === "partner" ? "partner" : "patient";
    sent = await sendCoordinatorReply(Number(id), role, message!, text(formData, "caseRef", 60)).catch(() => false);
  } else if (channel === "portal") {
    await sendPortalMessage(id, { name: (await currentActor()) || "Shifain desk", direction: "outbound" }, message!);
    sent = true;
  } else if (channel === "web") {
    sent = await coordinatorReply(id, message!).catch(() => false);
  }
  finish(back, sent ? "Sent" : "Could not send on this channel");
}

/** Gives a website chat back to the assistant after a person took it over. */
export async function handBackAction(formData: FormData) {
  await guard();
  const back = backOf(formData);
  const key = String(formData.get("key") ?? "");
  if (key.startsWith("web:")) await setWebIntakeProfileExtras(key.slice(4), { handoff: false });
  finish(back, "Handed back to the assistant");
}

/** A case the desk opens itself: a phone call, a walk-in, a partner on WhatsApp. */
export async function newCaseAction(formData: FormData) {
  await guard();
  const back = backOf(formData);
  const name = text(formData, "name", 120);
  const phone = text(formData, "phone", 40);
  const country = text(formData, "country", 80);
  if (!name || !phone || !country) finish(back, "Name, country and mobile are needed", { d: "new-case" });
  const area = text(formData, "area", 80);
  const told = text(formData, "told", 4000);
  const locale = ["en", "ru", "uz"].includes(String(formData.get("locale"))) ? String(formData.get("locale")) : "en";
  const settings = await getSettings();
  const record = await createCase({
    locale,
    patient: { name: name!, phone: phone!, country: country!, email: text(formData, "email", 160) },
    statedNeed: area && area !== "Not sure yet" ? area : told?.slice(0, 120) ?? null,
    intakeRoute: "description",
    description: told,
    answers: null,
    reports: [],
    reportsExpireAt: new Date(Date.now() + settings.reportRetentionDays * 86_400_000).toISOString(),
    source: "coordinator",
    referredBy: null,
  });
  const channels = formData.getAll("channels").map(String).filter((value): value is ContactChannel => (CHANNELS as readonly string[]).includes(value));
  if (channels.length) await setPreferences(record._id, { channels, mainChannel: channels.find((item) => item === "telegram" || item === "whatsapp") ?? channels[0] });
  const coordinatorId = text(formData, "coordinatorId", 120);
  if (coordinatorId) await setCare(record._id, { coordinatorId }, "coordinator");
  const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length) await addCaseFiles(record._id, files, { source: "patient", kind: "report" }, "coordinator");
  const how = text(formData, "how", 40);
  if (how) await (await getDb()).collection<PatientCase>("cases").updateOne({ _id: record._id }, { $push: { planEdits: { at: new Date().toISOString(), via: "coordinator", change: `Opened by the desk (${how})` } } } as never);
  revalidatePath("/admin/cases");
  finish("/admin/cases", "Case created", { d: "case", ref: record._id });
}

/** One change to many cases from the list: assign, move stage, or message them all. */
export async function bulkCasesAction(formData: FormData) {
  await guard();
  const back = backOf(formData);
  const ids = formData.getAll("ids").map(String).filter((id) => /^SH-[A-Z0-9-]{4,40}$/.test(id)).slice(0, 200);
  const op = String(formData.get("op") ?? "");
  if (!ids.length) finish(back, "Tick at least one case");
  const db = await getDb();
  if (op === "assign") {
    const coordinatorId = text(formData, "coordinatorId", 120);
    for (const id of ids) await setCare(id, { coordinatorId }, "coordinator");
    finish(withoutDrawer(back), `${coordinatorId ? "Assigned" : "Unassigned"} ${ids.length} case${ids.length === 1 ? "" : "s"}`);
  }
  if (op === "stage") {
    const status = String(formData.get("status") ?? "") as CaseStatus;
    if (!STATUSES.includes(status)) finish(back, "Pick a stage");
    await db.collection<PatientCase>("cases").updateMany({ _id: { $in: ids } }, { $set: { status, updatedAt: new Date().toISOString() } });
    for (const id of ids) await syncReferralWithCase(id, status).catch(() => undefined);
    finish(withoutDrawer(back), `Moved ${ids.length} case${ids.length === 1 ? "" : "s"}`);
  }
  if (op === "message") {
    const message = text(formData, "message", 2000);
    if (!message) finish(back, "Write a message first");
    const from = (await currentActor()) || "Shifain desk";
    for (const id of ids) await sendPortalMessage(id, { name: from, direction: "outbound" }, message!);
    finish(withoutDrawer(back), `Message sent to ${ids.length} patient${ids.length === 1 ? "" : "s"} in the app`);
  }
  finish(back, "Nothing changed");
}

/** Sets a case's stage from the case drawer, keeping the drawer open. */
export async function caseStageAction(formData: FormData) {
  await guard();
  const back = backOf(formData);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as CaseStatus;
  if (!id || !STATUSES.includes(status)) finish(back, "Pick a stage");
  await (await getDb()).collection<PatientCase>("cases").updateOne({ _id: id }, { $set: { status, updatedAt: new Date().toISOString() } });
  await syncReferralWithCase(id, status).catch(() => undefined);
  revalidatePath("/admin/cases");
  finish(back, "Stage saved");
}

/** A note on the case for the team, kept with the patient's own notes and changes. */
export async function caseNoteAction(formData: FormData) {
  await guard();
  const back = backOf(formData);
  const id = String(formData.get("id") ?? "");
  const note = text(formData, "note", 1000);
  if (!id || !note) finish(back, "Write a note first");
  const who = (await currentActor()) || "Desk";
  await (await getDb()).collection<PatientCase>("cases").updateOne({ _id: id }, { $push: { planEdits: { at: new Date().toISOString(), via: "coordinator", change: `Note from ${who}: ${note}` } }, $set: { updatedAt: new Date().toISOString() } } as never);
  finish(back, "Note added");
}

/** The coordinator on a case, straight from the drawer. */
export async function caseCoordinatorAction(formData: FormData) {
  await guard();
  const back = backOf(formData);
  const id = String(formData.get("id") ?? "");
  if (id) await setCare(id, { coordinatorId: text(formData, "coordinatorId", 120) }, "coordinator");
  revalidatePath("/admin/cases");
  finish(back, "Coordinator saved");
}
