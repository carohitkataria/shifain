"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { WebChatSummary, WebMessage } from "@/lib/web-intake";

const timeAgo = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const STAGE: Record<string, string> = {
  medical_chat: "Describing their need",
  collecting_profile: "Giving contact details",
  complete: "Case open",
};

const who = (chat: WebChatSummary) => chat.name || (chat.phone ? `+${chat.phone.replace(/\D/g, "")}` : "Website visitor");

/**
 * Conversations from the website's chat and voice assistant. A coordinator
 * can read any of them, reply (which pauses the assistant for that patient)
 * and hand the chat back when done.
 */
export function WebChatInbox({
  chats,
  selected,
  thread,
}: {
  chats: WebChatSummary[];
  selected: WebChatSummary | null;
  thread: WebMessage[];
}) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [thread]);

  // New patient messages arrive without a reload.
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [router]);

  const post = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/web-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "That didn't go through.");
      else router.refresh();
      return res.ok;
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!selected || !reply.trim()) return;
    if (await post({ sessionId: selected.id, text: reply.trim() })) setReply("");
  };

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[500px] overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
      <div className={`${selected ? "hidden lg:flex" : "flex"} w-full flex-col border-r border-line lg:w-80 lg:min-w-[280px]`}>
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <h3 className="text-sm font-bold text-ink">Website & voice chats</h3>
          <span className="ml-auto rounded-full bg-brand-tint px-2 py-0.5 text-xs font-bold text-brand">{chats.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-ink-soft">No website conversations yet.</p>
          ) : (
            <ul>
              {chats.map((chat) => (
                <li key={chat.id}>
                  <Link
                    href={`/admin/messages?tab=web&chat=${chat.id}`}
                    className={`flex items-start gap-3 border-b border-line/50 px-4 py-3 transition-colors ${
                      selected?.id === chat.id ? "border-l-2 border-l-brand bg-brand-tint/60" : "hover:bg-surface-muted"
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                      {who(chat)[0].toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-ink">{who(chat)}</span>
                        {chat.humanRequestedAt && !chat.handoff ? (
                          <span className="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-700">
                            Wants a person
                          </span>
                        ) : null}
                        {chat.handoff ? (
                          <span className="shrink-0 rounded-full bg-saffron/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-saffron">You</span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-soft">
                        {chat.lastMessage?.role === "user" ? "" : chat.lastMessage?.role === "coordinator" ? "You: " : "AI: "}
                        {chat.lastMessage?.content}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-ink-muted">
                        {STAGE[chat.state] ?? chat.state} · {timeAgo(chat.updatedAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={`${selected ? "flex" : "hidden lg:flex"} min-w-0 flex-1 flex-col`}>
        {selected ? (
          <>
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
              <Link href="/admin/messages?tab=web" className="rounded-lg px-2 py-1 text-sm font-semibold text-ink-soft hover:bg-surface-muted lg:hidden">
                ← Back
              </Link>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-ink">{who(selected)}</h3>
                <p className="truncate text-xs text-ink-soft">
                  {[selected.treatment, selected.country, selected.phone ? `+${selected.phone.replace(/\D/g, "")}` : null]
                    .filter(Boolean)
                    .join(" · ") || "No details yet"}
                  {selected.caseReference ? (
                    <>
                      {" · "}
                      <Link href={`/admin/cases?q=${selected.caseReference}`} className="font-semibold text-brand hover:underline">
                        {selected.caseReference}
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>
              {selected.handoff ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => post({ sessionId: selected.id, handoff: false })}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink hover:bg-surface-muted"
                >
                  Hand back to AI
                </button>
              ) : (
                <span className="rounded-full bg-brand-tint px-2.5 py-1 text-xs font-bold text-brand-deep">AI is answering</span>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-surface-muted/40 px-4 py-4">
              <div className="mx-auto max-w-2xl space-y-3">
                {thread.map((message, index) => {
                  const patient = message.role === "user";
                  const coordinator = message.role === "coordinator";
                  return (
                    <div key={`${message.ts}-${index}`} className={`flex ${patient ? "justify-start" : "justify-end"}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm sm:max-w-[75%] ${
                          patient
                            ? "rounded-bl-md bg-white text-ink"
                            : coordinator
                              ? "rounded-br-md bg-brand text-white"
                              : "rounded-br-md border border-brand/20 bg-brand-tint text-ink"
                        }`}
                      >
                        {!patient ? (
                          <p className={`mb-1 text-[10px] font-bold uppercase tracking-wide ${coordinator ? "text-white/70" : "text-brand"}`}>
                            {coordinator ? "You" : "AI assistant"}
                          </p>
                        ) : null}
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        <p className={`mt-1 text-[10px] ${coordinator ? "text-white/60" : "text-ink-muted"}`}>
                          {new Date(message.ts).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
              className="border-t border-line bg-white p-3"
            >
              {error ? <p className="mb-2 text-sm font-semibold text-red-700">{error}</p> : null}
              <div className="flex items-end gap-2">
                <label htmlFor="web-reply" className="sr-only">
                  Reply
                </label>
                <textarea
                  id="web-reply"
                  rows={2}
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      send();
                    }
                  }}
                  placeholder={selected.handoff ? "Reply to the patient…" : "Reply — the AI will pause for this patient…"}
                  className="min-w-0 flex-1 resize-none rounded-xl border border-line bg-surface-muted px-4 py-2.5 text-sm focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-tint"
                />
                <button type="submit" disabled={busy || !reply.trim()} className="btn btn-primary !px-4 !py-2.5 text-sm disabled:opacity-40">
                  Send
                </button>
              </div>
              <p className="mt-1.5 text-xs text-ink-muted">The patient sees your reply in their chat within a few seconds, marked “Coordinator”.</p>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-sm font-medium text-ink-soft">Select a conversation</p>
            <p className="max-w-xs text-xs text-ink-muted">Chats marked “Wants a person” asked for a coordinator. Replying pauses the AI for that patient.</p>
          </div>
        )}
      </div>
    </div>
  );
}
