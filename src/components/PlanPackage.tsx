"use client";

import { useMemo, useState } from "react";
import { Icon } from "./Icon";

export type PlanLine = {
  id: string;
  icon: string;
  title: string;
  note: string;
  min: number;
  max: number;
  optional: boolean;
  preselected: boolean;
};

const money = (currency: string, value: number) =>
  `${currency === "USD" ? "$" : `${currency} `}${Math.round(value).toLocaleString("en-US")}`;

/**
 * The editable package. Everything optional starts switched on or off as the
 * plan suggested, and the estimate follows whatever the patient decides — that
 * is the difference between a plan and a brochure.
 */
export function PlanPackage({
  currency,
  lines,
  labels,
}: {
  currency: string;
  lines: PlanLine[];
  labels: { included: string; optional: string; total: string; note: string; free: string };
}) {
  const [chosen, setChosen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(lines.map((line) => [line.id, line.optional ? line.preselected : true])),
  );

  const total = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          chosen[line.id] ? { min: sum.min + line.min, max: sum.max + line.max } : sum,
        { min: 0, max: 0 },
      ),
    [lines, chosen],
  );

  return (
    <div>
      <ul className="divide-y divide-line">
        {lines.map((line) => {
          const on = Boolean(chosen[line.id]);
          const free = line.min === 0 && line.max === 0;
          return (
            <li key={line.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 py-3.5">
              <span
                className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                  on ? "bg-brand-tint text-brand" : "bg-surface-muted text-ink-soft"
                }`}
              >
                <Icon name={line.icon} className="h-[18px] w-[18px]" />
              </span>

              <span className="min-w-0 flex-1 basis-40">
                <span className={`block font-semibold ${on ? "text-ink" : "text-ink-soft"}`}>
                  {line.title}
                </span>
                <span className="mt-0.5 block text-sm leading-snug text-ink-soft">{line.note}</span>
              </span>

              <span className="shrink-0 text-right">
                <span className={`block font-semibold tabular-nums ${on ? "text-ink" : "text-ink-soft line-through"}`}>
                  {free ? labels.free : `${money(currency, line.min)}–${money(currency, line.max)}`}
                </span>
                {line.optional ? (
                  <button
                    type="button"
                    onClick={() => setChosen((prev) => ({ ...prev, [line.id]: !prev[line.id] }))}
                    aria-pressed={on}
                    className="mt-1 text-sm font-semibold text-brand underline-offset-4 hover:underline"
                  >
                    {on ? labels.optional : labels.included}
                  </button>
                ) : (
                  <span className="mt-1 block text-sm text-ink-soft">{labels.included}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 rounded-2xl bg-surface-muted p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="font-semibold text-ink">{labels.total}</span>
          <span className="text-2xl font-extrabold tabular-nums text-ink">
            {money(currency, total.min)}–{money(currency, total.max)}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{labels.note}</p>
      </div>
    </div>
  );
}
