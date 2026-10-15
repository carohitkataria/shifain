import "server-only";
import crypto from "node:crypto";
import { Binary } from "mongodb";
import { getDb } from "./db";
import { openCase } from "./case-flow";
import { attributeFromCookie } from "./referrals";
import { MAX_REPORT_BYTES, type ReportUpload } from "./reports";
import {
  type IntakeField,
  type IntakeState,
  type IntakeUploadRef,
  missingRequired,
  isIntakeReady,
  nextProfileQuestion,
} from "./conversation-intake";
import type { Locale } from "./i18n";

export { isIntakeReady, nextProfileQuestion };

export type WebIntake = {
  _id: string;
  sessionId: string;
  fields: IntakeField;
  state: IntakeState;
  complete: boolean;
  caseReference: string | null;
  messages: WebMessage[];
  uploads: IntakeUploadRef[];
  /** Asked for after the phone number; optional, so the patient can sign in by email later. */
  email?: string | null;
  emailSkipped?: boolean;
  /** The page language the conversation started in. */
  locale?: string;
  /** The language the patient writes or speaks in, once clear. */
  language?: string;
  /** A coordinator has taken over: the AI stays quiet until they hand it back. */
  handoff?: boolean;
  /** A command waiting on an answer — "what's your email?" — or null. */
  command?: PendingCommand | null;
  /** When the patient asked for a person; a coordinator picks it up from Messages. */
  humanRequestedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** "coordinator" is a person on the ShifaIn team replying from the console. */
export type WebMessage = { role: "user" | "assistant" | "coordinator"; content: string; ts: string };

export type PendingCommand = {
  name: string;
  step: string;
  data: Record<string, string | number | boolean>;
  /** A half-finished command is forgotten after a while, so an old question cannot swallow a new message. */
  expiresAt: string;
};

type StoredFile = {
  _id: string;
  intakeId: string;
  sessionId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  data: Binary;
  createdAt: string;
};

const COLLECTION = "web_intakes";
const FILES_COLLECTION = "web_intake_files";

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

/**
 * The conversation for this browser. A finished one is returned as it is —
 * follow-up questions belong with the case they followed — and only
 * `resetWebIntake` starts over, when the patient asks for a new case.
 */
export async function getOrCreateWebIntake(sessionId: string): Promise<WebIntake> {
  const db = await getDb();

  const existing = await db.collection<WebIntake>(COLLECTION).findOne({ _id: sessionId });
  if (existing) return existing;
  return resetWebIntake(sessionId);
}

/** The conversation for this browser, without creating one. */
export async function findWebIntake(sessionId: string): Promise<WebIntake | null> {
  const db = await getDb();
  return db.collection<WebIntake>(COLLECTION).findOne({ _id: sessionId });
}

/** A fresh conversation for this browser, keeping nothing of the last. */
export async function resetWebIntake(sessionId: string): Promise<WebIntake> {
  const db = await getDb();
  const now = new Date().toISOString();
  const record: WebIntake = {
    _id: sessionId,
    sessionId,
    fields: emptyFields(),
    state: "medical_chat",
    complete: false,
    caseReference: null,
    messages: [],
    uploads: [],
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<WebIntake>(COLLECTION).replaceOne(
    { _id: sessionId },
    record,
    { upsert: true },
  );
  return record;
}

/** The contact details a case needs, gathered after the medical picture. */
export function profileOf(intake: WebIntake) {
  return {
    name: intake.fields.name,
    phone: intake.fields.phone,
    country: intake.fields.country,
    email: intake.email ?? null,
    emailSkipped: intake.emailSkipped ?? false,
  };
}

export async function setWebIntakeProfileExtras(
  sessionId: string,
  extras: { email?: string | null; emailSkipped?: boolean; locale?: string; language?: string; handoff?: boolean },
): Promise<void> {
  const db = await getDb();
  await db
    .collection<WebIntake>(COLLECTION)
    .updateOne({ _id: sessionId }, { $set: { ...extras, updatedAt: new Date().toISOString() } });
}

export async function updateWebIntakeFields(
  sessionId: string,
  fields: Partial<IntakeField>,
): Promise<WebIntake> {
  const db = await getDb();
  const setFields: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const [k, v] of Object.entries(fields)) {
    if (v) setFields[`fields.${k}`] = v;
  }
  await db.collection<WebIntake>(COLLECTION).updateOne({ _id: sessionId }, { $set: setFields });
  return (await db.collection<WebIntake>(COLLECTION).findOne({ _id: sessionId }))!;
}

export async function pushWebIntakeMessage(
  sessionId: string,
  role: WebMessage["role"],
  content: string,
): Promise<void> {
  const db = await getDb();
  await db.collection<WebIntake>(COLLECTION).updateOne(
    { _id: sessionId },
    {
      $push: { messages: { role, content, ts: new Date().toISOString() } },
      $set: { updatedAt: new Date().toISOString() },
    },
  );
}

export async function setWebIntakeState(sessionId: string, state: IntakeState): Promise<void> {
  const db = await getDb();
  await db.collection<WebIntake>(COLLECTION).updateOne(
    { _id: sessionId },
    { $set: { state, updatedAt: new Date().toISOString() } },
  );
}

export async function storeWebIntakeFile(
  sessionId: string,
  file: { fileName: string; mimeType: string; fileSize: number; data: Buffer },
): Promise<string> {
  const db = await getDb();
  const id = `wupload-${crypto.randomBytes(6).toString("hex")}`;
  const now = new Date().toISOString();

  await db.collection<StoredFile>(FILES_COLLECTION).insertOne({
    _id: id,
    intakeId: sessionId,
    sessionId,
    fileName: file.fileName,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    data: new Binary(file.data),
    createdAt: now,
  });

  await db.collection<WebIntake>(COLLECTION).updateOne(
    { _id: sessionId },
    {
      $push: { uploads: { id, fileName: file.fileName, mimeType: file.mimeType, fileSize: file.fileSize, createdAt: now } },
      $set: { updatedAt: now },
    },
  );

  return id;
}

export async function createCaseFromWebIntake(
  intake: WebIntake,
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
      const stored = await db.collection<StoredFile>(FILES_COLLECTION).findOne({ _id: ref.id });
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
      name: fields.name || "Website patient",
      phone: fields.phone ? `+${fields.phone.replace(/\D/g, "")}` : "",
      country: fields.country || "Unknown",
      email: intake.email ?? null,
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
    source: "web-chat",
    referredBy: null,
  });
  await attributeFromCookie(record, "web-chat");

  const db = await getDb();
  await db.collection<WebIntake>(COLLECTION).updateOne(
    { _id: intake._id },
    { $set: { complete: true, state: "complete" as IntakeState, caseReference: record._id, updatedAt: new Date().toISOString() } },
  );

  return record._id;
}

