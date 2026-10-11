"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hands-free voice conversation, like ChatGPT's talk mode: listen until the
 * patient pauses, send what they said, read the answer aloud, listen again.
 *
 * Hearing: the server (ElevenLabs, any language) when it is configured,
 * otherwise the browser's own speech recognition. Speaking: the server's
 * audio when it sends some, otherwise the browser's speech synthesis.
 * Half-duplex on purpose — the microphone is off while the answer plays, so
 * the speaker is never heard as the patient. Tapping the orb interrupts.
 */

export type VoiceTurnResult = { reply?: string; audioBase64?: string; heardNothing?: boolean; error?: string };

type Phase = "starting" | "listening" | "hearing" | "thinking" | "speaking" | "error";

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};

const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function speechLang(): string {
  const page = (document.documentElement.lang || "en").toLowerCase().split("-")[0];
  const nav = (navigator.language || "").toLowerCase();
  if (nav.startsWith(page)) return navigator.language;
  return { en: "en-US", ru: "ru-RU", uz: "uz-UZ" }[page] ?? navigator.language ?? "en-US";
}

const PHASE_TEXT: Record<Phase, string> = {
  starting: "Starting…",
  listening: "Listening — go ahead",
  hearing: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking — tap to interrupt",
  error: "",
};

export function VoiceDock({
  serverVoice,
  onSpokenText,
  onSpokenAudio,
  onClose,
}: {
  /** Whether the server can transcribe audio and speak replies. */
  serverVoice: boolean;
  /** Browser-heard text: add it to the chat and return the reply. */
  onSpokenText: (text: string, lang: string) => Promise<VoiceTurnResult>;
  /** Recorded audio for the server to hear: add the transcript to the chat and return the reply. */
  onSpokenAudio: (audio: Blob) => Promise<VoiceTurnResult>;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("starting");
  const [live, setLive] = useState("");
  const [error, setError] = useState("");
  const [level, setLevel] = useState(0);

  const active = useRef(true);
  const audioEl = useRef<HTMLAudioElement | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const raf = useRef<number | null>(null);
  const listenRef = useRef<() => void>(() => {});
  /**
   * Each listening turn gets a number. Callbacks from an older turn — a
   * recogniser's late "end" after abort, a cancelled utterance — check it and
   * stand down, so two loops can never run at once.
   */
  const turn = useRef(0);
  /** Turns in a row with nothing heard; voice pauses rather than listening forever. */
  const quietTurns = useRef(0);
  const useServer = serverVoice && typeof MediaRecorder !== "undefined";

  const fail = useCallback((message: string) => {
    setError(message);
    setPhase("error");
  }, []);

  const stopListening = useCallback(() => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    recognition.current?.abort();
    setLevel(0);
  }, []);

  const stopSpeaking = useCallback(() => {
    audioEl.current?.pause();
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }, []);

  /** Listens again after a quiet turn, pausing after a few in a row. */
  const relisten = useCallback(() => {
    quietTurns.current += 1;
    if (quietTurns.current >= 4) {
      fail("Paused because it went quiet. Tap End, then Talk when you're ready.");
      return;
    }
    listenRef.current();
  }, [fail]);

  /** Plays the answer, then goes back to listening. */
  const speak = useCallback(
    (result: VoiceTurnResult, lang: string) => {
      if (!active.current) return;
      if (result.error) {
        fail(result.error);
        return;
      }
      if (result.heardNothing || !result.reply) {
        relisten();
        return;
      }
      quietTurns.current = 0;
      setPhase("speaking");
      const mine = turn.current;
      const next = () => {
        if (active.current && mine === turn.current) listenRef.current();
      };

      if (result.audioBase64 && audioEl.current) {
        const el = audioEl.current;
        el.src = `data:audio/mpeg;base64,${result.audioBase64}`;
        el.onended = next;
        el.play().catch(next);
        return;
      }
      if (typeof speechSynthesis !== "undefined") {
        const utterance = new SpeechSynthesisUtterance(result.reply);
        utterance.lang = lang;
        utterance.rate = 1;
        utterance.onend = next;
        utterance.onerror = next;
        speechSynthesis.cancel();
        speechSynthesis.speak(utterance);
        return;
      }
      next();
    },
    [fail, relisten],
  );

  /** Server path: record until a pause, then send the audio. */
  const listenWithServer = useCallback(() => {
    const media = stream.current;
    const audioCtx = ctx.current;
    if (!media || !audioCtx) return;
    const mine = ++turn.current;

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    audioCtx.createMediaStreamSource(media).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);

    const chunks: Blob[] = [];
    const rec = new MediaRecorder(media);
    recorder.current = rec;
    rec.ondataavailable = (event) => event.data.size > 0 && chunks.push(event.data);

    const started = performance.now();
    let floor = 0.01;
    let heardAt = 0;
    let spoke = false;
    let sendIt = false;

    rec.onstop = async () => {
      if (!active.current || mine !== turn.current) return;
      if (!sendIt) {
        relisten();
        return;
      }
      setPhase("thinking");
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      const result = await onSpokenAudio(blob);
      if (mine === turn.current) speak(result, speechLang());
    };

    const tick = () => {
      if (mine !== turn.current) return;
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const v of samples) sum += v * v;
      const rms = Math.sqrt(sum / samples.length);
      const now = performance.now();
      if (now - started < 350) floor = Math.max(floor, rms);
      const threshold = Math.max(0.015, floor * 2.5);
      setLevel(Math.min(1, rms / (threshold * 4)));

      if (rms > threshold) {
        if (!spoke) setPhase("hearing");
        spoke = true;
        heardAt = now;
      }
      // A pause after speech ends the turn; long silence just restarts listening.
      if ((spoke && now - heardAt > 1300) || (!spoke && now - started > 12000) || now - started > 45000) {
        sendIt = spoke;
        rec.stop();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };

    setPhase("listening");
    rec.start(250);
    raf.current = requestAnimationFrame(tick);
  }, [onSpokenAudio, relisten, speak]);

  /** Browser path: the browser's recogniser hears and transcribes. */
  const listenWithBrowser = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      fail("Voice conversation isn't supported in this browser. You can still type, or try Chrome.");
      return;
    }
    const lang = speechLang();
    const mine = ++turn.current;
    const rec = new Ctor();
    recognition.current = rec;
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    let lastError = "";

    rec.onresult = (event) => {
      if (mine !== turn.current) return;
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      setPhase("hearing");
      setLive((finalText + interim).trim());
    };
    rec.onerror = (event) => {
      lastError = event.error;
    };
    rec.onend = async () => {
      if (!active.current || mine !== turn.current) return;
      const text = finalText.trim();
      setLive("");
      if (lastError === "not-allowed" || lastError === "service-not-allowed") {
        fail("Microphone access is blocked. Allow it in your browser settings, or type instead.");
        return;
      }
      if (lastError && lastError !== "no-speech" && lastError !== "aborted") {
        fail("Voice isn't available right now. Please type instead.");
        return;
      }
      if (!text) {
        relisten();
        return;
      }
      setPhase("thinking");
      const result = await onSpokenText(text, lang);
      if (mine === turn.current) speak(result, lang);
    };

    setPhase("listening");
    setLive("");
    try {
      rec.start();
    } catch {
      /* already started */
    }
  }, [fail, onSpokenText, relisten, speak]);

  const listen = useCallback(() => {
    if (!active.current) return;
    stopSpeaking();
    if (useServer) listenWithServer();
    else listenWithBrowser();
  }, [listenWithBrowser, listenWithServer, stopSpeaking, useServer]);

  useEffect(() => {
    listenRef.current = listen;
  }, [listen]);

  // Starts on mount, which follows the tap that opened voice mode, so audio
  // playback is unlocked inside that gesture (iOS needs it).
  useEffect(() => {
    active.current = true;
    const el = new Audio(SILENT_WAV);
    el.play().catch(() => undefined);
    audioEl.current = el;
    if (typeof speechSynthesis !== "undefined") speechSynthesis.speak(new SpeechSynthesisUtterance(""));

    (async () => {
      if (useServer) {
        try {
          stream.current = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
          });
          const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          ctx.current = new AC();
          await ctx.current.resume();
        } catch {
          fail("Microphone access is blocked. Allow it in your browser settings, or type instead.");
          return;
        }
      }
      listenRef.current();
    })();

    return () => {
      active.current = false;
      turn.current += 1;
      stopListening();
      stopSpeaking();
      stream.current?.getTracks().forEach((track) => track.stop());
      ctx.current?.close().catch(() => undefined);
    };
  }, [fail, stopListening, stopSpeaking, useServer]);

  const interrupt = () => {
    if (phase === "speaking") {
      quietTurns.current = 0;
      turn.current += 1; // the cancelled reply's "end" must not start a second loop
      stopSpeaking();
      listen();
    }
  };

  const scale = phase === "hearing" ? 1 + level * 0.35 : 1;

  return (
    <div className="voice-dock" role="region" aria-label="Voice conversation">
      <button
        type="button"
        onClick={interrupt}
        className={`voice-orb voice-orb-${phase}`}
        style={{ transform: `scale(${scale})` }}
        aria-label={phase === "speaking" ? "Interrupt and speak" : "Voice status"}
      >
        <span className="voice-orb-core" />
      </button>

      <div className="min-w-0 flex-1" aria-live="polite">
        <p className="text-[14px] font-semibold text-ink">
          {phase === "error" ? "Voice paused" : PHASE_TEXT[phase]}
        </p>
        <p className="truncate text-[13px] text-ink-soft">
          {phase === "error" ? error : live || (phase === "listening" ? (useServer ? "Speak in any language" : "Speak now") : "\u00a0")}
        </p>
      </div>

      <button type="button" onClick={onClose} className="voice-end" aria-label="End voice conversation">
        End
      </button>
    </div>
  );
}
