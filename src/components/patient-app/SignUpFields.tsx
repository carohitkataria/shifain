"use client";

import { useState } from "react";
import { AppIcon } from "./AppIcon";
import { COUNTRIES, COUNTRY_BY_NAME } from "@/lib/countries";
import { suggestedMessenger, type ContactChannel } from "@/lib/journey-rules";

/**
 * Country, phone and how to reach them. Choosing the country fills in the
 * dialling code and pre-selects the messenger most people there use
 * (Telegram or WhatsApp), marked "Suggested" — the patient can change it.
 */
export function SignUpFields({
  labels,
}: {
  labels: Record<"country" | "choose" | "phone" | "mobile" | "reachMe" | "tapToChange" | "suggested" | "hintPick" | "hintTelegram" | "hintWhatsapp" | "telegram" | "whatsapp" | "call" | "email", string>;
}) {
  const [country, setCountry] = useState("");
  const [dial, setDial] = useState("");
  const [chosen, setChosen] = useState<Set<ContactChannel>>(new Set(["email"]));
  const [suggested, setSuggested] = useState<"telegram" | "whatsapp" | null>(null);

  const pickCountry = (name: string) => {
    setCountry(name);
    const found = COUNTRY_BY_NAME.get(name);
    if (found) setDial(`+${found.dial}`);
    const messenger = suggestedMessenger(found?.code);
    setSuggested(messenger);
    setChosen((current) => {
      const next = new Set(current);
      next.delete("telegram");
      next.delete("whatsapp");
      next.add(messenger);
      return next;
    });
  };

  const toggle = (channel: ContactChannel) =>
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(channel)) next.delete(channel);
      else next.add(channel);
      return next;
    });

  const options: { key: ContactChannel; icon: string; color?: string; label: string }[] = [
    { key: "telegram", icon: "tg", color: "var(--tg)", label: labels.telegram },
    { key: "whatsapp", icon: "wa", color: "var(--wa)", label: labels.whatsapp },
    { key: "call", icon: "phone", label: labels.call },
    { key: "email", icon: "mail", label: labels.email },
  ];
  const main = suggested && chosen.has(suggested) ? suggested : options.find((option) => chosen.has(option.key))?.key ?? "email";

  return (
    <>
      <label className="a-field">
        <span>{labels.country}</span>
        <select className="a-input" name="country" required value={country} onChange={(event) => pickCountry(event.target.value)}>
          <option value="" disabled>
            {labels.choose}
          </option>
          {COUNTRIES.map((item) => (
            <option key={item.code} value={item.name}>
              {item.name}
            </option>
          ))}
          <option value="Other">Other</option>
        </select>
      </label>
      <label className="a-field">
        <span>{labels.phone}</span>
        <span className="a-row">
          <input className="a-input" name="dial" value={dial} onChange={(event) => setDial(event.target.value)} style={{ width: 84 }} placeholder="+" aria-label="Code" inputMode="tel" />
          <input className="a-input" name="phone" required inputMode="tel" autoComplete="tel-national" placeholder={labels.mobile} />
        </span>
      </label>
      <div className="a-field">
        <span>
          {labels.reachMe} <small className="a-muted">· {labels.tapToChange}</small>
        </span>
        <div className="a-g4">
          {options.map((option) => (
            <button key={option.key} type="button" className={`a-ch ${chosen.has(option.key) ? "on" : ""}`} aria-pressed={chosen.has(option.key)} onClick={() => toggle(option.key)}>
              {suggested === option.key ? <span className="a-star">{labels.suggested}</span> : null}
              <span style={{ color: option.color }}>
                <AppIcon name={option.icon} />
              </span>
              {option.label}
            </button>
          ))}
        </div>
        {[...chosen].map((channel) => (
          <input key={channel} type="hidden" name="channels" value={channel} />
        ))}
        <input type="hidden" name="main" value={main} />
        <p className="a-hint">
          <AppIcon name="ai" />
          <span>{suggested === "telegram" ? labels.hintTelegram : suggested === "whatsapp" ? labels.hintWhatsapp : labels.hintPick}</span>
        </p>
      </div>
    </>
  );
}
