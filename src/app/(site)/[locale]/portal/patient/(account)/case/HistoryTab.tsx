import { CASE_TABS } from "@/components/patient-app/AppShell";
import { Panel, PortalFrame, PortalHeading } from "@/components/portal/PortalFrame";
import { PortalIcon } from "@/components/portal/PortalIcon";
import { PORTAL_COPY } from "@/lib/portal-patient-copy";
import { portalPage, type PortalPageProps } from "@/lib/patient-portal-page";
import { caseHistory, languageName, type HistoryEvent } from "@/lib/patient-portal";
import { t } from "@/lib/localize";

const ICON: Record<HistoryEvent["kind"], string> = {
  created: "overview",
  reports: "reports",
  planned: "plan",
  replan: "plan",
  change: "plan",
  note: "help",
  call: "schedule",
  confirmed: "check",
};

export async function HistoryTab(props: PortalPageProps) {
  const { locale, content, data } = await portalPage(props);
  const record = data.active;
  if (!record) return <PortalFrame content={content} locale={locale} data={data} section="history" tabs={CASE_TABS("history")}>{null}</PortalFrame>;

  const events = caseHistory(record);

  return (
    <PortalFrame content={content} locale={locale} data={data} section="history" tabs={CASE_TABS("history")}>
      <PortalHeading title={t(PORTAL_COPY.historyTitle, locale)} lead={t(PORTAL_COPY.historyLead, locale)} />
      <Panel>
        <ol className="relative flex flex-col gap-6 before:absolute before:bottom-2 before:left-[1.35rem] before:top-2 before:w-0.5 before:bg-[#e6e3f4]">
          {events.map((event, index) => (
            <li key={`${event.at}-${index}`} className="relative grid grid-cols-[2.75rem_minmax(0,1fr)] gap-4">
              <span
                className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full ${
                  index === 0 ? "bg-violet text-white" : "bg-violet-soft text-violet"
                }`}
              >
                <PortalIcon name={ICON[event.kind]} />
              </span>
              <div className="min-w-0 pt-1">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-bold text-navy">{t(PORTAL_COPY.historyEvents[event.kind], locale)}</span>
                  <time dateTime={event.at} className="text-sm text-slate">
                    {new Date(event.at).toLocaleString(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {event.via ? ` · ${t(PORTAL_COPY.via[event.via], locale)}` : ""}
                  </time>
                </p>
                {event.appointment ? (
                  <p className="mt-1 text-[15px] leading-relaxed text-[#2c3a5e]">
                    {t(PORTAL_COPY.kinds[event.appointment.kind], locale)} ·{" "}
                    {new Date(`${event.appointment.date}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "long" })},{" "}
                    {t(PORTAL_COPY.windows[event.appointment.window], locale)} · {languageName(event.appointment.language)} —{" "}
                    {t(PORTAL_COPY.callStatus[event.appointment.status], locale)}
                  </p>
                ) : event.detail ? (
                  <p className="mt-1 break-words text-[15px] leading-relaxed text-[#2c3a5e]">{event.detail}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </PortalFrame>
  );
}
