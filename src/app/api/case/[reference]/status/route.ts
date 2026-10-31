import { NextResponse } from "next/server";
import { getCase } from "@/lib/cases";
import { mayViewCase } from "@/lib/case-access";
import { isDatabaseConfigured } from "@/lib/db";

/** Lets the plan page wait for the planner without holding a request open. */
export async function GET(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  if (!isDatabaseConfigured()) return NextResponse.json({ status: "unknown" }, { status: 503 });

  try {
    const record = await getCase(reference.trim().toUpperCase());
    // The same answer for a case that does not exist and one this browser may not see.
    if (!record || !(await mayViewCase(record))) return NextResponse.json({ status: "unknown" }, { status: 404 });
    return NextResponse.json({ status: record.status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[shifain] could not read case status", reference, error);
    return NextResponse.json({ status: "unknown" }, { status: 503 });
  }
}
