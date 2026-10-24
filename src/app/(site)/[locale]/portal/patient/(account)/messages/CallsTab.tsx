import { MESSAGE_TABS } from "@/components/patient-app/AppShell";
import { Notice, Panel, PortalFrame, PortalHeading } from "@/components/portal/PortalFrame";
import { PortalIcon } from "@/components/portal/PortalIcon";
import { ScheduleForm } from "@/components/portal/ScheduleForm";
import { PORTAL_COPY } from "@/lib/portal-patient-copy";
import { portalPage, type PortalPageProps } from "@/lib/patient-portal-page";
import { APPOINTMENT_KINDS, APPOINTMENT_WINDOWS, PORTAL_LANGUAGES, languageName } from "@/lib/patient-portal";
import { cancelAppointmentAction, requestAppointmentAction } from "../../portal-actions";
import { t } from "@/lib/localize";

const TONE = {
  requested: "bg-saffron-tint text-[#8a4a05]",
  confirmed: "bg-leaf-tint text-[#1f6b31]",
  declined: "bg-surface-muted text-slate",
  cancelled: "bg-surface-muted text-slate",
} as const;

export async function CallsTab(props: PortalPageProps) {
  const { locale, content, data, query } = await portalPage(props);
  const record = data.active;
  if (!record) return <PortalFrame content={content} locale={locale} data={data} section="schedule" tabs={MESSAGE_TABS("calls")}>{null}</PortalFrame>;

  const calls = [...(record.appointments ?? [])].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const defaultLanguage = PORTAL_LANGUAGES.some((item) => item.code === locale) ? locale : "en";

  return (
    <PortalFrame content={content} locale={locale} data={data} section="schedule" tabs={MESSAGE_TABS("calls")}>
      <PortalHeading title={t(PORTAL_COPY.scheduleTitle, locale)} lead={t(PORTAL_COPY.scheduleLead, locale)} />

      {query.done === "requested" ? <Notice tone="good">{t(PORTAL_COPY.requested, locale)}</Notice> : null}
      {query.error === "request" ? <Notice tone="bad">{t(PORTAL_COPY.requestFailed, locale)}</Notice> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel>
          <ScheduleForm
            action={requestAppointmentAction}
            locale={locale}
            reference={record._id}
            defaultLanguage={defaultLanguage}
            kinds={APPOINTMENT_KINDS.map((kind) => ({ value: kind, label: t(PORTAL_COPY.kinds[kind], locale) }))}
            windows={APPOINTMENT_WINDOWS.map((window) => ({ value: window, label: t(PORTAL_COPY.windows[window], locale) }))}
            languages={PORTAL_LANGUAGES.map((item) => ({ value: item.code, label: `${item.native} · ${item.name}` }))}
            labels={{
              kind: t(PORTAL_COPY.kind, locale),
              date: t(PORTAL_COPY.date, locale),
              window: t(PORTAL_COPY.window, locale),
              yourTime: t(PORTAL_COPY.yourTime, locale),
              language: t(PORTAL_COPY.language, locale),
              note: t(PORTAL_COPY.note, locale),
              submit: t(PORTAL_COPY.request, locale),
            }}
          />
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel>
            <h2 className="text-lg font-bold text-navy">{t(PORTAL_COPY.yourCalls, locale)}</h2>
            {calls.length === 0 ? (
              <p className="mt-3 text-[15px] text-slate">{t(PORTAL_COPY.callsNone, locale)}</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {calls.map((call) => (
                  <li key={call.id} className="rounded-2xl bg-surface-muted p-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${TONE[call.status]}`}>
                      {t(PORTAL_COPY.callStatus[call.status], locale)}
                    </span>
                    <p className="mt-2 font-semibold text-navy">{t(PORTAL_COPY.kinds[call.kind], locale)}</p>
                    <p className="mt-0.5 text-[15px] text-[#2c3a5e]">
                      {call.status === "confirmed" && call.confirmedSlot
                        ? call.confirmedSlot
                        : `${new Date(`${call.date}T12:00:00`).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "long" })} · ${t(PORTAL_COPY.windows[call.window], locale)} · ${call.timezone}`}
                    </p>
                    <p className="text-sm text-slate">
                      {languageName(call.language)}
                      {call.note ? ` · “${call.note}”` : ""}
                    </p>
                    {call.status === "requested" ? (
                      <form action={cancelAppointmentAction} className="mt-1">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="case" value={record._id} />
                        <input type="hidden" name="id" value={call.id} />
                        <button type="submit" className="min-h-11 text-sm font-semibold text-violet hover:underline">
                          {t(PORTAL_COPY.cancel, locale)}
                        </button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-soft text-violet">
                <PortalIcon name="plane" />
              </span>
              <h2 className="text-lg font-bold text-navy">{t(PORTAL_COPY.travelPlans, locale)}</h2>
            </div>
            <p className="mt-3 text-[15px] text-navy">{record.preferences?.travel || t(PORTAL_COPY.notSet, locale)}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate">{t(PORTAL_COPY.changeByChat, locale)}</p>
          </Panel>
        </div>
      </div>
    </PortalFrame>
  );
}
