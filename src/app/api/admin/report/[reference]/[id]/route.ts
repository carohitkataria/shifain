import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { readReport } from "@/lib/reports";

/**
 * Hands a stored report to a signed-in coordinator. Patient records, so the
 * admin session is checked on every request and nothing is cached anywhere.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string; id: string }> },
) {
  if (!(await isAuthenticated())) return new NextResponse("Not found", { status: 404 });
  if (!isDatabaseConfigured()) return new NextResponse("Not found", { status: 404 });

  const { reference, id } = await params;
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
