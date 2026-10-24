import { NextResponse } from "next/server";
import { currentPatient } from "@/lib/patient-auth";
import { cachedSpeech, isElevenLabsConfigured } from "@/lib/elevenlabs";
import { allowHit } from "@/lib/rate-limit";
import { NATURAL_TTS } from "@/lib/voice/languages";
import { naturalVoice, voiceForGender } from "@/lib/voice/voices";

/**
 * POST /api/patient/speak { text, lang, voiceId?, gender?, speed? } → MP3
 *
 * The translator's natural voice. Only a curated voice id can be asked for,
 * and only for a language the voices pronounce well; anything else answers
 * 204 so the phone reads it with its own voice instead.
 */
export async function POST(request: Request) {
  const identity = await currentPatient().catch(() => null);
  if (!identity) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { text?: unknown; lang?: unknown; voiceId?: unknown; gender?: unknown; speed?: unknown };
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 600) : "";
  const lang = typeof body.lang === "string" ? body.lang : "";
  if (!text) return NextResponse.json({ error: "Nothing to say." }, { status: 400 });
  if (!isElevenLabsConfigured() || !NATURAL_TTS.has(lang)) return new NextResponse(null, { status: 204 });

  const key = identity.kind === "email" ? identity.email : identity.digits;
  if (!allowHit(`speak:${key}`, 120, 10 * 60_000)) return new NextResponse(null, { status: 204 });

  const gender = body.gender === "male" || body.gender === "female" ? body.gender : "female";
  const voice = naturalVoice(typeof body.voiceId === "string" ? body.voiceId : null) ?? voiceForGender(gender);
  const speed = typeof body.speed === "number" && Number.isFinite(body.speed) ? Math.min(1.2, Math.max(0.7, body.speed)) : 1;
  try {
    const audio = await cachedSpeech({ text, voiceId: voice.id, languageCode: lang, speed });
    return new NextResponse(new Uint8Array(audio), { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("[shifain] translator speech failed; the phone reads it instead", error);
    return new NextResponse(null, { status: 204 });
  }
}
