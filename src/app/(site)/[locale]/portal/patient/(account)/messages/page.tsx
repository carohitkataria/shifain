import { AppShell, Hidden, MESSAGE_TABS } from "@/components/patient-app/AppShell";
import { AppIcon } from "@/components/patient-app/AppIcon";
import { fmtDay } from "@/components/patient-app/view";
import { APP } from "@/lib/patient-app-copy";
import { loadApp, type AppProps } from "@/lib/patient-app";
import { t } from "@/lib/localize";
import { messageAction } from "../../app-actions";
import { AlertsTab } from "./AlertsTab";
import { CallsTab } from "./CallsTab";

export const dynamic = "force-dynamic";

/** Messages, in three tabs: the chat with the care team, calls, and alerts. */
export default async function MessagesPage(props: AppProps) {
  const { tab } = await props.searchParams;
  if (tab === "calls") return CallsTab(props);
  if (tab === "alerts") return AlertsTab(props);
  return Chats(props);
}

/** The thread with the care team. The coordinator answers from their desk; replies land here. */
async function Chats(props: AppProps) {
  const app = await loadApp(props);
  const { locale, record, ctx } = app;
  const messages = ctx?.messages ?? [];

  return (
    <AppShell app={app} section="messages" tabs={MESSAGE_TABS("chats")}>
      {record ? (
        <>
          <div className="a-bubbles">
            {messages.length === 0 ? <p className="a-hint" style={{ marginTop: 0 }}><AppIcon name="chat" /><span>{t(APP.messagesEmpty, locale)}</span></p> : null}
            {messages.map((message) => (
              <div key={message._id} className={`a-bub ${message.direction === "inbound" ? "me" : "them"}`}>
                {message.text}
                <small>
                  {message.direction === "outbound" ? `${message.senderName} · ` : (message.metadata as { to?: string } | null)?.to ? `→ ${t(APP.messageTo[(message.metadata as { to: "coordinator" | "doctor" | "hotel" }).to] ?? APP.messageTo.coordinator, locale)} · ` : ""}
                  {fmtDay(message.createdAt, locale)} {new Date(message.createdAt).toISOString().slice(11, 16)}
                </small>
              </div>
            ))}
          </div>
          <form action={messageAction} className="a-sec">
            <Hidden app={app} section="messages" />
            <div className="a-g3">
              {(["doctor", "coordinator", "hotel"] as const).map((to) => (
                <label key={to} className="a-ch">
                  <input type="radio" name="to" value={to} defaultChecked={to === (app.query.to === "doctor" || app.query.to === "hotel" ? app.query.to : "coordinator")} />
                  <AppIcon name={to === "doctor" ? "stethoscope" : to === "hotel" ? "bed" : "user"} />
                  {t(APP.messageTo[to], locale)}
                </label>
              ))}
            </div>
            <div className="a-row" style={{ marginTop: 10, alignItems: "flex-end" }}>
              <textarea className="a-input" name="text" required maxLength={2000} placeholder={t(APP.writeHere, locale)} style={{ minHeight: 48 }} />
              <button className="a-ibtn" style={{ background: "var(--primary)", color: "#fff", borderColor: "var(--primary)" }} aria-label={t(APP.send, locale)}>
                <AppIcon name="send" />
              </button>
            </div>
          </form>
        </>
      ) : (
        <p className="a-card a-pad">{t(APP.noCase, locale)}</p>
      )}
    </AppShell>
  );
}
