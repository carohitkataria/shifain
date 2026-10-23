import Link from "next/link";
import { AppIcon } from "./AppIcon";
import { HelpButton, OpenSheet, Sheet, ShareLocation, Toast } from "./client";
import { APP } from "@/lib/patient-app-copy";
import { initials, telHref, type AppData } from "@/lib/patient-app";
import { t } from "@/lib/localize";
import type { L } from "@/lib/content-types";

export type Section =
  | "home"
  | "case"
  | "calendar"
  | "reports"
  | "stay"
  | "companions"
  | "family"
  | "payments"
  | "documents"
  | "notifications"
  | "settings"
  | "tasks"
  | "messages"
  | "translate"
  | "plan"
  | "schedule"
  | "history"
  | "help"
  | "new";

const l = (en: string, ru: string, uz: string): L => ({ en, ru, uz });
const DONE: Record<string, L> = {
  saved: APP.saved,
  sent: APP.sent,
  booked: APP.booked,
  taken: APP.slotTaken,
  ride: l("Car requested — you can follow it here", "Машина вызвана — следите за ней здесь", "Mashina chaqirildi — shu yerda kuzating"),
  cancelled: l("Cancelled", "Отменено", "Bekor qilindi"),
  change: APP.changeRequested,
  removed: l("Removed", "Удалено", "O'chirildi"),
  uploaded: l("Uploaded — your coordinator checks it", "Загружено — координатор проверит", "Yuklandi — koordinator tekshiradi"),
  "upload-failed": l("Nothing uploaded — PDF or photo, up to 14 MB", "Ничего не загружено — PDF или фото до 14 МБ", "Hech narsa yuklanmadi — PDF yoki rasm, 14 MB gacha"),
  pay: APP.payRequested,
  hello: APP.saidHi,
  missing: l("A detail was missing — try again", "Не хватает данных — попробуйте ещё раз", "Ma'lumot yetishmadi — qayta urinib ko'ring"),
};

/** The hidden fields every app form posts: language, case and the screen to come back to. */
export function Hidden({ app, section }: { app: AppData; section: Section | "" }) {
  return (
    <>
      <input type="hidden" name="locale" value={app.locale} />
      <input type="hidden" name="reference" value={app.record?._id ?? ""} />
      <input type="hidden" name="section" value={section === "home" ? "" : section} />
    </>
  );
}

/** A link to another app screen that keeps the chosen case. */
export const href = (app: AppData, section: string, extra = "") => {
  const base = `/${app.locale}/portal/patient${section && section !== "home" ? `/${section}` : ""}`;
  const params = new URLSearchParams();
  if (app.record && app.portal.cases.length > 1) params.set("case", app.record._id);
  for (const [key, value] of new URLSearchParams(extra)) params.set(key, value);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
};

/**
 * The phone frame every patient screen sits in: the top bar (who, SOS, the
 * bell), the screen, the help button, and the bottom bar with the translator
 * in the middle. The More and SOS sheets live here so every screen has them.
 */
