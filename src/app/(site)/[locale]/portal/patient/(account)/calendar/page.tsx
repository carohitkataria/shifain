import { AppShell } from "@/components/patient-app/AppShell";
import { AppIcon } from "@/components/patient-app/AppIcon";
import { OpenSheet } from "@/components/patient-app/client";
import { AddEventSheet, AskSheet } from "@/components/patient-app/sheets";
import { CalendarView } from "@/components/patient-app/CalendarView";
import { eventTitle } from "@/components/patient-app/view";
import { APP } from "@/lib/patient-app-copy";
import { loadApp, type AppProps } from "@/lib/patient-app";
import { arrivalDate, isIsoDate, nextEvent } from "@/lib/journey-rules";
import { canSee } from "@/lib/patient-portal";
import { t } from "@/lib/localize";

export const dynamic = "force-dynamic";

/** The calendar the plan creates: booked items, calls, visits, cars, the plan's days and the patient's own. */
export default async function CalendarPage(props: AppProps & { searchParams: Promise<{ e?: string }> }) {
  const app = await loadApp(props);
  const { locale, record, today, portal } = app;
  const query = (await props.searchParams) as { day?: string; e?: string };
  if (!record || !canSee(portal.viewer, "calendar")) {
    return (
      <AppShell app={app} section="calendar">
        <p className="a-card a-pad">{t(APP.noCase, locale)}</p>
      </AppShell>
    );
  }
  const next = nextEvent(app.events, today);
  const initialDay = isIsoDate(query.day) ? query.day : next?.date ?? arrivalDate(record) ?? today;
  const isPatient = portal.viewer?.role === "patient";

  return (
    <AppShell
      app={app}
      section="calendar"
      sheets={
        <>
          {isPatient ? <AddEventSheet app={app} section="calendar" /> : null}
          <AskSheet app={app} section="messages" />
        </>
      }
    >
      <CalendarView
        events={app.events.map((event) => ({
          id: event.id,
          date: event.date,
          time: event.time,
          title: eventTitle(event, locale),
          where: event.where,
          with: event.with,
          bring: event.bring,
          tone: event.tone,
          sourceLabel: t(APP.sources[event.source], locale),
          status: event.status,
        }))}
        notes={record.eventNotes ?? {}}
        today={today}
        initialDay={initialDay}
        initialEvent={query.e ?? null}
        locale={locale}
        reference={record._id}
        canAdd={isPatient}
        legend={[
          { tone: "violet", label: t(APP.legend.hospital, locale) },
          { tone: "sky", label: t(APP.legend.travel, locale) },
          { tone: "teal", label: t(APP.legend.plan, locale) },
          { tone: "amber", label: t(APP.legend.mine, locale) },
        ]}
        labels={{
          month: t(APP.month, locale),
          agenda: t(APP.agenda, locale),
          nothing: t(APP.nothingPlanned, locale),
          add: t(APP.add, locale),
          bring: t(APP.bring, locale),
          myNote: t(APP.myNote, locale),
          notePlaceholder: t(APP.notePlaceholder, locale),
          save: t(APP.save, locale),
          directions: t(APP.directions, locale),
          phone: t(APP.phoneCal, locale),
          change: t(APP.change, locale),
          datesLater: t(APP.datesLater, locale),
          close: t(APP.close, locale),
        }}
      />
      <p className="a-hint">
        <AppIcon name="swap" />
        <span>{t(APP.syncedHint, locale)}</span>
      </p>
      {isPatient ? (
        <OpenSheet id="addevent" className="a-btn a-btn-p a-w" style={{ marginTop: 12 }}>
          <AppIcon name="plus" />
          {t(APP.addToCalendar, locale)}
        </OpenSheet>
      ) : null}
    </AppShell>
  );
}