export async function setPendingCommand(sessionId: string, command: Omit<PendingCommand, "expiresAt"> | null): Promise<void> {
  const db = await getDb();
  const value = command ? { ...command, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() } : null;
  await db
    .collection<WebIntake>(COLLECTION)
    .updateOne({ _id: sessionId }, { $set: { command: value, updatedAt: new Date().toISOString() } });
}

export function activeCommand(intake: WebIntake): PendingCommand | null {
  const command = intake.command;
  if (!command || Date.parse(command.expiresAt) < Date.now()) return null;
  return command;
}

export async function markHumanRequested(sessionId: string): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.collection<WebIntake>(COLLECTION).updateOne({ _id: sessionId }, { $set: { humanRequestedAt: now, updatedAt: now } });
}

// ---------------------------------------------------------------- console inbox

export type WebChatSummary = {
  id: string;
  name: string | null;
  phone: string | null;
  country: string | null;
  treatment: string | null;
  caseReference: string | null;
  state: IntakeState;
  handoff: boolean;
  humanRequestedAt: string | null;
  lastMessage: WebMessage | null;
  messageCount: number;
  updatedAt: string;
};

/** Website conversations for the console, newest first. Test chats from the console are left out. */
export async function listWebChats(limit = 60): Promise<WebChatSummary[]> {
  const db = await getDb();
  const rows = await db
    .collection<WebIntake>(COLLECTION)
    .find({ _id: { $not: /^admin-test-/ }, "messages.0": { $exists: true } } as never)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .toArray();
  return rows.map((row) => ({
    id: row._id,
    name: row.fields.name,
    phone: row.fields.phone,
    country: row.fields.country,
    treatment: row.fields.treatment,
    caseReference: row.caseReference,
    state: row.state,
    handoff: Boolean(row.handoff),
    humanRequestedAt: row.humanRequestedAt ?? null,
    lastMessage: row.messages[row.messages.length - 1] ?? null,
    messageCount: row.messages.length,
    updatedAt: row.updatedAt,
  }));
}

/** A coordinator writes into a website chat; the assistant stays quiet until handed back. */
export async function coordinatorReply(sessionId: string, text: string): Promise<boolean> {
  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.collection<WebIntake>(COLLECTION).updateOne(
    { _id: sessionId },
    {
      $push: { messages: { role: "coordinator", content: text.slice(0, 4000), ts: now } },
      $set: { handoff: true, updatedAt: now },
    },
  );
  return result.matchedCount > 0;
}
