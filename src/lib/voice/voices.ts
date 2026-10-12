/**
 * The voices the assistant can speak with. Shared by the browser (the picker)
 * and the server (which only ever speaks with an id from this list, or the one
 * an admin set, so a request cannot spend credits on an arbitrary voice).
 *
 * Natural voices are ElevenLabs premade voices: every account has them, and
 * they read English, Russian, Hindi and Uzbek with the multilingual models.
 * "device" means the phone's or browser's own voice — free, and on modern
 * phones (Siri, Google, Edge "Natural" voices) often very good.
 */
export type VoiceGender = "female" | "male" | "neutral";

export type NaturalVoice = {
  id: string;
  name: string;
  gender: VoiceGender;
  note: string;
  /** ElevenLabs' own public sample, so trying a voice costs nothing. */
  preview: string;
};

const SAMPLES = "https://storage.googleapis.com/eleven-public-prod/premade/voices";

export const NATURAL_VOICES: NaturalVoice[] = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "female", note: "Warm, reassuring", preview: `${SAMPLES}/EXAVITQu4vr4xnSDxMaL/01a3e33c-6e99-4ee7-8543-ff2216a32186.mp3` },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", gender: "female", note: "Calm, British", preview: `${SAMPLES}/pFZP5JQG7iQjIQuC4Bku/89b68b35-b3dd-4348-a84a-a3c13a3c2b30.mp3` },
  { id: "hpp4J3VqNfWAUOO0d1Us", name: "Bella", gender: "female", note: "Bright, professional", preview: `${SAMPLES}/hpp4J3VqNfWAUOO0d1Us/dab0f5ba-3aa4-48a8-9fad-f138fea1126d.mp3` },
  { id: "cjVigY5qzO86Huf0OWal", name: "Eric", gender: "male", note: "Smooth, trustworthy", preview: `${SAMPLES}/cjVigY5qzO86Huf0OWal/d098fda0-6456-4030-b3d8-63aa048c9070.mp3` },
  { id: "iP95p4xoKVk53GoZ742B", name: "Chris", gender: "male", note: "Natural, down-to-earth", preview: `${SAMPLES}/iP95p4xoKVk53GoZ742B/3f4bde72-cc48-40dd-829f-57fbf906f4d7.mp3` },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", gender: "male", note: "Relaxed, resonant", preview: `${SAMPLES}/CwhRBWXzGAHq8TQ4Fs17/58ee3ff5-f6f2-4628-93b8-e38eb31806b0.mp3` },
  { id: "SAz9YHcvj6GT2YYXdXww", name: "River", gender: "neutral", note: "Even, informative", preview: `${SAMPLES}/SAz9YHcvj6GT2YYXdXww/e6c95f0b-2227-491a-b3d7-2249240decb7.mp3` },
];

/** A warm female voice reads best to anxious patients; admins can change it. */
export const DEFAULT_NATURAL_VOICE = NATURAL_VOICES[0].id;

export const VOICE_ID_PATTERN = /^[A-Za-z0-9]{16,32}$/;

export function naturalVoice(id: string | null | undefined): NaturalVoice | null {
  return NATURAL_VOICES.find((voice) => voice.id === id) ?? null;
}

/** The first curated voice of a gender, for "use a male voice". */
export function voiceForGender(gender: VoiceGender): NaturalVoice {
  return NATURAL_VOICES.find((voice) => voice.gender === gender) ?? NATURAL_VOICES[0];
}

/** What the patient chose, kept in their browser. */
export type VoicePrefs = {
  /** "natural" uses the server's voices; "device" the browser's own, free. */
  engine: "natural" | "device";
  naturalId: string;
  /** A browser voice by name; empty picks the best one available. */
  deviceName: string;
  gender: VoiceGender | "";
  rate: number;
};

export const DEFAULT_VOICE_PREFS: VoicePrefs = {
  engine: "natural",
  naturalId: DEFAULT_NATURAL_VOICE,
  deviceName: "",
  gender: "female",
  rate: 1,
};

