import { NextResponse } from "next/server";
import { isFreshlyVerified, ownedCase } from "@/lib/patient-portal";
import { audit } from "@/lib/audit";
import { readReport } from "@/lib/reports";

/** A patient's own stored report, only to the patient who owns the case. Never cached. */
export async function GET(request: Request, { params }: { params: Promise<{ reference: string; id: string }> }) {
  const { reference, id } = await params;
  const owned = await ownedCase(reference, "reports");
  if (!owned) return new NextResponse("Not found", { status: 404 });
  // Opening a report needs a recent sign-in; older, and the patient is asked for a fresh code.
  const fresh = await isFreshlyVerified();
  await audit({ session: "web", method: "action:portal-open-report", reference: owned.record._id, result: fresh ? "ok" : "needs-code", ip: null });
  if (!fresh) return NextResponse.redirect(new URL(`/${owned.record.locale || "en"}/portal/patient/login?error=fresh`, request.url), 303);

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
