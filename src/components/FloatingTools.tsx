"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const FAQ_ITEMS = [
  {
    icon: "📋",
    q: "How is my estimate calculated?",
    a: "We collect your medical reports, match you with accredited hospitals, and return real quotes within 24–48 hours — no middleman markup.",
  },
  {
    icon: "🛂",
    q: "What documents do I need for a medical visa?",
    a: "A valid passport, a visa invitation letter from the hospital (we arrange this), your medical reports, and proof of funds. We guide you through every step.",
  },
  {
    icon: "🏥",
    q: "How do I track my case?",
    a: "Once you submit your reports, you get a patient portal with live status updates — from doctor review to travel planning.",
  },
];

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
};

type ProfileQuestion = {
  field: string;
  question: string;
  buttons?: { text: string; callback_data: string }[][];
};

function HelpPanel({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    function close(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [onClose]);

  const scrollTo = useCallback((id: string) => {
    onClose();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, [onClose]);

  return (
    <div ref={ref} className="fab-panel">
      <h4 className="mb-1 text-[17px] font-bold">Quick help</h4>
      <p className="mb-3 text-sm text-ink-soft">Get answers fast, or reach a person.</p>

      {FAQ_ITEMS.map((item, i) => (
        <div key={i}>
          <button
            type="button"
            className="fab-qa"
            onClick={() => setOpenFaq(openFaq === i ? null : i)}
          >
            {item.icon} {item.q}
          </button>
          {openFaq === i && (
            <p className="mb-2 ml-1 rounded-lg bg-brand-tint px-3 py-2 text-[13px] leading-relaxed text-ink-soft">
              {item.a}
            </p>
          )}
        </div>
      ))}

      <button
        type="button"
        className="fab-qa"
        onClick={() => scrollTo("quote")}
      >
        📞 Request a callback
      </button>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          className="btn btn-primary w-full text-sm"
          onClick={() => scrollTo("faq")}
        >
          View all FAQs
        </button>
        <button
          type="button"
          className="btn btn-secondary w-full text-sm"
          onClick={() => scrollTo("quote")}
        >
          Get my plan
        </button>
      </div>
    </div>
  );
}

function ChatPanel({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    function close(e: MouseEvent | TouchEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [onClose]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendText = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;
    const userMsg = text.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
      if (data.state) setState(data.state);
      if (data.profileQuestion) setProfileQuestion(data.profileQuestion);
      else setProfileQuestion(null);
      if (data.caseReference) setCaseRef(data.caseReference);
      if (data.audioBase64) {
        const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
        audio.play().catch(() => {});
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setSending(false);
    }
  }, [sending]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    sendText(input);
  }, [input, sendText]);

  const handleProfileButton = useCallback((value: string) => {
    sendText(value);
  }, [sendText]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setMessages((prev) => [...prev, { role: "user", content: "🎤 Voice message" }]);
        setSending(true);
        try {
          const form = new FormData();
          form.append("audio", blob, "voice.webm");
          const res = await fetch("/api/chat", { method: "POST", body: form });
          const data = await res.json();
          if (data.reply) {
            setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
          }
          if (data.state) setState(data.state);
          if (data.profileQuestion) setProfileQuestion(data.profileQuestion);
          else setProfileQuestion(null);
          if (data.caseReference) setCaseRef(data.caseReference);
          if (data.audioBase64) {
            const audio = new Audio(`data:audio/mpeg;base64,${data.audioBase64}`);
            audio.play().catch(() => {});
          }
        } catch {
          setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't process the voice message." }]);
        } finally {
          setSending(false);
        }
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      /* mic permission denied — ignore */
    }
  }, []);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessages((prev) => [...prev, { role: "user", content: `📎 ${file.name}` }]);
    setSending(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/chat", { method: "POST", body: form });
      const data = await res.json();
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
      if (data.state) setState(data.state);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, the file upload failed." }]);
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, []);

  return (
    <div ref={panelRef} className="chat-panel">
      <div className="chat-header">
        <div>
          <h4 className="text-[15px] font-bold text-white">ShifaIn Assistant</h4>
          <p className="text-[12px] text-white/70">Ask about treatments in India</p>
        </div>
        <button type="button" onClick={onClose} className="chat-close" aria-label="Close chat">
          ✕
        </button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-welcome">
            <p className="text-[14px] font-semibold text-ink">Hello! 👋</p>
            <p className="text-[13px] text-ink-soft">
              Tell me about your medical needs and I&apos;ll help you explore treatment options in India.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role === "user" ? "chat-user" : "chat-bot"}`}>
            {msg.content}
          </div>
        ))}
        {sending && (
          <div className="chat-bubble chat-bot chat-typing">
            <span /><span /><span />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {profileQuestion?.buttons && state === "collecting_profile" && (
        <div className="chat-buttons">
          {profileQuestion.buttons.flat().map((btn, i) => (
            <button
              key={i}
              type="button"
              className="chat-profile-btn"
              onClick={() => handleProfileButton(btn.text.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*/u, ""))}
              disabled={sending}
            >
              {btn.text}
            </button>
          ))}
        </div>
      )}

      {caseRef && state === "complete" && (
        <div className="chat-case-ref">
          Case reference: <strong>{caseRef}</strong>
        </div>
      )}

      <form onSubmit={handleSubmit} className="chat-input-bar">
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
        <button
          type="button"
          className="chat-icon-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          aria-label="Upload file"
          title="Upload medical reports"
        >
          📎
        </button>
        <input
          type="text"
          className="chat-text-input"
          placeholder={state === "complete" ? "Ask a follow-up..." : "Type your message..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
        />
        <button
          type="button"
          className={`chat-icon-btn ${recording ? "chat-recording" : ""}`}
          onClick={recording ? stopRecording : startRecording}
          disabled={sending && !recording}
          aria-label={recording ? "Stop recording" : "Record voice"}
          title={recording ? "Stop recording" : "Record voice message"}
        >
          {recording ? "⏹" : "🎙"}
        </button>
        <button
          type="submit"
          className="chat-send-btn"
          disabled={sending || !input.trim()}
          aria-label="Send"
        >
          ➤
        </button>
      </form>
    </div>
  );
}

export function FloatingTools() {
  const [helpOpen, setHelpOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const openHelp = useCallback(() => {
    setChatOpen(false);
    setHelpOpen((v) => !v);
  }, []);

  const openChat = useCallback(() => {
    setHelpOpen(false);
    setChatOpen((v) => !v);
  }, []);

  return (
    <div className="fab-stack">
      {helpOpen && <HelpPanel onClose={() => setHelpOpen(false)} />}
      {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}

      <button
        type="button"
        className="fab-btn fab-talk"
        onClick={openChat}
      >
        <span>🗣</span> Talk to us
      </button>

      <button
        type="button"
        className="fab-btn fab-help"
        onClick={openHelp}
      >
        <span>💬</span> Quick help
      </button>
    </div>
  );
}