/** Reads saved preferences defensively: whatever is in storage may be old or hand-edited. */
export function parseVoicePrefs(raw: string | null, fallbackNaturalId = DEFAULT_NATURAL_VOICE): VoicePrefs {
  const base = { ...DEFAULT_VOICE_PREFS, naturalId: fallbackNaturalId };
  if (!raw) return base;
  try {
    const value = JSON.parse(raw) as Partial<VoicePrefs>;
    return {
      engine: value.engine === "device" ? "device" : "natural",
      naturalId: typeof value.naturalId === "string" && VOICE_ID_PATTERN.test(value.naturalId) ? value.naturalId : base.naturalId,
      deviceName: typeof value.deviceName === "string" ? value.deviceName.slice(0, 200) : "",
      gender: value.gender === "male" || value.gender === "female" || value.gender === "neutral" ? value.gender : "",
      rate: typeof value.rate === "number" && value.rate >= 0.7 && value.rate <= 1.2 ? value.rate : 1,
    };
  } catch {
    return base;
  }
}

const FEMALE_NAMES =
  /samantha|victoria|karen|moira|tessa|fiona|serena|allison|ava|susan|zira|hazel|heera|kalpana|aria|jenny|sonia|libby|natasha|neerja|swara|milena|katya|svetlana|dariya|madina|female|woman|google uk english female|google us english/i;
const MALE_NAMES =
  /daniel|alex|fred|tom|aaron|arthur|oliver|rishi|david|mark|george|guy|ryan|ravi|prabhat|dmitry|pavel|yuri|sardor|male|man\b/i;

/** A rough guess from the voice's name; browsers do not say. */
export function guessGender(name: string): VoiceGender | "" {
  if (FEMALE_NAMES.test(name)) return "female";
  if (MALE_NAMES.test(name)) return "male";
  return "";
}

/**
 * How natural a browser voice is likely to sound. The neural voices (Edge's
 * "Natural"/"Online", Apple's Premium/Enhanced/Siri, Google's network voices)
 * are free and far better than the old robotic defaults.
 */
export function naturalness(voice: { name: string; localService: boolean }): number {
  const name = voice.name;
  let score = 0;
  if (/natural|neural|online/i.test(name)) score += 6;
  if (/premium|enhanced|siri/i.test(name)) score += 5;
  if (/^google/i.test(name)) score += 4;
  if (!voice.localService) score += 1;
  if (/compact|espeak|robot|novelty|whisper|bells|bad news|zarvox|trinoids|albert|jester/i.test(name)) score -= 8;
  return score;
}

type DeviceVoice = { name: string; lang: string; localService: boolean };

/**
 * The browser voices worth offering for a language, best first. Accepts the
 * page language ("ru") or a full tag ("ru-RU").
 */
export function rankDeviceVoices<T extends DeviceVoice>(voices: T[], lang: string): T[] {
  const base = lang.toLowerCase().split("-")[0];
  const matching = voices.filter((voice) => voice.lang.toLowerCase().replace("_", "-").startsWith(base));
  return [...matching].sort((a, b) => naturalness(b) - naturalness(a) || a.name.localeCompare(b.name));
}

/** The browser voice to speak with: the chosen one, else the best of the wanted gender, else the best. */
export function pickDeviceVoice<T extends DeviceVoice>(voices: T[], lang: string, prefs: Pick<VoicePrefs, "deviceName" | "gender">): T | null {
  const ranked = rankDeviceVoices(voices, lang);
  if (prefs.deviceName) {
    const chosen = ranked.find((voice) => voice.name === prefs.deviceName);
    if (chosen) return chosen;
  }
  if (prefs.gender) {
    const gendered = ranked.find((voice) => guessGender(voice.name) === prefs.gender);
    if (gendered) return gendered;
  }
  return ranked[0] ?? null;
}
