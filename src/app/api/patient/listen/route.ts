import { NextResponse } from "next/server";
import { currentPatient } from "@/lib/patient-auth";
import { isElevenLabsConfigured, transcribeAudio } from "@/lib/elevenlabs";
import { allowHit } from "@/lib/rate-limit";
import { fromSpeechCode } from "@/lib/voice/languages";
import { PORTAL_LANGUAGES } from "@/lib/patient-portal";

/**
 * POST /api/patient/listen (multipart: audio, lang?) → { text, lang }
 *
 * What was said in a stretch of the translator's conversation, and in which
 * language — so the translator knows who spoke without anyone tapping a side.
 * Without `lang` the language is detected.
 */
export async function GET() {
  return NextResponse.json({ available: isElevenLabsConfigured() });
}

export async function POST(request: Request) {
  const identity = await currentPatient().catch(() => null);
  if (!identity) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!isElevenLabsConfigured()) return NextResponse.json({ error: "Not available." }, { status: 503 });
  const key = identity.kind === "email" ? identity.email : identity.digits;
  if (!allowHit(`listen:${key}`, 120, 10 * 60_000)) return NextResponse.json({ error: "Too many at once. Wait a minute." }, { status: 429 });

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File) || audio.size === 0) return NextResponse.json({ error: "No audio." }, { status: 400 });
  if (audio.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Too long." }, { status: 413 });
  const hint = String(form?.get("lang") ?? "");
  const known = PORTAL_LANGUAGES.some((item) => item.code === hint) ? hint : undefined;
  try {
    const result = await transcribeAudio(Buffer.from(await audio.arrayBuffer()), audio.name || "speech.webm", known);
    return NextResponse.json({ text: result.text.trim(), lang: fromSpeechCode(result.language_code), confidence: result.language_probability });
  } catch (error) {
    console.error("[shifain] translator listening failed", error);
    return NextResponse.json({ error: "Could not hear that." }, { status: 502 });
  }
}
