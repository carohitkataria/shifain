import Link from "next/link";
import { cookies } from "next/headers";
import { AppShell, href } from "@/components/patient-app/AppShell";
import { AppIcon } from "@/components/patient-app/AppIcon";
import { MarkSeen } from "@/components/patient-app/client";
import { fmtDay, money } from "@/components/patient-app/view";
import { APP } from "@/lib/patient-app-copy";
import { SEEN_COOKIE, loadApp, type AppProps } from "@/lib/patient-app";
import { t } from "@/lib/localize";

export const dynamic = "force-dynamic";

const ICON: Record<string, [string, string]> = {
  journey: ["calendar", "c-violet"],
  ride: ["car", "c-sky"],
  task: ["edit", "c-rose"],
  payment: ["wallet", "c-amber"],
  doc: ["shield", "c-green"],
  call: ["phone", "c-violet"],
  change: ["swapdoc", "c-violet"],
  message: ["chat", "c-teal"],
};

/** What changed on the case, newest first; opening this marks it read on this device. */
export default async function NotificationsPage(props: AppProps) {
  const app = await loadApp(props);
  const { locale, record } = app;
  const seen = (await cookies()).get(SEEN_COOKIE)?.value ?? "";
  const onlyUnread = app.query.f === "unread";
  const items = app.feed.filter((item) => !onlyUnread || item.at > seen).slice(0, 60);

  const title = (kind: string, raw: string, sub: string | null) => {
    if (kind.startsWith("ride-")) return `${t(APP.feed[kind] ?? APP.feed.task, locale)} · ${t(APP.rideTo[raw as keyof typeof APP.rideTo] ?? APP.rideTo.other, locale)}`;
    if (kind.startsWith("doc-")) return `${t(APP.feed[kind] ?? APP.feed["doc-optional"], locale)} · ${t(APP.docs[raw as keyof typeof APP.docs] ?? APP.docs.passport, locale)}`;
    if (kind === "payment") return `${t(APP.feed.payment, locale)} · ${money(Number(raw), sub ?? "USD")}`;
    if (kind.startsWith("change-")) return t(APP.feed[kind], locale);
    if (kind.startsWith("call-")) return t(APP.feed[kind], locale);
    if (kind === "message") return t(APP.feed.message, locale);
    return `${t(APP.feed[kind] ?? APP.feed.task, locale)} · ${raw}`;
  };

  return (
    <AppShell app={app} section="notifications">
      <MarkSeen />
      <div className="a-chips">
        <Link href={href(app, "notifications")} className="a-fchip" aria-current={!onlyUnread ? "page" : undefined}>
          {t(APP.all, locale)}
        </Link>
        <Link href={href(app, "notifications", "f=unread")} className="a-fchip" aria-current={onlyUnread ? "page" : undefined}>
          {t(APP.unread, locale)} · {app.unread}
        </Link>
      </div>
      <ul className="a-card a-list" style={{ marginTop: 12 }}>
        {!record || items.length === 0 ? (
          <li className="a-li">
            <span className="a-t">
              <small>{t(APP.noNotifications, locale)}</small>
            </span>
          </li>
        ) : null}
        {items.map((item) => {
          const [icon, tone] = ICON[item.kind.split("-")[0]] ?? ICON.task;
          const when = new Date(item.at);
          return (
            <li key={item.id}>
              <Link href={href(app, item.section === "case" ? "case" : item.section)} className="a-li a-tap">
                <span className={`a-chip ${tone}`}>
                  <AppIcon name={icon} />
                </span>
                <span className="a-t">
                  <b>{title(item.kind, item.title, item.sub)}</b>
                  <small>
                    {item.kind === "message" ? `“${item.title}” · ` : item.sub && /^\d{4}-\d{2}-\d{2}/.test(item.sub) ? `${fmtDay(item.sub, locale)} · ` : ""}
                    {fmtDay(item.at, locale)} {when.toISOString().slice(11, 16)}
                  </small>
                </span>
                {item.at > seen ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--rose)", flex: "none" }} aria-label={t(APP.unread, locale)} /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
