import "server-only";
import crypto from "node:crypto";
import { Binary } from "mongodb";
import { getDb } from "./db";
import { openCase } from "./case-flow";
import { sendMessage } from "./telegram";
import { getTelegramContact, linkContactToCase, updateContactState } from "./crm-messages";
import { attributeCase, partnerByCode } from "./referrals";
import { storeReports, MAX_REPORT_BYTES, type ReportUpload } from "./reports";
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
  /** Where they would like treatment (a city or hospital), if they said. */
  destination?: string | null;
};

export type IntakeState = "medical_chat" | "collecting_profile" | "complete";

export type IntakeUploadRef = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  /** What the assistant read in it, when it could: for the coordinator and the planner, not a diagnosis. */
  reading?: { documentType: string; findings: string; specialtyCode: string | null } | null;
};

export type ConversationIntake = {
  _id: string;
  telegramUserId: number;
  telegramChatId: number;
  fields: IntakeField;
  state: IntakeState;
  complete: boolean;
  caseReference: string | null;
  messages: { role: "user" | "assistant"; content: string; ts: string }[];
  uploads: IntakeUploadRef[];
  createdAt: string;
  updatedAt: string;
};

type StoredIntakeFile = {
  _id: string;
  intakeId: string;
  telegramUserId: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  data: Binary;
  createdAt: string;
};

const COLLECTION = "conversation_intakes";
const UPLOADS_COLLECTION = "intake_files";

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

// ---------------------------------------------------------------- country detection

const PHONE_COUNTRY_CODES: [string, string][] = [
  ["998", "Uzbekistan"],
  ["996", "Kyrgyzstan"],
  ["995", "Georgia"],
  ["994", "Azerbaijan"],
  ["993", "Turkmenistan"],
  ["992", "Tajikistan"],
  ["977", "Nepal"],
  ["976", "Mongolia"],
  ["974", "Qatar"],
  ["973", "Bahrain"],
  ["972", "Israel"],
  ["971", "UAE"],
  ["968", "Oman"],
  ["966", "Saudi Arabia"],
  ["964", "Iraq"],
  ["963", "Syria"],
  ["962", "Jordan"],
  ["961", "Lebanon"],
  ["960", "Maldives"],
  ["880", "Bangladesh"],
  ["254", "Kenya"],
  ["234", "Nigeria"],
  ["98", "Iran"],
  ["95", "Myanmar"],
  ["94", "Sri Lanka"],
  ["93", "Afghanistan"],
  ["92", "Pakistan"],
  ["91", "India"],
  ["90", "Turkey"],
  ["86", "China"],
  ["82", "South Korea"],
  ["66", "Thailand"],
  ["65", "Singapore"],
  ["62", "Indonesia"],
  ["60", "Malaysia"],
  ["49", "Germany"],
  ["44", "UK"],
  ["33", "France"],
  ["7", "Russia"],
  ["1", "USA"],
];

export function countryFromPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  for (const [code, country] of PHONE_COUNTRY_CODES) {
    if (digits.startsWith(code)) return country;
  }
  return null;
}

// ---------------------------------------------------------------- profile questions (code-driven, no LLM)

export type ProfileQuestion = {
  field: keyof IntakeField;
  question: string;
  buttons?: { text: string; callback_data: string }[][];
};

export function nextProfileQuestion(fields: IntakeField): ProfileQuestion | null {
  if (!fields.country) {
    return {
      field: "country",
      question:
        "🌍 <b>Which country are you from?</b>\n\nTap a button or type your country:",
      buttons: [
        [
          { text: "🇺🇿 Uzbekistan", callback_data: "profile:country:Uzbekistan" },
          { text: "🇧🇩 Bangladesh", callback_data: "profile:country:Bangladesh" },
        ],
        [
          { text: "🇦🇫 Afghanistan", callback_data: "profile:country:Afghanistan" },
          { text: "🇮🇶 Iraq", callback_data: "profile:country:Iraq" },
        ],
        [
          { text: "🇳🇬 Nigeria", callback_data: "profile:country:Nigeria" },
          { text: "🇰🇪 Kenya", callback_data: "profile:country:Kenya" },
        ],
        [
          { text: "🇵🇰 Pakistan", callback_data: "profile:country:Pakistan" },
          { text: "🇸🇦 Saudi Arabia", callback_data: "profile:country:Saudi Arabia" },
        ],
      ],
    };
  }
  if (!fields.name) {
    return {
      field: "name",
      question: "👤 <b>What is your full name?</b>",
    };
  }
  return null;
}

// ---------------------------------------------------------------- intake CRUD

