import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { isAuthenticated } from "@/lib/auth";
import { isMailConfigured } from "@/lib/mailer";
import { isTelegramConfigured } from "@/lib/telegram";
import { isElevenLabsConfigured } from "@/lib/elevenlabs";
import { isWhatsAppConfigured } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — for an uptime monitor and Render's health check.
 * 200 when the database answers, 503 when it does not. Anyone sees only
 * ok/not ok; the owner, signed in, also sees which services are set up.
 */
export async function GET() {
  const started = Date.now();
  let database = false;
  if (isDatabaseConfigured()) {
    try {
      const db = await getDb();
      await Promise.race([db.command({ ping: 1 }), new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5_000))]);
      database = true;
    } catch (error) {
      console.error("[shifain] health: database did not answer", error);
    }
  }
  const body: Record<string, unknown> = { ok: database, ms: Date.now() - started };
  if (await isAuthenticated().catch(() => false)) {
    body.services = {
      database,
      mail: isMailConfigured(),
      ai: Boolean(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY),
      telegram: isTelegramConfigured("patient"),
      whatsapp: isWhatsAppConfigured(),
      voice: isElevenLabsConfigured(),
      baseUrl: Boolean(process.env.BASE_URL),
    };
  }
  return NextResponse.json(body, { status: database ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
