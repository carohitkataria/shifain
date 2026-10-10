"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { CrmMessage } from "@/lib/crm-messages";

const channelBadge: Record<string, string> = {
  telegram: "bg-[#229ED9]/10 text-[#229ED9]",
  whatsapp: "bg-leaf/10 text-leaf",
  sms: "bg-saffron/10 text-saffron",
  email: "bg-brand-tint text-brand-deep",
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

function senderLabel(msg: CrmMessage): string | null {
  if (msg.direction === "inbound") return null;
  const meta = msg.metadata as Record<string, unknown> | null;
  if (meta?.ai) return "AI Bot";
  if (meta?.coordinator) return "Coordinator";
  if (msg.senderName === "ShifaIn AI") return "AI Bot";
  if (msg.senderName === "Coordinator") return "Coordinator";
  return "ShifaIn";
}

function threadPatientName(thread: CrmMessage[]): string | null {
  const inbound = thread.find((m) => m.direction === "inbound" && m.senderName);
  return inbound?.senderName ?? null;
}

export function MessageInbox({
  conversations,
  thread,
  selectedChat,
}: {
  conversations: CrmMessage[];
  thread: CrmMessage[];
  selectedChat: number | null;
}) {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [showList, setShowList] = useState(!selectedChat);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thread]);

  useEffect(() => {
    setShowList(!selectedChat);
  }, [selectedChat]);

  const sendReply = useCallback(async () => {
    if (!reply.trim() || !selectedChat) return;
    setSending(true);
    try {
      await fetch("/api/crm/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramChatId: selectedChat,
          text: reply.trim(),
          botRole: "patient",
        }),
      });
      setReply("");
      window.location.reload();
    } finally {
      setSending(false);
    }
  }, [reply, selectedChat]);

  const patientName = threadPatientName(thread);

  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[500px] gap-0 overflow-hidden rounded-2xl border border-line bg-white shadow-sm lg:h-[calc(100vh-160px)]">
      {/* Conversation list */}
      <div
        className={`${
          selectedChat ? "hidden lg:flex" : "flex"
        } w-full flex-col border-r border-line lg:w-80 lg:min-w-[280px]`}
      >
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-tint">
            <svg className="h-4 w-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-ink">Conversations</h3>
          <span className="ml-auto rounded-full bg-brand-tint px-2 py-0.5 text-xs font-bold text-brand">
            {conversations.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted">
                <svg className="h-6 w-6 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-ink-soft">No messages yet</p>
              <p className="mt-1 text-xs text-ink-muted">Conversations will appear here</p>
            </div>
          ) : (
            <ul>
              {conversations.map((msg) => {
                const isActive = msg.telegramChatId === selectedChat;
                return (
                  <li key={msg._id}>
                    <a
                      href={`/admin/messages?chat=${msg.telegramChatId}`}
                      className={`flex items-start gap-3 border-b border-line/50 px-4 py-3 transition-colors ${
                        isActive
                          ? "bg-brand-tint/60 border-l-2 border-l-brand"
                          : "hover:bg-surface-muted"
                      }`}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                        {(msg.senderName ?? "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-ink">
                            {msg.senderName || `Chat ${msg.telegramChatId}`}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                              channelBadge[msg.channel] ?? "bg-surface-muted text-ink-soft"
                            }`}
                          >
                            {msg.channel}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-ink-soft">
                          {msg.direction === "outbound" ? "You: " : ""}
                          {msg.text}
                        </p>
                        <p className="mt-0.5 text-[10px] text-ink-muted">{timeAgo(msg.createdAt)}</p>
                      </div>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Thread view */}
      <div
        className={`${
          selectedChat ? "flex" : "hidden lg:flex"
        } min-w-0 flex-1 flex-col`}
      >
        {selectedChat ? (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <button
                onClick={() => { window.location.href = "/admin/messages"; }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition hover:bg-surface-muted lg:hidden"
                aria-label="Back to conversations"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">
                {(patientName ?? "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold text-ink">
                  {patientName ?? `Chat ${selectedChat}`}
                </h3>
                <div className="flex items-center gap-2">
                  {thread[0]?.caseReference && (
                    <span className="text-xs font-medium text-brand">
                      Case: {thread[0].caseReference}
                    </span>
                  )}
                  <span className="text-[10px] text-ink-muted">
                    ID: {selectedChat}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto bg-surface-muted/40 px-4 py-4">
              <div className="mx-auto max-w-2xl space-y-3">
                {thread.map((msg) => {
                  const label = senderLabel(msg);
                  const isInbound = msg.direction === "inbound";
                  const isBot = label === "AI Bot";
                  const isCoord = label === "Coordinator" || label === "ShifaIn";

                  return (
                    <div
                      key={msg._id}
                      className={`flex ${isInbound ? "justify-start" : "justify-end"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm sm:max-w-[75%] ${
                          isInbound
                            ? "rounded-bl-md bg-white text-ink"
                            : isBot
                              ? "rounded-br-md bg-brand-tint text-ink border border-brand/20"
                              : "rounded-br-md bg-brand text-white"
                        }`}
                      >
                        {label && (
                          <p
                            className={`mb-1 text-[10px] font-bold uppercase tracking-wide ${
                              isBot
                                ? "text-brand"
                                : isCoord
                                  ? "text-white/70"
                                  : "text-white/70"
                            }`}
                          >
                            {label}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        <p
                          className={`mt-1 text-[10px] ${
                            isInbound
                              ? "text-ink-muted"
                              : isBot
                                ? "text-ink-muted"
                                : "text-white/60"
                          }`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {thread.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="text-sm text-ink-soft">No messages in this thread yet.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Reply form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendReply();
              }}
              className="flex items-end gap-2 border-t border-line bg-white p-3"
            >
              <input
                type="text"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type a reply..."
                className="min-w-0 flex-1 rounded-xl border border-line bg-surface-muted px-4 py-2.5 text-sm transition-colors focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-tint"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendReply();
                  }
                }}
              />
              <button
                type="submit"
                disabled={sending || !reply.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-deep disabled:opacity-40"
                aria-label="Send"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-tint">
              <svg className="h-8 w-8 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-ink-soft">Select a conversation</p>
            <p className="text-xs text-ink-muted">Choose from the list to view messages</p>
          </div>
        )}
      </div>
    </div>
  );
}
