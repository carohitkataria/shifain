"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { VoiceDock, type VoiceTurnResult } from "./VoiceDock";
import { VoicePicker } from "./VoicePicker";
import { DEFAULT_NATURAL_VOICE, parseVoicePrefs, voiceForGender, type VoicePrefs } from "@/lib/voice/voices";

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

const STARTERS = ["Knee replacement", "Heart surgery", "Cancer treatment", "IVF"];

/** Things the patient can simply say; shown so they know the chat can act, not just answer. */
const COMMAND_HINTS = ["What's my case status?", "Show my plan", "Add visa support", "How much is a knee replacement?", "Talk to a coordinator", "What can you do?"];

type ReplyLink = { kind: "whatsapp" | "phone" | "attach" | "page"; label: string; href?: string };

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  voice?: boolean;
  links?: ReplyLink[];
  /** A person on the ShifaIn team wrote this, not the assistant. */
  coordinator?: boolean;
};

type ClientAction =
  | { type: "navigate"; href: string }
  | { type: "locale"; locale: string }
  | { type: "voice"; naturalId?: string; gender?: "female" | "male"; rate?: "slower" | "faster" | "normal"; openPicker?: boolean };

const PREFS_KEY = "shifain_voice";
const CHAT_KEY = "shifain_chat_view";

