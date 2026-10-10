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
  messages: { role: "user" | "assistant"; content: string; ts: string }[];
  uploads: IntakeUploadRef[];
  createdAt: string;
  updatedAt: string;
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

export async function getOrCreateWebIntake(sessionId: string): Promise<WebIntake> {
  const db = await getDb();

  const existing = await db
    .collection<WebIntake>(COLLECTION)
    .findOne({ _id: sessionId, complete: false });

  if (existing) return existing;

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
  role: "user" | "assistant",
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
