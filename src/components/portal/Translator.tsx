"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PortalIcon } from "./PortalIcon";
import { rankDeviceVoices } from "@/lib/voice/voices";

type Language = { code: string; name: string; native: string; speech: string };
type Speaker = "me" | "them";
type Line = { id: number; speaker: Speaker; original: string; translation: string | null; to: string; failed?: boolean };

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const SELECT =
  "min-h-12 w-full rounded-2xl border border-[#dcd8ee] bg-white px-4 text-[15px] font-semibold text-navy focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet-soft";

/**
 * Two people, two languages, one phone. Each line is translated by the
 * server and, if the patient wants, read aloud with the device's own voice
 * (free; no paid speech here).
 */
export function Translator({
  languages,
  defaultMine,
  defaultTheirs,
  labels,
}: {
  languages: Language[];
  defaultMine: string;
  defaultTheirs: string;
  labels: Record<
    | "iSpeak"
    | "theySpeak"
    | "me"
    | "them"
    | "typeHere"
    | "translate"
    | "listening"
    | "readAloud"
    | "swap"
    | "clear"
    | "translating"
    | "failed"
    | "empty"
    | "speak"
    | "play",
    string
  >;
}) {
  const [mine, setMine] = useState(defaultMine);
  const [theirs, setTheirs] = useState(defaultTheirs);
  const [speaker, setSpeaker] = useState<Speaker>("me");
  const [text, setText] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [aloud, setAloud] = useState(true);
  const [canListen, setCanListen] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const counter = useRef(0);
  const endRef = useRef<HTMLDivElement | null>(null);

  const lang = (code: string) => languages.find((item) => item.code === code) ?? languages[0];

  useEffect(() => {
    setCanListen(Boolean(recognitionCtor()));
    try {
      const saved = JSON.parse(localStorage.getItem("shifain_translator") ?? "null") as { mine?: string; theirs?: string; aloud?: boolean } | null;
      if (saved?.mine && languages.some((item) => item.code === saved.mine)) setMine(saved.mine);
      if (saved?.theirs && languages.some((item) => item.code === saved.theirs)) setTheirs(saved.theirs);
      if (typeof saved?.aloud === "boolean") setAloud(saved.aloud);
    } catch {}
  }, [languages]);

  useEffect(() => {
    try {
      localStorage.setItem("shifain_translator", JSON.stringify({ mine, theirs, aloud }));
    } catch {}
  }, [mine, theirs, aloud]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [lines]);

  const say = useCallback(
    (words: string, code: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
      const target = lang(code);
      const utterance = new SpeechSynthesisUtterance(words);
      utterance.lang = target.speech;
      const voice = rankDeviceVoices(window.speechSynthesis.getVoices(), target.speech)[0];
      if (voice) utterance.voice = voice;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [languages],
  );

  const send = useCallback(
    async (words: string, who: Speaker) => {
      const value = words.trim();
      if (!value || busy) return;
      const from = who === "me" ? mine : theirs;
      const to = who === "me" ? theirs : mine;
      const id = ++counter.current;
      setLines((prev) => [...prev, { id, speaker: who, original: value, translation: null, to }]);
      setText("");
      setBusy(true);
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
        if (aloud) say(data.translation, to);
      } catch {
        setLines((prev) => prev.map((line) => (line.id === id ? { ...line, failed: true } : line)));
      } finally {
        setBusy(false);
      }
    },
    [aloud, busy, mine, say, theirs],
  );

  const listen = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    if (listening) {
      recognition.current?.abort();
      setListening(false);
      return;
    }
    const who = speaker;
    const rec = new Ctor();
    rec.lang = lang(who === "me" ? mine : theirs).speech;
    rec.interimResults = true;
    rec.continuous = false;
    let heard = "";
    rec.onresult = (event) => {
      heard = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ");
      setText(heard);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      if (heard.trim()) void send(heard, who);
    };
    recognition.current = rec;
    setListening(true);
    rec.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening, mine, send, speaker, theirs]);

  const swap = () => {
    setMine(theirs);
    setTheirs(mine);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate">
          {labels.iSpeak}
          <select value={mine} onChange={(event) => setMine(event.target.value)} className={SELECT}>
            {languages.map((item) => (
              <option key={item.code} value={item.code}>
                {item.native} · {item.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={swap}
          aria-label={labels.swap}
          title={labels.swap}
          className="flex h-12 w-12 items-center justify-center justify-self-center rounded-full bg-violet-soft text-violet transition hover:bg-[#ece2ff]"
        >
          <PortalIcon name="swap" />
        </button>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate">
          {labels.theySpeak}
          <select value={theirs} onChange={(event) => setTheirs(event.target.value)} className={SELECT}>
            {languages.map((item) => (
              <option key={item.code} value={item.code}>
                {item.native} · {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex min-h-[18rem] flex-col gap-3 rounded-3xl bg-surface-muted p-4 sm:p-5" aria-live="polite">
        {lines.length === 0 ? (
          <p className="m-auto max-w-sm text-center text-[15px] leading-relaxed text-slate">{labels.empty}</p>
        ) : (
          lines.map((line) => (
            <div key={line.id} className={`flex ${line.speaker === "me" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-3xl px-4 py-3 ${
                  line.speaker === "me" ? "rounded-br-lg bg-violet text-white" : "rounded-bl-lg bg-white text-navy ring-1 ring-[#e6e3f4]"
                }`}
              >
                <p className={`text-xs font-semibold ${line.speaker === "me" ? "text-white/75" : "text-slate"}`}>
                  {line.speaker === "me" ? labels.me : labels.them} · {line.original}
                </p>
                <p className="mt-1 text-lg font-semibold leading-snug" lang={line.to}>
                  {line.translation ?? (line.failed ? labels.failed : labels.translating)}
                </p>
                {line.translation ? (
                  <button
                    type="button"
                    onClick={() => say(line.translation!, line.to)}
                    className={`mt-1 inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold ${line.speaker === "me" ? "text-white/90" : "text-violet"}`}
                  >
                    <PortalIcon name="speaker" className="h-4 w-4" />
                    {labels.play}
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send(text, speaker);
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="radiogroup" className="flex rounded-full bg-surface-muted p-1">
            {(["me", "them"] as Speaker[]).map((who) => (
              <button
                key={who}
                type="button"
                role="radio"
                aria-checked={speaker === who}
                onClick={() => setSpeaker(who)}
                className={`min-h-11 rounded-full px-5 text-[15px] font-semibold transition ${speaker === who ? "bg-white text-navy shadow-sm" : "text-slate"}`}
              >
                {who === "me" ? `${labels.me} · ${lang(mine).native}` : `${labels.them} · ${lang(theirs).native}`}
              </button>
            ))}
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium text-navy">
            <input type="checkbox" checked={aloud} onChange={(event) => setAloud(event.target.checked)} className="h-5 w-5 accent-[#722be4]" />
            {labels.readAloud}
          </label>
        </div>

        <div className="flex items-end gap-2">
          <label className="sr-only" htmlFor="translator-text">
            {labels.typeHere}
          </label>
          <textarea
            id="translator-text"
            rows={2}
            value={text}
            maxLength={600}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(text, speaker);
              }
            }}
            placeholder={listening ? labels.listening : labels.typeHere}
            lang={speaker === "me" ? mine : theirs}
            className="min-h-14 flex-1 resize-none rounded-2xl border border-[#dcd8ee] bg-white px-4 py-3 text-[16px] text-navy focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet-soft"
          />
          {canListen ? (
            <button
              type="button"
              onClick={listen}
              aria-label={labels.speak}
              aria-pressed={listening}
              className={`flex h-14 w-14 flex-none items-center justify-center rounded-full transition ${
                listening ? "animate-pulse bg-[#d93a3a] text-white" : "bg-violet-soft text-violet hover:bg-[#ece2ff]"
              }`}
            >
              <PortalIcon name="mic" className="h-6 w-6" />
            </button>
          ) : null}
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="flex h-14 flex-none items-center gap-2 rounded-full bg-violet px-5 font-semibold text-white transition hover:bg-brand-deep disabled:opacity-50"
          >
            <PortalIcon name="arrow" />
            <span className="hidden sm:inline">{labels.translate}</span>
          </button>
        </div>
        {lines.length ? (
          <button type="button" onClick={() => setLines([])} className="min-h-11 self-start text-sm font-semibold text-slate hover:text-navy">
            {labels.clear}
          </button>
        ) : null}
      </form>
    </div>
  );
}
