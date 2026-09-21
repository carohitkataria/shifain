"use client";

import { useState, useRef, useEffect } from "react";

export function FieldLabel({
  text,
  hint,
  htmlFor,
  className = "",
}: {
  text: string;
  hint?: string;
  htmlFor?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open]);

  return (
    <label htmlFor={htmlFor} className={`mb-1.5 flex items-center gap-1.5 text-sm font-bold text-ink ${className}`}>
      {text}
      {hint ? (
        <span
          ref={ref}
          tabIndex={0}
          role="button"
          aria-label={`Help: ${text}`}
          className="relative inline-grid h-[17px] w-[17px] cursor-help place-items-center rounded-full border border-ink-muted text-[11px] font-bold text-ink-muted transition hover:border-ink hover:bg-ink hover:text-white focus:border-ink focus:bg-ink focus:text-white"
          onClick={() => setOpen((v) => !v)}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        >
          ?
          <span
            role="tooltip"
            className={`pointer-events-none absolute bottom-[135%] left-1/2 z-20 w-[220px] -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-left text-xs font-normal leading-snug text-white shadow-lg transition ${
              open ? "visible opacity-100" : "invisible opacity-0"
            }`}
          >
            {hint}
            <span className="absolute left-1/2 top-full -translate-x-1/2 border-[6px] border-transparent border-t-ink" />
          </span>
        </span>
      ) : null}
    </label>
  );
}
