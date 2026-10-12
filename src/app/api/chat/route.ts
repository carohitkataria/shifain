import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { generateIntakeReply, generateChatReply } from "@/lib/voice-agent";
import { isElevenLabsConfigured, transcribeAudio, cachedSpeech } from "@/lib/elevenlabs";
import { isDatabaseConfigured } from "@/lib/db";
import { listCities } from "@/lib/catalogue";
import { getSettings } from "@/lib/settings";
import { startPatientSession } from "@/lib/patient-auth";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import {
  getOrCreateWebIntake,
  updateWebIntakeFields,
  pushWebIntakeMessage,
  setWebIntakeState,
  isIntakeReady,
  createCaseFromWebIntake,
  nextProfileQuestion,
  storeWebIntakeFile,
  activeCommand,
  setPendingCommand,
  type WebIntake,
} from "@/lib/web-intake";
import { parseCommand, slotsFor } from "@/lib/voice/intents";
import { continueCommand, runCommand, type CommandOutcome } from "@/lib/voice/commands";
import { say, sayLang } from "@/lib/voice/command-copy";
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
export async function GET() {
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

  const lang = sayLang(detectedLanguage ?? locale);

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

    let intake = await getOrCreateWebIntake(sessionId);
    // Read before this message is stored, so the AI is not shown it twice.
    const history = intake.messages.slice(-12).map((m) => ({ role: m.role, content: m.content }));
    await pushWebIntakeMessage(sessionId, "user", userMessage);

    // 1. Commands — plain patterns, no AI.
    const cities = (await listCities().catch(() => [])).map((city) => city.name);
    const ctx = { sessionId, intake, text: userMessage, lang, locale };
    const commandOutcome = await commandTurn(ctx, cities);
    if (commandOutcome) return respond(await withSpeech(await finish(sessionId, commandOutcome, intake)));

    // 2. Profile questions — code-driven.
    if (intake.state === "collecting_profile" && !intake.complete) {
      const q = nextProfileQuestion(intake.fields);
      if (q) await updateWebIntakeFields(sessionId, { [q.field]: userMessage });

      intake = await getOrCreateWebIntake(sessionId);
      const next = nextProfileQuestion(intake.fields);
      if (next) {
        const reply = next.question.replace(/<[^>]*>/g, "");
        await pushWebIntakeMessage(sessionId, "assistant", reply);
        return respond(await withSpeech({ reply, state: "collecting_profile", profileQuestion: next }));
      }
      if (isIntakeReady(intake.fields)) {
        return respond(await withSpeech(await openCaseFor(sessionId, intake, "", lang)));
      }
    }

    // 3. Follow-ups once a case exists — the AI answers, and may name a command.
    if (intake.complete) {
      const { reply, command } = await generateChatReply(userMessage, history, detectedLanguage, { commands: true });
      if (command) {
        const outcome = await runCommand({ ...ctx, intake }, { name: command, slots: slotsFor(command, userMessage, cities) });
        return respond(await withSpeech(await finish(sessionId, outcome, intake)));
      }
      await pushWebIntakeMessage(sessionId, "assistant", reply);
      return respond(await withSpeech({ reply, state: "complete", caseReference: intake.caseReference }));
    }

    // 4. The medical conversation — the AI, with a scripted fallback.
    const { reply, extracted, command } = await generateIntakeReply(
      userMessage,
      history,
      intake.fields,
      detectedLanguage,
      { commands: true },
    );
    // The AI recognised an app command the patterns missed; doing it beats talking about it.
    if (command) {
      const outcome = await runCommand({ ...ctx, intake }, { name: command, slots: slotsFor(command, userMessage, cities) });
      return respond(await withSpeech(await finish(sessionId, outcome, intake)));
    }

    const { readyToSubmit, ...fieldUpdates } = extracted;
    if (Object.values(fieldUpdates).some(Boolean)) {
      await updateWebIntakeFields(sessionId, fieldUpdates);
    }
    await pushWebIntakeMessage(sessionId, "assistant", reply);

    const result: Record<string, unknown> = { reply, state: "medical_chat" };

    if (readyToSubmit) {
      await setWebIntakeState(sessionId, "collecting_profile");
      const updatedIntake = await getOrCreateWebIntake(sessionId);

      if (isIntakeReady(updatedIntake.fields)) {
        return respond(await withSpeech(await openCaseFor(sessionId, updatedIntake, reply, lang)));
      }
      const q = nextProfileQuestion(updatedIntake.fields);
      if (q) {
        result.state = "collecting_profile";
        result.profileQuestion = q;
      }
    }

    return respond(await withSpeech(result));
  } catch (error) {
    console.error("[shifain] chat error:", error);
    return respond(
      { reply: "I'm sorry, I had trouble processing that. Please try again.", state: "error" },
      { status: 500 },
    );
  }
}

/**
 * A command, or the answer to one the patient is in the middle of. Returns
 * null when the message is conversation rather than a command.
 */
async function commandTurn(
  ctx: Parameters<typeof runCommand>[0],
  cities: string[],
): Promise<CommandOutcome | null> {
  const parsed = parseCommand(ctx.text, cities);
  if (parsed?.name === "cancel" || parsed?.name === "emergency") return runCommand(ctx, parsed);

  const pending = activeCommand(ctx.intake);
  if (pending) {
    // Free text is the answer here ("tell me what's new"), whatever it says.
    if (pending.step === "details") return continueCommand(ctx, pending);
    // A new command takes over from a half-finished one.
    if (parsed && parsed.name !== pending.name) return runCommand(ctx, parsed);
    const answer = await continueCommand(ctx, pending);
    if (answer) return answer;
    await setPendingCommand(ctx.sessionId, null);
  }
  return parsed ? runCommand(ctx, parsed) : null;
}

async function finish(sessionId: string, outcome: CommandOutcome, intake: WebIntake): Promise<Record<string, unknown>> {
  await pushWebIntakeMessage(sessionId, "assistant", outcome.reply);
  return {
    reply: outcome.reply,
    state: outcome.state ?? (intake.complete ? "complete" : intake.state),
    caseReference: outcome.caseReference ?? intake.caseReference ?? undefined,
    action: outcome.action,
    links: outcome.links,
    command: true,
  };
}

/**
 * Opens the case and signs the patient in on this device: they just gave us
 * the phone number the portal checks, so asking again would only be friction.
 */
async function openCaseFor(
  sessionId: string,
  intake: WebIntake,
  lead: string,
  lang: ReturnType<typeof sayLang>,
): Promise<Record<string, unknown>> {
  const caseRef = await createCaseFromWebIntake(intake);
  if (intake.fields.phone) await startPatientSession(intake.fields.phone).catch(() => undefined);
  const reply = [
    lead,
    `Your case has been created! Reference: ${caseRef}. Our medical team will review your details and you'll receive a treatment plan within 24-48 hours.`,
    intake.fields.phone ? say("caseCreatedSignedIn", lang) : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  await pushWebIntakeMessage(sessionId, "assistant", reply);
  return { reply, state: "complete", caseReference: caseRef };
}
