import { APP } from "@/lib/patient-app-copy";
import { t } from "@/lib/localize";
import { balanceDue, rideStep, type CalendarEvent, type PlanTile, type RideStatus, type TodoItem } from "@/lib/journey-rules";
import type { AppData } from "@/lib/patient-app";
import type { Locale } from "@/lib/i18n";

/** "4 Nov" in the reader's language. */
export const fmtDay = (iso: string | null | undefined, locale: Locale, withWeekday = false) =>
  iso
    ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(locale === "en" ? "en-GB" : locale, {
        day: "numeric",
        month: "short",
        ...(withWeekday ? { weekday: "short" } : {}),
      })
    : "";

export const money = (amount: number, currency: string) =>
  `${currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "INR" ? "₹" : `${currency} `}${Math.round(amount).toLocaleString("en-US")}`;

const DOC_LABEL = (key: string, locale: Locale) => t(APP.docs[key as keyof typeof APP.docs] ?? APP.docs.passport, locale);

export type TodoView = { icon: string; tone: string; title: string; sub: string | null; to: string; step?: number; done?: boolean };

/** How one open item reads on the home screen and the to-do list. */
export function todoView(item: TodoItem, app: AppData): TodoView {
  const { locale } = app;
  const to = item.section === "case" ? "case" : item.section;
  switch (item.kind) {
    case "task":
      return { icon: item.owner === "desk" ? "clock" : "edit", tone: item.owner === "desk" ? "c-off" : "c-rose", title: item.title, sub: item.sub ? (/^\d{4}-\d{2}-\d{2}$/.test(item.sub) ? fmtDay(item.sub, locale) : item.sub) : null, to };
    case "document":
      return item.owner === "patient"
        ? { icon: "upload", tone: "c-teal", title: `${t(APP.todoKinds.document, locale)} · ${DOC_LABEL(item.title, locale)}`, sub: item.sub, to }
        : { icon: "clock", tone: "c-off", title: DOC_LABEL(item.title, locale), sub: t(APP.todoKinds["document-review"], locale), to };
    case "family-passport":
      return { icon: "passport", tone: "c-amber", title: `${t(APP.todoKinds["family-passport"], locale)} · ${item.title}`, sub: null, to };
    case "missing-report":
      return { icon: "file", tone: "c-teal", title: t(APP.todoKinds["missing-report"], locale), sub: item.title, to };
    case "ride": {
      const status = (item.sub ?? "requested") as RideStatus;
      return {
        icon: "car",
        tone: "c-sky",
        title: `${t(APP.ride, locale)} ${t(APP.rideTo[item.title as keyof typeof APP.rideTo] ?? APP.rideTo.other, locale)}`,
        sub: t(APP.rideStatus[status], locale),
        to,
        step: rideStep(status),
      };
    }
    case "call":
      return { icon: "phone", tone: "c-off", title: t(APP.todoKinds.call, locale), sub: fmtDay(item.sub, locale), to };
    case "doctor-change":
      return { icon: "swapdoc", tone: "c-off", title: t(APP.todoKinds["doctor-change"], locale), sub: t(APP.todoKinds.waiting, locale), to };
    case "balance":
      return { icon: "wallet", tone: "c-amber", title: t(APP.todoKinds.balance, locale), sub: `${money(Number(item.title), app.record?.billing?.currency ?? "USD")}${item.sub ? ` · ${item.sub}` : ""}`, to };
  }
}

export const tileTone = (status: PlanTile["status"]) => (status === "ok" ? "c-green" : status === "due" ? "c-amber" : status === "sch" ? "c-violet" : "c-off");

/** The short word under a plan tile: a date, a name, an amount, or the status. */
export function tileValue(tile: PlanTile, app: AppData): string {
  const { locale } = app;
  if (tile.status === "off") return t(APP.tileStatus.off, locale);
  if (!tile.value) return t(APP.tileStatus[tile.status], locale);
  if (/^\d{4}-\d{2}-\d{2}$/.test(tile.value)) return fmtDay(tile.value, locale);
  if (tile.key === "balance") return money(Number(tile.value), app.record?.billing?.currency ?? "USD");
  if (tile.key === "visa") return t(APP.docStatus[tile.value as keyof typeof APP.docStatus] ?? APP.tileStatus[tile.status], locale);
  return tile.value.split(" ")[0];
}

/** An entry's title in the reader's language where it is one of ours (a call, a car); the desk's own words otherwise. */
export function eventTitle(event: CalendarEvent, locale: Locale): string {
  if (event.source === "call") return `${t(APP.sources.call, locale)} · ${event.title}`;
  if (event.source === "ride") return `${t(APP.ride, locale)} ${t(APP.rideTo[event.title as keyof typeof APP.rideTo] ?? APP.rideTo.other, locale)}`;
  return event.title;
}

export const balanceOf = (app: AppData) => balanceDue(app.record?.billing);
