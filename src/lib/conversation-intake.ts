import "server-only";
import { getDb } from "./db";
import { openCase } from "./case-flow";
import { sendMessage } from "./telegram";
import { linkContactToCase, updateContactState } from "./crm-messages";
import type { Locale } from "./i18n";

export type IntakeField = {
  name: string | null;
  phone: string | null;
  country: string | null;
  treatment: string | null;
  condition: string | null;
  duration: string | null;
  previousTreatment: string | null;
  age: string | null;
};

export type ConversationIntake = {
  _id: string;
  telegramUserId: number;
  telegramChatId: number;
  fields: IntakeField;
  complete: boolean;
  caseReference: string | null;
  messages: { role: "user" | "assistant"; content: string; ts: string }[];
  createdAt: string;
  updatedAt: string;
};

const COLLECTION = "conversation_intakes";

function intakeId(userId: number): string {
  return `intake-${userId}`;
}

function emptyFields(): IntakeField {
  return {
    name: null,
    phone: null,
    country: null,
    treatment: null,
    condition: null,
    duration: null,
    previousTreatment: null,
    age: null,
  };
}

const REQUIRED: (keyof IntakeField)[] = ["name", "country", "treatment", "condition"];

export function missingRequired(fields: IntakeField): (keyof IntakeField)[] {
  return REQUIRED.filter((k) => !fields[k]);
}

export function isIntakeReady(fields: IntakeField): boolean {
  return missingRequired(fields).length === 0;
}

export async function getOrCreateIntake(
  userId: number,
  chatId: number,
): Promise<ConversationIntake> {
  const db = await getDb();
  const id = intakeId(userId);

  const existing = await db
    .collection<ConversationIntake>(COLLECTION)
    .findOne({ _id: id, complete: false });

  if (existing) return existing;

  const now = new Date().toISOString();
  const record: ConversationIntake = {
    _id: id,
    telegramUserId: userId,
    telegramChatId: chatId,
    fields: emptyFields(),
    complete: false,
    caseReference: null,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<ConversationIntake>(COLLECTION).replaceOne(
    { _id: id },
    record,
    { upsert: true },
  );
  return record;
}

export async function updateIntakeFields(
  userId: number,
  fields: Partial<IntakeField>,
  message?: { role: "user" | "assistant"; content: string },
): Promise<ConversationIntake> {
  const db = await getDb();
  const id = intakeId(userId);

  const setFields: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const [k, v] of Object.entries(fields)) {
    if (v) setFields[`fields.${k}`] = v;
  }

  const update: Record<string, unknown> = { $set: setFields };
  if (message) {
    update.$push = { messages: { ...message, ts: new Date().toISOString() } };
  }

  await db.collection<ConversationIntake>(COLLECTION).updateOne({ _id: id }, update);
  return (await db.collection<ConversationIntake>(COLLECTION).findOne({ _id: id }))!;
}

export async function pushIntakeMessage(
  userId: number,
  role: "user" | "assistant",
  content: string,
): Promise<void> {
  const db = await getDb();
  await db.collection<ConversationIntake>(COLLECTION).updateOne(
    { _id: intakeId(userId) },
    {
      $push: { messages: { role, content, ts: new Date().toISOString() } },
      $set: { updatedAt: new Date().toISOString() },
    },
  );
}

export async function completeIntake(userId: number, caseRef: string): Promise<void> {
  const db = await getDb();
  await db.collection<ConversationIntake>(COLLECTION).updateOne(
    { _id: intakeId(userId) },
    { $set: { complete: true, caseReference: caseRef, updatedAt: new Date().toISOString() } },
  );
}

export async function createCaseFromIntake(
  intake: ConversationIntake,
  locale: Locale = "en",
): Promise<string> {
  const { fields } = intake;

  const description = [
    fields.condition,
    fields.duration ? `Duration: ${fields.duration}` : null,
    fields.previousTreatment ? `Previous treatment: ${fields.previousTreatment}` : null,
    fields.age ? `Patient age: ${fields.age}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const record = await openCase({
    locale,
    patient: {
      name: fields.name || "Telegram patient",
      phone: fields.phone || "",
      country: fields.country || "Unknown",
      email: null,
    },
    intake: {
      route: "description",
      statedNeed: fields.treatment || "",
      description,
      answers: null,
      meta: [],
      uploads: [],
      forPlanner: [],
      tooLarge: false,
    },
    referredBy: "telegram-ai-intake",
  });

  await completeIntake(intake.telegramUserId, record._id);
  await linkContactToCase("patient", intake.telegramUserId, record._id, null);
  await updateContactState("patient", intake.telegramUserId, "ready");

  await sendMessage("patient", {
    chatId: intake.telegramChatId,
    text:
      `✅ <b>Your case has been created!</b>\n\n` +
      `📋 Reference: <code>${record._id}</code>\n\n` +
      `Here's what happens next:\n` +
      `1. Our medical team reviews your details\n` +
      `2. You'll receive a treatment plan with hospital options and costs\n` +
      `3. A coordinator will reach out to discuss next steps\n\n` +
      `This usually takes 24-48 hours. You can check your status anytime with /status\n\n` +
      `If you have medical reports (scans, lab results), please upload them at our patient portal for a more accurate plan.`,
    keyboard: [
      [
        { text: "📊 Check status", callback_data: "action:status" },
        { text: "💬 Ask a question", callback_data: "action:query" },
      ],
    ],
  });

  return record._id;
}
