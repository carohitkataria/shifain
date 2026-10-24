"use client";

import { useEffect, useState } from "react";
import { suggestedMessenger, type ContactChannel } from "@/lib/journey-rules";
import { REACH_COPY as R } from "@/lib/intake-copy";
import { t } from "@/lib/localize";
import type { Locale } from "@/lib/i18n";

const OPTIONS: ContactChannel[] = ["telegram", "whatsapp", "call", "email"];

/**
 * How the coordinator should reach the patient, chosen on the enquiry form
 * (posted as "channel"). Telegram or WhatsApp is suggested from the country,
 * as at sign-up, until the patient picks for themselves.
 */
export function ReachChoice({ locale, countryCode }: { locale: Locale; countryCode: string | null }) {
  const suggested = suggestedMessenger(countryCode);
  const [picked, setPicked] = useState<ContactChannel | null>(null);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!touched) setPicked(suggested);
  }, [suggested, touched]);
  const value = picked ?? suggested;

  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-semibold text-ink">{t(R.legend, locale)}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {OPTIONS.map((option) => (
          <label
            key={option}
            className={`relative flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-2 text-center text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${
              value === option ? "border-brand bg-brand-tint text-brand-deep" : "border-line bg-white text-ink-soft hover:border-brand/40"
            }`}
          >
            <input
              type="radio"
              name="channel"
              value={option}
              checked={value === option}
              onChange={() => {
                setTouched(true);
                setPicked(option);
              }}
              className="sr-only"
            />
            {t(R[option], locale)}
            {option === suggested && !touched ? <span className="absolute -top-2 right-2 rounded-full bg-leaf px-1.5 text-[10px] font-bold text-white">{t(R.suggested, locale)}</span> : null}
          </label>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-ink-muted">{t(R.note[value], locale)}</p>
    </fieldset>
  );
}
