import { NextResponse, type NextRequest } from "next/server";
import { handleUpdate } from "@/lib/telegram-bot";
import { webhookSecret } from "@/lib/telegram";
import type { TgUpdate, BotRole } from "@/lib/telegram";

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
