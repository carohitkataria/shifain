"use client";

import { useMemo, useState } from "react";
import { AppIcon } from "./AppIcon";
import { openSheet } from "./client";
import { eventNoteAction } from "@/app/(site)/[locale]/portal/patient/app-actions";

export type CalEvent = {
  id: string;
  date: string | null;
  time: string | null;
  title: string;
  where: string | null;
  with: string | null;
  bring: string | null;
  tone: string;
  sourceLabel: string;
  status: string | null;
};

type Labels = Record<"month" | "agenda" | "nothing" | "add" | "bring" | "myNote" | "notePlaceholder" | "save" | "directions" | "phone" | "change" | "datesLater" | "close", string>;

/**
 * Dates read the same on the server and in the browser: the parts from Intl,
 * joined by spaces, so a "Wed, 4 Nov" on one side never meets "Wed 4 Nov".
 */
const fmt = (isoDate: string, intl: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(intl, { ...options, timeZone: "UTC" })
    .formatToParts(new Date(`${isoDate}T00:00:00Z`))
    .filter((part) => part.type !== "literal")
    .map((part) => part.value)
    .join(" ");

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/**
 * The calendar the plan creates, in the shape of Google Calendar on a phone:
 * a month grid with coloured entries, the chosen day's list underneath, and
 * an agenda of everything. Every day and every entry opens.
 */
export function CalendarView({
  events,
  notes,
  today,
  initialDay,
  initialEvent,
  locale,
  reference,
  labels,
  legend,
  canAdd,
}: {
  events: CalEvent[];
  notes: Record<string, string>;
  today: string;
  initialDay: string;
  initialEvent: string | null;
  locale: string;
  reference: string;
  labels: Labels;
  legend: { tone: string; label: string }[];
  canAdd: boolean;
}) {
  const [view, setView] = useState<"month" | "agenda">("month");
  const [selected, setSelected] = useState(initialDay);
  const [month, setMonth] = useState(() => new Date(`${initialDay.slice(0, 7)}-01T00:00:00`));
  const [open, setOpen] = useState<CalEvent | null>(() => events.find((event) => event.id === initialEvent) ?? null);
  const intl = locale === "en" ? "en-GB" : locale;

  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const event of events) if (event.date) map.set(event.date, [...(map.get(event.date) ?? []), event]);
    return map;
  }, [events]);
  const undated = events.filter((event) => !event.date);

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
  const weekdays = Array.from({ length: 7 }, (_, index) => fmt(`2024-01-0${1 + index}`, intl, { weekday: "narrow" }));
  const dayEvents = byDay.get(selected) ?? [];

  const row = (event: CalEvent, withDate = false) => (
    <li key={event.id}>
      <button type="button" className="a-li a-tap" onClick={() => setOpen(event)}>
        <span className={`a-barl e-${event.tone}`} />
        <span className="a-time">
          {withDate && event.date ? (
            <>
              {fmt(event.date, intl, { day: "numeric", month: "short" })}
              <br />
            </>
          ) : null}
          {event.time ?? (event.date ? "" : event.status ?? "")}
        </span>
        <span className="a-t">
          <b>{event.title}</b>
          <small>{event.where ?? event.with ?? event.sourceLabel}</small>
        </span>
        <AppIcon name="right" />
      </button>
    </li>
  );

  return (
    <>
      <div className="a-seg" style={{ marginBottom: 12 }}>
        <button type="button" aria-pressed={view === "month"} onClick={() => setView("month")}>
          {labels.month}
        </button>
        <button type="button" aria-pressed={view === "agenda"} onClick={() => setView("agenda")}>
          {labels.agenda}
        </button>
      </div>

      {view === "month" ? (
        <>
          <div className="a-cal-h">
            <button type="button" className="a-ibtn" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
              <AppIcon name="left" />
            </button>
            <h3>{fmt(iso(month), intl, { month: "long", year: "numeric" })}</h3>
            <button type="button" className="a-ibtn" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
              <AppIcon name="right" />
            </button>
          </div>
          <div className="a-cal" role="grid">
            {weekdays.map((day, index) => (
              <div key={index} className="a-dow" role="columnheader">
                {day}
              </div>
            ))}
            {cells.map((day) => {
              const key = iso(day);
              const list = byDay.get(key) ?? [];
              return (
                <div
                  key={key}
                  role="gridcell"
                  tabIndex={0}
                  aria-selected={key === selected}
                  aria-label={`${fmt(key, intl, { day: "numeric", month: "long" })}${list.length ? `, ${list.length}` : ""}`}
                  className={`a-d ${day.getMonth() !== month.getMonth() ? "out" : ""} ${key === today ? "today" : ""} ${key === selected ? "sel" : ""}`}
                  onClick={() => setSelected(key)}
                  onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && setSelected(key)}
                >
                  <span className="a-n">{day.getDate()}</span>
                  {list.slice(0, 2).map((event) => (
                    <span
                      key={event.id}
                      className={`a-ev e-${event.tone}`}
                      onClick={(click) => {
                        click.stopPropagation();
                        setSelected(key);
                        setOpen(event);
                      }}
                    >
                      {event.title}
                    </span>
                  ))}
                  {list.length > 2 ? <span className="a-tiny a-muted" style={{ fontSize: 9 }}>+{list.length - 2}</span> : null}
                </div>
              );
            })}
          </div>
          <div className="a-row a-wrap" style={{ marginTop: 8, gap: 10 }}>
            {legend.map((item) => (
              <span key={item.tone} className="a-tiny a-muted a-row" style={{ gap: 4 }}>
                <span className={`a-ev e-${item.tone}`} style={{ width: 10, height: 10, padding: 0 }} />
                {item.label}
              </span>
            ))}
          </div>
          <section className="a-sec">
            <div className="a-sec-h">
              <h3>{fmt(selected, intl, { weekday: "short", day: "numeric", month: "short" })}</h3>
            </div>
            <ul className="a-card a-list">
              {dayEvents.length ? (
                dayEvents.map((event) => row(event))
              ) : (
                <li className="a-li">
                  <span className="a-t">
                    <small>{labels.nothing}</small>
                  </span>
                  {canAdd ? (
                    <button type="button" className="a-link" onClick={() => openSheet("addevent")}>
                      <AppIcon name="plus" />
                      {labels.add}
                    </button>
                  ) : null}
                </li>
              )}
            </ul>
          </section>
          {undated.length ? (
            <section className="a-sec">
              <p className="a-hint" style={{ marginTop: 0, marginBottom: 10 }}>
                <AppIcon name="clock" />
                <span>{labels.datesLater}</span>
              </p>
              <ul className="a-card a-list">{undated.map((event) => row(event))}</ul>
            </section>
          ) : null}
        </>
      ) : (
        <ul className="a-card a-list">{events.map((event) => row(event, true))}</ul>
      )}

      {open ? (
        <div className="a-dim" onClick={(event) => event.target === event.currentTarget && setOpen(null)}>
          <div className="a-sheet" role="dialog" aria-modal="true" aria-label={open.title}>
            <div className="a-grip" />
            <div className="a-sh">
              <h3>{open.title}</h3>
              <button type="button" className="a-x" onClick={() => setOpen(null)} aria-label={labels.close}>
                <AppIcon name="x" />
              </button>
            </div>
            <ul className="a-card a-list">
              <li className="a-li">
                <span className="a-chip c-violet">
                  <AppIcon name="clock" />
                </span>
                <span className="a-t">
                  <b>
                    {open.date ? fmt(open.date, intl, { weekday: "long", day: "numeric", month: "long" }) : open.status}
                    {open.time ? ` · ${open.time}` : ""}
                  </b>
                  <small>{open.sourceLabel}</small>
                </span>
              </li>
              {open.where || open.with ? (
                <li className="a-li">
                  <span className="a-chip c-teal">
                    <AppIcon name="pin" />
                  </span>
                  <span className="a-t">
                    <b>{open.where ?? open.with}</b>
                    {open.where && open.with ? <small>{open.with}</small> : null}
                  </span>
                </li>
              ) : null}
              {open.bring ? (
                <li className="a-li">
                  <span className="a-chip c-amber">
                    <AppIcon name="case" />
                  </span>
                  <span className="a-t">
                    <b>{labels.bring}</b>
                    <small>{open.bring}</small>
                  </span>
                </li>
              ) : null}
            </ul>
            <div className="a-actions" style={{ marginTop: 12 }}>
              {open.date ? (
                <a className="a-btn a-btn-t" href={googleLink(open)} target="_blank" rel="noopener noreferrer">
                  <AppIcon name="calendar" />
                  {labels.phone}
                </a>
              ) : (
                <span />
              )}
              {open.where ? (
                <a className="a-btn a-btn-t" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(open.where)}`} target="_blank" rel="noopener noreferrer">
                  <AppIcon name="nav" />
                  {labels.directions}
                </a>
              ) : (
                <span />
              )}
              <button type="button" className="a-btn a-btn-s" onClick={() => openSheet("ask")}>
                <AppIcon name="edit" />
                {labels.change}
              </button>
            </div>
            <form action={eventNoteAction}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="reference" value={reference} />
              <input type="hidden" name="section" value="calendar" />
              <input type="hidden" name="id" value={open.id} />
              <label className="a-field">
                <span>{labels.myNote}</span>
                <textarea className="a-input" name="note" defaultValue={notes[open.id] ?? ""} placeholder={labels.notePlaceholder} maxLength={500} />
              </label>
              <button className="a-btn a-btn-s a-w" style={{ marginTop: 8 }}>
                <AppIcon name="check" />
                {labels.save}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** Adds the entry to the phone's own calendar (Google Calendar's add link works on every phone). */
function googleLink(event: CalEvent) {
  const day = event.date!.replace(/-/g, "");
  const [h, m] = (event.time ?? "09:00").split(":").map(Number);
  const pad = (value: number) => String(value).padStart(2, "0");
  const startStamp = event.time ? `${day}T${pad(h)}${pad(m)}00` : day;
  const nextDay = new Date(Date.parse(`${event.date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10).replace(/-/g, "");
  const end = event.time ? `${day}T${pad(Math.min(23, h + 1))}${pad(m)}00` : nextDay;
  const params = new URLSearchParams({ action: "TEMPLATE", text: event.title, dates: `${startStamp}/${end}`, ctz: "Asia/Kolkata", details: [event.with, event.bring].filter(Boolean).join("\n"), location: event.where ?? "" });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
