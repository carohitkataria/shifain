import "server-only";

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
): Promise<TranscriptionResult> {
  const key = apiKey();
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set.");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audioBuffer)]), filename);
  form.append("model_id", "scribe_v1");

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

const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const DEFAULT_MODEL = "eleven_turbo_v2_5";

export type TTSOptions = {
  text: string;
  voiceId?: string;
  modelId?: string;
  languageCode?: string;
};

/**
 * Generates speech from text using ElevenLabs TTS.
 * Returns raw audio bytes as MP3 (Telegram accepts MP3 for voice notes
 * when sent as audio, or OGG Opus for sendVoice).
 */
export async function textToSpeech(opts: TTSOptions): Promise<Buffer> {
  const key = apiKey();
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set.");

  const voiceId = opts.voiceId ?? DEFAULT_VOICE_ID;

  const body: Record<string, unknown> = {
    text: opts.text,
    model_id: opts.modelId ?? DEFAULT_MODEL,
    output_format: "mp3_44100_128",
  };

  if (opts.languageCode) {
    body.language_code = opts.languageCode;
  }

  const res = await fetch(`${API}/text-to-speech/${voiceId}`, {
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
