import Link from "next/link";
import { AppIcon } from "./AppIcon";
import { href } from "./AppShell";
import { eventTitle, fmtDay, tileTone, tileValue, todoView } from "./view";
import { APP } from "@/lib/patient-app-copy";
import { t } from "@/lib/localize";
import type { AppData } from "@/lib/patient-app";
import type { CalendarEvent, TodoItem } from "@/lib/journey-rules";

/** One open item. A car shows how far along it is. */
export function TodoRow({ item, app }: { item: TodoItem; app: AppData }) {
  const view = todoView(item, app);
  return (
    <li>
      <Link href={href(app, view.to)} className="a-li a-tap">
        <span className={`a-chip ${view.tone}`}>
          <AppIcon name={view.icon} />
        </span>
        <span className="a-t">
          <b>{view.title}</b>
          {view.sub ? <small>{view.sub}</small> : null}
          {view.step != null ? (
            <span className="a-progress" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((index) => (
                <span key={index} className={index <= view.step! ? "on" : ""} />
              ))}
            </span>
          ) : null}
        </span>
        <AppIcon name="right" />
      </Link>
    </li>
  );
}

/** The nine elements of the plan, three to a row. */
export function PlanGrid({ app }: { app: AppData }) {
  return (
    <div className="a-g3">
      {app.tiles.map((tile) => (
        <Link key={tile.key} href={href(app, tile.key === "balance" ? "payments" : tile.key === "hotel" || tile.key === "pickup" || tile.key === "flights" ? "stay" : tile.key === "visa" ? "documents" : "case")} className="a-st a-tap">
          <span className={`a-chip ${tileTone(tile.status)}`}>
            <AppIcon name={tile.icon} />
          </span>
          {t(APP.tiles[tile.key as keyof typeof APP.tiles], app.locale)}
          <em className={`t-${tile.status}`}>{tileValue(tile, app)}</em>
        </Link>
      ))}
    </div>
  );
}

export function EventRow({ event, app, withDate, onOpen }: { event: CalendarEvent; app: AppData; withDate?: boolean; onOpen?: string }) {
  return (
    <li>
      <Link href={onOpen ?? href(app, "calendar", `day=${event.date ?? ""}&e=${event.id}`)} className="a-li a-tap">
        <span className={`a-barl e-${event.tone}`} />
        <span className="a-time">
          {withDate && event.date ? (
            <>
              {fmtDay(event.date, app.locale)}
              <br />
            </>
          ) : null}
          {event.time ?? (event.source === "plan" ? event.status : "")}
        </span>
        <span className="a-t">
          <b>{eventTitle(event, app.locale)}</b>
          <small>{event.where ?? event.with ?? t(APP.sources[event.source], app.locale)}</small>
        </span>
        <AppIcon name="right" />
      </Link>
    </li>
  );
}
