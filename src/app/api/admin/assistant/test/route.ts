import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { isLocale } from "@/lib/i18n";
import { handleWebTurn } from "@/lib/assistant/web-turn";
import { resetWebIntake } from "@/lib/web-intake";

const COOKIE = "shifain_assistant_test";

/**
 * The console's test chat: the same engine patients talk to, on a test
 * conversation that never opens a real case. POST { message, locale } or
 * { reset: true } to start over.
 */
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "The database is not configured." }, { status: 503 });

  const jar = await cookies();
  let id = jar.get(COOKIE)?.value;
  const body = await request.json().catch(() => ({}));
  if (!id || body.reset === true) {
    id = `admin-test-${crypto.randomBytes(6).toString("hex")}`;
    jar.set(COOKIE, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
    await resetWebIntake(id);
    if (body.reset === true) return NextResponse.json({ ok: true });
  }

  const message = String(body.message ?? "").trim().slice(0, 2000);
  if (!message) return NextResponse.json({ error: "No message." }, { status: 400 });
  const locale = isLocale(String(body.locale)) ? (String(body.locale) as "en" | "ru" | "uz") : "en";

  try {
    const turn = await handleWebTurn({ sessionId: id, text: message, locale, dryRun: true });
    return NextResponse.json(turn);
  } catch (error) {
    console.error("[shifain] assistant test failed", error);
    return NextResponse.json({ error: "The assistant could not answer. Check the server log." }, { status: 500 });
  }
}
