import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { PUBLIC_KINDS, readMedia } from "@/lib/media";

/** Whether a patient may see this owner's pictures: only once it is published. */
async function ownerIsPublic(ownerType: string, ownerId: string): Promise<boolean> {
  const db = await getDb();
  if (ownerType === "hospital") {
    return Boolean(await db.collection("hospitals").findOne({ _id: ownerId as never, "publication.state": "published" }, { projection: { _id: 1 } }));
  }
  return Boolean(
    await db
      .collection("doctors")
      .findOne({ _id: ownerId as never, consentToList: true, "publication.state": "published" }, { projection: { _id: 1 } }),
  );
}

/**
 * Onboarding files. Pictures of a published hospital or doctor are public;
 * everything else — certificates, agreements, anything still in draft — is for
 * the Shifain team only.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return new NextResponse("Not found", { status: 404 });
  const { id } = await params;
  const asset = await readMedia(id).catch(() => null);
  if (!asset) return new NextResponse("Not found", { status: 404 });

  const open = PUBLIC_KINDS.includes(asset.kind) && (await ownerIsPublic(asset.ownerType, asset.ownerId).catch(() => false));
  if (!open && !(await isAuthenticated())) return new NextResponse("Not found", { status: 404 });

  const viewable = /^(application\/pdf|image\/(png|jpeg|gif|webp))$/.test(asset.mediaType);
  return new NextResponse(new Uint8Array(asset.body), {
    headers: {
      "Content-Type": viewable ? asset.mediaType : "application/octet-stream",
      "Content-Disposition": `${viewable ? "inline" : "attachment"}; filename="${asset.filename.replace(/["\r\n]/g, "")}"`,
      "Cache-Control": open ? "public, max-age=3600" : "no-store, private",
      "X-Content-Type-Options": "nosniff",
      ...(open ? {} : { "X-Robots-Tag": "noindex, nofollow" }),
    },
  });
}
