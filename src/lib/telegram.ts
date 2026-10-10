import "server-only";

/**
 * Telegram Bot API client. Thin wrapper over the HTTPS API — no SDK needed,
 * it is just JSON over fetch.
 *
 * Two bots:
 *   TELEGRAM_PATIENT_BOT_TOKEN  — the patient-facing bot
 *   TELEGRAM_PARTNER_BOT_TOKEN  — the partner/doctor-facing bot
 *
 * When only TELEGRAM_BOT_TOKEN is set, both roles share it.
 */

// ------------------------------------------------------------------ config

function patientToken(): string | null {
  return process.env.TELEGRAM_PATIENT_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || null;
}

function partnerToken(): string | null {
  return process.env.TELEGRAM_PARTNER_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || null;
}

export type BotRole = "patient" | "partner";

function tokenFor(role: BotRole): string | null {
  return role === "patient" ? patientToken() : partnerToken();
}

export function isTelegramConfigured(role: BotRole = "patient"): boolean {
  return Boolean(tokenFor(role));
}

// ------------------------------------------------------------------ API

const API = "https://api.telegram.org";

type TgResult<T> = { ok: true; result: T } | { ok: false; description: string };

async function call<T>(token: string, method: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as TgResult<T>;
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description}`);
  return json.result;
}

// ------------------------------------------------------------------ types

export type TgUser = {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

export type TgChat = {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type TgMessage = {
  message_id: number;
  from?: TgUser;
  chat: TgChat;
  date: number;
  text?: string;
  contact?: { phone_number: string; first_name: string; user_id?: number };
  voice?: { file_id: string; file_unique_id: string; duration: number; mime_type?: string; file_size?: number };
  audio?: { file_id: string; file_unique_id: string; duration: number; mime_type?: string; file_size?: number };
  photo?: { file_id: string; file_unique_id: string; width: number; height: number; file_size?: number }[];
  document?: { file_id: string; file_unique_id: string; file_name?: string; mime_type?: string; file_size?: number };
  caption?: string;
};

export type TgUpdate = {
  update_id: number;
  message?: TgMessage;
  callback_query?: {
    id: string;
    from: TgUser;
    message?: TgMessage;
    data?: string;
  };
};

// ------------------------------------------------------------------ send

export type InlineButton = { text: string; callback_data: string };
export type InlineRow = InlineButton[];

export type SendOptions = {
  text: string;
  chatId: number;
  parseMode?: "HTML" | "MarkdownV2";
  keyboard?: InlineRow[];
  requestContact?: boolean;
};

export async function sendMessage(role: BotRole, opts: SendOptions): Promise<TgMessage> {
  const token = tokenFor(role);
  if (!token) throw new Error(`Telegram ${role} bot is not configured.`);

  const body: Record<string, unknown> = {
    chat_id: opts.chatId,
    text: opts.text,
    parse_mode: opts.parseMode ?? "HTML",
  };

  if (opts.keyboard) {
    body.reply_markup = { inline_keyboard: opts.keyboard };
  } else if (opts.requestContact) {
    body.reply_markup = {
      keyboard: [[{ text: "📱 Share my phone number", request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    };
  }

  return call<TgMessage>(token, "sendMessage", body);
}

export async function answerCallback(role: BotRole, callbackId: string, text?: string): Promise<void> {
  const token = tokenFor(role);
  if (!token) return;
  await call(token, "answerCallbackQuery", { callback_query_id: callbackId, text });
}

// ------------------------------------------------------------------ files

export type TgFile = {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
};

export async function getFile(role: BotRole, fileId: string): Promise<TgFile> {
  const token = tokenFor(role);
  if (!token) throw new Error(`Telegram ${role} bot is not configured.`);
  return call<TgFile>(token, "getFile", { file_id: fileId });
}

export async function downloadFile(role: BotRole, filePath: string): Promise<Buffer> {
  const token = tokenFor(role);
  if (!token) throw new Error(`Telegram ${role} bot is not configured.`);
  const res = await fetch(`${API}/file/bot${token}/${filePath}`);
  if (!res.ok) throw new Error(`Telegram file download ${res.status}`);
  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}

export async function sendVoice(role: BotRole, chatId: number, audioBuffer: Buffer, caption?: string): Promise<TgMessage> {
  const token = tokenFor(role);
  if (!token) throw new Error(`Telegram ${role} bot is not configured.`);

  const form = new FormData();
  form.append("chat_id", String(chatId));
  form.append("voice", new Blob([new Uint8Array(audioBuffer)], { type: "audio/mpeg" }), "reply.mp3");
  if (caption) {
    form.append("caption", caption);
    form.append("parse_mode", "HTML");
  }

  const res = await fetch(`${API}/bot${token}/sendVoice`, {
    method: "POST",
    body: form,
  });
  const json = (await res.json()) as { ok: true; result: TgMessage } | { ok: false; description: string };
  if (!json.ok) throw new Error(`Telegram sendVoice: ${json.description}`);
  return json.result;
}

// ------------------------------------------------------------------ webhook

export async function setWebhook(role: BotRole, url: string): Promise<void> {
  const token = tokenFor(role);
  if (!token) throw new Error(`Telegram ${role} bot is not configured.`);
  await call(token, "setWebhook", {
    url,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
}

export async function deleteWebhook(role: BotRole): Promise<void> {
  const token = tokenFor(role);
  if (!token) return;
  await call(token, "deleteWebhook", { drop_pending_updates: true });
}

export async function getWebhookInfo(role: BotRole): Promise<{ url: string }> {
  const token = tokenFor(role);
  if (!token) throw new Error(`Telegram ${role} bot is not configured.`);
  return call(token, "getWebhookInfo");
}

// ------------------------------------------------------------------ bot info

export async function getMe(role: BotRole): Promise<TgUser> {
  const token = tokenFor(role);
  if (!token) throw new Error(`Telegram ${role} bot is not configured.`);
  return call(token, "getMe");
}
