import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { isElevenLabsConfigured, transcribeAudio, cachedSpeech } from "@/lib/elevenlabs";
import { isDatabaseConfigured } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { getOrCreateWebIntake, storeWebIntakeFile, findWebIntake } from "@/lib/web-intake";
import { handleWebTurn } from "@/lib/assistant/web-turn";
import { DEFAULT_NATURAL_VOICE, VOICE_ID_PATTERN, naturalVoice } from "@/lib/voice/voices";

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

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const audio = form.get("audio") as File | null;
    const file = form.get("file") as File | null;
    const text = form.get("message") as string | null;
    wantsVoice = form.get("voice") === "1";
    readCommon((name) => form.get(name));

    if (audio && isElevenLabsConfigured()) {
      const buffer = Buffer.from(await audio.arrayBuffer());
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
    const lang = String(body.lang ?? "").toLowerCase().split("-")[0];
    if (LANG.test(lang)) detectedLanguage = lang;
  }


  // Every answer carries what was heard, so a spoken turn shows as text.
  const respond = (payload: Record<string, unknown>, init?: ResponseInit) =>
    NextResponse.json(heardFromAudio ? { transcript: userMessage, ...payload } : payload, init);

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
    // Handle file upload
    if (uploadedFile) {
      await getOrCreateWebIntake(sessionId);
      await storeWebIntakeFile(sessionId, {
        fileName: uploadedFile.fileName,
        mimeType: uploadedFile.mimeType,
        fileSize: uploadedFile.data.byteLength,
        data: uploadedFile.data,
      });

      if (!userMessage) {
        return NextResponse.json({
          reply: `📎 File received: ${uploadedFile.fileName}. Your report has been saved. Continue describing your medical needs.`,
          state: "medical_chat",
        });
      }
    }

    const turn = await handleWebTurn({ sessionId, text: userMessage, detectedLanguage, locale });
    return respond(await withSpeech({ ...turn, via: undefined }));
  } catch (error) {
    console.error("[shifain] chat error:", error);
    return respond(
      { reply: "I'm sorry, I had trouble processing that. Please try again.", state: "error" },
      { status: 500 },
    );
  }
}
