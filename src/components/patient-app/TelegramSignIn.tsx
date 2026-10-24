"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { LOGIN } from "@/lib/patient-login-copy";
import { t } from "@/lib/localize";
import type { Locale } from "@/lib/i18n";

/**
 * The Telegram option on the sign-in page. It opens the patient bot in a new
 * tab (or the Telegram app on a phone) and waits here: once the patient shares
 * their number in the bot, this page is signed in.
 */
export function TelegramTile({ locale, className, statusClassName, reset = false }: { locale: Locale; className: string; statusClassName: string; /** Forgot password: sign in, then choose a new one. */ reset?: boolean }) {
  const [state, setState] = useState<"idle" | "waiting" | "expired">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const poll = (startedAt: number) => {
    timer.current = setTimeout(async () => {
      const result = await fetch("/api/auth/telegram/status", { cache: "no-store" })
        .then((response) => response.json() as Promise<{ status: string; redirect?: string }>)
        .catch(() => ({ status: "pending" }) as { status: string; redirect?: string });
      if (result.status === "done" && result.redirect) {
        window.location.assign(result.redirect);
        return;
      }
      // "none" only until the new tab has set the cookie; ten minutes is the token's life.
      const tooLong = Date.now() - startedAt > 10 * 60_000 || (result.status === "none" && Date.now() - startedAt > 30_000);
      if (result.status === "expired" || tooLong) return setState("expired");
      poll(startedAt);
    }, 2000);
  };

  return (
    <>
      <a
        href={`/api/auth/telegram/start?locale=${locale}${reset ? "&then=password" : ""}`}
        target="_blank"
        rel="noopener"
        className={className}
        aria-describedby="tg-status"
        onClick={() => {
          if (timer.current) clearTimeout(timer.current);
          setState("waiting");
          poll(Date.now());
        }}
      >
        <Send size={19} strokeWidth={1.75} aria-hidden="true" />
        Telegram
      </a>
      <p id="tg-status" className={statusClassName} role="status" aria-live="polite" hidden={state === "idle"}>
        {state === "waiting" ? t(LOGIN.tgWaiting, locale) : state === "expired" ? t(LOGIN.tgExpired, locale) : ""}
      </p>
    </>
  );
}
