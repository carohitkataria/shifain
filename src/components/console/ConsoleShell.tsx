import Link from "next/link";
import { headers } from "next/headers";
import { ADMIN_URL_HEADER, withDrawer } from "@/lib/console-url";
import { badges, INBOX_CHANNELS } from "@/lib/console";
import { currentActor } from "@/lib/onboarding";
import { CIcon } from "./CIcon";
import { SearchKey, Toast } from "./client";
import { DrawerHost } from "./drawers";
import { SECTIONS, sectionOf, tabOn } from "./sections";
import { Greet, Tabs } from "./ui";
import { logoutAction } from "@/app/(admin)/admin/actions";

/** The page the console is on, query included, as the middleware passed it. */
export async function consoleUrl(): Promise<string> {
  const value = (await headers()).get(ADMIN_URL_HEADER);
  return value && value.startsWith("/admin") ? value : "/admin";
}

const QUICK = [
  { d: "new-case", tip: "New case", icon: "plus", cta: true },
  { d: "lead", tip: "Add lead", icon: "user-plus" },
  { d: "ride", tip: "Book a ride", icon: "car" },
  { d: "upload", tip: "Upload reports", icon: "upload" },
  { d: "broadcast", tip: "Broadcast", icon: "megaphone" },
];

const Dot = ({ n, className = "" }: { n: number; className?: string }) =>
  n ? <span className={`absolute grid h-[15px] min-w-[15px] place-items-center rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-extrabold text-white ${className}`}>{n > 99 ? "99+" : n}</span> : null;

/**
 * The console around every admin page, after the approved mock-up: sections on
 * a left rail, quick actions and every inbox on a right ribbon, a search bar,
 * and on a phone a bottom bar with a "More" sheet. Drawers (a case, a chat, a
 * quick action) open on top of whatever page is showing, from the address bar,
 * so a link can point straight at one and the back button closes it.
 */
