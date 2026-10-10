"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const FAQ_ITEMS = [
  {
    q: "How is my estimate worked out?",
    a: "We read your medical reports, match you with accredited hospitals and give you an itemised estimate. The treating hospital confirms the final plan and price within 48 hours — no middleman markup.",
  },
  {
    q: "What do I need for a medical visa?",
    a: "A valid passport, the hospital's visa invitation letter (we arrange it), your medical reports and proof of funds. Your coordinator walks you through each step.",
  },
  {
    q: "How do I follow my case?",
    a: "Once you send your details you get a patient page with live updates — from the doctor's review to travel planning.",
  },
];

type ChatMsg = { role: "user" | "assistant"; content: string };

type ProfileQuestion = {
  field: string;
  question: string;
  buttons?: { text: string; callback_data: string }[][];
};

type View = "menu" | "chat";

const svg = {
  className: "h-5 w-5",
  fill: "none",
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const IconChat = () => (
  <svg {...svg}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
  </svg>
);
const IconClose = () => (
  <svg {...svg}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
const IconBack = () => (
  <svg {...svg}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
const IconPhone = () => (
  <svg {...svg}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
  </svg>
);
const IconWhatsapp = () => (
  <svg {...svg}>
    <path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z" />
    <path d="M9 9.5c.3 1.8 1.7 3.6 3.6 4.4l1.3-1.1 1.8.9c-.3 1-1.2 1.6-2.2 1.5A6 6 0 0 1 8 9.7c0-1 .6-1.8 1.5-2.1l.9 1.8z" />
  </svg>
);
const IconChevron = ({ open }: { open: boolean }) => (
  <svg {...svg} className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
    <path d="M6 9l6 6 6-6" />
  </svg>
);
const IconClip = () => (
  <svg {...svg}>
    <path d="M21 11.5l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.6-8.6a3.4 3.4 0 0 1 4.8 4.8l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9" />
  </svg>
);
const IconMic = () => (
  <svg {...svg}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
const IconStop = () => (
  <svg {...svg}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);
const IconSend = () => (
  <svg {...svg}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

// ------------------------------------------------------------------ menu

function HelpMenu({
  onChat,
  onClose,
  whatsapp,
  phone,
}: {
  onChat: () => void;
  onClose: () => void;
  whatsapp: string | null;
  phone: string | null;
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const firstRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  const scrollTo = (id: string) => {
    onClose();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <div className="help-head">
        <div>
          <h2 className="text-[17px] font-extrabold text-ink">How can we help?</h2>
          <p className="mt-0.5 text-[13px] text-ink-soft">A real person replies, in your language.</p>
        </div>
        <button type="button" onClick={onClose} className="help-icon-btn" aria-label="Close help">
          <IconClose />
        </button>
      </div>

      <div className="help-body">
        <button ref={firstRef} type="button" onClick={onChat} className="help-primary">
          <span className="help-primary-icon">
            <IconChat />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-[15px] font-bold">Chat with us</span>
            <span className="block text-[13px] text-white/80">
              Describe your condition, send reports or a voice note
            </span>
          </span>
          <span aria-hidden="true" className="text-lg">
            &rarr;
          </span>
        </button>

        <div className="mt-2 grid grid-cols-2 gap-2">
          {whatsapp ? (
            <a
              href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="help-option"
            >
              <IconWhatsapp />
              WhatsApp
            </a>
          ) : null}
          {phone ? (
            <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="help-option">
              <IconPhone />
              Call us
            </a>
          ) : null}
          <button type="button" onClick={() => scrollTo("quote")} className="help-option col-span-2">
            Get my free treatment plan
          </button>
        </div>

        <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-ink-soft">Common questions</p>
        <ul className="space-y-1.5">
          {FAQ_ITEMS.map((item, i) => (
            <li key={item.q}>
              <button
                type="button"
                className="fab-qa flex items-center justify-between gap-3"
                aria-expanded={openFaq === i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span>{item.q}</span>
                <IconChevron open={openFaq === i} />
              </button>
              {openFaq === i ? (
                <p className="mt-1 rounded-lg bg-brand-tint px-3 py-2 text-[13px] leading-relaxed text-ink-soft">
                  {item.a}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => scrollTo("faq")}
          className="mt-3 min-h-11 w-full text-center text-sm font-bold text-brand hover:underline"
        >
          See all questions
        </button>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ chat

function ChatView({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [state, setState] = useState<string>("medical_chat");
  const [profileQuestion, setProfileQuestion] = useState<ProfileQuestion | null>(null);
  const [caseRef, setCaseRef] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const applyReply = useCallback((data: Record<string, unknown>) => {
    if (typeof data.reply === "string") {
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply as string }]);
    }
    if (typeof data.state === "string") setState(data.state);
    setProfileQuestion((data.profileQuestion as ProfileQuestion) ?? null);
    if (typeof data.caseReference === "string") setCaseRef(data.caseReference);
    if (typeof data.audioBase64 === "string") {
      new Audio(`data:audio/mpeg;base64,${data.audioBase64}`).play().catch(() => {});
    }
  }, []);

  const post = useCallback(
    async (body: BodyInit, headers?: HeadersInit, failure = "Sorry, something went wrong. Please try again.") => {
      setSending(true);
      try {
        const res = await fetch("/api/chat", { method: "POST", body, headers });
        applyReply(await res.json());
      } catch {
        setMessages((prev) => [...prev, { role: "assistant", content: failure }]);
      } finally {
        setSending(false);
      }
    },
    [applyReply],
  );

  const sendText = useCallback(
    (text: string) => {
      const message = text.trim();
      if (!message || sending) return;
      setMessages((prev) => [...prev, { role: "user", content: message }]);
      setInput("");
      void post(JSON.stringify({ message }), { "Content-Type": "application/json" });
    },
    [post, sending],
  );

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const form = new FormData();
        form.append("audio", new Blob(chunksRef.current, { type: "audio/webm" }), "voice.webm");
        setMessages((prev) => [...prev, { role: "user", content: "Voice message" }]);
        void post(form, undefined, "Sorry, I couldn't process the voice message.");
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I couldn't reach your microphone. You can type your message instead." },
      ]);
    }
  }, [post]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }, []);

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const form = new FormData();
      form.append("file", file);
      setMessages((prev) => [...prev, { role: "user", content: `Attached: ${file.name}` }]);
      void post(form, undefined, "Sorry, the file upload failed.").finally(() => {
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
    },
    [post],
  );

  return (
    <>
      <div className="chat-header">
        <button type="button" onClick={onBack} className="chat-head-btn" aria-label="Back to help options">
          <IconBack />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-bold text-white">ShifaIn care team</h2>
          <p className="flex items-center gap-1.5 text-[12px] text-white/75">
            <span className="h-2 w-2 rounded-full bg-[#4ade80]" aria-hidden="true" />
            Replies instantly · coordinators on hand
          </p>
        </div>
        <button type="button" onClick={onClose} className="chat-head-btn" aria-label="Close chat">
          <IconClose />
        </button>
      </div>

      <div className="chat-messages" aria-live="polite">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <p className="text-[15px] font-semibold text-ink">Hello — how can we help?</p>
            <p className="text-[13px] leading-relaxed text-ink-soft">
              Tell us what treatment you are looking for or what the doctor said. You can write in any
              language, send a voice note, or attach your reports.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Knee replacement", "Heart surgery", "Cancer treatment", "IVF"].map((topic) => (
                <button
                  key={topic}
                  type="button"
                  className="chat-profile-btn"
                  onClick={() => sendText(`I'm looking for ${topic.toLowerCase()}`)}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role === "user" ? "chat-user" : "chat-bot"}`}>
            {msg.content}
          </div>
        ))}
        {sending ? (
          <div className="chat-bubble chat-bot chat-typing" aria-label="Typing">
            <span />
            <span />
            <span />
          </div>
        ) : null}
        <div ref={messagesEndRef} />
      </div>

      {profileQuestion?.buttons && state === "collecting_profile" ? (
        <div className="chat-buttons">
          {profileQuestion.buttons.flat().map((btn) => (
            <button
              key={btn.callback_data}
              type="button"
              className="chat-profile-btn"
              onClick={() => sendText(btn.text.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, ""))}
              disabled={sending}
            >
              {btn.text}
            </button>
          ))}
        </div>
      ) : null}

      {caseRef && state === "complete" ? (
        <div className="chat-case-ref">
          Case reference: <strong>{caseRef}</strong>
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendText(input);
        }}
        className="chat-input-bar"
      >
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFile} />
        <button
          type="button"
          className="chat-icon-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          aria-label="Attach medical reports"
        >
          <IconClip />
        </button>
        <label htmlFor="chat-input" className="sr-only">
          Message
        </label>
        <input
          id="chat-input"
          ref={inputRef}
          type="text"
          className="chat-text-input"
          placeholder={state === "complete" ? "Ask a follow-up…" : "Type your message…"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
          autoComplete="off"
        />
        <button
          type="button"
          className={`chat-icon-btn ${recording ? "chat-recording" : ""}`}
          onClick={recording ? stopRecording : startRecording}
          disabled={sending && !recording}
          aria-label={recording ? "Stop recording" : "Record a voice message"}
        >
          {recording ? <IconStop /> : <IconMic />}
        </button>
        <button type="submit" className="chat-send-btn" disabled={sending || !input.trim()} aria-label="Send">
          <IconSend />
        </button>
      </form>
    </>
  );
}

// ------------------------------------------------------------------ shell

export function FloatingTools({ whatsapp = null, phone = null }: { whatsapp?: string | null; phone?: string | null }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    fabRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || fabRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [open, close]);

  // Lets any page open the chat directly, e.g. a "Chat with us" link.
  useEffect(() => {
    const openChat = () => {
      setView("chat");
      setOpen(true);
    };
    window.addEventListener("shifain:open-chat", openChat);
    return () => window.removeEventListener("shifain:open-chat", openChat);
  }, []);

  return (
    <>
      {open ? <div className="help-backdrop" aria-hidden="true" /> : null}

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label={view === "chat" ? "Chat with ShifaIn" : "Help"}
          className={`help-panel ${view === "chat" ? "help-panel-chat" : ""}`}
        >
          {view === "menu" ? (
            <HelpMenu onChat={() => setView("chat")} onClose={close} whatsapp={whatsapp} phone={phone} />
          ) : (
            <ChatView onBack={() => setView("menu")} onClose={close} />
          )}
        </div>
      ) : null}

      <button
        ref={fabRef}
        type="button"
        className={`help-fab ${open ? "help-fab-open" : ""}`}
        aria-expanded={open}
        aria-label={open ? "Close help" : "Need help? Chat with us"}
        onClick={() => (open ? close() : (setView("menu"), setOpen(true)))}
      >
        {open ? <IconClose /> : <IconChat />}
        <span className={open ? "sr-only" : "help-fab-label"}>Need help?</span>
      </button>
    </>
  );
}
