import { NextResponse } from "next/server";
import { currentPatient } from "@/lib/patient-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { translateLine } from "@/lib/ai/translate";
import { PORTAL_LANGUAGES } from "@/lib/patient-portal";

/** Eighty lines per ten minutes per signed-in patient — plenty for a conversation, not enough to run up a bill. */
const WINDOW_MS = 10 * 60_000;
const LIMIT = 80;
const recent = new Map<string, number[]>();

function allow(key: string): boolean {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (hits.length >= LIMIT) return false;
  hits.push(now);
  recent.set(key, hits);
  return true;
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const identity = await currentPatient().catch(() => null);
  if (!identity) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { text?: unknown; from?: unknown; to?: unknown };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const from = PORTAL_LANGUAGES.find((item) => item.code === body.from);
  const to = PORTAL_LANGUAGES.find((item) => item.code === body.to);
  if (!text || !from || !to) return NextResponse.json({ error: "Nothing to translate." }, { status: 400 });

  const key = identity.kind === "email" ? identity.email : identity.digits;
  if (!allow(key)) return NextResponse.json({ error: "Too many lines at once. Wait a minute and try again." }, { status: 429 });

  if (from.code === to.code) return NextResponse.json({ translation: text });
  const translation = await translateLine(text, from.name, to.name);
  if (!translation) return NextResponse.json({ error: "Translation is not available right now." }, { status: 502 });
  return NextResponse.json({ translation });
}
