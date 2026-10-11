import "server-only";
import { sendMessage, isTelegramConfigured, type BotRole } from "./telegram";
import { saveMessage, type TelegramContact } from "./crm-messages";
import { readOr, getDb } from "./db";

/**
 * Outbound notifications — the system reaching out to patients and partners
 * over Telegram. Called from case-flow, admin actions, and scheduled jobs.
 */

async function findContact(
  botRole: BotRole,
  phone: string | null,
  email: string | null,
): Promise<TelegramContact | null> {
  if (!phone && !email) return null;
  const query: Record<string, unknown> = { botRole };
  if (phone) {
    const tail = phone.replace(/\D/g, "").slice(-9);
    if (tail.length >= 6) {
      query.phone = { $regex: `${tail}$` };
    }
  }
  return readOr<TelegramContact | null>(null, (db) =>
    db.collection<TelegramContact>("telegram_contacts").findOne(query),
  );
}

export async function notifyPatient(opts: {
  phone: string | null;
  email: string | null;
  caseReference: string;
  text: string;
}): Promise<boolean> {
  if (!isTelegramConfigured("patient")) return false;

  const contact = await findContact("patient", opts.phone, opts.email);
  if (!contact) return false;

  try {
    await sendMessage("patient", {
      chatId: contact.telegramChatId,
      text: opts.text,
    });
    await saveMessage({
      channel: "telegram",
      direction: "outbound",
      contactType: "patient",
      contactId: contact.contactId,
      caseReference: opts.caseReference,
      telegramChatId: contact.telegramChatId,
      senderName: "ShifaIn",
      text: opts.text,
      metadata: null,
      status: "delivered",
    });
    return true;
  } catch (error) {
    console.error("[shifain] telegram notification failed:", error);
    return false;
  }
}

export async function notifyPartner(opts: {
  telegramChatId: number;
  text: string;
}): Promise<boolean> {
  if (!isTelegramConfigured("partner")) return false;

  try {
    await sendMessage("partner", {
      chatId: opts.telegramChatId,
      text: opts.text,
    });
    await saveMessage({
      channel: "telegram",
      direction: "outbound",
      contactType: "partner",
      contactId: null,
      caseReference: null,
      telegramChatId: opts.telegramChatId,
      senderName: "ShifaIn",
      text: opts.text,
      metadata: null,
      status: "delivered",
    });
    return true;
  } catch (error) {
    console.error("[shifain] telegram partner notification failed:", error);
    return false;
  }
}

export async function broadcastToPartners(text: string): Promise<number> {
  if (!isTelegramConfigured("partner")) return 0;

  const contacts = await readOr<TelegramContact[]>([], (db) =>
    db
      .collection<TelegramContact>("telegram_contacts")
      .find({ botRole: "partner", contactType: "partner" })
      .toArray(),
  );

  let sent = 0;
  for (const contact of contacts) {
    const ok = await notifyPartner({ telegramChatId: contact.telegramChatId, text });
    if (ok) sent++;
  }
  return sent;
}

export async function sendCaseUpdate(
  caseReference: string,
  status: string,
  patientPhone: string | null,
): Promise<void> {
  const statusMessages: Record<string, string> = {
    planned: `✅ <b>Your treatment plan is ready!</b>\n\nCase: <code>${caseReference}</code>\n\nLog in to the patient portal to view your plan, compare hospitals, and see cost estimates.`,
    confirmed: `🎯 <b>Your treatment is confirmed!</b>\n\nCase: <code>${caseReference}</code>\n\nYour coordinator will be in touch with next steps. Check the patient portal for details.`,
    closed: `📁 <b>Case closed</b>\n\nCase: <code>${caseReference}</code>\n\nThank you for choosing ShifaIn. We hope your treatment went well. Feel free to reach out if you need anything.`,
  };

  const text = statusMessages[status];
  if (!text) return;

  await notifyPatient({ phone: patientPhone, email: null, caseReference, text });
}

export async function sendCoordinatorReply(
  telegramChatId: number,
  botRole: BotRole,
  text: string,
  caseReference: string | null,
): Promise<boolean> {
  if (!isTelegramConfigured(botRole)) return false;

  try {
    await sendMessage(botRole, { chatId: telegramChatId, text });
    await saveMessage({
      channel: "telegram",
      direction: "outbound",
      contactType: botRole === "patient" ? "patient" : "partner",
      contactId: null,
      caseReference,
      telegramChatId,
      senderName: "Coordinator",
      text,
      metadata: { coordinator: true },
      status: "delivered",
    });

    const db = await getDb();
    await db.collection<TelegramContact>("telegram_contacts").updateOne(
      { telegramChatId, botRole },
      { $set: { state: "admin_handling", updatedAt: new Date().toISOString() } },
    );

    return true;
  } catch {
    return false;
  }
}