export async function ConsoleShell({ title, sub, right, children }: { title?: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode }) {
  const url = await consoleUrl();
  const path = url.split("?")[0];
  const query = new URLSearchParams(url.split("?")[1] ?? "");
  const section = sectionOf(path);
  const [count, actor] = await Promise.all([badges(), currentActor()]);
  const dots: Partial<Record<string, number>> = { cases: count.cases, partners: count.partners };
  const open = (drawer: Record<string, string>) => withDrawer(url, drawer);
  const me = (actor || "Owner").trim();
  const meInitials = me
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const tabs = section.tabs?.some((tab) => tabOn(tab, path))
    ? section.tabs.map((tab) => ({ label: tab.label, href: tab.href, on: tabOn(tab, path), count: tab.href === "/admin/partners/applications" ? count.partners : null }))
    : null;

  const ribbonBtn = "relative grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl text-ink-muted transition hover:bg-brand-tint hover:text-brand";
  const tip = (text: string) => <span className="pointer-events-none absolute right-[52px] top-1/2 z-10 -translate-y-1/2 scale-95 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[11.5px] font-medium text-white opacity-0 transition group-hover:scale-100 group-hover:opacity-100 group-focus-visible:opacity-100">{text}</span>;

  return (
    <div className="min-h-screen bg-[#f6f6fb] text-[14px] text-ink">
      <SearchKey />

      {/* Left rail: the sections */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[84px] flex-col items-center border-r border-line bg-white pb-2.5 pt-3.5 md:flex" aria-label="Main sections">
        <Link href="/admin" aria-label="Shifain home" className="mb-3.5 grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-gradient-to-br from-brand to-[#9b7bf3] text-white shadow-[0_6px_16px_rgba(124,58,237,.35)]">
          <CIcon name="cross" size={24} />
        </Link>
        <nav className="flex min-h-0 w-full flex-1 flex-col items-center gap-0.5 overflow-y-auto py-1">
          {SECTIONS.map((item) => {
            const on = item.id === section.id;
            return (
              <Link key={item.id} href={item.href} title={item.label} aria-current={on ? "page" : undefined} className={`relative flex w-16 shrink-0 flex-col items-center justify-center gap-[3px] rounded-xl py-[7px] transition ${on ? "bg-brand-tint text-brand before:absolute before:-left-2.5 before:bottom-3 before:top-3 before:w-[3px] before:rounded-r before:bg-brand" : "text-[#9a9eae] hover:bg-surface-muted hover:text-ink-soft"}`}>
                <CIcon name={item.icon} />
                <span className="text-center text-[10px] font-semibold leading-tight">{item.label}</span>
                <Dot n={dots[item.id] ?? 0} className="right-3 top-1" />
              </Link>
            );
          })}
          <form action={logoutAction} className="mt-auto">
            <button type="submit" title="Sign out" className="flex w-16 flex-col items-center gap-[3px] rounded-xl py-[7px] text-[#9a9eae] transition hover:bg-red-50 hover:text-red-600">
              <CIcon name="logout" />
              <span className="text-[10px] font-semibold">Exit</span>
            </button>
          </form>
        </nav>
      </aside>

      {/* Right ribbon: quick actions, every inbox, alerts */}
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-[58px] flex-col items-center gap-1.5 overflow-y-auto border-l border-line bg-white py-4 md:flex" aria-label="Quick actions and messages">
        {QUICK.map((item) => (
          <Link key={item.d} href={open({ d: item.d })} aria-label={item.tip} scroll={false} className={`group ${ribbonBtn} ${item.cta ? "!bg-brand !text-white hover:!bg-brand-deep" : ""}`}>
            <CIcon name={item.icon} />
            {tip(item.tip)}
          </Link>
        ))}
        <span className="my-1 h-px w-[26px] shrink-0 bg-line" />
        {INBOX_CHANNELS.map((channel) => (
          <Link key={channel.key} href={open({ d: "inbox", ch: channel.key })} aria-label={`${channel.label} inbox`} scroll={false} className={`group ${ribbonBtn} ${channel.key === "whatsapp" ? "!text-emerald-600 hover:!bg-emerald-50" : channel.key === "telegram" ? "!text-[#229ED9] hover:!bg-sky-50" : ""}`}>
            <CIcon name={channel.icon} />
            <Dot n={count.waiting[channel.key]} className="right-1.5 top-1.5" />
            {tip(`${channel.label} inbox`)}
          </Link>
        ))}
        <span className="my-1 h-px w-[26px] shrink-0 bg-line" />
        <Link href={open({ d: "notifs" })} aria-label="Notifications" scroll={false} className={`group ${ribbonBtn}`}>
          <CIcon name="bell" />
          <Dot n={count.notifications} className="right-1.5 top-1.5" />
          {tip("Notifications")}
        </Link>
        <Link href={open({ d: "assistant" })} aria-label="AI assistant" scroll={false} className={`group ${ribbonBtn}`}>
          <CIcon name="sparkles" />
          {tip("AI assistant")}
        </Link>
        <Link href={open({ d: "help" })} aria-label="Help" scroll={false} className={`group ${ribbonBtn}`}>
          <CIcon name="help" />
          {tip("Help")}
        </Link>
      </aside>

      <div className="min-h-screen md:ml-[84px] md:mr-[58px]">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-3 md:gap-4 md:px-[30px]">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-tint text-brand">
              <CIcon name={section.icon} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-extrabold text-ink">{section.label}</h1>
              <p className="truncate text-xs text-ink-muted">Shifain care console</p>
            </div>
          </div>
          <div className="flex-1" />
          <form action="/admin/cases" method="get" role="search" className="hidden h-10 w-[320px] items-center gap-2 rounded-[11px] border border-line bg-white px-3 text-ink-muted lg:flex">
            <CIcon name="search" size={16} />
            <input id="console-search" name="q" placeholder="Search patients, cases, hospitals" aria-label="Search" className="w-full bg-transparent text-[13.5px] text-ink outline-none" />
            <kbd className="rounded-md border border-line px-1.5 text-[11px] text-[#9a9eae]">/</kbd>
          </form>
          <Link href="/admin/cases?view=list" aria-label="Search" className="grid h-10 w-10 place-items-center rounded-[11px] border border-line text-ink-muted lg:hidden">
            <CIcon name="search" size={16} />
          </Link>
          <a href="/" target="_blank" rel="noopener noreferrer" className="hidden h-10 items-center gap-2 whitespace-nowrap rounded-[11px] border border-line bg-white px-3 text-[13px] font-semibold text-ink transition hover:border-brand/30 hover:text-brand sm:inline-flex">
            <CIcon name="external" size={16} />
            Site
          </a>
          <Link href={open({ d: "account" })} scroll={false} aria-label="Your account" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-[13px] font-extrabold text-white">
            {meInitials || "S"}
          </Link>
        </header>

        <main id="main" className="mx-auto max-w-[1440px] px-4 pb-28 pt-6 md:px-[30px] md:pb-16">
          {title ? <Greet title={title} sub={sub} right={right} /> : null}
          {tabs ? <Tabs items={tabs} /> : null}
          {children}
        </main>
      </div>

      {/* Phone: bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-line bg-white px-1.5 pb-[calc(8px+env(safe-area-inset-bottom))] pt-1.5 md:hidden" aria-label="Main">
        {[
          { id: "home", label: "Home", icon: "home", href: "/admin" },
          { id: "cases", label: "Cases", icon: "case", href: "/admin/cases" },
        ].map((item) => (
          <Link key={item.id} href={item.href} aria-current={section.id === item.id ? "page" : undefined} className={`flex flex-1 flex-col items-center gap-[3px] py-1 text-[10.5px] font-bold ${section.id === item.id ? "text-brand" : "text-ink-muted"}`}>
            <CIcon name={item.icon} />
            {item.label}
          </Link>
        ))}
        <Link href={open({ d: "new-case" })} scroll={false} aria-label="New case" className="-mt-6 grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 border-[#f6f6fb] bg-brand text-white shadow-[0_10px_24px_rgba(124,58,237,.42)]">
          <CIcon name="plus" size={24} />
        </Link>
        <Link href={open({ d: "inbox", ch: "all" })} scroll={false} className="relative flex flex-1 flex-col items-center gap-[3px] py-1 text-[10.5px] font-bold text-ink-muted">
          <CIcon name="msg" />
          Inbox
          <Dot n={count.waiting.all} className="right-[calc(50%-22px)] top-0" />
        </Link>
        <Link href={open({ d: "more" })} scroll={false} className="flex flex-1 flex-col items-center gap-[3px] py-1 text-[10.5px] font-bold text-ink-muted">
          <CIcon name="grid" />
          More
        </Link>
      </nav>

      <DrawerHost url={url} query={query} counts={count} />
      <Toast message={query.get("done")} />
    </div>
  );
}
