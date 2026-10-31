"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALES, LOCALE_COOKIE, LOCALE_META, type Locale } from "@/lib/i18n";

/**
 * Language is picked automatically from the visitor's country, but always
 * changeable here. The choice is remembered in a cookie so it wins next time.
 */
/** The short code on the button: the full name is in the menu and read to screen readers. */
const SHORT: Record<Locale, string> = { en: "EN", ru: "RU", uz: "UZ", oz: "ЎЗ" };

export function LanguageSwitcher({ locale, path }: { locale: Locale; path: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const remember = (next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Language: ${LOCALE_META[locale].label}`}
        title={LOCALE_META[locale].label}
        className="flex min-h-11 items-center gap-1 rounded-full px-1.5 text-sm sm:px-2.5 font-semibold text-navy transition hover:bg-white/70 hover:text-violet focus-visible:outline-2 focus-visible:outline-brand"
      >
        <svg viewBox="0 0 24 24" className="h-[1.15rem] w-[1.15rem]" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
        </svg>
        <span aria-hidden="true">{SHORT[locale]}</span>
        <svg viewBox="0 0 24 24" className="hidden h-3.5 w-3.5 sm:block" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-xl shadow-ink/10"
        >
          {LOCALES.map((option) => (
            <a
              key={option}
              role="menuitem"
              href={`/${option}${path}`}
              onClick={() => remember(option)}
              className={`flex items-center justify-between px-3 py-2 text-sm transition hover:bg-surface-muted ${
                option === locale ? "font-bold text-brand-deep" : "text-ink-soft"
              }`}
            >
              <span>{LOCALE_META[option].label}</span>
              <span className="text-[0.68rem] uppercase tracking-wider text-ink-muted">{option === "oz" ? "ЎЗ" : option}</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
