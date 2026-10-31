import "server-only";
import { getDb, readOr } from "./db";
import type { Channel } from "./channels";

/**
 * Every message sent or received across any channel (Telegram, WhatsApp, SMS,
 * email) lands here. The coordinator inbox reads from this collection, and
 * automation triggers write to it.
 */

export type MessageDirection = "inbound" | "outbound";

export type CrmMessage = {
  _id: string;
  /** "portal" is the in-app thread between a patient and their care team. */
  channel: Channel | "email" | "portal";
  direction: MessageDirection;
  contactType: "patient" | "partner" | "lead";
  contactId: string | null;
  caseReference: string | null;
  telegramChatId: number | null;
  senderName: string | null;
  text: string;
  metadata: Record<string, unknown> | null;
  status: "delivered" | "failed" | "pending";
  createdAt: string;
};

export type TelegramContact = {
  _id: string;
  telegramUserId: number;
  telegramChatId: number;
  username: string | null;
  firstName: string;
  lastName: string | null;
  languageCode: string | null;
  phone: string | null;
  /** Telegram vouched for the number: shared with the button, by its own owner. */
  phoneVerified?: boolean;
  contactType: "patient" | "partner" | "lead" | "unknown";
  contactId: string | null;
  caseReference: string | null;
  botRole: "patient" | "partner";
  state: string;
  stateData: Record<string, unknown> | null;
  /** The partner code from a t.me/<bot>?start=ref_CODE link, kept until a case opens. */
  referralCode?: string | null;
  createdAt: string;
  updatedAt: string;
};

let _messageIdCounter = 0;

function messageId(): string {
  return `msg-${Date.now()}-${++_messageIdCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function saveMessage(msg: Omit<CrmMessage, "_id" | "createdAt">): Promise<CrmMessage> {
  const record: CrmMessage = {
    _id: messageId(),
    ...msg,
    createdAt: new Date().toISOString(),
  };
  const db = await getDb();
  await db.collection<CrmMessage>("crm_messages").insertOne(record);
  return record;
}

export async function listMessages(filter: {
  contactId?: string;
  caseReference?: string;
  channel?: Channel | "email";
  contactType?: string;
  limit?: number;
}): Promise<CrmMessage[]> {
  const query: Record<string, unknown> = {};
  if (filter.contactId) query.contactId = filter.contactId;
  if (filter.caseReference) query.caseReference = filter.caseReference;
  if (filter.channel) query.channel = filter.channel;
  if (filter.contactType) query.contactType = filter.contactType;

  return readOr<CrmMessage[]>([], (db) =>
    db
      .collection<CrmMessage>("crm_messages")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(filter.limit ?? 100)
      .toArray(),
  );
}

export async function recentConversations(limit = 50): Promise<CrmMessage[]> {
  return readOr<CrmMessage[]>([], (db) =>
    db.collection("crm_messages").aggregate<CrmMessage>([
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: "$telegramChatId",
        doc: { $first: "$$ROOT" },
      }},
      { $replaceRoot: { newRoot: "$doc" } },
      { $sort: { createdAt: -1 } },
      { $limit: limit },
    ]).toArray(),
  );
}

// ---------------------------------------------------------------- contacts

export async function upsertTelegramContact(
  data: Omit<TelegramContact, "_id" | "createdAt" | "updatedAt">,
): Promise<TelegramContact> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = `tg-${data.botRole}-${data.telegramUserId}`;

  await db.collection<TelegramContact>("telegram_contacts").updateOne(
    { _id: id },
    {
      $set: {
        telegramChatId: data.telegramChatId,
        username: data.username,
        firstName: data.firstName,
        lastName: data.lastName,
        languageCode: data.languageCode,
        phone: data.phone ?? undefined,
        ...(data.phoneVerified ? { phoneVerified: true } : {}),
        botRole: data.botRole,
        state: data.state,
        stateData: data.stateData,
        updatedAt: now,
      },
      $setOnInsert: {
        telegramUserId: data.telegramUserId,
        contactType: data.contactType,
        contactId: data.contactId,
        caseReference: data.caseReference,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return (await db.collection<TelegramContact>("telegram_contacts").findOne({ _id: id }))!;
}

export async function getTelegramContact(
  botRole: "patient" | "partner",
  telegramUserId: number,
): Promise<TelegramContact | null> {
  return readOr<TelegramContact | null>(null, (db) =>
    db.collection<TelegramContact>("telegram_contacts").findOne({
      _id: `tg-${botRole}-${telegramUserId}`,
    }),
  );
}

export async function updateContactState(
  botRole: "patient" | "partner",
  telegramUserId: number,
  state: string,
  stateData?: Record<string, unknown> | null,
): Promise<void> {
  const db = await getDb();
  await db.collection<TelegramContact>("telegram_contacts").updateOne(
    { _id: `tg-${botRole}-${telegramUserId}` },
    { $set: { state, stateData: stateData ?? null, updatedAt: new Date().toISOString() } },
  );
}

/** Remembers the partner whose Telegram link brought this patient. First link wins. */
export async function rememberContactReferral(
  botRole: "patient" | "partner",
  telegramUserId: number,
  referralCode: string,
): Promise<void> {
  const db = await getDb();
  await db.collection<TelegramContact>("telegram_contacts").updateOne(
    { _id: `tg-${botRole}-${telegramUserId}`, referralCode: { $in: [null, undefined] as never } },
    { $set: { referralCode, updatedAt: new Date().toISOString() } },
  );
}

export async function linkContactToCase(
  botRole: "patient" | "partner",
  telegramUserId: number,
  caseReference: string,
  contactId: string | null,
): Promise<void> {
  const db = await getDb();
  await db.collection<TelegramContact>("telegram_contacts").updateOne(
    { _id: `tg-${botRole}-${telegramUserId}` },
    {
      $set: {
        caseReference,
        contactId,
        contactType: "patient" as const,
        updatedAt: new Date().toISOString(),
      },
    },
  );
}
