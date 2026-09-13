"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { GROUPS } from "@/lib/admin-groups";

type NavSection = { heading: string; links: { href: string; label: string }[] };

function MenuButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="admin-nav"
      aria-label={open ? "Close menu" : "Open menu"}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white text-ink transition hover:border-brand hover:text-brand-deep"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
      </svg>
    </button>
  );
}

/**
 * Hamburger-driven admin navigation. Off-canvas on narrow screens, pinned open
 * on wide ones. Sections are grouped so more areas can be added later.
 */
export function AdminNav({ brand, actions }: { brand: React.ReactNode; actions: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever navigation lands on a new page.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const sections: NavSection[] = [
    { heading: "Overview", links: [{ href: "/admin", label: "Homepage layout" }] },
    {
      heading: "Homepage content",
      links: GROUPS.map((group) => ({ href: `/admin/${group.key}`, label: group.label })),
    },
    {
      heading: "People",
      links: [{ href: "/admin/access", label: "Partner logins" }],
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-white lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <MenuButton open={open} onToggle={() => setOpen((v) => !v)} />
            {brand}
          </div>
          {actions}
        </div>
      </header>


      {open ? (
        <div
          role="presentation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
        />
      ) : null}

      <nav
        id="admin-nav"
        aria-label="Admin sections"
        className={`fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-line bg-white p-4 transition-transform lg:sticky lg:top-0 lg:z-0 lg:h-[100dvh] lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <span className="text-sm font-extrabold text-ink">Menu</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {sections.map((section) => (
          <div key={section.heading} className="mb-5">
            <p className="px-3 pb-2 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink-muted">
              {section.heading}
            </p>
            <ul className="space-y-0.5">
              {section.links.map((link) => {
                const active = pathname === link.href;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-lg px-3 py-2 text-sm transition ${
                        active
                          ? "bg-brand-tint font-bold text-brand-deep"
                          : "text-ink-soft hover:bg-surface-muted hover:text-ink"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}
