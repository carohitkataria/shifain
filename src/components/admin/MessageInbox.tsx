"use client";

import { useState, useRef, useCallback } from "react";
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
  const formRef = useRef<HTMLFormElement>(null);

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

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* Conversation list */}
      <div className="card max-h-[70vh] overflow-y-auto">
        <div className="sticky top-0 border-b border-line bg-white p-3">
          <h3 className="text-sm font-bold text-ink">Conversations</h3>
        </div>
        {conversations.length === 0 ? (
          <p className="p-4 text-sm text-ink-soft">No messages yet.</p>
        ) : (
          <ul>
            {conversations.map((msg) => (
              <li key={msg._id}>
                <a
                  href={`/admin/messages?chat=${msg.telegramChatId}`}
                  className={`block border-b border-line px-4 py-3 transition hover:bg-surface-muted ${
                    msg.telegramChatId === selectedChat ? "bg-brand-tint" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink">
                      {msg.senderName || `Chat ${msg.telegramChatId}`}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
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
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Thread view */}
      <div className="card flex flex-col" style={{ maxHeight: "70vh" }}>
        {selectedChat ? (
          <>
            <div className="border-b border-line p-4">
              <h3 className="text-sm font-bold text-ink">
                Chat {selectedChat}
                {thread[0]?.caseReference && (
                  <span className="ml-2 text-xs font-semibold text-brand">
                    Case: {thread[0].caseReference}
                  </span>
                )}
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {thread.map((msg) => (
                <div
                  key={msg._id}
                  className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                    msg.direction === "inbound"
                      ? "mr-auto bg-surface-muted text-ink"
                      : "ml-auto bg-brand text-white"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      msg.direction === "inbound" ? "text-ink-muted" : "text-white/60"
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
              {thread.length === 0 && (
                <p className="text-center text-sm text-ink-soft">No messages in this thread.</p>
              )}
            </div>
            <form
              ref={formRef}
              onSubmit={(e) => {
                e.preventDefault();
                sendReply();
              }}
              className="flex gap-2 border-t border-line p-3"
            >
              <input
                type="text"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type a reply..."
                className="flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint"
              />
              <button
                type="submit"
                disabled={sending || !reply.trim()}
                className="btn btn-primary !py-2 text-sm disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8">
            <p className="text-sm text-ink-soft">Select a conversation to view messages.</p>
          </div>
        )}
      </div>
    </div>
  );
}
