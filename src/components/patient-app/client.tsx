"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppIcon } from "./AppIcon";

/** Opens a bottom sheet by id, from anywhere in the app. */
export const openSheet = (id: string, detail?: unknown) => window.dispatchEvent(new CustomEvent("pa:sheet", { detail: { id, detail } }));
export const closeSheets = () => window.dispatchEvent(new CustomEvent("pa:sheet", { detail: { id: null } }));

export function OpenSheet({ id, className, children, label, data, style }: { id: string; className?: string; children: React.ReactNode; label?: string; data?: unknown; style?: React.CSSProperties }) {
  return (
    <button type="button" className={className} style={style} aria-label={label} aria-haspopup="dialog" onClick={() => openSheet(id, data)}>
      {children}
    </button>
  );
}

/** A bottom sheet: hidden until opened, closed by the backdrop, Escape or its close button. */
export function Sheet({ id, title, children, tone }: { id: string; title?: string; children: React.ReactNode; tone?: "red" }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    const onSheet = (event: Event) => {
      const wanted = (event as CustomEvent<{ id: string | null }>).detail?.id;
      if (wanted === id) {
        opener.current = document.activeElement;
        setOpen(true);
      } else setOpen(false);
    };
    window.addEventListener("pa:sheet", onSheet);
    return () => window.removeEventListener("pa:sheet", onSheet);
  }, [id]);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="a-dim" onClick={(event) => event.target === event.currentTarget && setOpen(false)}>
      <div ref={panel} className="a-sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="a-grip" />
        {title ? (
          <div className="a-sh">
            <h3 style={tone === "red" ? { color: "var(--red)" } : undefined}>{title}</h3>
            <button type="button" className="a-x" onClick={() => setOpen(false)} aria-label="Close">
              <AppIcon name="x" />
            </button>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

/** The short note after an action ("Saved"), then the address is tidied so a reload does not show it again. */
export function Toast({ message }: { message: string | null }) {
  const [shown, setShown] = useState(message);
  useEffect(() => {
    if (!message) return;
    setShown(message);
    const url = new URL(window.location.href);
    url.searchParams.delete("done");
    window.history.replaceState(null, "", url.toString());
    const timer = window.setTimeout(() => setShown(null), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);
  if (!shown) return null;
  return (
    <div className="a-toast" role="status">
      {shown}
    </div>
  );
}

/** The floating help button: opens the site's assistant chat (which a coordinator can also answer). */
export function HelpButton({ label }: { label: string }) {
  useEffect(() => {
    document.documentElement.classList.add("pa-app");
    return () => document.documentElement.classList.remove("pa-app");
  }, []);
  return (
    <button type="button" className="a-help" aria-label={label} onClick={() => window.dispatchEvent(new Event("shifain:open-chat"))}>
      <AppIcon name="ai" />
    </button>
  );
}

export function CopyButton({ value, children, className, copied }: { value: string; children: React.ReactNode; className?: string; copied: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        });
      }}
    >
      {children}
      {done ? <span className="sr-only" role="status">{copied}</span> : null}
      {done ? <em className="t-ok" style={{ position: "absolute", bottom: 6 }}>{copied}</em> : null}
    </button>
  );
}

/** Shares where the patient is, as a map link, through the phone's own share sheet. */
export function ShareLocation({ label, className }: { label: string; className?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "failed">("idle");
  const share = useCallback(() => {
    if (!navigator.geolocation) return setState("failed");
    setState("busy");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const link = `https://maps.google.com/?q=${position.coords.latitude},${position.coords.longitude}`;
        try {
          if (navigator.share) await navigator.share({ title: "My location", text: link });
          else await navigator.clipboard.writeText(link);
          setState("done");
        } catch {
          setState("idle");
        }
      },
      () => setState("failed"),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);
  return (
    <button type="button" className={className} onClick={share} disabled={state === "busy"}>
      <AppIcon name="pin" />
      {label}
      {state === "done" ? " ✓" : state === "failed" ? " ✕" : ""}
    </button>
  );
}

/** Marks the notifications read on this device once they have been seen (a plain request, so the page does not reload). */
export function MarkSeen() {
  useEffect(() => {
    void fetch("/api/patient/seen", { method: "POST" }).catch(() => undefined);
  }, []);
  return null;
}

export function Counter({ name, initial, min, max, label }: { name: string; initial: number; min: number; max: number; label: string }) {
  const [value, setValue] = useState(initial);
  return (
    <span className="a-row">
      <button type="button" className="a-ibtn" aria-label={`${label} −`} onClick={() => setValue((v) => Math.max(min, v - 1))}>
        −
      </button>
      <b style={{ width: 22, textAlign: "center" }} aria-live="polite">
        {value}
      </b>
      <button type="button" className="a-ibtn" aria-label={`${label} +`} onClick={() => setValue((v) => Math.min(max, v + 1))}>
        +
      </button>
      <input type="hidden" name={name} value={value} />
    </span>
  );
}

/** A switch that saves the moment it is flipped (submits its form). */
export function AutoToggle({ name, defaultChecked, label, disabled }: { name: string; defaultChecked: boolean; label: string; disabled?: boolean }) {
  return (
    <>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} aria-label={label} disabled={disabled} onChange={(event) => event.currentTarget.form?.requestSubmit()} />
      <span className="a-toggle-ui" />
    </>
  );
}

/** Picking a file sends it: the label is the button, the form submits on choose. */
export function UploadButton({ label, className, multiple = false, style }: { label: string; className?: string; multiple?: boolean; style?: React.CSSProperties }) {
  const [busy, setBusy] = useState(false);
  return (
    <label className={className} style={{ cursor: "pointer", ...style }} aria-busy={busy}>
      <AppIcon name="upload" />
      {busy ? "…" : label}
      <input
        type="file"
        name="files"
        multiple={multiple}
        accept="application/pdf,image/*"
        className="sr-only"
        onChange={(event) => {
          if (!event.currentTarget.files?.length) return;
          setBusy(true);
          event.currentTarget.form?.requestSubmit();
        }}
      />
    </label>
  );
}
