"use client";

import { useEffect, useRef, useState } from "react";

type Line = { from: "you" | "bot"; text: string; via?: string; extra?: string };

const VIA: Record<string, { label: string; tone: string; note: string }> = {
  command: { label: "Command", tone: "bg-leaf/10 text-leaf", note: "Done in code — no AI, free" },
  instant: { label: "Instant answer", tone: "bg-leaf/10 text-leaf", note: "From your knowledge — no AI, free" },
  profile: { label: "Guided step", tone: "bg-leaf/10 text-leaf", note: "Asked in code — no AI, free" },
  ai: { label: "AI", tone: "bg-brand-tint text-brand-deep", note: "Used your instructions and knowledge" },
  handoff: { label: "Coordinator", tone: "bg-saffron/15 text-saffron", note: "A person is handling this chat" },
};

const TRY = ["What can you do?", "Do I need a visa?", "I have had chest pain for two months", "How much is a knee replacement?", "Talk to a coordinator"];

/**
 * Talk to the assistant exactly as a patient would, on a test conversation
 * that never opens a real case, and see which path answered each message.
 */
export function AssistantTester() {
  const [lines, setLines] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [locale, setLocale] = useState<"en" | "ru" | "uz">("en");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [lines, busy]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setLines((prev) => [...prev, { from: "you", text: message }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/assistant/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, locale }),
      });
      const data = await res.json();
      const extra = [
        data.action?.type === "navigate" ? `Would open ${data.action.href}` : "",
        data.action?.type === "locale" ? `Would switch the site to ${data.action.locale}` : "",
        data.action?.type === "voice" ? "Would change the voice" : "",
        data.suggestions?.length ? `Quick replies: ${data.suggestions.join(" · ")}` : "",
        data.links?.length ? `Buttons: ${data.links.map((link: { label: string }) => link.label).join(" · ")}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      setLines((prev) => [...prev, { from: "bot", text: data.reply || data.error || "(no reply)", via: data.via, extra }]);
    } catch {
      setLines((prev) => [...prev, { from: "bot", text: "Could not reach the server." }]);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setLines([]);
    await fetch("/api/admin/assistant/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true }),
    }).catch(() => undefined);
  };

  return (
    <div className="flex h-[640px] max-h-[calc(100vh-140px)] flex-col overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-ink">Test chat</p>
          <p className="text-xs text-ink-soft">Talk like a patient. Nothing real is opened.</p>
        </div>
        <label className="sr-only" htmlFor="tester-locale">
          Page language
        </label>
        <select
          id="tester-locale"
          value={locale}
          onChange={(event) => setLocale(event.target.value as "en" | "ru" | "uz")}
          className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm"
        >
          <option value="en">English page</option>
          <option value="ru">Russian page</option>
          <option value="uz">Uzbek page</option>
        </select>
        <button type="button" onClick={reset} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-brand hover:bg-brand-tint">
          Start over
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-surface-muted p-4" aria-live="polite">
        {lines.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm text-ink-soft">Try one of these, or write your own:</p>
            <div className="flex flex-wrap gap-1.5">
              {TRY.map((text) => (
                <button key={text} type="button" onClick={() => send(text)} className="chat-profile-btn">
                  {text}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {lines.map((line, index) => (
          <div key={index} className={line.from === "you" ? "flex justify-end" : ""}>
            <div
              className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                line.from === "you" ? "bg-brand text-white" : "border border-line bg-white text-ink"
              }`}
            >
              {line.text}
            </div>
            {line.from === "bot" && line.via && VIA[line.via] ? (
              <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
                <span className={`rounded-full px-2 py-0.5 font-bold ${VIA[line.via].tone}`}>{VIA[line.via].label}</span>
                {VIA[line.via].note}
              </p>
            ) : null}
            {line.extra ? <p className="mt-1 whitespace-pre-wrap text-xs text-ink-muted">{line.extra}</p> : null}
          </div>
        ))}
        {busy ? <p className="text-sm text-ink-soft">Thinking…</p> : null}
        <div ref={end} />
      </div>

      <form
        className="flex gap-2 border-t border-line p-3"
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="tester-input" className="sr-only">
          Message
        </label>
        <input
          id="tester-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Write as a patient would…"
          className="min-w-0 flex-1 rounded-lg border border-line px-3 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint"
          autoComplete="off"
        />
        <button type="submit" disabled={busy || !input.trim()} className="btn btn-primary !px-4 !py-2 text-sm disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}