export async function getOrCreateIntake(
  userId: number,
  chatId: number,
  autoFill?: { name?: string; phone?: string; country?: string },
): Promise<ConversationIntake> {
  const db = await getDb();
  const id = intakeId(userId);

  const existing = await db
    .collection<ConversationIntake>(COLLECTION)
    .findOne({ _id: id, complete: false });

  if (existing) {
    if (autoFill) {
      const updates: Record<string, unknown> = {};
      if (autoFill.name && !existing.fields.name) updates["fields.name"] = autoFill.name;
      if (autoFill.phone && !existing.fields.phone) updates["fields.phone"] = autoFill.phone;
      if (autoFill.country && !existing.fields.country) updates["fields.country"] = autoFill.country;
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date().toISOString();
        await db.collection<ConversationIntake>(COLLECTION).updateOne({ _id: id }, { $set: updates });
        return (await db.collection<ConversationIntake>(COLLECTION).findOne({ _id: id }))!;
      }
    }
    return existing;
  }

  const fields = emptyFields();
  if (autoFill?.name) fields.name = autoFill.name;
  if (autoFill?.phone) fields.phone = autoFill.phone;
  if (autoFill?.country) fields.country = autoFill.country;

  const now = new Date().toISOString();
  const record: ConversationIntake = {
    _id: id,
    telegramUserId: userId,
    telegramChatId: chatId,
    fields,
    state: "medical_chat",
    complete: false,
    caseReference: null,
    messages: [],
    uploads: [],
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

export async function setIntakeState(userId: number, state: IntakeState): Promise<void> {
  const db = await getDb();
  await db.collection<ConversationIntake>(COLLECTION).updateOne(
    { _id: intakeId(userId) },
    { $set: { state, updatedAt: new Date().toISOString() } },
  );
}

export async function completeIntake(userId: number, caseRef: string): Promise<void> {
  const db = await getDb();
  await db.collection<ConversationIntake>(COLLECTION).updateOne(
    { _id: intakeId(userId) },
    { $set: { complete: true, state: "complete" as IntakeState, caseReference: caseRef, updatedAt: new Date().toISOString() } },
  );
}

// ---------------------------------------------------------------- file uploads

export async function storeIntakeFile(
  userId: number,
  file: { fileName: string; mimeType: string; fileSize: number; data: Buffer },
): Promise<string> {
  const db = await getDb();
  const id = `upload-${userId}-${crypto.randomBytes(4).toString("hex")}`;
  const now = new Date().toISOString();

  await db.collection<StoredIntakeFile>(UPLOADS_COLLECTION).insertOne({
    _id: id,
    intakeId: intakeId(userId),
    telegramUserId: userId,
    fileName: file.fileName,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    data: new Binary(file.data),
    createdAt: now,
  });

  await db.collection<ConversationIntake>(COLLECTION).updateOne(
    { _id: intakeId(userId) },
    {
      $push: { uploads: { id, fileName: file.fileName, mimeType: file.mimeType, fileSize: file.fileSize, createdAt: now } },
      $set: { updatedAt: now },
    },
  );

  return id;
}

// ---------------------------------------------------------------- case creation

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

  const uploads: ReportUpload[] = [];
  const meta: { id: string; filename: string; mediaType: string; bytes: number }[] = [];

  if (intake.uploads.length > 0) {
    const db = await getDb();
    for (const ref of intake.uploads) {
      const stored = await db.collection<StoredIntakeFile>(UPLOADS_COLLECTION).findOne({ _id: ref.id });
      if (stored?.data) {
        const body = Buffer.from((stored.data as Binary).buffer);
        if (body.byteLength <= MAX_REPORT_BYTES) {
          uploads.push({ id: ref.id, filename: ref.fileName, mediaType: ref.mimeType, body });
        }
        meta.push({ id: ref.id, filename: ref.fileName, mediaType: ref.mimeType, bytes: body.byteLength });
      }
    }
  }

  const record = await openCase({
    locale,
    patient: {
      name: fields.name || "Telegram patient",
      phone: fields.phone || "",
      country: fields.country || "Unknown",
      email: null,
    },
    intake: {
      route: uploads.length > 0 ? "reports" : "description",
      statedNeed: fields.treatment || "",
      description,
      answers: null,
      meta,
      uploads,
      forPlanner: uploads.map((u) => ({
        filename: u.filename,
        mediaType: u.mediaType,
        data: /^(application\/pdf|image\/(png|jpeg|gif|webp))$/.test(u.mediaType)
          ? u.body.toString("base64")
          : "",
      })),
      tooLarge: false,
    },
    source: "telegram",
    referredBy: null,
  });

  const contact = await getTelegramContact("patient", intake.telegramUserId);
  const partner = await partnerByCode(contact?.referralCode).catch(() => null);
  if (partner) await attributeCase({ record, partner, channel: "telegram", by: "system" });

  await completeIntake(intake.telegramUserId, record._id);
  await linkContactToCase("patient", intake.telegramUserId, record._id, null);
  await updateContactState("patient", intake.telegramUserId, "ready");

  const uploadNote = intake.uploads.length > 0
    ? `\n📎 ${intake.uploads.length} report(s) attached to your case.\n`
    : "";

  await sendMessage("patient", {
    chatId: intake.telegramChatId,
    text:
      `✅ <b>Your case has been created!</b>\n\n` +
      `📋 Reference: <code>${record._id}</code>\n` +
      uploadNote +
      `\nHere's what happens next:\n` +
      `1. Our medical team reviews your details\n` +
      `2. You'll receive a treatment plan with hospital options and costs\n` +
      `3. A coordinator will reach out to discuss next steps\n\n` +
      `This usually takes 24-48 hours. You can check your status anytime with /status\n\n` +
      `If you have more medical reports (scans, lab results), you can still send them here.`,
    keyboard: [
      [
        { text: "📊 Check status", callback_data: "action:status" },
        { text: "💬 Ask a question", callback_data: "action:query" },
      ],
    ],
  });

  return record._id;
}
