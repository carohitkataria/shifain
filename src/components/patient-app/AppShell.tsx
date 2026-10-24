import Link from "next/link";
import { AppIcon } from "./AppIcon";
import { HelpButton, OpenSheet, Sheet, ShareLocation, Toast } from "./client";
import { Logo } from "@/components/Logo";
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
  password: APP.password.saved,
  missing: l("A detail was missing — try again", "Не хватает данных — попробуйте ещё раз", "Ma'lumot yetishmadi — qayta urinib ko'ring"),
};

/** The hidden fields every app form posts: language, case and the screen to come back to. */
export function Hidden({ app, section, tab }: { app: AppData; section: Section | ""; /** The tab of that screen to come back to. */ tab?: string }) {
  return (
    <>
      <input type="hidden" name="locale" value={app.locale} />
      <input type="hidden" name="reference" value={app.record?._id ?? ""} />
      <input type="hidden" name="section" value={section === "home" ? "" : section} />
      {tab ? <input type="hidden" name="tab" value={tab} /> : null}
    </>
  );
}

/** Pages that became tabs of another screen: old names still work everywhere a link is built. */
const MOVED: Record<string, [string, string]> = {
  plan: ["case", "tab=plan"],
  history: ["case", "tab=history"],
  documents: ["stay", "tab=documents"],
  notifications: ["messages", "tab=alerts"],
  schedule: ["messages", "tab=calls"],
};

/**
 * What the case is about, in the patient's language: the planned treatment, else the
 * specialty they picked on the form (stored as its slug, "cardiac-care"), else their own words.
 */
export function caseNeed(app: AppData): string | null {
  const stated = app.record?.statedNeed ?? null;
  if (app.names.treatment) return app.names.treatment;
  const specialty = stated ? app.content.specialties.items.find((item) => item.slug === stated) : null;
  return specialty ? t(specialty.title, app.locale) : stated;
}

