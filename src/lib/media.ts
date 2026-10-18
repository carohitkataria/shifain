import "server-only";
import crypto from "node:crypto";
import { Binary } from "mongodb";
import { getDb } from "./db";

/**
 * Files attached to hospitals and doctors during onboarding: logos, gallery
 * pictures, certificates, the signed agreement. They live in the database, as
 * reports do, because that is the storage this deployment has; callers hold
 * only ids, so moving to object storage later touches this file alone.
 */

export type MediaKind = "logo" | "cover" | "gallery" | "photo" | "certificate" | "agreement";
export type MediaOwner = "hospital" | "doctor";

export type MediaAsset = {
  _id: string;
  ownerType: MediaOwner;
  ownerId: string;
  kind: MediaKind;
  filename: string;
  mediaType: string;
  bytes: number;
  uploadedAt: string;
};

/** Pictures a patient may see once the owner is published; certificates and agreements never. */
export const PUBLIC_KINDS: MediaKind[] = ["logo", "cover", "gallery", "photo"];

export const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
const IMAGE = /^image\/(png|jpeg|webp|gif)$/;
const DOCUMENT = /^(application\/pdf|image\/(png|jpeg|webp))$/;

/** Whether this file is acceptable for this use, before it is stored. */
export function acceptable(file: File | null | undefined, kind: MediaKind): file is File {
  if (!file || typeof file === "string" || !file.size || file.size > MAX_MEDIA_BYTES) return false;
  return (kind === "certificate" || kind === "agreement" ? DOCUMENT : IMAGE).test(file.type);
}

/** Stores one file and returns its id, or null if it was empty or not acceptable. */
export async function storeMedia(file: File | null | undefined, owner: { type: MediaOwner; id: string }, kind: MediaKind): Promise<string | null> {
  if (!acceptable(file, kind)) return null;
  const id = `m-${crypto.randomBytes(9).toString("base64url")}`;
  const db = await getDb();
  await db.collection("media_assets").insertOne({
    _id: id,
    ownerType: owner.type,
    ownerId: owner.id,
    kind,
    filename: file.name.slice(0, 160) || kind,
    mediaType: file.type,
    bytes: file.size,
    data: new Binary(Buffer.from(await file.arrayBuffer())),
    uploadedAt: new Date().toISOString(),
  } as never);
  return id;
}

export async function mediaInfo(ids: string[]): Promise<MediaAsset[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  return db.collection<MediaAsset>("media_assets").find({ _id: { $in: ids } }, { projection: { data: 0 } }).toArray();
}

export async function readMedia(id: string): Promise<(MediaAsset & { body: Buffer }) | null> {
  const db = await getDb();
  const row = await db.collection<MediaAsset & { data?: Binary }>("media_assets").findOne({ _id: id });
  if (!row?.data) return null;
  const { data, ...info } = row;
  return { ...info, body: Buffer.from(data.buffer) };
}

/** Removes files no longer referenced, so replaced logos and dropped certificates do not pile up. */
export async function removeMedia(ids: (string | null | undefined)[]): Promise<void> {
  const list = ids.filter((id): id is string => Boolean(id));
  if (list.length === 0) return;
  const db = await getDb();
  await db.collection<MediaAsset>("media_assets").deleteMany({ _id: { $in: list } });
}

export const mediaUrl = (id: string) => `/api/media/${encodeURIComponent(id)}`;
