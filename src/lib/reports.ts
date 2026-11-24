import "server-only";
import { Binary } from "mongodb";
import { getDb } from "./db";

/**
 * Uploaded reports are part of the patient's record and are kept for good.
 * Nothing removes them on a timer: they go only when the team deletes the
 * case in the console.
 *
 * They live in the database because that is what this deployment has. It is
 * the right boundary to move to object storage behind: a case holds only ids,
 * so swapping the backing store touches this file and nothing else.
 */

/** A single document caps at 16MB, so a file has to stay clear of that. */
export const MAX_REPORT_BYTES = 14 * 1024 * 1024;

export type StoredReport = {
  _id: string;
  reference: string;
  filename: string;
  mediaType: string;
  bytes: number;
  uploadedAt: string;
};

export type ReportUpload = {
  id: string;
  filename: string;
  mediaType: string;
  body: Buffer;
};

/** The database's own rule for a stored file: what it must have, and nothing about when it goes. */
const REPORT_VALIDATOR = {
  $jsonSchema: {
    bsonType: "object",
    required: ["_id", "reference", "filename", "mediaType", "bytes", "uploadedAt"],
    properties: {
      reference: { bsonType: "string" },
      filename: { bsonType: "string" },
      mediaType: { bsonType: "string" },
      bytes: { bsonType: ["int", "long"] },
      data: { bsonType: "binData" },
      uploadedAt: { bsonType: ["string", "date"] },
    },
  },
};

/**
 * Earlier versions deleted files thirty days after upload, through an index
 * that makes MongoDB remove documents by date, and the database's rule for
 * the collection required that date. Both are taken away here, once per
 * process, so a database set up by an older version stops deleting files and
 * accepts them without a date. Runs at start-up (instrumentation.ts) and again
 * before the first file is written.
 */
let storageReady: Promise<void> | null = null;

export function ensureReportStorage(): Promise<void> {
  storageReady ??= (async () => {
    const db = await getDb();
    const reports = db.collection("case_reports");
    const existing = await reports.indexes().catch(() => []);
    for (const index of existing) {
      if (typeof index.expireAfterSeconds === "number" && index.name) {
        await reports.dropIndex(index.name);
        console.log(`[shifain] report storage: removed the timed-deletion index ${index.name}; files are now kept`);
      }
    }
    await reports.createIndex({ reference: 1 });
    await db
      .command({ collMod: "case_reports", validator: REPORT_VALIDATOR, validationLevel: "moderate" })
      .then(() => console.log("[shifain] report storage: files are kept until deleted by the team"))
      .catch(async (error: { codeName?: string; code?: number }) => {
        // A fresh database has no collection yet: create it with the rule.
        if (error?.code === 26 || error?.codeName === "NamespaceNotFound") {
          await db.createCollection("case_reports", { validator: REPORT_VALIDATOR, validationLevel: "moderate" });
          return;
        }
        console.error("[shifain] report storage: could not update the database rule for stored files (run npm run db:seed with an admin connection)", error?.codeName ?? error);
      });
  })().catch((error) => {
    storageReady = null;
    throw error;
  });
  return storageReady;
}

/** Stores the files for a case. A failure here must not lose the case. */
export async function storeReports(reference: string, uploads: ReportUpload[]): Promise<number> {
  const keepable = uploads.filter((upload) => upload.body.byteLength <= MAX_REPORT_BYTES);
  if (keepable.length === 0) return 0;

  await ensureReportStorage();
  const uploadedAt = new Date().toISOString();

  const db = await getDb();
  await db.collection("case_reports").insertMany(
    keepable.map((upload) => ({
      _id: `${reference}-${upload.id}`,
      reference,
      filename: upload.filename,
      mediaType: upload.mediaType,
      bytes: upload.body.byteLength,
      data: new Binary(upload.body),
      uploadedAt,
    })) as never,
    { ordered: false },
  );
  return keepable.length;
}

/** The files still held for a case, without their contents. */
export async function listReports(reference: string): Promise<StoredReport[]> {
  const db = await getDb();
  return db
    .collection<StoredReport>("case_reports")
    .find({ reference }, { projection: { data: 0 } })
    .sort({ uploadedAt: 1 })
    .toArray();
}

export async function readReport(
  reference: string,
  id: string,
): Promise<{ filename: string; mediaType: string; body: Buffer } | null> {
  const db = await getDb();
  const row = await db
    .collection<StoredReport & { data?: Binary }>("case_reports")
    .findOne({ _id: id, reference });
  if (!row?.data) return null;
  return { filename: row.filename, mediaType: row.mediaType, body: Buffer.from(row.data.buffer) };
}
