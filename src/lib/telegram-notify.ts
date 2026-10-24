import "server-only";
import { sendMessage, isTelegramConfigured, type BotRole } from "./telegram";
import { saveMessage, type TelegramContact } from "./crm-messages";
import { readOr, getDb } from "./db";
import { toUzCyrillic } from "./uz-cyrillic";
import { send } from "./mailer";
import type { PatientCase } from "./cases";

/**
 * Outbound notifications — the system reaching out to patients and partners
 * over Telegram. Called from case-flow, admin actions, and scheduled jobs.
 */

/** The patient's chat: the one linked to the case if any, else the one with their phone number. */
async function findContact(
  botRole: BotRole,
  phone: string | null,
  caseReference: string | null = null,
): Promise<TelegramContact | null> {
  return readOr<TelegramContact | null>(null, async (db) => {
    const contacts = db.collection<TelegramContact>("telegram_contacts");
    const linked = caseReference ? await contacts.findOne({ botRole, caseReference }) : null;
    if (linked) return linked;
    const tail = (phone ?? "").replace(/\D/g, "").slice(-9);
    return tail.length >= 6 ? contacts.findOne({ botRole, phone: { $regex: `${tail}$` } }) : null;
  });
}

export async function notifyPatient(opts: {
  phone: string | null;
  email: string | null;
  caseReference: string;
  text: string;
}): Promise<boolean> {
  if (!isTelegramConfigured("patient")) return false;

  const contact = await findContact("patient", opts.phone, opts.caseReference);
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

// ---------------------------------------------------------------- case updates

type Words = { en: string; ru: string; uz: string };

const STATUS_WORDS: Record<string, Words> = {
  received: {
    en: "📨 <b>We have your request.</b> A coordinator who speaks your language will review it — usually within 24 hours — and the treating hospital confirms the plan and price within 48 hours.",
    ru: "📨 <b>Мы получили ваш запрос.</b> Координатор, говорящий на вашем языке, изучит его — обычно в течение 24 часов, — а клиника подтвердит план и стоимость в течение 48 часов.",
    uz: "📨 <b>So'rovingizni oldik.</b> Tilingizda gapiradigan koordinator uni ko'rib chiqadi — odatda 24 soat ichida — shifoxona esa reja va narxni 48 soat ichida tasdiqlaydi.",
  },
  planning: {
    en: "📋 <b>We're reading your reports.</b> Your treatment plan is being prepared.",
    ru: "📋 <b>Мы изучаем ваши документы.</b> Готовим план лечения.",
    uz: "📋 <b>Hujjatlaringizni oʻrganyapmiz.</b> Davolash rejasi tayyorlanmoqda.",
  },
  planned: {
    en: "✅ <b>Your treatment plan is ready!</b> Open your account to see the hospitals, doctors and costs.",
    ru: "✅ <b>Ваш план лечения готов!</b> Откройте аккаунт, чтобы увидеть клиники, врачей и стоимость.",
    uz: "✅ <b>Davolash rejangiz tayyor!</b> Shifoxonalar, shifokorlar va narxlarni koʻrish uchun akkauntingizni oching.",
  },
  confirmed: {
    en: "🎯 <b>Your treatment is confirmed!</b> Your coordinator will send the next steps.",
    ru: "🎯 <b>Лечение подтверждено!</b> Координатор пришлёт следующие шаги.",
    uz: "🎯 <b>Davolanishingiz tasdiqlandi!</b> Koordinator keyingi qadamlarni yuboradi.",
  },
  closed: {
    en: "📁 <b>Your case is closed.</b> Thank you for choosing ShifaIn — write to us here any time.",
    ru: "📁 <b>Ваш случай закрыт.</b> Спасибо, что выбрали ShifaIn — пишите нам здесь в любое время.",
    uz: "📁 <b>Holatingiz yopildi.</b> ShifaIn ni tanlaganingiz uchun rahmat — istalgan vaqtda shu yerda yozing.",
  },
};

const RIDE_WORDS: Record<string, Words> = {
  assigned: { en: "🚗 <b>Your car is booked.</b> We'll tell you when the driver sets off.", ru: "🚗 <b>Машина заказана.</b> Сообщим, когда водитель выедет.", uz: "🚗 <b>Mashina buyurtma qilindi.</b> Haydovchi yoʻlga chiqqanda xabar beramiz." },
  "on-the-way": { en: "🚗 <b>Your driver is on the way.</b>", ru: "🚗 <b>Водитель уже едет к вам.</b>", uz: "🚗 <b>Haydovchi yoʻlda.</b>" },
  arrived: { en: "📍 <b>Your driver has arrived</b> and is waiting for you.", ru: "📍 <b>Водитель приехал</b> и ждёт вас.", uz: "📍 <b>Haydovchi yetib keldi</b> va sizni kutmoqda." },
};

const MESSAGE_WORDS: Words = { en: "💬 <b>New message from {name}</b>", ru: "💬 <b>Новое сообщение от {name}</b>", uz: "💬 <b>{name} dan yangi xabar</b>" };
const CASE_WORDS: Words = { en: "Case", ru: "Случай", uz: "Holat" };
const SUBJECT_WORDS: Words = { en: "Update on your Shifain case", ru: "Новости по вашему случаю Shifain", uz: "Shifain holatingiz bo'yicha yangilik" };
const OPEN_WORDS: Words = { en: "Open your account", ru: "Открыть аккаунт", uz: "Akkauntni ochish" };

const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type CaseUpdate =
  | { kind: "status"; status: string }
  | { kind: "ride"; status: string }
  | { kind: "message"; from: string; text: string };

/**
 * Tells the patient their case moved, in their language (Uzbek in Cyrillic
 * when that is what they read): on Telegram if they linked the bot, and by
 * email if we have their address. Silent when nothing worth saying changed.
 */
export async function notifyCase(caseReference: string, update: CaseUpdate): Promise<boolean> {
  const record = await readOr<Pick<PatientCase, "_id" | "patient" | "locale" | "accountEmail"> | null>(null, (db) =>
    db.collection<PatientCase>("cases").findOne({ _id: caseReference }, { projection: { patient: 1, locale: 1, accountEmail: 1 } }),
  );
  if (!record) return false;

  const locale = record.locale === "ru" || record.locale === "uz" || record.locale === "oz" ? record.locale : "en";
  const pick = (words: Words) => (locale === "oz" ? toUzCyrillic(words.uz) : words[locale]);
  let lead: string | null = null;
  if (update.kind === "status") lead = STATUS_WORDS[update.status] ? pick(STATUS_WORDS[update.status]) : null;
  if (update.kind === "ride") lead = RIDE_WORDS[update.status] ? pick(RIDE_WORDS[update.status]) : null;
  if (update.kind === "message") lead = `${pick(MESSAGE_WORDS).replace("{name}", escapeHtml(update.from))}\n\n${escapeHtml(update.text.slice(0, 1500))}`;
  if (!lead) return false;

  const base = (process.env.BASE_URL || "https://shifain.com").replace(/\/$/, "");
  const account = `${base}/${locale}/portal/patient`;
  const text = `${lead}\n\n${pick(CASE_WORDS)}: <code>${caseReference}</code>\n<a href="${account}">${pick(OPEN_WORDS)}</a>`;
  const byTelegram = await notifyPatient({ phone: record.patient?.phone ?? null, email: record.patient?.email ?? null, caseReference, text });

  // The same news by email, for patients who never found the bot — most of them.
  const to = record.patient?.email || record.accountEmail || null;
  let byEmail = false;
  // A car on its way is news for the next minute, not for an inbox.
  if (to && update.kind !== "ride") {
    const plain = lead.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    const subject = `${pick(SUBJECT_WORDS)} ${caseReference}`;
    const body = `${plain}\n\n${pick(CASE_WORDS)}: ${caseReference}\n${pick(OPEN_WORDS)}: ${account}\n\n— Shifain`;
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#0a1a47;max-width:520px;margin:0 auto;padding:24px;line-height:1.55">
<p style="font-size:20px;font-weight:700;color:#722be4;margin:0 0 16px">Shifain</p>
<p style="font-size:15px;margin:0 0 16px;white-space:pre-line">${lead}</p>
<p style="font-size:13px;color:#3f4a69;margin:0 0 20px">${pick(CASE_WORDS)}: <b>${caseReference}</b></p>
<a href="${account}" style="display:inline-block;background:#722be4;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">${pick(OPEN_WORDS)}</a>
</div>`;
    byEmail = await send(to, subject, body, html).catch(() => false);
  }
  return byTelegram || byEmail;
}

/** Kept for the planner's callers: a stage change, told to the patient. */
export async function sendCaseUpdate(caseReference: string, status: string, _patientPhone: string | null): Promise<void> {
  await notifyCase(caseReference, { kind: "status", status });
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