export function AppShell({ app, section, title, children, sheets }: { app: AppData; section: Section; title?: string; children: React.ReactNode; sheets?: React.ReactNode }) {
  const { locale, record, ctx, portal } = app;
  const account = portal.account;
  const name = (account ? [account.firstName, account.lastName].filter(Boolean).join(" ") : "") || (record?.patient.name && record.patient.name !== "Website patient" ? record.patient.name : "") || "Shifain";
  const viewerName = portal.viewer?.role === "family" ? portal.viewer.member.name : name;
  const home = section === "home";
  const heading = title ?? t(APP.titles[section], locale);
  const sub = record ? `${t(APP.caseShort, locale)} …${record._id.slice(-4)}${home && record.statedNeed ? ` · ${record.statedNeed}` : ""}` : "";
  const done = app.query.done ? DONE[app.query.done] ?? APP.saved : null;
  const emergency = ctx?.hospital?.emergencyPhone || ctx?.hospital?.phone || null;
  const nav: { key: Section; icon: string; label: L }[] = [
    { key: "home", icon: "home", label: APP.nav.home },
    { key: "case", icon: "case", label: APP.nav.case },
  ];

  const tile = (key: string, icon: string, label: L, to?: string, red?: boolean) =>
    to ? (
      <Link key={key} href={to} className={`a-tile ${red ? "red" : ""}`}>
        <AppIcon name={icon} />
        {t(label, locale)}
      </Link>
    ) : (
      <OpenSheet key={key} id={key} className={`a-tile ${red ? "red" : ""}`}>
        <AppIcon name={icon} />
        {t(label, locale)}
      </OpenSheet>
    );

  return (
    <div className="a-device">
      <header className="a-top">
        {home ? null : (
          <Link href={href(app, "home")} className="a-ibtn" aria-label={t(APP.back, locale)}>
            <AppIcon name="left" />
          </Link>
        )}
        <div className="a-brand">
          {home ? <span className="a-av">{initials(viewerName)}</span> : null}
          <div style={{ minWidth: 0 }}>
            <b>{home ? viewerName : heading}</b>
            {sub ? <small>{sub}</small> : null}
          </div>
        </div>
        {record ? (
          <OpenSheet id="sos" className="a-ibtn a-sos" label={t(APP.emergency, locale)}>
            <AppIcon name="phone" className="" />
            {t(APP.sos, locale)}
          </OpenSheet>
        ) : null}
        <Link href={href(app, "notifications")} className="a-ibtn" aria-label={`${t(APP.bell, locale)}${app.unread ? ` · ${app.unread}` : ""}`}>
          <AppIcon name="bell" />
          {app.unread ? <span className="a-dot">{app.unread > 9 ? "9+" : app.unread}</span> : null}
        </Link>
      </header>

      <main className="a-scroll" id="main">
        {portal.viewer?.role === "family" ? (
          <p className="a-hint" style={{ marginTop: 0, marginBottom: 12 }}>
            <AppIcon name="family" />
            <span>
              {t(APP.familyView, locale)} · {record?.patient.name}
            </span>
          </p>
        ) : null}
        {children}
      </main>

      <HelpButton label={t(APP.askAssistant, locale)} />

      <nav className="a-nav" aria-label="Main">
        {nav.map((item) => (
          <Link key={item.key} href={href(app, item.key)} className="a-nv" aria-current={section === item.key ? "page" : undefined}>
            <AppIcon name={item.icon} />
            {t(item.label, locale)}
          </Link>
        ))}
        <Link href={href(app, "translator")} className="a-cta" aria-label={t(APP.nav.translate, locale)} aria-current={section === "translate" ? "page" : undefined}>
          <AppIcon name="translate" />
        </Link>
        <Link href={href(app, "calendar")} className="a-nv" aria-current={section === "calendar" ? "page" : undefined}>
          <AppIcon name="calendar" />
          {t(APP.nav.calendar, locale)}
        </Link>
        <OpenSheet id="more" className="a-nv">
          <AppIcon name="grid" />
          {t(APP.nav.more, locale)}
        </OpenSheet>
      </nav>

      <Sheet id="more" title={t(APP.nav.more, locale)}>
        <div className="a-g3">
          {tile("reports", "file", APP.quickTiles.reports, href(app, "reports"))}
          {tile("stay", "bed", APP.quickTiles.stay, href(app, "stay"))}
          {tile("messages", "chat", APP.quickTiles.messages, href(app, "messages"))}
          {tile("companions", "users", APP.quickTiles.companions, href(app, "companions"))}
          {tile("family", "family", APP.quickTiles.family, href(app, "family"))}
          {tile("payments", "wallet", APP.quickTiles.payments, href(app, "payments"))}
          {tile("documents", "passport", APP.quickTiles.documents, href(app, "documents"))}
          {tile("tasks", "alert", APP.quickTiles.tasks, href(app, "tasks"))}
          {tile("plan", "case", APP.quickTiles.plan, href(app, "plan"))}
          {tile("notifications", "bell", APP.quickTiles.alerts, href(app, "notifications"))}
          {tile("settings", "gear", APP.quickTiles.settings, href(app, "settings"))}
          {record ? tile("sos", "phone", APP.quickTiles.emergency, undefined, true) : tile("history", "clock", APP.quickTiles.history, href(app, "history"))}
        </div>
      </Sheet>

      {record ? (
        <Sheet id="sos" title={t(APP.emergency, locale)} tone="red">
          <ul className="a-card a-list">
            {emergency ? (
              <li className="a-li">
                <span className="a-chip c-red">
                  <AppIcon name="hospital" />
                </span>
                <div className="a-t">
                  <b>
                    {ctx?.hospital?.name} · {t(APP.emergency, locale)}
                  </b>
                  <small>
                    {t(APP.allDay, locale)} · {emergency}
                  </small>
                </div>
                <a href={telHref(emergency)} className="a-btn a-btn-red" aria-label={`${t(APP.call, locale)} ${emergency}`}>
                  <AppIcon name="phone" />
                </a>
              </li>
            ) : null}
            {ctx?.coordinator ? (
              <li className="a-li">
                <span className="a-chip c-violet">
                  <AppIcon name="user" />
                </span>
                <div className="a-t">
                  <b>
                    {ctx.coordinator.name} · {t(APP.yourCoordinator, locale)}
                  </b>
                  <small>
                    {t(APP.allDay, locale)} · {t(APP.speaksYourLanguage, locale)}
                  </small>
                </div>
                {ctx.coordinator.phone ? (
                  <a href={telHref(ctx.coordinator.phone)} className="a-btn a-btn-t" aria-label={`${t(APP.call, locale)} ${ctx.coordinator.name}`}>
                    <AppIcon name="phone" />
                  </a>
                ) : null}
              </li>
            ) : null}
            <li className="a-li">
              <span className="a-chip c-amber">
                <AppIcon name="alert" />
              </span>
              <div className="a-t">
                <b>{t(APP.ambulance, locale)}</b>
                <small>{t(APP.nationalNumber, locale)}</small>
              </div>
              <a href="tel:112" className="a-btn a-btn-s">
                112
              </a>
            </li>
            {record.preferences?.homeContact ? (
              <li className="a-li">
                <span className="a-chip c-teal">
                  <AppIcon name="home" />
                </span>
                <div className="a-t">
                  <b>{record.preferences.homeContact.name}</b>
                  <small>{t(APP.homeContactShort, locale)}</small>
                </div>
                <a href={telHref(record.preferences.homeContact.phone)} className="a-btn a-btn-s" aria-label={`${t(APP.call, locale)} ${record.preferences.homeContact.name}`}>
                  <AppIcon name="phone" />
                </a>
              </li>
            ) : null}
          </ul>
          <ShareLocation label={t(APP.shareLocation, locale)} className="a-btn a-btn-s a-w" />
        </Sheet>
      ) : null}

      {sheets}
      <Toast message={done ? t(done, locale) : null} />
    </div>
  );
}

/** A heading row inside a screen. */
export function SecHead({ icon, title, action, count }: { icon: string; title: string; action?: React.ReactNode; count?: number }) {
  return (
    <div className="a-sec-h">
      <h3>
        <AppIcon name={icon} />
        {title}
        {count ? <span className="a-pill t-due">{count}</span> : null}
      </h3>
      {action}
    </div>
  );
}

export function MoreLink({ to, label }: { to: string; label: string }) {
  return (
    <Link href={to} className="a-link">
      {label}
      <AppIcon name="right" />
    </Link>
  );
}