/** Browser storage may be missing or blocked; the chat works without it. */
const store = {
  get(area: "local" | "session", key: string): string | null {
    try {
      return (area === "local" ? localStorage : sessionStorage).getItem(key);
    } catch {
      return null;
    }
  },
  set(area: "local" | "session", key: string, value: string) {
    try {
      (area === "local" ? localStorage : sessionStorage).setItem(key, value);
    } catch {
      /* not saved; nothing breaks */
    }
  },
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
const IconVoice = () => (
  <svg {...svg}>
    <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
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
const IconPlan = () => (
  <svg {...svg}>
    <path d="M9 4h6l1 2h3v14H5V6h3z" />
    <path d="M9 12h6M9 16h4" />
  </svg>
);
const IconQuestion = () => (
  <svg {...svg}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6M12 17h.01" />
  </svg>
);
const IconChevron = ({ open }: { open?: boolean }) => (
  <svg {...svg} className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);
const IconClip = () => (
  <svg {...svg}>
    <path d="M21 11.5l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.6-8.6a3.4 3.4 0 0 1 4.8 4.8l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9" />
  </svg>
);
const IconSend = () => (
  <svg {...svg}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);
const IconWave = () => (
  <svg {...svg}>
    <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
  </svg>
);

/** Turns the API's reply into chat state; shared by typed, uploaded and spoken turns. */
type ChatReply = {
  reply?: string;
  /** The reply as it may be read aloud: no whole phone, email or case number. */
  speech?: string;
  state?: string;
  /** Quick replies to offer under the answer. */
  suggestions?: string[];
  handoff?: boolean;
  caseReference?: string;
  audioBase64?: string;
  transcript?: string;
  heardNothing?: boolean;
  error?: string;
  action?: ClientAction;
  links?: ReplyLink[];
};

export function FloatingTools({ whatsapp = null, phone = null }: { whatsapp?: string | null; phone?: string | null }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [state, setState] = useState("medical_chat");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [unread, setUnread] = useState(0);
  /** The newest coordinator message this browser has seen, for polling. */
  const seenUntil = useRef<string>(new Date().toISOString());
  const [caseRef, setCaseRef] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(false);
  const [serverVoice, setServerVoice] = useState(false);
  const [serverListening, setServerListening] = useState(false);
  const [naturalVoices, setNaturalVoices] = useState(false);
  const [voicePrefs, setVoicePrefs] = useState<VoicePrefs>(() => parseVoicePrefs(null));
  const [pickerOpen, setPickerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setVoiceOn(false);
    setOpen(false);
    fabRef.current?.focus();
  }, []);

  // The conversation survives moving between pages (and a language switch,
  // which remounts this component), so "show my hospitals" never loses it.
  useEffect(() => {
    const saved = store.get("session", CHAT_KEY);
    if (!saved) return;
    try {
      const value = JSON.parse(saved) as { messages?: ChatMsg[]; open?: boolean; caseRef?: string | null; state?: string };
      if (Array.isArray(value.messages)) setMessages(value.messages.slice(-60));
      if (value.caseRef) setCaseRef(value.caseRef);
      if (value.state) setState(value.state);
      if (value.open) {
        setView("chat");
        setOpen(true);
      }
    } catch {
      /* start fresh */
    }
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    store.set("session", CHAT_KEY, JSON.stringify({ messages: messages.slice(-60), open: open && view === "chat", caseRef, state }));
  }, [messages, open, view, caseRef, state]);

  // A coordinator can reply from the console; their messages arrive here.
  useEffect(() => {
    if (messages.length === 0) return;
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/chat?after=${encodeURIComponent(seenUntil.current)}`, { cache: "no-store" });
        const data = (await res.json()) as { messages?: { content: string; ts: string }[] };
        const incoming = data.messages ?? [];
        if (stopped || incoming.length === 0) return;
        seenUntil.current = incoming[incoming.length - 1].ts;
        setMessages((prev) => [...prev, ...incoming.map((item) => ({ role: "assistant" as const, content: item.content, coordinator: true }))]);
        setUnread((count) => count + incoming.length);
      } catch {
        /* try again on the next tick */
      }
    };
    const timer = window.setInterval(poll, open ? 6000 : 20000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [messages.length > 0, open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && view === "chat") setUnread(0);
  }, [open, view, messages.length]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/chat")
      .then((res) => res.json())
      .then((data: { voiceServer?: boolean; serverListening?: boolean; naturalVoices?: boolean; defaultVoiceId?: string }) => {
        setServerVoice(Boolean(data.voiceServer));
        setServerListening(Boolean(data.serverListening));
        setNaturalVoices(Boolean(data.naturalVoices));
        const prefs = parseVoicePrefs(store.get("local", PREFS_KEY), data.defaultVoiceId ?? DEFAULT_NATURAL_VOICE);
        // Without server voices the device speaks, whatever was saved.
        setVoicePrefs(data.naturalVoices ? prefs : { ...prefs, engine: "device" });
      })
      .catch(() => undefined);
  }, [open]);

  const changeVoice = useCallback((next: VoicePrefs) => {
    setVoicePrefs(next);
    store.set("local", PREFS_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pickerOpen && close();
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target) || fabRef.current?.contains(target)) return;
      if (voiceOn) return; // a stray tap must not end a spoken conversation
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
  }, [open, close, voiceOn, pickerOpen]);

  useEffect(() => {
    const openChat = () => {
      setView("chat");
      setOpen(true);
    };
    // "Speak to Shifain" on the homepage opens the chat with the microphone on.
    const openVoice = () => {
      setView("chat");
      setOpen(true);
      setVoiceOn(true);
    };
    window.addEventListener("shifain:open-chat", openChat);
    window.addEventListener("shifain:open-voice", openVoice);
    return () => {
      window.removeEventListener("shifain:open-chat", openChat);
      window.removeEventListener("shifain:open-voice", openVoice);
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  /** Carries out what the server asked the page to do after a command. */
  const act = useCallback(
    (action: ClientAction | undefined) => {
      if (!action) return;
      if (action.type === "navigate" && action.href.startsWith("/")) {
        router.push(action.href);
      } else if (action.type === "locale") {
        const rest = pathname.replace(/^\/(en|ru|uz|oz)(?=\/|$)/, "");
        router.push(`/${action.locale}${rest || ""}`);
      } else if (action.type === "voice") {
        if (action.openPicker) {
          setPickerOpen(true);
          return;
        }
        setVoicePrefs((prev) => {
          const next: VoicePrefs = { ...prev };
          if (action.gender) {
            next.gender = action.gender;
            next.naturalId = action.naturalId ?? voiceForGender(action.gender).id;
            next.deviceName = "";
          }
          if (action.rate) next.rate = action.rate === "slower" ? 0.85 : action.rate === "faster" ? 1.15 : 1;
          store.set("local", PREFS_KEY, JSON.stringify(next));
          return next;
        });
      }
    },
    [pathname, router],
  );

  const apply = useCallback(
    (data: ChatReply, voice = false) => {
      if (typeof data.reply === "string" && data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply!, voice, links: data.links }]);
      }
      if (data.state && data.state !== "error") setState(data.state);
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions.slice(0, 6) : []);
      if (data.caseReference) setCaseRef(data.caseReference);
      act(data.action);
    },
    [act],
  );

  /** Sent with every turn: the page's language and the voice to answer in. */
  const turnContext = useCallback(
    () => ({
      locale: (document.documentElement.lang || "en").split("-")[0],
      voiceId: voicePrefs.engine === "natural" ? voicePrefs.naturalId : "device",
      rate: voicePrefs.rate,
    }),
    [voicePrefs],
  );

  const post = useCallback(async (body: BodyInit, headers?: HeadersInit, timeoutMs = 30_000): Promise<ChatReply> => {
    setSending(true);
    try {
      // A reply should come in seconds; never leave the patient watching dots. Reading a report takes longer.
      const res = await fetch("/api/chat", { method: "POST", body, headers, signal: AbortSignal.timeout(timeoutMs) });
      const data = (await res.json()) as ChatReply;
      if (!res.ok && !data.reply) return { error: data.error ?? "Something went wrong. Please try again." };
      return data;
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        return { error: "That's taking longer than it should. Please send it again, or tap “Talk to a person”." };
      }
      return { error: "You seem to be offline. Please try again." };
    } finally {
      setSending(false);
    }
  }, []);

  const sendText = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || sending) return;
      setView("chat");
      setMessages((prev) => [...prev, { role: "user", content: message }]);
      setInput("");
      const data = await post(JSON.stringify({ message, ...turnContext() }), { "Content-Type": "application/json" });
      if (data.error) setMessages((prev) => [...prev, { role: "assistant", content: data.error! }]);
      else apply(data);
    },
    [apply, post, sending, turnContext],
  );

  // Voice turns: the dock hears, we show both sides in the chat and hand the reply back to be spoken.
  const voiceText = useCallback(
    async (text: string, lang: string): Promise<VoiceTurnResult> => {
      setMessages((prev) => [...prev, { role: "user", content: text, voice: true }]);
      const data = await post(JSON.stringify({ message: text, voice: true, lang, ...turnContext() }), {
        "Content-Type": "application/json",
      });
      if (data.error) return { error: data.error };
      apply(data, true);
      return data;
    },
    [apply, post, turnContext],
  );

  const voiceAudio = useCallback(
    async (audio: Blob): Promise<VoiceTurnResult> => {
      const form = new FormData();
      form.append("audio", audio, "voice.webm");
      form.append("voice", "1");
      for (const [key, value] of Object.entries(turnContext())) form.append(key, String(value));
      const data = await post(form);
      if (data.error) return { error: data.error };
      if (data.heardNothing) return { heardNothing: true };
      if (data.transcript) setMessages((prev) => [...prev, { role: "user", content: data.transcript!, voice: true }]);
      apply(data, true);
      return data;
    },
    [apply, post, turnContext],
  );

  const startVoice = () => {
    setView("chat");
    setVoiceOn(true);
  };

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setView("chat");
      setMessages((prev) => [...prev, { role: "user", content: `Attached: ${file.name}` }]);
      const form = new FormData();
      form.append("file", file);
      form.append("locale", turnContext().locale);
      const data = await post(form, undefined, 75_000);
      if (data.error) setMessages((prev) => [...prev, { role: "assistant", content: data.error! }]);
      else apply(data);
      if (fileRef.current) fileRef.current.value = "";
    },
    [apply, post, turnContext],
  );

  const scrollTo = (id: string) => {
    close();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {open ? <div className="help-backdrop" aria-hidden="true" /> : null}

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label={view === "chat" ? "Chat with ShifaIn" : "Help"}
          className="help-panel help-panel-chat"
        >
          {/* Header */}
          {view === "menu" ? (
            <div className="help-head">
              <div className="min-w-0">
                <h2 className="text-[17px] font-extrabold text-ink">How can we help?</h2>
                <p className="mt-0.5 text-[13px] text-ink-soft">Ask below, or pick a topic.</p>
              </div>
              <button type="button" onClick={close} className="help-icon-btn" aria-label="Close help">
                <IconClose />
              </button>
            </div>
          ) : (
            <div className="chat-header">
              <button type="button" onClick={() => { setVoiceOn(false); setView("menu"); }} className="chat-head-btn" aria-label="Back to help topics">
                <IconBack />
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[15px] font-bold text-white">ShifaIn care team</h2>
                <p className="flex items-center gap-1.5 text-[12px] text-white/75">
                  <span className="h-2 w-2 rounded-full bg-[#4ade80]" aria-hidden="true" />
                  Instant answers · coordinators on hand
                </p>
              </div>
              <button type="button" onClick={() => setPickerOpen(true)} className="chat-head-btn" aria-label="Choose the assistant's voice">
                <IconVoice />
              </button>
              <button type="button" onClick={close} className="chat-head-btn" aria-label="Close chat">
                <IconClose />
              </button>
            </div>
          )}

          {/* Body */}
          {view === "menu" ? (
            <div className="help-body flex-1">
              <button type="button" onClick={() => scrollTo("quote")} className="help-primary">
                <span className="help-primary-icon">
                  <IconPlan />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-[15px] font-bold">Get your free treatment plan</span>
                  <span className="block text-[13px] text-white/80">Three quick steps · hospital-confirmed in 48 h</span>
                </span>
                <span aria-hidden="true" className="text-lg">
                  &rarr;
                </span>
              </button>

              <div className="my-4 flex items-center gap-3 text-[13px] text-ink-muted">
                <span>or explore</span>
                <span className="h-px flex-1 bg-line" />
              </div>

              <ul className="space-y-2">
                {messages.length > 0 ? (
                  <li>
                    <button type="button" className="help-row" onClick={() => setView("chat")}>
                      <span className="help-row-icon"><IconChat /></span>
                      <span className="flex-1">Continue your conversation</span>
                      <IconChevron />
                    </button>
                  </li>
                ) : null}
                {FAQ_ITEMS.map((item, i) => (
                  <li key={item.q}>
                    <button
                      type="button"
                      className="help-row"
                      aria-expanded={openFaq === i}
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    >
                      <span className="help-row-icon"><IconQuestion /></span>
                      <span className="flex-1">{item.q}</span>
                      <IconChevron open={openFaq === i} />
                    </button>
                    {openFaq === i ? (
                      <p className="mx-1 mt-1.5 rounded-lg bg-brand-tint px-3 py-2 text-[13px] leading-relaxed text-ink-soft">
                        {item.a}
                      </p>
                    ) : null}
                  </li>
                ))}
                {whatsapp ? (
                  <li>
                    <a
                      className="help-row"
                      href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="help-row-icon"><IconWhatsapp /></span>
                      <span className="flex-1">Message us on WhatsApp</span>
                      <IconChevron />
                    </a>
                  </li>
                ) : null}
                {phone ? (
                  <li>
                    <a className="help-row" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>
                      <span className="help-row-icon"><IconPhone /></span>
                      <span className="flex-1">Call a coordinator</span>
                      <IconChevron />
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
          ) : (
            <div className="chat-messages" aria-live="polite">
              {messages.length === 0 ? (
                <div className="chat-welcome">
                  <p className="text-[15px] font-semibold text-ink">Hello — how can we help?</p>
                  <p className="text-[13px] leading-relaxed text-ink-soft">
                    Tell us what treatment you are looking for or what the doctor said. Type in any language, attach
                    your reports, or tap <b>Talk</b> to speak.
                  </p>
                  <p className="mt-2 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-muted">Or just say</p>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMAND_HINTS.map((hint) => (
                      <button key={hint} type="button" className="chat-profile-btn" onClick={() => sendText(hint)}>
                        “{hint}”
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-muted">Popular treatments</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STARTERS.map((topic) => (
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
                <div key={i} className="contents">
                  <div className={`chat-bubble ${msg.role === "user" ? "chat-user" : "chat-bot"} ${msg.coordinator ? "chat-coordinator" : ""}`}>
                    {msg.coordinator ? (
                      <span className="mb-0.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-leaf">Coordinator</span>
                    ) : null}
                    {msg.voice ? (
                      <span className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold opacity-70">
                        <span className="inline-block h-3.5 w-3.5"><IconWave /></span>
                        {msg.role === "user" ? "You said" : "Spoken reply"}
                      </span>
                    ) : null}
                    {msg.content}
                  </div>
                  {msg.links?.length ? (
                    <div className="chat-links">
                      {msg.links.map((link) =>
                        link.kind === "attach" ? (
                          <button key={link.label} type="button" className="chat-link" onClick={() => fileRef.current?.click()}>
                            <IconClip />
                            {link.label}
                          </button>
                        ) : (
                          <a
                            key={link.label}
                            className="chat-link"
                            href={link.href}
                            {...(link.kind === "whatsapp" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                          >
                            {link.kind === "whatsapp" ? <IconWhatsapp /> : link.kind === "phone" ? <IconPhone /> : null}
                            {link.label}
                          </a>
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
              ))}
              {sending ? (
                <div className="chat-bubble chat-bot chat-typing" aria-label="Typing">
                  <span />
                  <span />
                  <span />
                </div>
              ) : null}
              {suggestions.length > 0 && !voiceOn && !sending ? (
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((text) => (
                    <button key={text} type="button" className="chat-profile-btn" onClick={() => sendText(text)}>
                      {text}
                    </button>
                  ))}
                </div>
              ) : null}
              {caseRef && state === "complete" ? (
                <div className="chat-case-ref">
                  Case reference: <strong>{caseRef}</strong>
                </div>
              ) : null}
              <div ref={endRef} />
            </div>
          )}

          {/* Composer — always at the bottom, like a messenger */}
          <div className="help-footer">
            {voiceOn ? (
              <VoiceDock
                serverVoice={serverVoice}
                serverListening={serverListening}
                prefs={voicePrefs}
                onOpenPicker={() => setPickerOpen(true)}
                onSpokenText={voiceText}
                onSpokenAudio={voiceAudio}
                onClose={() => setVoiceOn(false)}
              />
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendText(input);
                }}
                className="help-composer"
              >
                <input type="file" ref={fileRef} className="hidden" accept="image/*,.pdf" onChange={handleFile} />
                <button
                  type="button"
                  className="chat-icon-btn"
                  onClick={() => fileRef.current?.click()}
                  disabled={sending}
                  aria-label="Attach medical reports"
                >
                  <IconClip />
                </button>
                <label htmlFor="help-input" className="sr-only">
                  Message
                </label>
                <input
                  id="help-input"
                  ref={inputRef}
                  type="text"
                  className="help-input"
                  placeholder={state === "complete" ? "Ask a follow-up…" : "Ask about treatment, cost, visa…"}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  autoComplete="off"
                  enterKeyHint="send"
                />
                {input.trim() ? (
                  <button key="send" type="submit" className="help-send" disabled={sending} aria-label="Send">
                    <IconSend />
                  </button>
                ) : (
                  <button
                    key="talk"
                    type="button"
                    className="help-talk"
                    onClick={startVoice}
                    disabled={sending}
                    aria-label="Talk — start a voice conversation"
                  >
                    <IconWave />
                    <span>Talk</span>
                  </button>
                )}
              </form>
            )}
            <p className="help-disclaimer">AI can make mistakes. A coordinator checks every plan before you travel.</p>
          </div>

          {pickerOpen ? (
            <VoicePicker
              prefs={voicePrefs}
              naturalAvailable={naturalVoices}
              onChange={changeVoice}
              onClose={() => setPickerOpen(false)}
            />
          ) : null}
        </div>
      ) : null}

      <button
        ref={fabRef}
        type="button"
        // The patient app has its own help button (bottom right, above its tab bar); sign-in and sign-up keep this one.
        hidden={!open && /^\/(en|ru|uz|oz)\/portal\/patient(?!\/(login|signup)(\/|$))(\/|$)/.test(pathname)}
        className={`help-fab ${open ? "help-fab-open" : ""}`}
        aria-expanded={open}
        aria-label={open ? "Close help" : "Need help? Chat with us"}
        onClick={() => (open ? close() : (setView("menu"), setOpen(true)))}
      >
        {open ? <IconClose /> : <IconChat />}
        <span className={open ? "sr-only" : "help-fab-label"}>Need help?</span>
        {unread > 0 && !open ? (
          <span className="help-fab-badge" aria-label={`${unread} new message${unread === 1 ? "" : "s"}`}>
            {unread}
          </span>
        ) : null}
      </button>
    </>
  );
}
