"use client";

import { useState, useRef, useEffect } from "react";

function HelpPanel({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="fab-panel">
      <h4 className="mb-1 text-[17px] font-bold">Quick help</h4>
      <p className="mb-3 text-sm text-ink-soft">Get answers fast, or reach a person.</p>
      <button type="button" className="fab-qa">📋 How is my estimate calculated?</button>
      <button type="button" className="fab-qa">🛂 What documents do I need for a medical visa?</button>
      <button type="button" className="fab-qa">💬 Chat with my coordinator</button>
      <button type="button" className="fab-qa">📞 Request a callback</button>
      <button type="button" className="btn btn-primary mt-2 w-full text-sm">Open help centre</button>
    </div>
  );
}

function TranslatePanel({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [lang, setLang] = useState("English");

  const LANGS = ["English", "العربية (Arabic)", "Français", "Kiswahili", "বাংলা (Bengali)", "Español"];

  useEffect(() => {
    function close(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="fab-panel">
      <h4 className="mb-1 text-[17px] font-bold">Language &amp; voice translator</h4>
      <p className="mb-3 text-sm text-ink-soft">Change the app language, or speak to translate live during a call.</p>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {LANGS.map((l) => (
          <button
            key={l}
            type="button"
            className={`rounded-lg border-[1.5px] px-3 py-2 text-sm font-medium transition ${
              lang === l
                ? "border-brand bg-brand-tint text-brand-deep"
                : "border-line bg-surface text-ink hover:border-brand"
            }`}
            onClick={() => setLang(l)}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 rounded-xl2 bg-surface-muted p-3">
        <div className="grid h-10 w-10 flex-none place-items-center rounded-full bg-brand text-lg text-white">🎤</div>
        <div>
          <b className="block text-sm font-bold">Voice translate</b>
          <span className="text-xs text-ink-soft">Tap and speak — we&apos;ll translate for your coordinator in real time.</span>
        </div>
      </div>
    </div>
  );
}

export function FloatingTools() {
  const [helpOpen, setHelpOpen] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);

  return (
    <div className="fab-stack">
      {translateOpen && <TranslatePanel onClose={() => setTranslateOpen(false)} />}
      {helpOpen && <HelpPanel onClose={() => setHelpOpen(false)} />}

      <button
        type="button"
        className="fab-btn fab-translate"
        onClick={() => { setTranslateOpen((v) => !v); setHelpOpen(false); }}
      >
        <span>🌐</span> Translate
      </button>
      <button
        type="button"
        className="fab-btn fab-help"
        onClick={() => { setHelpOpen((v) => !v); setTranslateOpen(false); }}
      >
        <span>💬</span> Quick help
      </button>
    </div>
  );
}
