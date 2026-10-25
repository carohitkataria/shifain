"use client";

import { useState } from "react";
import { Mail, Smartphone } from "lucide-react";
import { countryOptions, COUNTRY_BY_NAME } from "@/lib/countries";
import type { Locale } from "@/lib/i18n";

/**
 * Email or mobile number for the password sign-in. A mobile number needs its
 * country code, so that mode has a code picker beside the number; the server
 * joins the two ("dial" + "identifier").
 */
export function LoginIdentifier({
  locale,
  labels,
  initial,
}: {
  locale: Locale;
  labels: { email: string; mobile: string; emailLabel: string; mobileLabel: string; code: string; number: string };
  /** What was typed before a failed attempt, to put back. */
  initial: string;
}) {
  const [mode, setMode] = useState<"email" | "mobile">(initial && !initial.includes("@") ? "mobile" : "email");
  const countries = countryOptions(locale);
  const seen = new Set<string>();
  // One entry per code, labelled with the first country that uses it ("+7" is shared).
  const codes = countries
    .map((item) => ({ dial: COUNTRY_BY_NAME.get(item.value)?.dial ?? "", label: item.label }))
    .filter((item) => item.dial && !seen.has(item.dial) && seen.add(item.dial));

  return (
    <div className="pl-field">
      <div className="pl-switch" role="tablist" aria-label={`${labels.email} / ${labels.mobile}`}>
        <button type="button" role="tab" aria-selected={mode === "email"} onClick={() => setMode("email")}>
          <Mail size={15} strokeWidth={1.75} aria-hidden="true" />
          {labels.email}
        </button>
        <button type="button" role="tab" aria-selected={mode === "mobile"} onClick={() => setMode("mobile")}>
          <Smartphone size={15} strokeWidth={1.75} aria-hidden="true" />
          {labels.mobile}
        </button>
      </div>
      {mode === "email" ? (
        <label className="pl-field">
          <span className="pl-label">{labels.emailLabel}</span>
          <span className="pl-input">
            <Mail size={18} strokeWidth={1.75} aria-hidden="true" />
            <input key="email" name="identifier" type="email" required autoComplete="username" defaultValue={initial.includes("@") ? initial : ""} placeholder="you@example.com" />
          </span>
        </label>
      ) : (
        <div className="pl-field">
          <label htmlFor="pl-mobile" className="pl-label">
            {labels.mobileLabel}
          </label>
          <div className="pl-phone">
            <span className="pl-input pl-dial">
              <select name="dial" required aria-label={labels.code} defaultValue="" suppressHydrationWarning>
                <option value="" disabled>
                  {labels.code}
                </option>
                {codes.map((item) => (
                  <option key={item.dial} value={item.dial} suppressHydrationWarning>
                    +{item.dial} {item.label}
                  </option>
                ))}
              </select>
            </span>
            <span className="pl-input">
              <Smartphone size={18} strokeWidth={1.75} aria-hidden="true" />
              <input key="mobile" id="pl-mobile" name="identifier" type="tel" inputMode="tel" required autoComplete="tel-national" defaultValue={initial.includes("@") ? "" : initial} placeholder={labels.number} />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