/** A link to another app screen that keeps the chosen case. */
export const href = (app: AppData, to: string, more = "") => {
  const moved = MOVED[to];
  const section = moved ? moved[0] : to;
  const extra = moved ? [moved[1], more].filter(Boolean).join("&") : more;
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
/** Tabs across the top of a screen that holds several pages (My case, Messages, Travel & stay). */
export type TabSpec = { path: string; current: string; items: { key: string; label: L }[] };

export const CASE_TABS = (current: string): TabSpec => ({
  path: "case",
  current,
  items: [
    { key: "overview", label: APP.tabs.overview },
    { key: "plan", label: APP.tabs.plan },
    { key: "history", label: APP.tabs.history },
  ],
});
export const MESSAGE_TABS = (current: string): TabSpec => ({
  path: "messages",
  current,
  items: [
    { key: "chats", label: APP.tabs.chats },
    { key: "calls", label: APP.tabs.calls },
    { key: "alerts", label: APP.tabs.alerts },
  ],
});
export const STAY_TABS = (current: string): TabSpec => ({
  path: "stay",
  current,
  items: [
    { key: "documents", label: APP.tabs.documents },
    { key: "flights", label: APP.tabs.flights },
    { key: "hotel", label: APP.tabs.hotel },
    { key: "car", label: APP.tabs.car },
    { key: "nearby", label: APP.tabs.nearby },
  ],
});

export function AppTabs({ app, tabs }: { app: AppData; tabs: TabSpec }) {
  return (
    <nav className="a-tabs" aria-label={t(APP.titles[tabs.path as Section] ?? APP.nav.more, app.locale)}>
      {tabs.items.map((item) => (
        <Link key={item.key} href={href(app, tabs.path, `tab=${item.key}`)} aria-current={tabs.current === item.key ? "page" : undefined}>
          {t(item.label, app.locale)}
        </Link>
      ))}
    </nav>
  );
}

export function AppShell({ app, section, title, children, sheets, tabs, wide = false, fill = false }: { app: AppData; section: Section; title?: string; children: React.ReactNode; sheets?: React.ReactNode; tabs?: TabSpec; wide?: boolean; /** The screen fills the window and scrolls inside itself (the translator). */ fill?: boolean }) {
  const { locale, record, ctx, portal } = app;
  const account = portal.account;
  const name = (account ? [account.firstName, account.lastName].filter(Boolean).join(" ") : "") || (record?.patient.name && record.patient.name !== "Website patient" ? record.patient.name : "") || "Shifain";
  const viewerName = portal.viewer?.role === "family" ? portal.viewer.member.name : name;
  const home = section === "home";
  const heading = title ?? t(APP.titles[section], locale);
  const need = caseNeed(app);
  const sub = record ? `${t(APP.caseShort, locale)} …${record._id.slice(-4)}${home && need ? ` · ${need}` : ""}` : "";
  const done = app.query.done ? DONE[app.query.done] ?? APP.saved : null;
  const emergency = ctx?.hospital?.emergencyPhone || ctx?.hospital?.phone || null;
  const nav: { key: Section; icon: string; label: L }[] = [
    { key: "home", icon: "home", label: APP.nav.home },
    { key: "case", icon: "case", label: APP.nav.case },
  ];

  // On a computer the bottom bar and the More sheet become this sidebar: every screen one click away.
  // Ten places in three groups, then Settings and Help; the More sheet on a phone lists the same.
  const side: { key: Section; icon: string; label: L; path?: string }[][] = [
    [
      { key: "home", icon: "home", label: APP.nav.home },
      { key: "tasks", icon: "alert", label: APP.quickTiles.tasks },
      { key: "calendar", icon: "calendar", label: APP.nav.calendar },
      { key: "messages", icon: "chat", label: APP.quickTiles.messages },
      { key: "translate", icon: "translate", label: APP.nav.translate, path: "translator" },
    ],
    [
      { key: "case", icon: "case", label: APP.nav.case },
      { key: "reports", icon: "file", label: APP.quickTiles.reports },
      { key: "payments", icon: "wallet", label: APP.quickTiles.payments },
    ],
    [
      { key: "stay", icon: "plane", label: APP.quickTiles.stay },
      { key: "family", icon: "family", label: APP.quickTiles.family },
      { key: "companions", icon: "users", label: APP.quickTiles.companions },
    ],
  ];
  const footer: { key: Section; icon: string; label: L }[] = [
    { key: "settings", icon: "gear", label: APP.quickTiles.settings },
    { key: "help", icon: "chat", label: APP.quickTiles.help },
  ];
  const link = (item: { key: Section; icon: string; label: L; path?: string }) => (
    <li key={item.key}>
      <Link href={href(app, item.path ?? item.key)} className="a-side-link" aria-current={section === item.key ? "page" : undefined}>
        <AppIcon name={item.icon} />
        <span>{t(item.label, locale)}</span>
        {item.key === "messages" && app.unread ? <span className="a-bdg">{app.unread > 9 ? "9+" : app.unread}</span> : null}
        {item.key === "tasks" && app.todo.length ? <span className="a-bdg">{app.todo.length}</span> : null}
      </Link>
    </li>
  );

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
      <aside className="a-side" aria-label="Menu">
        <Link href={`/${locale}`} className="a-side-logo" aria-label="Shifain">
          <Logo compact />
        </Link>
        {side.map((group, index) => (
          <ul key={index} className="a-side-list">
            {group.map(link)}
          </ul>
        ))}
        <ul className="a-side-list a-side-foot">{footer.map(link)}</ul>
      </aside>

      <header className="a-top">
        {home ? null : (
          <Link href={href(app, "home")} className="a-ibtn a-back" aria-label={t(APP.back, locale)}>
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
        <Link href={href(app, "messages", "tab=alerts")} className="a-ibtn" aria-label={`${t(APP.bell, locale)}${app.unread ? ` · ${app.unread}` : ""}`}>
          <AppIcon name="bell" />
          {app.unread ? <span className="a-dot">{app.unread > 9 ? "9+" : app.unread}</span> : null}
        </Link>
      </header>

      <main className={`a-scroll ${fill ? "a-fill" : ""}`} id="main">
        {portal.viewer?.role === "family" ? (
          <p className="a-hint" style={{ marginTop: 0, marginBottom: 12 }}>
            <AppIcon name="family" />
            <span>
              {t(APP.familyView, locale)} · {record?.patient.name}
            </span>
          </p>
        ) : null}
        <div className={`a-page ${wide ? "a-page-wide" : ""}`}>
          {tabs ? <AppTabs app={app} tabs={tabs} /> : null}
          {children}
        </div>
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
          {tile("tasks", "alert", APP.quickTiles.tasks, href(app, "tasks"))}
          {tile("messages", "chat", APP.quickTiles.messages, href(app, "messages"))}
          {tile("reports", "file", APP.quickTiles.reports, href(app, "reports"))}
          {tile("payments", "wallet", APP.quickTiles.payments, href(app, "payments"))}
          {tile("stay", "plane", APP.quickTiles.stay, href(app, "stay"))}
          {tile("family", "family", APP.quickTiles.family, href(app, "family"))}
          {tile("companions", "users", APP.quickTiles.companions, href(app, "companions"))}
          {tile("settings", "gear", APP.quickTiles.settings, href(app, "settings"))}
          {tile("help", "chat", APP.quickTiles.help, href(app, "help"))}
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
