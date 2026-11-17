import "server-only";
import { readOr } from "./db";
import { getSettings } from "./settings";
import { notifyOps } from "./mailer";
import { notifyPartner } from "./telegram-notify";
import type { PartnerUser } from "./partner-auth";

/** How soon a coordinator should pick up a case that needs a person. */
export const REPLY_TARGET_HOURS = 24;

/**
 * Tells the team a case needs a person now — the automatic plan failed, files
 * were not stored. By email to the ops address (Settings, or OPS_EMAIL), and on
 * Telegram to every active coordinator who linked the partner bot. Nothing
 * clinical goes in the message: the reference, the reason, and where to open it.
 */
export async function alertTeam(reference: string, reason: string): Promise<void> {
  const base = (process.env.BASE_URL || "https://shifain.com").replace(/\/$/, "");
  const link = `${base}/admin/cases?d=case&ref=${encodeURIComponent(reference)}`;
  const lines = [`Case ${reference} needs a coordinator.`, reason, `Please reply to the patient within ${REPLY_TARGET_HOURS} hours.`, "", link];
  const text = `⚠️ <b>Case ${reference} needs a coordinator</b>\n${reason}\nReply to the patient within ${REPLY_TARGET_HOURS} hours.\n<a href="${link}">Open the case</a>`;
  await alertTeamPlain(`Action needed: case ${reference}`, lines, text);
}

/**
 * Something is wrong that no patient case shows (mail is failing, a fallback
 * was used). By email and on the coordinators' Telegram both, since the
 * problem may be the email itself. No patient details: what happened only.
 */
export async function alertTeamPlain(subject: string, lines: string[], telegramText?: string): Promise<void> {
  const settings = await getSettings();
  await notifyOps(settings.opsEmail || process.env.OPS_EMAIL?.trim() || null, subject, lines);
  const text = telegramText ?? `⚠️ <b>${escapeHtml(subject)}</b>\n${escapeHtml(lines.filter(Boolean).join("\n"))}`;

  const coordinators = await readOr<Pick<PartnerUser, "_id" | "telegramChatId">[]>([], (db) =>
    db
      .collection<PartnerUser>("partner_users")
      .find({ role: "coordinator", status: "active", telegramChatId: { $exists: true, $ne: null } }, { projection: { telegramChatId: 1 } })
      .toArray(),
  );
  for (const coordinator of coordinators) {
    if (coordinator.telegramChatId) await notifyPartner({ telegramChatId: coordinator.telegramChatId, text }).catch(() => false);
  }
}

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
