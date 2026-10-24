import "server-only";
import crypto from "node:crypto";
import { Binary } from "mongodb";
import { getDb, isDatabaseConfigured } from "./db";
import { DEFAULT_NATURAL_VOICE } from "./voice/voices";

const API = "https://api.elevenlabs.io/v1";

function apiKey(): string | null {
  return process.env.ELEVENLABS_API_KEY?.trim() || null;
}

export function isElevenLabsConfigured(): boolean {
  return Boolean(apiKey());
}

// ------------------------------------------------------------------ STT

export type TranscriptionResult = {
  text: string;
  language_code: string;
  language_probability: number;
};

/**
 * Transcribes audio using ElevenLabs Speech-to-Text.
 * Accepts raw audio bytes (e.g. an .ogg voice note from Telegram).
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename = "voice.ogg",
  /** A language to expect; left out, the language is detected. */
  languageCode?: string,
): Promise<TranscriptionResult> {
  const key = apiKey();
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set.");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audioBuffer)]), filename);
  form.append("model_id", "scribe_v1");
  if (languageCode) form.append("language_code", languageCode);

  const res = await fetch(`${API}/speech-to-text`, {
    method: "POST",
    headers: { "xi-api-key": key },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs STT ${res.status}: ${body}`);
  }

  const json = await res.json();
  return {
    text: json.text ?? "",
    language_code: json.language_code ?? "en",
    language_probability: json.language_probability ?? 0,
  };
}

// ------------------------------------------------------------------ TTS

/**
 * Flash is ElevenLabs' cheapest and fastest model (half the credits of the
 * multilingual one) and still natural; ELEVENLABS_MODEL overrides it.
 */
const DEFAULT_MODEL = process.env.ELEVENLABS_MODEL?.trim() || "eleven_flash_v2_5";
/** 64 kbps is plenty for a voice and half the bytes of 128. */
const OUTPUT_FORMAT = "mp3_44100_64";

export type TTSOptions = {
  text: string;
  voiceId?: string;
  modelId?: string;
  languageCode?: string;
  /** 0.7 (slower) to 1.2 (faster). */
  speed?: number;
};

/**
 * Generates speech from text using ElevenLabs TTS.
 * Returns raw audio bytes as MP3 (Telegram accepts MP3 for voice notes
 * when sent as audio, or OGG Opus for sendVoice).
 */
export async function textToSpeech(opts: TTSOptions): Promise<Buffer> {
  const key = apiKey();
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set.");

  const voiceId = opts.voiceId ?? DEFAULT_NATURAL_VOICE;
  const speed = Math.min(1.2, Math.max(0.7, opts.speed ?? 1));

  const body: Record<string, unknown> = {
    text: opts.text,
    model_id: opts.modelId ?? DEFAULT_MODEL,
    voice_settings: { stability: 0.5, similarity_boost: 0.75, speed },
  };

  if (opts.languageCode) {
    body.language_code = opts.languageCode;
  }

  const res = await fetch(`${API}/text-to-speech/${voiceId}?output_format=${OUTPUT_FORMAT}`, {
    method: "POST",
    headers: {
      "xi-api-key": key,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS ${res.status}: ${errBody}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ------------------------------------------------------------------ cache

const CACHE = "speech_cache";
const CACHE_DAYS = 30;
let cacheIndex: Promise<unknown> | null = null;

/**
 * Speech for a reply, from the cache when this exact sentence was spoken in
 * this voice before. Command answers repeat a lot ("You're signed in",
 * "Which city would you prefer?"), so most of them cost nothing after the
 * first time. Falls back to a fresh call if the database is unavailable.
 */
export async function cachedSpeech(opts: TTSOptions): Promise<Buffer> {
  if (!isDatabaseConfigured()) return textToSpeech(opts);
  const key = crypto
    .createHash("sha256")
    .update([opts.voiceId ?? DEFAULT_NATURAL_VOICE, opts.modelId ?? DEFAULT_MODEL, opts.languageCode ?? "", opts.speed ?? 1, opts.text].join("|"))
    .digest("base64url");

  try {
    const db = await getDb();
    const hit = await db.collection<{ _id: string; audio: Binary }>(CACHE).findOne({ _id: key });
    if (hit?.audio) return Buffer.from(hit.audio.buffer);
  } catch {
    /* a cache miss, not a failure */
  }

  const audio = await textToSpeech(opts);
  try {
    const db = await getDb();
    cacheIndex ??= db
      .collection(CACHE)
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_ttl" })
      .catch(() => (cacheIndex = null));
    await db.collection(CACHE).updateOne(
      { _id: key as never },
      {
        $set: {
          audio: new Binary(audio),
          bytes: audio.byteLength,
          expiresAt: new Date(Date.now() + CACHE_DAYS * 24 * 60 * 60 * 1000),
        },
      },
      { upsert: true },
    );
  } catch {
    /* the patient still hears it */
  }
  return audio;
}
