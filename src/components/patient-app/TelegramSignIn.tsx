"use client";

import { useEffect, useRef, useState } from "react";
import { APP } from "@/lib/patient-app-copy";
import { t } from "@/lib/localize";
import type { Locale } from "@/lib/i18n";
import { TelegramGlyph } from "@/components/TelegramGlyph";

/**
 * Opens the patient bot in a new tab (or the Telegram app on a phone) and waits
 * here: once the patient shares their number in the bot, this page is signed in.
 */
export function TelegramSignIn({ locale }: { locale: Locale }) {
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
    <div>
      <a
        href={`/api/auth/telegram/start?locale=${locale}`}
        target="_blank"
        rel="noopener"
        className="a-btn a-w a-btn-tgs"
        onClick={() => {
          if (timer.current) clearTimeout(timer.current);
          setState("waiting");
          poll(Date.now());
        }}
      >
        <TelegramGlyph />
        {t(APP.tgSignIn, locale)}
      </a>
      <p className="a-tiny a-muted" role="status" aria-live="polite" style={{ marginTop: 6, textAlign: "center" }}>
        {t(state === "waiting" ? APP.telegramWaiting : state === "expired" ? APP.telegramExpired : APP.telegramHint, locale)}
      </p>
    </div>
  );
}
