import { NextResponse } from "next/server";
import { deskCase } from "@/lib/desk";
import { readReport } from "@/lib/reports";

/**
 * Hands a stored report to the desk: the owner console or the case's coordinator. Patient records, so the
 * admin session is checked on every request and nothing is cached anywhere.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string; id: string }> },
) {
  const { reference, id } = await params;
  // The owner console, or the coordinator the case is assigned to.
  if (!(await deskCase(reference))) return new NextResponse("Not found", { status: 404 });
  const report = await readReport(reference, id).catch(() => null);
  if (!report) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(report.body), {
    headers: {
      "Content-Type": report.mediaType,
      "Content-Disposition": `inline; filename="${report.filename.replace(/"/g, "")}"`,
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
