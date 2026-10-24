"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppIcon } from "./AppIcon";
import { NATURAL_VOICES, guessGender, pickDeviceVoice, rankDeviceVoices } from "@/lib/voice/voices";
import { NATURAL_TTS, fromSpeechCode } from "@/lib/voice/languages";
import { saveGenderAction } from "@/app/(site)/[locale]/portal/patient/app-actions";

type Language = { code: string; name: string; native: string; speech: string };
type Who = "me" | "them";
type Gender = "female" | "male";
type Line = { id: number; who: Who; original: string; from: string; translation: string | null; to: string; failed?: boolean };
type Phrase = { key: string; icon: string; short: Record<string, string>; text: Record<string, string> };
type Mode = { key: string; label: string; phrases: Phrase[] };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};
type Prefs = {
  mine: string;
  theirs: string;
  aloud: boolean;
  autoDetect: boolean;
  engine: "natural" | "device";
  myGender: Gender;
  theirGender: Gender;
  myVoice: string;
  theirVoice: string;
  speed: number;
};
type Labels = Record<
  | "iSpeak" | "theySpeak" | "swap" | "tap" | "listening" | "type" | "translating" | "failed" | "quick" | "me" | "them" | "clear" | "send" | "readAloud"
  | "auto" | "autoHint" | "turnsHint" | "listeningBoth" | "yourTurn" | "theirTurn" | "hearing" | "speaking" | "paused" | "empty" | "settings"
  | "autoDetect" | "autoDetectHint" | "voice" | "natural" | "phone" | "myVoice" | "theirVoice" | "best" | "speed" | "slower" | "faster"
  | "test" | "sample" | "micBlocked" | "noVoice" | "done" | "who" | "iAm" | "male" | "female",
  string
>;

const STORE = "shifain_translator_v2";
/** Phrases exist in these; anyone else reads them in the nearest one. */
const PHRASE_LANGS = ["en", "ru", "uz"];
const NEAREST: Record<string, string> = { tg: "ru", kk: "ru", ky: "ru", tk: "ru", az: "ru" };

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Long lines are read in sentence-sized pieces: some phone voices stop or slur after a few seconds. */
const pieces = (text: string) =>
  (text.match(/[^.!?।؟]+[.!?।؟]*\s*/g) ?? [text])
    .flatMap((part) => (part.length > 180 ? part.match(/.{1,180}(\s|$)/g) ?? [part] : [part]))
    .map((part) => part.trim())
    .filter(Boolean);

/**
 * The translator behind the centre button: two languages, one phone. In Auto
 * both people simply talk — the translator hears the language, knows who spoke,
 * translates to the other and reads it aloud, then listens again. Manual keeps
 * the tap-to-talk and typing it always had. Each side's words are read in a
 * voice of that person's gender; the patient's comes from their account.
 */
