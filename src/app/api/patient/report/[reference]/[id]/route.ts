import { NextResponse } from "next/server";
import { ownedCase } from "@/lib/patient-portal";
import { readReport } from "@/lib/reports";

/** A patient's own stored report, only to the patient who owns the case. Never cached. */
export async function GET(_request: Request, { params }: { params: Promise<{ reference: string; id: string }> }) {
  const { reference, id } = await params;
  const owned = await ownedCase(reference);
  if (!owned) return new NextResponse("Not found", { status: 404 });

  const report = await readReport(owned.record._id, `${owned.record._id}-${id}`).catch(() => null);
  if (!report) return new NextResponse("Not found", { status: 404 });

  // Only documents a browser shows safely open inline; anything else downloads.
  const viewable = /^(application\/pdf|image\/(png|jpeg|gif|webp))$/.test(report.mediaType);
  return new NextResponse(new Uint8Array(report.body), {
    headers: {
      "Content-Type": viewable ? report.mediaType : "application/octet-stream",
      "Content-Disposition": `${viewable ? "inline" : "attachment"}; filename="${report.filename.replace(/["\r\n]/g, "")}"`,
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
