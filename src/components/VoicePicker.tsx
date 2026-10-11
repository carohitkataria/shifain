"use client";

import { useEffect, useRef, useState } from "react";
import {
  NATURAL_VOICES,
  guessGender,
  pickDeviceVoice,
  rankDeviceVoices,
  type VoicePrefs,
} from "@/lib/voice/voices";

/**
 * Choosing how the assistant sounds. Natural voices are ElevenLabs' (their
 * own public samples play as the preview, so trying one costs nothing);
 * device voices are the phone's or browser's, free, and previewed locally.
 */

const SPEEDS: { label: string; rate: number }[] = [
  { label: "Slower", rate: 0.85 },
  { label: "Normal", rate: 1 },
  { label: "Faster", rate: 1.15 },
];

const SAMPLE: Record<string, string> = {
  en: "Hello, I'm here to help you plan your treatment.",
  ru: "Здравствуйте, я помогу вам спланировать лечение.",
  uz: "Assalomu alaykum, davolanishingizni rejalashtirishda yordam beraman.",
};

function pageLang(): string {
  return (typeof document !== "undefined" ? document.documentElement.lang : "en").toLowerCase().split("-")[0] || "en";
}

export function VoicePicker({
  prefs,
  naturalAvailable,
  onChange,
  onClose,
}: {
  prefs: VoicePrefs;
  /** Whether this site speaks with natural (server) voices at all. */
  naturalAvailable: boolean;
  onChange: (next: VoicePrefs) => void;
  onClose: () => void;
}) {
  const [deviceVoices, setDeviceVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lang = pageLang();

  useEffect(() => {
    closeRef.current?.focus();
    if (typeof speechSynthesis === "undefined") return;
    const load = () => setDeviceVoices(rankDeviceVoices(speechSynthesis.getVoices(), lang).slice(0, 8));
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", load);
      speechSynthesis.cancel();
      audio.current?.pause();
    };
  }, [lang]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const stopPreview = () => {
    audio.current?.pause();
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    setPlaying(null);
  };

  const previewNatural = (id: string, url: string) => {
    stopPreview();
    if (playing === id) return;
    const el = audio.current ?? new Audio();
    audio.current = el;
    el.src = url;
    el.playbackRate = prefs.rate;
    el.onended = () => setPlaying(null);
    el.play().then(() => setPlaying(id)).catch(() => setPlaying(null));
  };

  const previewDevice = (voice: SpeechSynthesisVoice) => {
    stopPreview();
    if (playing === voice.name) return;
    const utterance = new SpeechSynthesisUtterance(SAMPLE[lang] ?? SAMPLE.en);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = prefs.rate;
    utterance.onend = () => setPlaying(null);
    setPlaying(voice.name);
    speechSynthesis.speak(utterance);
  };

  const autoDevice = pickDeviceVoice(deviceVoices, lang, { deviceName: "", gender: prefs.gender });

  return (
    <div className="voice-picker" role="dialog" aria-modal="true" aria-labelledby="voice-picker-title">
      <div className="voice-picker-head">
        <div className="min-w-0">
          <h3 id="voice-picker-title" className="text-[16px] font-extrabold text-ink">
            Assistant voice
          </h3>
          <p className="text-[12.5px] text-ink-soft">Tap ▶ to hear it. Your choice is saved on this device.</p>
        </div>
        <button ref={closeRef} type="button" onClick={onClose} className="voice-picker-done">
          Done
        </button>
      </div>

      <div className="voice-picker-body">
        <fieldset>
          <legend className="voice-picker-label">Speed</legend>
          <div className="voice-speed" role="radiogroup" aria-label="Speaking speed">
            {SPEEDS.map((speed) => (
              <button
                key={speed.label}
                type="button"
                role="radio"
                aria-checked={Math.abs(prefs.rate - speed.rate) < 0.01}
                className="voice-speed-btn"
                onClick={() => onChange({ ...prefs, rate: speed.rate })}
              >
                {speed.label}
              </button>
            ))}
          </div>
        </fieldset>

        {naturalAvailable ? (
          <fieldset>
            <legend className="voice-picker-label">
              Natural voices <span className="font-normal text-ink-muted">· most lifelike</span>
            </legend>
            <ul className="voice-list">
              {NATURAL_VOICES.map((voice) => {
                const selected = prefs.engine === "natural" && prefs.naturalId === voice.id;
                return (
                  <li key={voice.id} className={`voice-row ${selected ? "voice-row-on" : ""}`}>
                    <button
                      type="button"
                      className="voice-choose"
                      aria-pressed={selected}
                      onClick={() =>
                        onChange({ ...prefs, engine: "natural", naturalId: voice.id, gender: voice.gender === "neutral" ? "" : voice.gender })
                      }
                    >
                      <span className="voice-radio" aria-hidden="true" />
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block text-[14px] font-bold text-ink">
                          {voice.name}{" "}
                          <span className="text-[12px] font-semibold capitalize text-ink-muted">{voice.gender}</span>
                        </span>
                        <span className="block text-[12.5px] text-ink-soft">{voice.note}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="voice-play"
                      aria-label={playing === voice.id ? `Stop ${voice.name}` : `Play a sample of ${voice.name}`}
                      onClick={() => previewNatural(voice.id, voice.preview)}
                    >
                      {playing === voice.id ? "■" : "▶"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ) : null}

        <fieldset>
          <legend className="voice-picker-label">
            This device <span className="font-normal text-ink-muted">· free, works offline</span>
          </legend>
          {deviceVoices.length === 0 ? (
            <p className="text-[13px] text-ink-soft">
              This browser has no voices for this language.{" "}
              {naturalAvailable ? "Natural voices above still work." : "Replies still appear as text — or try Chrome or Safari."}
            </p>
          ) : (
            <ul className="voice-list">
              {deviceVoices.map((voice) => {
                const selected =
                  prefs.engine === "device" && (prefs.deviceName ? prefs.deviceName === voice.name : autoDevice?.name === voice.name);
                const gender = guessGender(voice.name);
                return (
                  <li key={voice.name} className={`voice-row ${selected ? "voice-row-on" : ""}`}>
                    <button
                      type="button"
                      className="voice-choose"
                      aria-pressed={selected}
                      onClick={() => onChange({ ...prefs, engine: "device", deviceName: voice.name, gender: gender || prefs.gender })}
                    >
                      <span className="voice-radio" aria-hidden="true" />
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-[14px] font-bold text-ink">
                          {voice.name.replace(/^(Microsoft|Google)\s+/, "").replace(/\s+-\s+.*$/, "")}
                        </span>
                        <span className="block text-[12.5px] capitalize text-ink-soft">
                          {[gender, voice.lang, /natural|neural|online|premium|enhanced|siri/i.test(voice.name) ? "high quality" : ""]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="voice-play"
                      aria-label={playing === voice.name ? "Stop" : `Play a sample of ${voice.name}`}
                      onClick={() => previewDevice(voice)}
                    >
                      {playing === voice.name ? "■" : "▶"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>
      </div>
    </div>
  );
}
