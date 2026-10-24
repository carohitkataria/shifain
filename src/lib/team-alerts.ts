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
  const settings = await getSettings();
  const base = (process.env.BASE_URL || "https://shifain.com").replace(/\/$/, "");
  const link = `${base}/admin/cases?d=case&ref=${encodeURIComponent(reference)}`;
  const lines = [`Case ${reference} needs a coordinator.`, reason, `Please reply to the patient within ${REPLY_TARGET_HOURS} hours.`, "", link];

  await notifyOps(settings.opsEmail || process.env.OPS_EMAIL?.trim() || null, `Action needed: case ${reference}`, lines);

  const coordinators = await readOr<Pick<PartnerUser, "_id" | "telegramChatId">[]>([], (db) =>
    db
      .collection<PartnerUser>("partner_users")
      .find({ role: "coordinator", status: "active", telegramChatId: { $exists: true, $ne: null } }, { projection: { telegramChatId: 1 } })
      .toArray(),
  );
  const text = `⚠️ <b>Case ${reference} needs a coordinator</b>\n${reason}\nReply to the patient within ${REPLY_TARGET_HOURS} hours.\n<a href="${link}">Open the case</a>`;
  for (const coordinator of coordinators) {
    if (coordinator.telegramChatId) await notifyPartner({ telegramChatId: coordinator.telegramChatId, text }).catch(() => false);
  }
}
