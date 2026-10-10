import { NextResponse, type NextRequest } from "next/server";
import { handleUpdate } from "@/lib/telegram-bot";
import type { TgUpdate, BotRole } from "@/lib/telegram";
import crypto from "node:crypto";

/**
 * Telegram webhook receiver.
 *
 * POST /api/telegram/webhook?bot=patient
 * POST /api/telegram/webhook?bot=partner
 *
 * The `secret_token` header is verified against a hash of the bot token
 * to reject spoofed requests. Telegram sends this header when we set
 * `secret_token` during webhook registration.
 */

function webhookSecret(role: BotRole): string | null {
  const token =
    role === "patient"
      ? process.env.TELEGRAM_PATIENT_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN
      : process.env.TELEGRAM_PARTNER_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  return crypto.createHash("sha256").update(token).digest("hex").slice(0, 32);
}

export async function POST(request: NextRequest) {
  const role = (request.nextUrl.searchParams.get("bot") ?? "patient") as BotRole;
  if (role !== "patient" && role !== "partner") {
    return NextResponse.json({ error: "invalid bot role" }, { status: 400 });
  }

  const secret = webhookSecret(role);
  if (secret) {
    const header = request.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  let update: TgUpdate;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  try {
    await handleUpdate(role, update);
  } catch (error) {
    console.error(`[shifain] webhook ${role} handler error:`, error);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ status: "Telegram webhook is active" });
}
