"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/Icon";

export type ServiceGroup = { key: string; label: string; items: string[] };

/** A hospital's services, one group at a time: tabs down the side, the group's services beside them. */
export function ServiceTabs({ groups }: { groups: ServiceGroup[] }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (to: number) => {
    const next = (to + groups.length) % groups.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  const current = groups[active];
  return (
    <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6">
      <div
        role="tablist"
        aria-orientation="vertical"
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
      >
        {groups.map((group, index) => (
          <button
            key={group.key}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`svc-tab-${group.key}`}
            aria-selected={index === active}
            aria-controls={`svc-panel-${group.key}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                event.preventDefault();
                move(active + 1);
              } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                event.preventDefault();
                move(active - 1);
              }
            }}
            className={`flex min-h-12 flex-none items-center justify-between gap-3 rounded-xl px-4 text-left text-sm font-bold transition lg:w-full ${
              index === active ? "bg-violet text-white" : "bg-white text-ink ring-1 ring-line hover:text-brand"
            }`}
          >
            <span className="whitespace-nowrap lg:whitespace-normal">{group.label}</span>
            <span className={`hidden text-xs font-semibold lg:inline ${index === active ? "text-white/80" : "text-ink-muted"}`}>{group.items.length}</span>
          </button>
        ))}
      </div>

      <ul
        role="tabpanel"
        id={`svc-panel-${current.key}`}
        aria-labelledby={`svc-tab-${current.key}`}
        className="grid content-start gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {current.items.map((item) => (
          <li key={item} className="flex min-h-16 items-center gap-3 rounded-xl bg-violet-soft/70 px-4 py-3 text-sm font-semibold text-ink">
            <Icon name="check" className="h-5 w-5 flex-none text-violet" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
