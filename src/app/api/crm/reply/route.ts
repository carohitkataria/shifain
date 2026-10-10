import { NextResponse, type NextRequest } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { sendCoordinatorReply } from "@/lib/telegram-notify";
import type { BotRole } from "@/lib/telegram";

/**
 * POST /api/crm/reply
 * Body: { telegramChatId, text, botRole?, caseReference? }
 *
 * Admin-only: sends a coordinator reply to a Telegram chat.
 */
export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const chatId = Number(body.telegramChatId);
  const text = String(body.text ?? "").trim();
  const role = (body.botRole ?? "patient") as BotRole;
  const caseRef = body.caseReference ?? null;

  if (!chatId || !text) {
    return NextResponse.json({ error: "chatId and text are required" }, { status: 400 });
  }

  const sent = await sendCoordinatorReply(chatId, role, text, caseRef);
  return NextResponse.json({ ok: sent });
}
