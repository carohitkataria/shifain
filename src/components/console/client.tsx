"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Escape closes the open drawer; focus moves into it so the keyboard follows. */
export function DrawerKeys({ closeHref }: { closeHref: string }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.push(closeHref, { scroll: false });
    };
    document.addEventListener("keydown", onKey);
    document.getElementById("console-drawer")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [closeHref, router]);
  return null;
}

/** The "saved" note an action leaves behind; gone after a moment, and out of the address bar. */
export function Toast({ message }: { message: string | null }) {
  const [shown, setShown] = useState(Boolean(message));
  useEffect(() => {
    if (!message) return;
    setShown(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("done");
    window.history.replaceState(null, "", url.toString());
    const timer = setTimeout(() => setShown(false), 2600);
    return () => clearTimeout(timer);
  }, [message]);
  if (!message || !shown) return null;
  return (
    <div role="status" className="fixed bottom-24 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-ink px-4 py-2.5 text-[13px] font-semibold text-white shadow-lg md:bottom-8">
      {message}
    </div>
  );
}

/** "/" jumps to the search box from anywhere that is not already a text field. */
export function SearchKey() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (event.key !== "/" || !active || /INPUT|TEXTAREA|SELECT/.test(active.tagName) || active.isContentEditable) return;
      event.preventDefault();
      document.getElementById("console-search")?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  return null;
}

/** A thread scrolled to its newest message. */
export function ScrollToEnd({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Fills the reply box with a ready phrase. */
export function QuickReply({ text, target }: { text: string; target: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const input = document.getElementById(target) as HTMLInputElement | null;
        if (input) {
          input.value = text;
          input.focus();
        }
      }}
      className="inline-flex h-8 items-center whitespace-nowrap rounded-full border border-line bg-white px-3 text-xs font-semibold text-ink-soft hover:border-brand/30 hover:text-brand"
    >
      {text}
    </button>
  );
}

/** Ticks every row's checkbox in a bulk form. */
export function SelectAll({ form, label }: { form: string; label: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      className="h-4 w-4 accent-brand"
      onChange={(event) => {
        document.querySelectorAll<HTMLInputElement>(`input[form="${form}"][name="ids"]`).forEach((box) => {
          box.checked = event.target.checked;
        });
        document.getElementById(`${form}-bar`)?.toggleAttribute("hidden", !event.target.checked);
        const count = document.getElementById(`${form}-count`);
        if (count) count.textContent = String(document.querySelectorAll(`input[form="${form}"][name="ids"]:checked`).length);
      }}
    />
  );
}

/** A row checkbox that shows the bulk bar once anything is ticked. */
export function RowCheck({ form, value, label }: { form: string; value: string; label: string }) {
  return (
    <input
      type="checkbox"
      form={form}
      name="ids"
      value={value}
      aria-label={label}
      className="h-4 w-4 accent-brand"
      onClick={(event) => event.stopPropagation()}
      onChange={() => {
        const any = document.querySelectorAll(`input[form="${form}"][name="ids"]:checked`).length > 0;
        document.getElementById(`${form}-bar`)?.toggleAttribute("hidden", !any);
        const count = document.getElementById(`${form}-count`);
        if (count) count.textContent = String(document.querySelectorAll(`input[form="${form}"][name="ids"]:checked`).length);
      }}
    />
  );
}

/** Country → dialling code and the messenger people there use, for the new-case form. */
export function CountryChannel({ countries, telegramFirst }: { countries: { name: string; code: string; dial: string }[]; telegramFirst: string[] }) {
  const [country, setCountry] = useState("");
  const found = countries.find((item) => item.name === country);
  const suggested = found ? (telegramFirst.includes(found.code) ? "telegram" : "whatsapp") : null;
  const [picked, setPicked] = useState<Set<string>>(new Set(["email"]));
  const channels = [
    { key: "whatsapp", label: "WhatsApp" },
    { key: "telegram", label: "Telegram" },
    { key: "email", label: "Email" },
    { key: "call", label: "Call" },
  ];
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[12px] font-bold text-ink-soft">
          Country
          <select
            name="country"
            required
            value={country}
            onChange={(event) => {
              setCountry(event.target.value);
              const next = countries.find((item) => item.name === event.target.value);
              const phone = document.getElementById("nc-phone") as HTMLInputElement | null;
              if (next && phone && !phone.value.trim()) phone.value = `+${next.dial} `;
              if (next) {
                const messenger = telegramFirst.includes(next.code) ? "telegram" : "whatsapp";
                setPicked((current) => {
                  const out = new Set(current);
                  out.delete("telegram");
                  out.delete("whatsapp");
                  out.add(messenger);
                  return out;
                });
              }
            }}
            className="mt-1.5 h-10 w-full rounded-[11px] border border-line bg-white px-3 text-[13.5px] text-ink"
          >
            <option value="">Choose</option>
            {countries.map((item) => (
              <option key={item.code} value={item.name}>
                {item.name} +{item.dial}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[12px] font-bold text-ink-soft">
          Mobile
          <input id="nc-phone" name="phone" required inputMode="tel" placeholder="+ code and number" className="mt-1.5 h-10 w-full rounded-[11px] border border-line bg-white px-3 text-[13.5px] text-ink" />
        </label>
      </div>
      <div className="mb-3 mt-3 text-[12px] font-bold text-ink-soft">
        Reach on
        <div className="mt-1.5 flex flex-wrap gap-2">
          {channels.map((channel) => {
            const on = picked.has(channel.key);
            return (
              <button
                key={channel.key}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setPicked((current) => {
                    const out = new Set(current);
                    if (out.has(channel.key)) out.delete(channel.key);
                    else out.add(channel.key);
                    return out;
                  })
                }
                className={`relative inline-flex h-9 items-center gap-1.5 rounded-[10px] border px-3 text-[12.5px] font-semibold ${on ? "border-brand/30 bg-brand-tint text-brand" : "border-line bg-white text-ink-soft"}`}
              >
                {suggested === channel.key ? <span className="absolute -top-2 right-1 rounded-full bg-leaf px-1.5 text-[9px] font-bold text-white">Suggested</span> : null}
                {channel.label}
              </button>
            );
          })}
        </div>
        {[...picked].map((channel) => (
          <input key={channel} type="hidden" name="channels" value={channel} />
        ))}
      </div>
    </>
  );
}
