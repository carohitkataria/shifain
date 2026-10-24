import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import { defaultContent } from "./default-content";
import { getDb, isDatabaseConfigured, readOr } from "./db";
import type { SiteContent } from "./content-types";

/**
 * The homepage's words live in MongoDB, in one `site_content` document: the
 * published copy the site shows, and the draft the website editor is working
 * on. A deploy replaces the server's disk, so anything kept in a file there
 * disappeared with every code update — the database is the only place an edit
 * survives. The file is still read when no database is configured (a laptop
 * with no MONGODB_URI), and is imported into the database the first time one
 * is, so nothing typed locally is lost either.
 */
const CONTENT_PATH = process.env.SHIFAIN_CONTENT_PATH || path.join(process.cwd(), "content", "homepage.json");
const DOC_ID = "homepage";

type Plain = Record<string, unknown>;

type StoredContent = {
  _id: string;
  /** What the site shows; overlaid on the shipped defaults. Absent until the first publish. */
  published?: Plain | null;
  /** The editor's unpublished work, a whole SiteContent. */
  draft?: Plain | null;
  draftUpdatedAt?: string | null;
};

const isPlainObject = (value: unknown): value is Plain => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Overlays stored content on top of the defaults. Keys the code knows about but
 * the stored copy predates keep their default value, so shipping a new field
 * never blanks the live homepage.
 */
function merge<T>(base: T, override: unknown): T {
  if (Array.isArray(base)) {
    return (Array.isArray(override) ? override : base) as T;
  }
  if (isPlainObject(base)) {
    if (!isPlainObject(override)) return base;
    const out: Plain = { ...base };
    for (const key of Object.keys(base as Plain)) {
      if (key in override) out[key] = merge((base as Plain)[key], override[key]);
    }
    return out as T;
  }
  return (override === undefined ? base : override) as T;
}

const overlay = (stored: unknown): SiteContent => structuredClone(merge(defaultContent, stored ?? {}));

async function readFile(): Promise<Plain | null> {
  try {
    return JSON.parse(await fs.readFile(CONTENT_PATH, "utf8")) as Plain;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") console.error("[shifain] could not read content file:", error);
    return null;
  }
}

/** The stored document, importing a leftover content file the first time the database is used. */
async function readDoc(): Promise<StoredContent | null> {
  const db = await getDb();
  const doc = await db.collection<StoredContent>("site_content").findOne({ _id: DOC_ID });
  if (doc) return doc;
  const file = await readFile();
  if (!file) return null;
  const imported: StoredContent = { _id: DOC_ID, published: file, draft: null, draftUpdatedAt: null };
  await db.collection<StoredContent>("site_content").updateOne({ _id: DOC_ID }, { $setOnInsert: imported }, { upsert: true });
  return imported;
}

/**
 * Reads the published homepage content, falling back to the shipped defaults.
 * The result is always a deep copy: callers edit it in place before publishing,
 * and `defaultContent` is a shared module object that must stay pristine.
 * Cached per request, since the layout and the page both ask.
 */
export const getContent = cache(async (): Promise<SiteContent> => {
  if (!isDatabaseConfigured()) return overlay(await readFile());
  const doc = await readOr<StoredContent | null>(null, () => readDoc());
  return overlay(doc?.published);
});

/** What the website editor opens: the unpublished draft if there is one, else the live copy. */
export async function getDraft(): Promise<{ content: SiteContent; hasDraft: boolean; draftUpdatedAt: string | null; live: SiteContent }> {
  if (!isDatabaseConfigured()) {
    const live = overlay(await readFile());
    return { content: live, hasDraft: false, draftUpdatedAt: null, live };
  }
  const doc = await readOr<StoredContent | null>(null, () => readDoc());
  const live = overlay(doc?.published);
  return doc?.draft ? { content: overlay(doc.draft), hasDraft: true, draftUpdatedAt: doc.draftUpdatedAt ?? null, live } : { content: live, hasDraft: false, draftUpdatedAt: null, live };
}

/** Keeps the editor's work between visits without touching what the site shows. */
export async function saveDraft(content: SiteContent): Promise<string> {
  const at = new Date().toISOString();
  if (!isDatabaseConfigured()) throw new Error("MONGODB_URI is not set.");
  const db = await getDb();
  await db.collection<StoredContent>("site_content").updateOne({ _id: DOC_ID }, { $set: { draft: content as unknown as Plain, draftUpdatedAt: at } }, { upsert: true });
  return at;
}

/** Drops the unpublished draft; the editor reopens on the live copy. */
export async function discardDraft(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = await getDb();
  await db.collection<StoredContent>("site_content").updateOne({ _id: DOC_ID }, { $set: { draft: null, draftUpdatedAt: null } });
}

/** Publishes new homepage content, and clears any draft it came from. */
export async function saveContent(content: SiteContent): Promise<void> {
  const next: SiteContent = {
    ...content,
    version: (content.version ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  if (!isDatabaseConfigured()) {
    await fs.mkdir(path.dirname(CONTENT_PATH), { recursive: true });
    await fs.writeFile(CONTENT_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    return;
  }
  const db = await getDb();
  await db.collection<StoredContent>("site_content").updateOne({ _id: DOC_ID }, { $set: { published: next as unknown as Plain, draft: null, draftUpdatedAt: null } }, { upsert: true });
}

/** Restores the shipped defaults by removing the stored copy and any draft. */
export async function resetContent(): Promise<void> {
  if (!isDatabaseConfigured()) {
    await fs.rm(CONTENT_PATH, { force: true });
    return;
  }
  const db = await getDb();
  await db.collection<StoredContent>("site_content").updateOne({ _id: DOC_ID }, { $set: { published: null, draft: null, draftUpdatedAt: null } }, { upsert: true });
}

export { CONTENT_PATH };