export function TranslatorApp({
  languages,
  defaultMine,
  defaultTheirs,
  patientGender,
  modes,
  labels,
}: {
  languages: Language[];
  defaultMine: string;
  defaultTheirs: string;
  patientGender: Gender | null;
  modes: Mode[];
  labels: Labels;
}) {
  const [prefs, setPrefs] = useState<Prefs>({
    mine: defaultMine,
    theirs: defaultTheirs,
    aloud: true,
    autoDetect: true,
    engine: "natural",
    myGender: patientGender ?? "female",
    theirGender: "female",
    myVoice: "",
    theirVoice: "",
    speed: 1,
  });
  const { mine, theirs } = prefs;
  const [mode, setMode] = useState(modes[0]?.key ?? "doctor");
  const [speaker, setSpeaker] = useState<Who>("me");
  const [text, setText] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [auto, setAuto] = useState(false);
  const [phase, setPhase] = useState<"idle" | "listening" | "hearing" | "thinking" | "speaking">("idle");
  const [turn, setTurn] = useState<Who>("me");
  const [level, setLevel] = useState(0);
  const [phrasesOpen, setPhrasesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const [serverEars, setServerEars] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [deviceVoices, setDeviceVoices] = useState<SpeechSynthesisVoice[]>([]);
  const recognition = useRef<Recognition | null>(null);
  const counter = useRef(0);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const autoRef = useRef(false);
  const prefsRef = useRef(prefs);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const lang = useCallback((code: string) => languages.find((item) => item.code === code) ?? languages[0], [languages]);
  const set = (patch: Partial<Prefs>) => setPrefs((current) => ({ ...current, ...patch }));
  prefsRef.current = prefs;

  // ---------------------------------------------------------------- setup

  useEffect(() => {
    setCanListen(Boolean(recognitionCtor()));
    fetch("/api/patient/listen")
      .then((res) => res.json())
      .then((data: { available?: boolean }) => setServerEars(Boolean(data.available) && typeof MediaRecorder !== "undefined"))
      .catch(() => setServerEars(false));
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "null") as Partial<Prefs> | null;
      if (saved) {
        setPrefs((current) => ({
          ...current,
          ...saved,
          mine: saved.mine && languages.some((item) => item.code === saved.mine) ? saved.mine : current.mine,
          theirs: saved.theirs && languages.some((item) => item.code === saved.theirs) ? saved.theirs : current.theirs,
          // The account's gender wins over an old browser setting.
          myGender: patientGender ?? (saved.myGender === "male" ? "male" : current.myGender),
          speed: typeof saved.speed === "number" && saved.speed >= 0.7 && saved.speed <= 1.2 ? saved.speed : 1,
        }));
      }
    } catch {}
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const load = () => setDeviceVoices(window.speechSynthesis.getVoices());
      load();
      window.speechSynthesis.addEventListener("voiceschanged", load);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
    }
  }, [languages, patientGender]);

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(prefs));
    } catch {}
  }, [prefs]);

  useEffect(() => {
    const chat = chatRef.current;
    if (chat) chat.scrollTo({ top: chat.scrollHeight, behavior: "smooth" });
  }, [lines, phase]);

  useEffect(() => () => stopAuto(), []);

  // ---------------------------------------------------------------- speaking

  /** Reads a line aloud in the voice of whoever said it, and resolves when it has finished. */
  const speak = useCallback(
    async (words: string, code: string, who: Who): Promise<void> => {
      const p = prefsRef.current;
      const gender = who === "me" ? p.myGender : p.theirGender;
      const chosen = who === "me" ? p.myVoice : p.theirVoice;
      if (p.engine === "natural" && NATURAL_TTS.has(code)) {
        try {
          const natural = NATURAL_VOICES.find((voice) => voice.id === chosen && voice.gender === gender);
          const res = await fetch("/api/patient/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: words, lang: code, gender, voiceId: natural?.id, speed: p.speed }),
            signal: AbortSignal.timeout(20_000),
          });
          if (res.status === 200) {
            const url = URL.createObjectURL(await res.blob());
            await new Promise<void>((resolve) => {
              audioRef.current?.pause();
              const audio = new Audio(url);
              audioRef.current = audio;
              audio.onended = audio.onerror = () => {
                URL.revokeObjectURL(url);
                resolve();
              };
              audio.play().catch(() => resolve());
            });
            return;
          }
        } catch {
          /* the phone reads it instead */
        }
      }
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const target = lang(code);
      const voice = pickDeviceVoice(window.speechSynthesis.getVoices(), target.speech, { deviceName: chosen && !NATURAL_VOICES.some((item) => item.id === chosen) ? chosen : "", gender });
      window.speechSynthesis.cancel();
      for (const part of pieces(words)) {
        await new Promise<void>((resolve) => {
          const utterance = new SpeechSynthesisUtterance(part);
          utterance.lang = voice?.lang ?? target.speech;
          if (voice) utterance.voice = voice;
          utterance.rate = p.speed;
          utterance.onend = utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        });
      }
    },
    [lang],
  );

  // ---------------------------------------------------------------- translating

  const send = useCallback(
    async (words: string, who: Who, fromOverride?: string) => {
      const value = words.trim();
      if (!value) return;
      const p = prefsRef.current;
      const from = fromOverride ?? (who === "me" ? p.mine : p.theirs);
      const to = who === "me" ? p.theirs : p.mine;
      const id = ++counter.current;
      setLines((prev) => [...prev, { id, who, original: value, from, translation: null, to }]);
      setText("");
      setBusy(true);
      setPhase((current) => (current === "idle" ? current : "thinking"));
      try {
        const res = await fetch("/api/patient/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: value, from, to }),
          signal: AbortSignal.timeout(25_000),
        });
        const data = (await res.json().catch(() => ({}))) as { translation?: string };
        if (!res.ok || !data.translation) throw new Error("failed");
        setLines((prev) => prev.map((line) => (line.id === id ? { ...line, translation: data.translation! } : line)));
        if (p.aloud) {
          if (autoRef.current) setPhase("speaking");
          await speak(data.translation, to, who);
        }
      } catch {
        setLines((prev) => prev.map((line) => (line.id === id ? { ...line, failed: true } : line)));
      } finally {
        setBusy(false);
      }
    },
    [speak],
  );

  // ---------------------------------------------------------------- manual: tap to talk

  const listenManual = useCallback(() => {
    const Ctor = recognitionCtor();
    if (listening) {
      recognition.current?.abort();
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      setListening(false);
      return;
    }
    const who = speaker;
    const code = who === "me" ? mine : theirs;
    if (Ctor) {
      const rec = new Ctor();
      rec.lang = lang(code).speech;
      rec.interimResults = true;
      rec.continuous = false;
      let heard = "";
      rec.onresult = (event) => {
        heard = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? "")
          .join(" ");
        setText(heard);
      };
      rec.onerror = (event) => {
        if (event?.error === "not-allowed") setNotice(labels.micBlocked);
        setListening(false);
      };
      rec.onend = () => {
        setListening(false);
        if (heard.trim()) void send(heard, who);
      };
      recognition.current = rec;
      setListening(true);
      rec.start();
      return;
    }
    if (serverEars) {
      // No recogniser in this browser: record until tapped again, then let the server hear it.
      void navigator.mediaDevices
        .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
        .then((stream) => {
          const recorder = new MediaRecorder(stream);
          const chunks: Blob[] = [];
          recorder.ondataavailable = (event) => chunks.push(event.data);
          recorder.onstop = async () => {
            stream.getTracks().forEach((track) => track.stop());
            setListening(false);
            const heard = await hear(new Blob(chunks, { type: recorder.mimeType }), code);
            if (heard?.text) void send(heard.text, who);
          };
          recorderRef.current = recorder;
          recorder.start();
          setListening(true);
        })
        .catch(() => setNotice(labels.micBlocked));
    }
  }, [labels.micBlocked, lang, listening, mine, send, serverEars, speaker, theirs]);

  // ---------------------------------------------------------------- auto: both people just talk

  const hear = async (blob: Blob, hint?: string): Promise<{ text: string; lang: string } | null> => {
    const form = new FormData();
    form.append("audio", blob, blob.type.includes("mp4") ? "speech.mp4" : "speech.webm");
    if (hint) form.append("lang", hint);
    try {
      const res = await fetch("/api/patient/listen", { method: "POST", body: form, signal: AbortSignal.timeout(30_000) });
      if (!res.ok) return null;
      const data = (await res.json()) as { text?: string; lang?: string };
      return data.text ? { text: data.text, lang: fromSpeechCode(data.lang) } : null;
    } catch {
      return null;
    }
  };

  /** One stretch of speech: waits for a voice, records until a second of quiet, returns the audio. */
  const utterance = (stream: MediaStream, analyser: AnalyserNode): Promise<Blob | null> =>
    new Promise((resolve) => {
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      const chunks: Blob[] = [];
      const samples = new Float32Array(analyser.fftSize);
      const started = performance.now();
      let floor = 0.01;
      let spoke = false;
      let lastLoud = 0;
      recorder.ondataavailable = (event) => chunks.push(event.data);
      recorder.onstop = () => resolve(spoke && autoRef.current ? new Blob(chunks, { type: recorder.mimeType }) : null);
      recorder.start(200);
      const tick = () => {
        if (!autoRef.current || recorder.state !== "recording") {
          if (recorder.state === "recording") recorder.stop();
          return;
        }
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) sum += sample * sample;
        const rms = Math.sqrt(sum / samples.length);
        const now = performance.now();
        if (now - started < 400) floor = Math.max(floor, rms);
        const loud = rms > Math.max(0.025, floor * 2.5);
        setLevel(Math.min(1, rms * 12));
        if (loud) {
          if (!spoke) setPhase("hearing");
          spoke = true;
          lastLoud = now;
        }
        if ((spoke && now - lastLoud > 1100) || (!spoke && now - started > 12_000) || now - started > 25_000) {
          recorder.stop();
          return;
        }
        setTimeout(tick, 60);
      };
      tick();
    });

  /** Auto with the server's ears: the language says who spoke. */
  const runDetecting = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    streamRef.current = stream;
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser);
    let last: Who = "them";
    try {
      while (autoRef.current) {
        setPhase("listening");
        const blob = await utterance(stream, analyser);
        if (!blob || !autoRef.current) continue;
        setPhase("thinking");
        const heard = await hear(blob);
        if (!heard?.text || !autoRef.current) continue;
        const p = prefsRef.current;
        const who: Who = heard.lang === p.mine ? "me" : heard.lang === p.theirs ? "them" : last === "me" ? "them" : "me";
        last = who;
        const known = languages.some((item) => item.code === heard.lang);
        await send(heard.text, who, known ? heard.lang : undefined);
      }
    } finally {
      stream.getTracks().forEach((track) => track.stop());
      void context.close();
    }
  };

  /** Auto with the browser's recogniser: it needs a language, so the two sides take turns. */
  const runTurns = async () => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    let side: Who = "me";
    while (autoRef.current) {
      setTurn(side);
      setPhase("listening");
      const heard = await new Promise<string | null>((resolve) => {
        const rec = new Ctor();
        const p = prefsRef.current;
        rec.lang = lang(side === "me" ? p.mine : p.theirs).speech;
        rec.interimResults = true;
        rec.continuous = false;
        let words = "";
        rec.onresult = (event) => {
          words = Array.from(event.results)
            .map((result) => result[0]?.transcript ?? "")
            .join(" ");
          setPhase("hearing");
          setText(words);
        };
        rec.onerror = (event) => {
          if (event?.error === "not-allowed") {
            setNotice(labels.micBlocked);
            autoRef.current = false;
            setAuto(false);
          }
        };
        rec.onend = () => resolve(words.trim() || null);
        recognition.current = rec;
        rec.start();
      });
      if (!autoRef.current) break;
      if (heard) {
        await send(heard, side);
        side = side === "me" ? "them" : "me";
      }
    }
  };

  function stopAuto() {
    autoRef.current = false;
    recognition.current?.abort();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    audioRef.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setPhase("idle");
    setLevel(0);
  }

  const toggleAuto = () => {
    if (auto) {
      setAuto(false);
      stopAuto();
      return;
    }
    const detecting = prefsRef.current.autoDetect && serverEars;
    if (!detecting && !canListen) {
      setNotice(labels.noVoice);
      return;
    }
    setNotice(null);
    setAuto(true);
    autoRef.current = true;
    (detecting ? runDetecting() : runTurns())
      .catch(() => setNotice(labels.micBlocked))
      .finally(() => {
        if (autoRef.current) {
          autoRef.current = false;
          setAuto(false);
        }
        setPhase("idle");
      });
  };

  // ---------------------------------------------------------------- render

  const phraseLang = PHRASE_LANGS.includes(mine) ? mine : NEAREST[mine] ?? "en";
  const phrases = modes.find((item) => item.key === mode)?.phrases ?? [];
  const label = (item: Language) => (item.native === item.name ? item.name : `${item.native} · ${item.name}`);
  const detecting = prefs.autoDetect && serverEars;
  const status = auto
    ? phase === "speaking"
      ? labels.speaking
      : phase === "thinking"
        ? labels.translating
        : phase === "hearing"
          ? labels.hearing
          : detecting
            ? labels.listeningBoth
            : turn === "me"
              ? `${labels.yourTurn} · ${lang(mine).native}`
              : `${labels.theirTurn} · ${lang(theirs).native}`
    : listening
      ? labels.listening
      : null;
  const voiceChoices = (code: string, gender: Gender) =>
    prefs.engine === "natural" && NATURAL_TTS.has(code)
      ? NATURAL_VOICES.filter((voice) => voice.gender === gender).map((voice) => ({ value: voice.id, label: `${voice.name} · ${voice.note}` }))
      : rankDeviceVoices(deviceVoices, lang(code).speech)
          .filter((voice) => {
            const guess = guessGender(voice.name);
            return !guess || guess === gender;
          })
          .map((voice) => ({ value: voice.name, label: voice.name }));

  return (
    <div className="a-tr">
      <div className="a-lang">
        <select aria-label={labels.iSpeak} value={mine} onChange={(event) => set({ mine: event.target.value })}>
          {languages.map((item) => (
            <option key={item.code} value={item.code}>
              {label(item)}
            </option>
          ))}
        </select>
        <button type="button" className="a-ibtn" aria-label={labels.swap} onClick={() => set({ mine: theirs, theirs: mine })}>
          <AppIcon name="swap" />
        </button>
        <select aria-label={labels.theySpeak} value={theirs} onChange={(event) => set({ theirs: event.target.value })}>
          {languages.map((item) => (
            <option key={item.code} value={item.code}>
              {label(item)}
            </option>
          ))}
        </select>
        <button type="button" className="a-ibtn" aria-label={labels.settings} onClick={() => setSettingsOpen(true)}>
          <AppIcon name="gear" />
        </button>
      </div>

      <div className="a-tr-auto">
        <label className="a-tog-label">
          <input type="checkbox" checked={auto} onChange={toggleAuto} />
          <span className="a-toggle-ui" />
          <b>{labels.auto}</b>
        </label>
        <span className="a-tr-status" aria-live="polite">
          {auto ? <i className="a-tr-level" style={{ transform: `scaleY(${0.25 + level * 0.75})` }} /> : null}
          {status ?? (auto ? null : <span className="a-muted">{detecting ? labels.autoHint : labels.turnsHint}</span>)}
        </span>
        {lines.length ? (
          <button type="button" className="a-link" onClick={() => setLines([])}>
            {labels.clear}
          </button>
        ) : null}
      </div>
      {auto && !detecting ? (
        <div className="a-seg a-tr-turn" role="radiogroup">
          {(["me", "them"] as const).map((side) => (
            <button key={side} type="button" role="radio" aria-checked={turn === side} onClick={() => setTurn(side)}>
              {side === "me" ? labels.me : labels.them} · {lang(side === "me" ? mine : theirs).native}
            </button>
          ))}
        </div>
      ) : null}
      {notice ? <p className="a-hint a-alert" style={{ marginTop: 8 }}>{notice}</p> : null}

      <div className="a-tr-chat" ref={chatRef} aria-live="polite">
        {lines.length === 0 ? <p className="a-tr-empty">{labels.empty}</p> : null}
        {lines.map((line) => (
          <div key={line.id} className={`a-bub ${line.who === "me" ? "me" : "them"}`}>
            <span lang={line.to}>{line.translation ?? (line.failed ? labels.failed : labels.translating)}</span>
            <small>
              <span lang={line.from}>{line.original}</span>
              {line.translation ? (
                <button type="button" className="a-tr-play" onClick={() => void speak(line.translation!, line.to, line.who)} aria-label="Play">
                  <AppIcon name="volume" />
                </button>
              ) : null}
            </small>
          </div>
        ))}
      </div>

      {phrasesOpen ? (
        <div className="a-tr-phrases">
          <div className="a-chips" role="tablist" aria-label={labels.who}>
            {modes.map((item) => (
              <button key={item.key} type="button" role="tab" aria-selected={mode === item.key} className="a-fchip" aria-current={mode === item.key ? "page" : undefined} onClick={() => setMode(item.key)}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="a-tr-phrase-list">
            {phrases.map((phrase) => (
              <button key={phrase.key} type="button" className="a-tr-phrase" disabled={busy} onClick={() => void send(phrase.text[phraseLang] ?? phrase.text.en, "me", phraseLang)}>
                <AppIcon name={phrase.icon} />
                <span lang={phraseLang}>{phrase.text[phraseLang] ?? phrase.text.en}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <form
        className="a-tr-bar"
        onSubmit={(event) => {
          event.preventDefault();
          void send(text, speaker);
        }}
      >
        <button type="button" className={`a-tr-round ghost ${phrasesOpen ? "on" : ""}`} aria-expanded={phrasesOpen} aria-label={labels.quick} onClick={() => setPhrasesOpen((open) => !open)}>
          <AppIcon name="ai" />
        </button>
        <button type="button" className="a-tr-side" onClick={() => setSpeaker(speaker === "me" ? "them" : "me")} aria-label={`${speaker === "me" ? labels.me : labels.them} · ${lang(speaker === "me" ? mine : theirs).native}`}>
          {(speaker === "me" ? mine : theirs).toUpperCase()}
        </button>
        <input className="a-tr-input" value={text} maxLength={600} onChange={(event) => setText(event.target.value)} placeholder={listening ? labels.listening : labels.type} lang={speaker === "me" ? mine : theirs} aria-label={labels.type} />
        {text.trim() && !listening ? (
          <button type="submit" className="a-tr-round" disabled={busy} aria-label={labels.send}>
            <AppIcon name="send" />
          </button>
        ) : (
          <button
            type="button"
            className={`a-tr-round ${listening || auto ? "rec" : ""}`}
            onClick={auto ? toggleAuto : listenManual}
            aria-pressed={listening || auto}
            aria-label={auto ? labels.auto : labels.tap}
            disabled={!auto && !canListen && !serverEars}
          >
            <AppIcon name={auto || listening ? "x" : "mic"} />
          </button>
        )}
      </form>

      {settingsOpen ? (
        <div className="a-dim" onClick={(event) => event.target === event.currentTarget && setSettingsOpen(false)}>
          <div className="a-sheet" role="dialog" aria-modal="true" aria-label={labels.settings}>
            <div className="a-grip" />
            <div className="a-sh">
              <h3>{labels.settings}</h3>
              <button type="button" className="a-x" onClick={() => setSettingsOpen(false)} aria-label={labels.done}>
                <AppIcon name="x" />
              </button>
            </div>

            <label className="a-tog-label a-li" style={{ padding: "10px 0" }}>
              <span className="a-t">
                <b>{labels.autoDetect}</b>
                <small>{serverEars ? labels.autoDetectHint : labels.turnsHint}</small>
              </span>
              <input type="checkbox" checked={prefs.autoDetect && serverEars} disabled={!serverEars} onChange={(event) => set({ autoDetect: event.target.checked })} />
              <span className="a-toggle-ui" />
            </label>
            <label className="a-tog-label a-li" style={{ padding: "10px 0" }}>
              <span className="a-t">
                <b>{labels.readAloud}</b>
              </span>
              <input type="checkbox" checked={prefs.aloud} onChange={(event) => set({ aloud: event.target.checked })} />
              <span className="a-toggle-ui" />
            </label>

            <div className="a-field">
              <span>{labels.voice}</span>
              <div className="a-seg" role="radiogroup">
                {(["natural", "device"] as const).map((engine) => (
                  <button key={engine} type="button" role="radio" aria-checked={prefs.engine === engine} onClick={() => set({ engine, myVoice: "", theirVoice: "" })}>
                    {engine === "natural" ? labels.natural : labels.phone}
                  </button>
                ))}
              </div>
            </div>

            {([
              ["me", labels.myVoice, theirs, prefs.myGender, prefs.myVoice] as const,
              ["them", labels.theirVoice, mine, prefs.theirGender, prefs.theirVoice] as const,
            ]).map(([who, title, code, gender, chosen]) => (
              <div key={who} className="a-field a-tr-voice">
                <span>
                  {who === "me" ? `${labels.iAm} · ` : ""}
                  {title} <small className="a-muted">· {lang(code).native}</small>
                </span>
                <div className="a-row">
                  <div className="a-seg" role="radiogroup" style={{ flex: 1 }}>
                    {(["female", "male"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={gender === value}
                        onClick={() => {
                          if (who === "me") {
                            set({ myGender: value, myVoice: "" });
                            void saveGenderAction(value).catch(() => false);
                          } else set({ theirGender: value, theirVoice: "" });
                        }}
                      >
                        {value === "female" ? labels.female : labels.male}
                      </button>
                    ))}
                  </div>
                  <button type="button" className="a-btn a-btn-s" style={{ minHeight: 40 }} onClick={() => void speak(labels.sample, code, who)}>
                    <AppIcon name="volume" />
                    {labels.test}
                  </button>
                </div>
                <select className="a-input" style={{ marginTop: 8 }} value={chosen} onChange={(event) => set(who === "me" ? { myVoice: event.target.value } : { theirVoice: event.target.value })}>
                  <option value="">{labels.best}</option>
                  {voiceChoices(code, gender).map((choice) => (
                    <option key={choice.value} value={choice.value}>
                      {choice.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <label className="a-field a-tr-speed">
              <span>
                {labels.speed} · {prefs.speed.toFixed(1)}×
              </span>
              <input type="range" min={0.7} max={1.2} step={0.1} value={prefs.speed} onChange={(event) => set({ speed: Number(event.target.value) })} />
              <div className="a-row a-between a-tiny a-muted">
                <span>{labels.slower}</span>
                <span>{labels.faster}</span>
              </div>
            </label>

            <button type="button" className="a-btn a-btn-p a-w" style={{ marginTop: 12 }} onClick={() => setSettingsOpen(false)}>
              {labels.done}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
