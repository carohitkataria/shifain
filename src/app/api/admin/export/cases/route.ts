import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { caseRows, allCases } from "@/lib/console";

const cell = (value: unknown) => {
  const text = value == null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * GET /api/admin/export/cases?months=6 — the cases of a period as a CSV for a
 * spreadsheet. Owner console only; contact details stay out of it.
 */
export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) return new NextResponse("Not found", { status: 404 });
  const months = Math.min(24, Math.max(1, Number(request.nextUrl.searchParams.get("months")) || 6));
  const since = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - (months - 1), 1)).toISOString();
  const [rows, cases] = await Promise.all([caseRows(), allCases()]);
  const created = new Map(cases.map((record) => [record._id, record.createdAt]));
  const header = ["Case", "Opened", "Stage", "Patient", "Country", "Source", "Treatment", "Hospital", "Coordinator", "Quote", "Currency"];
  const lines = rows
    .filter((row) => (created.get(row.id) ?? "") >= since)
    .map((row) => [row.id, created.get(row.id)?.slice(0, 10), row.status, row.name, row.country, row.source, row.treatment, row.hospital, row.coordinator, row.value, row.currency].map(cell).join(","));
  return new NextResponse(`${header.join(",")}\n${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="shifain-cases-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store, private",
    },
  });
}
