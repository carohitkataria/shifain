"use client";

/** Opens the help panel on the chat — or with the microphone on — from anywhere on the page. */
export function OpenChatButton({
  className,
  children,
  voice = false,
  label,
}: {
  className?: string;
  children: React.ReactNode;
  voice?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={className}
      onClick={() => window.dispatchEvent(new Event(voice ? "shifain:open-voice" : "shifain:open-chat"))}
    >
      {children}
    </button>
  );
}
