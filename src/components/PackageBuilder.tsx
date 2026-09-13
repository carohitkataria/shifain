"use client";

import { useMemo, useState } from "react";
import { Icon } from "./Icon";

export type PackageLineView = {
  id: string;
  icon: string;
  title: string;
  note: string;
  amount: string;
  included: boolean;
  optional: boolean;
};

/** Reads "$4,600" into 4600 so the running total can be recalculated. */
function toNumber(amount: string): number {
  const digits = amount.replace(/[^\d.]/g, "");
  const value = Number.parseFloat(digits);
  return Number.isFinite(value) ? value : 0;
}

function currencyPrefix(amount: string): string {
  const match = amount.match(/^[^\d]*/);
  return match ? match[0] : "";
}

/**
 * The editable package: optional travel items can be switched off and the
 * estimate recalculates immediately, which is the point of the AI plan.
 */
export function PackageBuilder({
  lines,
  includedLabel,
  optionalLabel,
  totalLabel,
  totalNote,
  cta,
}: {
  lines: PackageLineView[];
  includedLabel: string;
  optionalLabel: string;
  totalLabel: string;
  totalNote: string;
  cta: string;
}) {
  const [dropped, setDropped] = useState<Record<string, boolean>>({});

  const symbol = currencyPrefix(lines[0]?.amount ?? "$");
  const total = useMemo(
    () =>
      lines.reduce(
        (sum, line) => (line.optional && dropped[line.id] ? sum : sum + toNumber(line.amount)),
        0,
      ),
    [lines, dropped],
  );

  return (
    <div>
      <ul className="divide-y divide-line">
        {lines.map((line) => {
          const off = line.optional && dropped[line.id];
          return (
            <li key={line.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3.5">
              <span
                className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl transition ${
                  off ? "bg-surface-muted text-ink-muted" : "bg-brand-tint text-brand-deep"
                }`}
              >
                <Icon name={line.icon} className="h-5 w-5" />
              </span>

              <div className="min-w-0 flex-1 basis-40">
                <p className={`truncate text-sm font-bold ${off ? "text-ink-muted line-through" : "text-ink"}`}>
                  {line.title}
                </p>
                <p className="truncate text-xs text-ink-muted">{line.note}</p>
              </div>

              <span
                className={`flex-none text-sm font-extrabold tabular-nums ${off ? "text-ink-muted line-through" : "text-ink"}`}
              >
                {line.amount}
              </span>

              {line.optional ? (
                <button
                  type="button"
                  onClick={() => setDropped((prev) => ({ ...prev, [line.id]: !prev[line.id] }))}
                  aria-pressed={!off}
                  className={`flex-none rounded-full border px-3 py-1 text-xs font-bold transition ${
                    off
                      ? "border-line bg-white text-ink-muted hover:border-brand hover:text-brand-deep"
                      : "border-leaf/30 bg-leaf-tint text-leaf"
                  }`}
                >
                  {off ? `+ ${optionalLabel}` : `✓ ${includedLabel}`}
                </button>
              ) : (
                <span className="flex-none rounded-full border border-line bg-surface-muted px-3 py-1 text-xs font-bold text-ink-muted">
                  {includedLabel}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-5 rounded-xl2 bg-ink p-5 text-white">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">{totalLabel}</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums">
              {symbol}
              {total.toLocaleString("en-US")}
            </p>
          </div>
          <a href="#quote-form" className="btn btn-primary !bg-white !py-2.5 text-sm !text-ink hover:!bg-white/90">
            {cta}
          </a>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-white/60">{totalNote}</p>
      </div>
    </div>
  );
}
