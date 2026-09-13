import "server-only";
import { Binary } from "mongodb";
import { getDb } from "./db";

/**
 * Uploaded reports are kept for thirty days, long enough for a coordinator and
 * the treating hospital to work from them, then removed by MongoDB itself via
 * the TTL index on expiresAt. Nothing has to remember to clean up.
 *
 * They live in the database because that is what this deployment has. It is
 * the right boundary to move to object storage behind: a case holds only ids,
 * so swapping the backing store touches this file and nothing else.
 */
export const RETENTION_DAYS = 30;

/** A single document caps at 16MB, so a file has to stay clear of that. */
export const MAX_REPORT_BYTES = 14 * 1024 * 1024;

export type StoredReport = {
  _id: string;
  reference: string;
  filename: string;
  mediaType: string;
  bytes: number;
  uploadedAt: string;
  expiresAt: Date;
};

export type ReportUpload = {
  id: string;
  filename: string;
  mediaType: string;
  body: Buffer;
};

export function expiryFromNow(): Date {
  return new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Retention is enforced by MongoDB, not by anything remembering to run: a TTL
 * index on expiresAt removes a report the moment it is thirty days old.
 *
 * The index is created here rather than only by the seed script, because the
 * seed needs a terminal and the promise that reports are deleted should not
 * depend on someone having one. It is idempotent and runs once per process.
 */
let ttlReady: Promise<void> | null = null;

function ensureRetention(): Promise<void> {
  ttlReady ??= (async () => {
    const db = await getDb();
    await db
      .collection("case_reports")
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_ttl" });
    await db.collection("case_reports").createIndex({ reference: 1 });
  })().catch((error) => {
    // Retry on the next upload rather than leaving files without an expiry.
    ttlReady = null;
    throw error;
  });
  return ttlReady;
}

/** Stores the files for a case. A failure here must not lose the case. */
export async function storeReports(reference: string, uploads: ReportUpload[]): Promise<number> {
  const keepable = uploads.filter((upload) => upload.body.byteLength <= MAX_REPORT_BYTES);
  if (keepable.length === 0) return 0;

  // A file is never written before the rule that deletes it exists.
  await ensureRetention();

  const expiresAt = expiryFromNow();
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
      expiresAt,
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

/** Removes a case's files ahead of their expiry, when someone asks us to. */
export async function deleteReports(reference: string): Promise<number> {
  const db = await getDb();
  const result = await db.collection("case_reports").deleteMany({ reference });
  return result.deletedCount ?? 0;
}
