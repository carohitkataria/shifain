"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const FAQ_ITEMS = [
  {
    icon: "📋",
    q: "How is my estimate calculated?",
    a: "We collect your medical reports, match you with accredited hospitals, and return real quotes within 24–48 hours — no middleman markup.",
  },
  {
    icon: "🛂",
    q: "What documents do I need for a medical visa?",
    a: "A valid passport, a visa invitation letter from the hospital (we arrange this), your medical reports, and proof of funds. We guide you through every step.",
  },
  {
    icon: "🏥",
    q: "How do I track my case?",
    a: "Once you submit your reports, you get a patient portal with live status updates — from doctor review to travel planning.",
  },
];

function HelpPanel({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  const scrollTo = useCallback((id: string) => {
    onClose();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, [onClose]);

  return (
    <div ref={ref} className="fab-panel">
      <h4 className="mb-1 text-[17px] font-bold">Quick help</h4>
      <p className="mb-3 text-sm text-ink-soft">Get answers fast, or reach a person.</p>

      {FAQ_ITEMS.map((item, i) => (
        <div key={i}>
          <button
            type="button"
            className="fab-qa"
            onClick={() => setOpenFaq(openFaq === i ? null : i)}
          >
            {item.icon} {item.q}
          </button>
          {openFaq === i && (
            <p className="mb-2 ml-1 rounded-lg bg-brand-tint px-3 py-2 text-[13px] leading-relaxed text-ink-soft">
              {item.a}
            </p>
          )}
        </div>
      ))}

      <button
        type="button"
        className="fab-qa"
        onClick={() => scrollTo("quote")}
      >
        📞 Request a callback
      </button>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn btn-primary w-full text-sm"
          onClick={() => scrollTo("faq")}
        >
          View all FAQs
        </button>
        <button
          type="button"
          className="btn btn-secondary w-full text-sm"
          onClick={() => scrollTo("quote")}
        >
          Get my plan
        </button>
      </div>
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
