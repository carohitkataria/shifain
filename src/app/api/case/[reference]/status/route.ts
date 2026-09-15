import { NextResponse } from "next/server";
import { getCase } from "@/lib/cases";
import { isDatabaseConfigured } from "@/lib/db";

/** Lets the plan page wait for the planner without holding a request open. */
export async function GET(_request: Request, { params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  if (!isDatabaseConfigured()) return NextResponse.json({ status: "unknown" }, { status: 503 });

  try {
    const record = await getCase(reference);
    if (!record) return NextResponse.json({ status: "unknown" }, { status: 404 });
    return NextResponse.json({ status: record.status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[shifain] could not read case status", reference, error);
    return NextResponse.json({ status: "unknown" }, { status: 503 });
  }
}
