import { NextResponse, type NextRequest } from "next/server";
import { publicOrigin } from "@/lib/origin";
import { setWebhook, deleteWebhook, getWebhookInfo, getMe, isTelegramConfigured, type BotRole } from "@/lib/telegram";
import { isAuthenticated } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const role = (request.nextUrl.searchParams.get("bot") ?? "patient") as BotRole;
  const action = request.nextUrl.searchParams.get("action") ?? "register";

  if (!isTelegramConfigured(role)) {
    return NextResponse.json(
      { error: `Telegram ${role} bot token is not configured` },
      { status: 400 },
    );
  }

  if (action === "unregister") {
    await deleteWebhook(role);
    return NextResponse.json({ ok: true, message: `${role} webhook removed` });
  }

  const baseUrl = publicOrigin(request);
  const webhookUrl = `${baseUrl}/api/telegram/webhook?bot=${role}`;

  await setWebhook(role, webhookUrl);

  const bot = await getMe(role);

  return NextResponse.json({
    ok: true,
    bot: { username: bot.username, name: bot.first_name },
    webhook: webhookUrl,
  });
}

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const role = (request.nextUrl.searchParams.get("bot") ?? "patient") as BotRole;

  if (!isTelegramConfigured(role)) {
    return NextResponse.json({ configured: false });
  }

  const [info, bot] = await Promise.all([
    getWebhookInfo(role).catch(() => null),
    getMe(role).catch(() => null),
  ]);

  return NextResponse.json({
    configured: true,
    bot: bot ? { username: bot.username, name: bot.first_name } : null,
    webhook: info,
  });
}
