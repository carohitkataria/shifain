"use client";

/** Opens the help panel straight on the chat, from anywhere on the page. */
export function OpenChatButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event("shifain:open-chat"))}
    >
      {children}
    </button>
  );
}
