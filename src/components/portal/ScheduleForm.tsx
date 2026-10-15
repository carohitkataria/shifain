"use client";

import { useEffect, useState } from "react";

type Option = { value: string; label: string };

const FIELD =
  "min-h-12 w-full rounded-2xl border border-[#dcd8ee] bg-white px-4 text-[15px] text-navy focus:border-violet focus:outline-none focus:ring-2 focus:ring-violet-soft";

/**
 * Asking for a call. The patient's own time zone is read from the browser so
 * the coordinator knows what "morning" means for them.
 */
export function ScheduleForm({
  action,
  locale,
  reference,
  kinds,
  windows,
  languages,
  defaultLanguage,
  labels,
}: {
  action: (formData: FormData) => void | Promise<void>;
  locale: string;
  reference: string;
  kinds: Option[];
  windows: Option[];
  languages: Option[];
  defaultLanguage: string;
  labels: { kind: string; date: string; window: string; yourTime: string; language: string; note: string; submit: string };
}) {
  const [timezone, setTimezone] = useState("UTC");
  const [minDate, setMinDate] = useState("");

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    } catch {}
    const tomorrow = new Date(Date.now() + 86_400_000);
    setMinDate(tomorrow.toISOString().slice(0, 10));
  }, []);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="case" value={reference} />
      <input type="hidden" name="timezone" value={timezone} />

      <fieldset>
        <legend className="text-[15px] font-semibold text-navy">{labels.kind}</legend>
        <div className="mt-2 grid gap-2">
          {kinds.map((kind, index) => (
            <label
              key={kind.value}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-[#dcd8ee] bg-white px-4 text-[15px] text-navy has-[:checked]:border-violet has-[:checked]:bg-violet-soft"
            >
              <input type="radio" name="kind" value={kind.value} defaultChecked={index === 0} className="h-5 w-5 accent-[#722be4]" />
              {kind.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-[15px] font-semibold text-navy">
          {labels.date}
          <input type="date" name="date" required min={minDate || undefined} className={FIELD} />
        </label>
        <label className="flex flex-col gap-1.5 text-[15px] font-semibold text-navy">
          {labels.language}
          <select name="language" defaultValue={defaultLanguage} className={FIELD}>
            {languages.map((language) => (
              <option key={language.value} value={language.value}>
                {language.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="text-[15px] font-semibold text-navy">
          {labels.window} <span className="font-normal text-slate">({labels.yourTime}: {timezone})</span>
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {windows.map((window, index) => (
            <label
              key={window.value}
              className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#dcd8ee] bg-white px-3 text-center text-[15px] text-navy has-[:checked]:border-violet has-[:checked]:bg-violet-soft"
            >
              <input type="radio" name="window" value={window.value} defaultChecked={index === 0} className="sr-only" />
              {window.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-[15px] font-semibold text-navy">
        {labels.note}
        <textarea name="note" rows={3} maxLength={500} className={`${FIELD} py-3`} />
      </label>

      <button type="submit" className="inline-flex min-h-12 items-center justify-center self-start rounded-full bg-violet px-7 font-semibold text-white transition hover:bg-brand-deep">
        {labels.submit}
      </button>
    </form>
  );
}
