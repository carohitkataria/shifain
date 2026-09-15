"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_GROUPS } from "@/lib/admin-nav";
import { AdminIcon } from "./AdminIcon";

const COLLAPSED_KEY = "shifain-admin-nav-collapsed";

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
 * The console sidebar: collapsible groups, off-canvas on narrow screens and
 * pinned open on wide ones. Which groups are folded away is remembered per
 * browser, because an editor who only touches the FAQ should not have to
 * scroll past twenty content sections every visit.
 */
export function AdminNav({ brand, actions }: { brand: React.ReactNode; actions: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSED_KEY);
      if (stored) setCollapsed(JSON.parse(stored));
    } catch {
      // A browser that refuses storage just gets every group open.
    }
  }, []);

  const toggleGroup = (id: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      } catch {
        // Not worth failing the click over.
      }
      return next;
    });
  };

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

  const nav = (
    <nav id="admin-nav" className="space-y-5 px-3 py-5">
      {NAV_GROUPS.map((group) => {
        const folded = Boolean(collapsed[group.id]);
        return (
          <div key={group.id}>
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              aria-expanded={!folded}
              className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-muted transition hover:text-ink"
            >
              {group.heading}
              <AdminIcon
                name="chevron"
                className={`h-4 w-4 transition-transform ${folded ? "-rotate-90" : ""}`}
              />
            </button>

            {!folded && (
              <ul className="mt-1 space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                          active
                            ? "bg-brand-tint font-bold text-brand-deep"
                            : "font-medium text-ink-soft hover:bg-surface-muted hover:text-ink"
                        }`}
                      >
                        <AdminIcon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                        <span className="min-w-0 truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );

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

      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-line bg-white transition-transform lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 lg:hidden">
          <span className="text-sm font-extrabold text-ink">Menu</span>
          <MenuButton open onToggle={() => setOpen(false)} />
        </div>
        {nav}
      </aside>
    </>
  );
}
