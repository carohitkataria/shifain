"use client";

import { useState } from "react";
import { TH, adminField } from "../Panel";

export type DayRow = { on: boolean; from: string; to: string; slotMinutes: number; consultType: string };
export type Week = Record<string, DayRow>;

const DAYS = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
] as const;

const CONSULT = [
  ["in_person", "In person"],
  ["video", "Video"],
  ["both", "Both"],
] as const;

const BLANK: DayRow = { on: false, from: "09:00", to: "13:00", slotMinutes: 20, consultType: "in_person" };

/**
 * One week of availability at one hospital: each day on or off, its hours, the
 * slot length and how the consult happens. Bookable slots are worked out from
 * this; none are stored.
 */
export function WeekBuilder({ initial, slotOptions }: { initial: Week; slotOptions: number[] }) {
  const [week, setWeek] = useState<Week>(() =>
    Object.fromEntries(DAYS.map(([key]) => [key, { ...BLANK, ...(initial[key] ?? {}) }])),
  );
  const set = (day: string, patch: Partial<DayRow>) => setWeek((current) => ({ ...current, [day]: { ...current[day], ...patch } }));

  const copyMonday = () =>
    setWeek((current) => ({
      ...current,
      ...Object.fromEntries(["tue", "wed", "thu", "fri"].map((day) => [day, { ...current.mon }])),
    }));

  const perDay = (row: DayRow) => {
    if (!row.on || !/^\d\d:\d\d$/.test(row.from) || !/^\d\d:\d\d$/.test(row.to)) return 0;
    const span = Number(row.to.slice(0, 2)) * 60 + Number(row.to.slice(3)) - (Number(row.from.slice(0, 2)) * 60 + Number(row.from.slice(3)));
    return span > 0 ? Math.floor(span / row.slotMinutes) : 0;
  };
  const total = DAYS.reduce((sum, [key]) => sum + perDay(week[key]), 0);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-soft" aria-live="polite">
          <strong className="text-ink">{total}</strong> bookable slots a week
        </p>
        <button
          type="button"
          onClick={copyMonday}
          className="min-h-9 rounded-lg px-3 text-sm font-semibold text-brand-deep transition hover:bg-brand-tint"
        >
          Copy Monday to Tue–Fri
        </button>
      </div>
      <div className="relative overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface-muted text-left">
            <tr>
              <th scope="col" className={TH}>Day</th>
              <th scope="col" className={TH}>From</th>
              <th scope="col" className={TH}>To</th>
              <th scope="col" className={TH}>Slot</th>
              <th scope="col" className={TH}>Consult</th>
              <th scope="col" className={`${TH} text-right`}>Slots</th>
            </tr>
          </thead>
          <tbody>
            {DAYS.map(([key, label]) => {
              const row = week[key];
              return (
                <tr key={key} className={`border-t border-line ${row.on ? "bg-white" : "bg-surface-muted/50"}`}>
                  <td className="px-3 py-2">
                    <label className="flex min-h-10 items-center gap-2.5 font-semibold text-ink">
                      <input
                        type="checkbox"
                        name={`week.${key}.on`}
                        checked={row.on}
                        onChange={(event) => set(key, { on: event.target.checked })}
                        className="h-5 w-5 accent-brand"
                      />
                      {label}
                    </label>
                  </td>
                  <td className="px-3 py-2">
                    <input type="time" name={`week.${key}.from`} value={row.from} disabled={!row.on} onChange={(event) => set(key, { from: event.target.value })} aria-label={`${label} from`} className={`${adminField} !w-32`} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="time" name={`week.${key}.to`} value={row.to} disabled={!row.on} onChange={(event) => set(key, { to: event.target.value })} aria-label={`${label} to`} className={`${adminField} !w-32`} />
                  </td>
                  <td className="px-3 py-2">
                    <select name={`week.${key}.slotMinutes`} value={row.slotMinutes} disabled={!row.on} onChange={(event) => set(key, { slotMinutes: Number(event.target.value) })} aria-label={`${label} slot length`} className={`${adminField} !w-28`}>
                      {slotOptions.map((value) => (
                        <option key={value} value={value}>
                          {value} min
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select name={`week.${key}.consultType`} value={row.consultType} disabled={!row.on} onChange={(event) => set(key, { consultType: event.target.value })} aria-label={`${label} consult type`} className={`${adminField} !w-32`}>
                      {CONSULT.map(([value, text]) => (
                        <option key={value} value={value}>
                          {text}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink">{perDay(row) || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
