import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import crypto from "node:crypto";
import { generateIntakeReply, generateReply } from "@/lib/voice-agent";
import { isElevenLabsConfigured, transcribeAudio, textToSpeech } from "@/lib/elevenlabs";
import { isDatabaseConfigured } from "@/lib/db";
import {
  getOrCreateWebIntake,
  updateWebIntakeFields,
  pushWebIntakeMessage,
  setWebIntakeState,
  isIntakeReady,
  createCaseFromWebIntake,
  nextProfileQuestion,
  storeWebIntakeFile,
} from "@/lib/web-intake";

const SESSION_COOKIE = "shifain_chat";
const SESSION_MAX_AGE = 60 * 60 * 24; // 24h

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
 * POST /api/chat
 *
 * Body (JSON): { message: string }
 *   or FormData with "audio" file for voice input
 *
 * Returns: { reply: string, state: string, profileQuestion?: object, caseReference?: string, audioUrl?: string }
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
  let uploadedFile: { fileName: string; mimeType: string; data: Buffer } | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const audio = form.get("audio") as File | null;
    const file = form.get("file") as File | null;
    const text = form.get("message") as string | null;

    if (audio && isElevenLabsConfigured()) {
      const buffer = Buffer.from(await audio.arrayBuffer());
      const transcription = await transcribeAudio(buffer, audio.name || "voice.webm");
      userMessage = transcription.text;
      detectedLanguage = transcription.language_code;
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
    userMessage = String(body.message ?? "").trim();
  }

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

    const intake = await getOrCreateWebIntake(sessionId);

    // Already completed — simple reply mode
    if (intake.complete) {
      const history = intake.messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await generateReply(userMessage, history, detectedLanguage);
      await pushWebIntakeMessage(sessionId, "user", userMessage);
      await pushWebIntakeMessage(sessionId, "assistant", reply);

      const result: Record<string, unknown> = { reply, state: "complete", caseReference: intake.caseReference };
      if (detectedLanguage && isElevenLabsConfigured()) {
        try {
          const speech = await textToSpeech({ text: reply, languageCode: detectedLanguage });
          result.audioBase64 = speech.toString("base64");
        } catch { /* voice is optional */ }
      }
      return NextResponse.json(result);
    }

    // Profile collection — code-driven
    if (intake.state === "collecting_profile") {
      const q = nextProfileQuestion(intake.fields);
      if (q) {
        await updateWebIntakeFields(sessionId, { [q.field]: userMessage });
        await pushWebIntakeMessage(sessionId, "user", userMessage);
      }

      const updatedIntake = await getOrCreateWebIntake(sessionId);
      const next = nextProfileQuestion(updatedIntake.fields);

      if (next) {
        return NextResponse.json({
          reply: next.question.replace(/<[^>]*>/g, ""),
          state: "collecting_profile",
          profileQuestion: next,
        });
      }

      if (isIntakeReady(updatedIntake.fields)) {
        const caseRef = await createCaseFromWebIntake(updatedIntake);
        return NextResponse.json({
          reply: `Your case has been created! Reference: ${caseRef}. Our medical team will review your details and you'll receive a treatment plan within 24-48 hours.`,
          state: "complete",
          caseReference: caseRef,
        });
      }
    }

    // Medical chat — LLM-powered
    await pushWebIntakeMessage(sessionId, "user", userMessage);
    const history = intake.messages.map((m) => ({ role: m.role, content: m.content }));
    const { reply, extracted } = await generateIntakeReply(
      userMessage,
      history,
      intake.fields,
      detectedLanguage,
    );

    const { readyToSubmit, ...fieldUpdates } = extracted;
    if (Object.values(fieldUpdates).some(Boolean)) {
      await updateWebIntakeFields(sessionId, fieldUpdates);
    }
    await pushWebIntakeMessage(sessionId, "assistant", reply);

    const result: Record<string, unknown> = { reply, state: "medical_chat" };

    if (detectedLanguage && isElevenLabsConfigured()) {
      try {
        const speech = await textToSpeech({ text: reply, languageCode: detectedLanguage });
        result.audioBase64 = speech.toString("base64");
      } catch { /* voice is optional */ }
    }

    if (readyToSubmit) {
      await setWebIntakeState(sessionId, "collecting_profile");
      const updatedIntake = await getOrCreateWebIntake(sessionId);

      if (isIntakeReady(updatedIntake.fields)) {
        const caseRef = await createCaseFromWebIntake(updatedIntake);
        result.reply = `${reply}\n\nYour case has been created! Reference: ${caseRef}. Our medical team will review your details and you'll receive a treatment plan within 24-48 hours.`;
        result.state = "complete";
        result.caseReference = caseRef;
      } else {
        const q = nextProfileQuestion(updatedIntake.fields);
        if (q) {
          result.state = "collecting_profile";
          result.profileQuestion = q;
        }
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[shifain] chat error:", error);
    return NextResponse.json(
      { reply: "I'm sorry, I had trouble processing that. Please try again.", state: "error" },
      { status: 500 },
    );
  }
}
