"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppIcon } from "./AppIcon";
import { rankDeviceVoices } from "@/lib/voice/voices";

type Language = { code: string; name: string; native: string; speech: string };
type Line = { id: number; mine: boolean; original: string; translation: string | null; to: string; failed?: boolean };
type Phrase = { key: string; icon: string; short: string; text: string };
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

/**
 * The translator behind the centre button: two languages, one phone. Speak or
 * type; each line is translated by the server and read aloud with the phone's
 * own voice. Quick phrases change with who the patient is talking to.
 */
export function TranslatorApp({
  languages,
  defaultMine,
  defaultTheirs,
  uiLocale,
  modes,
  labels,
}: {
  languages: Language[];
  defaultMine: string;
  defaultTheirs: string;
  uiLocale: string;
  modes: { key: string; label: string; phrases: Phrase[] }[];
  labels: Record<"iSpeak" | "theySpeak" | "swap" | "tap" | "listening" | "type" | "translating" | "failed" | "quick" | "me" | "them" | "clear" | "send" | "readAloud", string>;
}) {
  const [mine, setMine] = useState(defaultMine);
  const [theirs, setTheirs] = useState(defaultTheirs);
  const [mode, setMode] = useState(modes[0]?.key ?? "doctor");
  const [speaker, setSpeaker] = useState<"me" | "them">("me");
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
    async (words: string, who: "me" | "them", fromOverride?: string) => {
      const value = words.trim();
      if (!value || busy) return;
      const from = fromOverride ?? (who === "me" ? mine : theirs);
      const to = who === "me" ? theirs : mine;
      const id = ++counter.current;
      setLines((prev) => [...prev, { id, mine: who === "me", original: value, translation: null, to }]);
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

  const phrases = modes.find((item) => item.key === mode)?.phrases ?? [];

  return (
    <>
      <div className="a-lang">
        <select aria-label={labels.iSpeak} value={mine} onChange={(event) => setMine(event.target.value)}>
          {languages.map((item) => (
            <option key={item.code} value={item.code}>
              {item.native}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="a-ibtn"
          aria-label={labels.swap}
          onClick={() => {
            setMine(theirs);
            setTheirs(mine);
          }}
        >
          <AppIcon name="swap" />
        </button>
        <select aria-label={labels.theySpeak} value={theirs} onChange={(event) => setTheirs(event.target.value)}>
          {languages.map((item) => (
            <option key={item.code} value={item.code}>
              {item.native}
            </option>
          ))}
        </select>
      </div>

      <div className="a-seg a-sec" style={{ marginTop: 10 }}>
        {modes.map((item) => (
          <button key={item.key} type="button" aria-pressed={mode === item.key} onClick={() => setMode(item.key)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="a-bubbles a-sec" aria-live="polite">
        {lines.map((line) => (
          <div key={line.id} className={`a-bub ${line.mine ? "me" : "them"}`}>
            <span lang={line.to}>{line.translation ?? (line.failed ? labels.failed : labels.translating)}</span>
            <small>
              {line.original}
              {line.translation ? (
                <button type="button" onClick={() => say(line.translation!, line.to)} style={{ marginLeft: 6, textDecoration: "underline" }} aria-label="Play">
                  ▶
                </button>
              ) : null}
            </small>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="a-sec" style={{ textAlign: "center" }}>
        <div className="a-seg" style={{ maxWidth: 260, margin: "0 auto 12px" }} role="radiogroup">
          <button type="button" role="radio" aria-checked={speaker === "me"} onClick={() => setSpeaker("me")}>
            {labels.me} · {lang(mine).native}
          </button>
          <button type="button" role="radio" aria-checked={speaker === "them"} onClick={() => setSpeaker("them")}>
            {labels.them} · {lang(theirs).native}
          </button>
        </div>
        {canListen ? (
          <button type="button" className={`a-mic ${listening ? "rec" : ""}`} onClick={listen} aria-pressed={listening} aria-label={labels.tap}>
            <AppIcon name="mic" />
          </button>
        ) : null}
        <p className="a-tiny a-muted" style={{ marginTop: 8 }}>
          {listening ? labels.listening : labels.tap}
        </p>
      </div>

      <section className="a-sec">
        <div className="a-sec-h">
          <h3>
            <AppIcon name="ai" />
            {labels.quick}
          </h3>
          <label className="a-tiny a-row" style={{ gap: 6 }}>
            <input type="checkbox" checked={aloud} onChange={(event) => setAloud(event.target.checked)} />
            {labels.readAloud}
          </label>
        </div>
        <div className="a-g3">
          {phrases.map((phrase) => (
            <button key={phrase.key} type="button" className="a-tile" onClick={() => void send(phrase.text, "me", uiLocale)}>
              <AppIcon name={phrase.icon} />
              {phrase.short}
            </button>
          ))}
        </div>
      </section>

      <form
        className="a-row a-sec"
        onSubmit={(event) => {
          event.preventDefault();
          void send(text, speaker);
        }}
      >
        <input className="a-input" value={text} maxLength={600} onChange={(event) => setText(event.target.value)} placeholder={listening ? labels.listening : labels.type} lang={speaker === "me" ? mine : theirs} />
        <button type="submit" className="a-ibtn" disabled={busy || !text.trim()} style={{ background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" }} aria-label={labels.send}>
          <AppIcon name="send" />
        </button>
      </form>
      {lines.length ? (
        <button type="button" className="a-link" style={{ marginTop: 10 }} onClick={() => setLines([])}>
          {labels.clear}
        </button>
      ) : null}
    </>
  );
}
