"use client";

import { useState, useEffect } from "react";

export function MobileMenu({
  items,
  cta,
}: {
  items: { href: string; label: string }[];
  cta?: { href: string; label: string };
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-11 w-11 items-center justify-center rounded-lg text-ink transition hover:bg-surface-muted xl:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
      >
        {open ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 top-[60px] z-50 xl:hidden">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <nav className="relative mx-4 mt-2 rounded-2xl border border-line bg-white p-2 shadow-xl">
            {items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center rounded-xl px-4 text-[15px] font-semibold text-ink transition hover:bg-surface-muted"
              >
                {item.label}
              </a>
            ))}
            {cta ? (
              <a
                href={cta.href}
                onClick={() => setOpen(false)}
                className="mt-2 flex min-h-12 items-center justify-center rounded-xl bg-brand-deep px-4 text-sm font-bold text-white transition hover:bg-brand sm:hidden"
              >
                {cta.label}
              </a>
            ) : null}
          </nav>
        </div>
      )}
    </>
  );
}
