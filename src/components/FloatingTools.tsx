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

export function FloatingTools() {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="fab-stack">
      {helpOpen && <HelpPanel onClose={() => setHelpOpen(false)} />}

      <button
        type="button"
        className="fab-btn fab-help"
        onClick={() => setHelpOpen((v) => !v)}
      >
        <span>💬</span> Quick help
      </button>
    </div>
  );
}
