import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { isElevenLabsConfigured, transcribeAudio, cachedSpeech } from "@/lib/elevenlabs";
import { toUzCyrillic } from "@/lib/uz-cyrillic";
import { isDatabaseConfigured } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { getOrCreateWebIntake, storeWebIntakeFile, findWebIntake } from "@/lib/web-intake";
import { handleReportTurn, handleWebTurn } from "@/lib/assistant/web-turn";
import { DEFAULT_NATURAL_VOICE, VOICE_ID_PATTERN, naturalVoice } from "@/lib/voice/voices";
import { allowHit } from "@/lib/rate-limit";
import { audioSeconds } from "@/lib/audio-duration";
import { MAX_REPORT_BYTES } from "@/lib/reports";

const SESSION_COOKIE = "shifain_chat";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, so "what's my status" works when they come back

async function getSessionId(): Promise<string> {
  const jar = await cookies();
  let id = jar.get(SESSION_COOKIE)?.value;
  if (!id) {
    id = `web-${crypto.randomBytes(8).toString("hex")}`;
    jar.set(SESSION_COOKIE, id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
  }
  return id;
}

/**
 * What the browser can lean on for voice. Speaking: natural server voices
 * when ElevenLabs is configured and the admin allows them, otherwise the
 * device's own voice. Hearing: the browser's free recogniser, with the
 * server as the fallback (or always, if the admin chose that).
 */
export async function GET(request: NextRequest) {
  // Polling for a coordinator's replies: GET /api/chat?after=<ISO time>
  const after = request.nextUrl.searchParams.get("after");
  if (after !== null) {
    const id = (await cookies()).get(SESSION_COOKIE)?.value;
    const intake = id && isDatabaseConfigured() ? await findWebIntake(id).catch(() => null) : null;
    const since = Date.parse(after) || 0;
    const messages = (intake?.messages ?? [])
      .filter((message) => message.role === "coordinator" && Date.parse(message.ts) > since)
      .map((message) => ({ content: message.content, ts: message.ts }));
    return NextResponse.json({ messages, handoff: Boolean(intake?.handoff) }, { headers: { "Cache-Control": "no-store" } });
  }

  const settings = await getSettings();
  const configured = isElevenLabsConfigured();
  return NextResponse.json({
    voiceServer: configured,
    serverListening: configured && settings.serverListening,
    naturalVoices: configured && settings.voiceEngine === "natural",
    defaultVoiceId: settings.voiceId ?? DEFAULT_NATURAL_VOICE,
  });
}

const LANG = /^[a-z]{2,3}$/;

/** The public chat's limits: turns per conversation and per address, and how much one turn may carry. */
const CHAT_LIMITS = {
  turnsPerSession: 30,
  turnsPerAddress: 60,
  windowMs: 10 * 60_000,
  audioBytes: 8 * 1024 * 1024,
  audioSeconds: 65,
  fileBytes: MAX_REPORT_BYTES,
  fileTypes: /^(application\/pdf|image\/(png|jpeg|webp|heic|heif))$/,
};

type Lang = "en" | "ru" | "uz";
const LIMIT_WORDS: Record<"slow" | "audio" | "file", Record<Lang, string>> = {
  slow: {
    en: "You're sending messages faster than I can keep up. Please wait a few minutes and try again.",
    ru: "Сообщения приходят быстрее, чем я успеваю отвечать. Подождите несколько минут и попробуйте снова.",
    uz: "Xabarlar men javob berishga ulgurganimdan tezroq kelyapti. Bir necha daqiqa kutib, qayta urinib ko'ring.",
  },
  audio: {
    en: "I couldn't take that voice message. Please keep it under a minute, or type it.",
    ru: "Не получилось принять это голосовое сообщение. Говорите не дольше минуты или напишите текстом.",
    uz: "Bu ovozli xabarni qabul qila olmadim. Bir daqiqadan oshirmang yoki yozib yuboring.",
  },
  file: {
    en: "I can take reports as PDF or photos (JPG, PNG, WEBP, HEIC), up to 14 MB each. Please send it in one of those.",
    ru: "Я принимаю заключения в PDF или фото (JPG, PNG, WEBP, HEIC) до 14 МБ каждое. Пришлите, пожалуйста, в одном из этих форматов.",
    uz: "Xulosalarni PDF yoki rasm (JPG, PNG, WEBP, HEIC) shaklida, har biri 14 MB gacha qabul qilaman. Shu formatlardan birida yuboring.",
  },
};

const langOf = (locale: Locale): Lang => (locale === "ru" ? "ru" : locale === "uz" || locale === "oz" ? "uz" : "en");

function clientAddress(request: NextRequest): string {
  return (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

/** The server only ever speaks with a curated voice or the one the admin chose. */
function allowedVoice(requested: unknown, adminVoice: string | null): string {
  const fallback = adminVoice ?? DEFAULT_NATURAL_VOICE;
  if (typeof requested !== "string" || !VOICE_ID_PATTERN.test(requested)) return fallback;
  return naturalVoice(requested) || requested === adminVoice ? requested : fallback;
}

/**
 * POST /api/chat
 *
 * JSON: { message, voice?, lang?, locale?, voiceId?, rate? }
 *   or FormData with "audio" (spoken turn) or "file" (a report).
 *
 * Every message is first checked for an app command — "case status", "add
 * visa support", "sign me in" — which is carried out without any AI. Only
 * conversation goes on to the intake assistant.
 */
export async function POST(request: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Chat is not available right now. Please use the enquiry form." },
      { status: 503 },
    );
  }

  const sessionId = await getSessionId();
  const contentType = request.headers.get("content-type") ?? "";

  let userMessage = "";
  let detectedLanguage: string | undefined;
  let locale: Locale = DEFAULT_LOCALE;
  /** Voice conversation: answer aloud when the server can. */
  let wantsVoice = false;
  let heardFromAudio = false;
  let requestedVoice: unknown;
  let rate = 1;
  let uploadedFile: { fileName: string; mimeType: string; data: Buffer } | null = null;

  const readCommon = (get: (name: string) => unknown) => {
    const pageLocale = String(get("locale") ?? "");
    if (isLocale(pageLocale)) locale = pageLocale;
    requestedVoice = get("voiceId");
    const speed = Number(get("rate"));
    if (Number.isFinite(speed) && speed > 0) rate = Math.min(1.2, Math.max(0.7, speed));
  };

  const ip = clientAddress(request);
  /** A refusal in the patient's language, before anything is stored or transcribed. */
  const refuse = (why: keyof typeof LIMIT_WORDS, status: number) => {
    const reply = LIMIT_WORDS[why][langOf(locale)];
    return NextResponse.json({ reply: locale === "oz" ? toUzCyrillic(reply) : reply, state: "limited" }, { status });
  };

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const audio = form.get("audio") as File | null;
    const file = form.get("file") as File | null;
    const text = form.get("message") as string | null;
    wantsVoice = form.get("voice") === "1";
    readCommon((name) => form.get(name));
    if (!allowTurn(sessionId, ip)) return refuse("slow", 429);

    if (audio && audio.size > CHAT_LIMITS.audioBytes) return refuse("audio", 413);
    if (file && file.size > 0 && (file.size > CHAT_LIMITS.fileBytes || !CHAT_LIMITS.fileTypes.test(file.type))) return refuse("file", 415);

    if (audio && isElevenLabsConfigured()) {
      const buffer = Buffer.from(await audio.arrayBuffer());
      // The length is measured from the clip itself, never taken from the caller: transcription is paid by the minute.
      const seconds = audioSeconds(buffer);
      if (seconds === null || seconds > CHAT_LIMITS.audioSeconds) return refuse("audio", 413);
      const transcription = await transcribeAudio(buffer, audio.name || "voice.webm");
      userMessage = transcription.text.trim();
      detectedLanguage = transcription.language_code;
      heardFromAudio = true;
      if (!userMessage) {
        return NextResponse.json({ heardNothing: true, transcript: "" });
      }
    } else if (text) {
      userMessage = text.trim();
    }

    if (file && file.size > 0) {
      uploadedFile = {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        data: Buffer.from(await file.arrayBuffer()),
      };
    }
  } else {
    const body = await request.json().catch(() => ({}));
    userMessage = String(body.message ?? "").trim().slice(0, 4000);
    wantsVoice = body.voice === true;
    readCommon((name) => body[name]);
    if (!allowTurn(sessionId, ip)) return refuse("slow", 429);
    const lang = String(body.lang ?? "").toLowerCase().split("-")[0];
    if (LANG.test(lang)) detectedLanguage = lang;
  }


  // A Cyrillic Uzbek page is answered in Uzbek, and the answer shown in Cyrillic.
  const cyrillic = locale === "oz";
  if (cyrillic) locale = "uz";
  const script = (payload: Record<string, unknown>): Record<string, unknown> => {
    if (!cyrillic) return payload;
    const out: Record<string, unknown> = { ...payload };
    if (typeof out.reply === "string") out.reply = toUzCyrillic(out.reply);
    if (Array.isArray(out.suggestions)) out.suggestions = out.suggestions.map((item) => (typeof item === "string" ? toUzCyrillic(item) : item));
    if (Array.isArray(out.links)) out.links = out.links.map((link) => (link && typeof link === "object" && typeof (link as { label?: unknown }).label === "string" ? { ...link, label: toUzCyrillic((link as { label: string }).label) } : link));
    return out;
  };

  // Every answer carries what was heard, so a spoken turn shows as text.
  const respond = (payload: Record<string, unknown>, init?: ResponseInit) =>
    NextResponse.json(heardFromAudio ? { transcript: userMessage, ...script(payload) } : script(payload), init);

  /** Speech for a reply, when this turn is spoken and natural voices are on. */
  const withSpeech = async (payload: Record<string, unknown>) => {
    const reply = typeof payload.reply === "string" ? payload.reply : "";
    if (!(wantsVoice || heardFromAudio) || !reply || !isElevenLabsConfigured()) return payload;
    const settings = await getSettings();
    if (settings.voiceEngine !== "natural" || requestedVoice === "device") return payload;
    try {
      const speech = await cachedSpeech({
        text: reply.slice(0, 1200),
        languageCode: detectedLanguage ?? locale,
        voiceId: allowedVoice(requestedVoice, settings.voiceId),
        speed: rate,
      });
      return { ...payload, audioBase64: speech.toString("base64") };
    } catch (error) {
      console.error("[shifain] speech failed; the browser reads it instead", error);
      return payload;
    }
  };

  if (!userMessage && !uploadedFile) {
    return NextResponse.json({ error: "No message provided." }, { status: 400 });
  }

  try {
    // A report: kept, then read, and answered from what it says.
    if (uploadedFile) {
      await getOrCreateWebIntake(sessionId);
      const uploadId = await storeWebIntakeFile(sessionId, {
        fileName: uploadedFile.fileName,
        mimeType: uploadedFile.mimeType,
        fileSize: uploadedFile.data.byteLength,
        data: uploadedFile.data,
      });
      const turn = await handleReportTurn({ sessionId, text: userMessage, detectedLanguage, locale, ip, file: uploadedFile, uploadId });
      return respond(await withSpeech({ ...turn, via: undefined }));
    }

    const turn = await handleWebTurn({ sessionId, text: userMessage, detectedLanguage, locale, ip });
    return respond(await withSpeech({ ...turn, via: undefined }));
  } catch (error) {
    console.error("[shifain] chat error:", error);
    return respond(
      { reply: "I'm sorry, I had trouble processing that. Please try again.", state: "error" },
      { status: 500 },
    );
  }
}

/**
 * One more turn for this conversation and this address, within the limits.
 * The address first: a caller who changes the chat cookie every time is
 * stopped there before a new conversation key is ever stored.
 */
function allowTurn(sessionId: string, ip: string): boolean {
  return (
    allowHit(`chat-ip:${ip}`, CHAT_LIMITS.turnsPerAddress, CHAT_LIMITS.windowMs) &&
    allowHit(`chat-session:${sessionId}`, CHAT_LIMITS.turnsPerSession, CHAT_LIMITS.windowMs)
  );
}
