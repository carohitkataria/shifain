import Link from "next/link";
import { readOr } from "@/lib/db";
import { withDrawer, withoutDrawer } from "@/lib/console-url";
import {
  INBOX_CHANNELS,
  STATUSES,
  STATUS_LABEL,
  caseRows,
  consoleCoordinators,
  consoleProviders,
  conversations,
  notifications,
  threadOf,
  allCases,
  isHere,
  addDays,
  type Conversation,
  type InboxChannel,
} from "@/lib/console";
import { careContext, type JourneyCase } from "@/lib/journey";
import { RIDE_PLACES, RIDE_STATUSES, arrivalDate, balanceDue, paidTotal, TELEGRAM_FIRST } from "@/lib/journey-rules";
import { describeRequest } from "@/lib/cases";
import { COUNTRIES } from "@/lib/countries";
import { listPartners } from "@/lib/partners";
import { currentActor } from "@/lib/onboarding";
import { indiaToday } from "@/lib/patient-app";
import { getSettings } from "@/lib/settings";
import type { Appointment } from "@/lib/patient-portal";
import { logoutAction } from "@/app/(admin)/admin/actions";
import { attributeCaseAction, deleteCaseAction, saveCaseAction } from "@/app/(admin)/admin/cases/actions";
import { saveBroadcastAction, saveLeadAction } from "@/app/(admin)/admin/partners/actions";
import { caseCoordinatorAction, caseNoteAction, caseStageAction, handBackAction, inboxReplyAction, newCaseAction, rerunPlannerAction, writePlanAction } from "@/app/(admin)/admin/console-actions";
import { listCities, listDiseases, listTreatments } from "@/lib/catalogue";
import { PLAN_PACKAGE_OPTIONS } from "@/lib/ai/plan-schema";
import { deskCallAction, deskChangeAction, deskFamilyAction, deskNewRideAction, deskPaymentAction, deskRideAction, deskUploadAction } from "@/lib/desk-actions";
import { CIcon } from "./CIcon";
import { CountryChannel, DrawerKeys, QuickReply, ScrollToEnd } from "./client";
import { SECTIONS } from "./sections";
import { Av, Chip, Empty, Note, Pill, Row, TONE, area, btn, field, initialsOf, label, type Tone } from "./ui";

type Counts = { waiting: Record<InboxChannel | "all", number>; notifications: number };

/** Picks the drawer the address bar asks for. */
export async function DrawerHost({ url, query, counts }: { url: string; query: URLSearchParams; counts: Counts }) {
  const d = query.get("d");
  if (!d) return null;
  const close = withoutDrawer(url);
  switch (d) {
    case "inbox":
      return <InboxDrawer url={url} close={close} channel={(query.get("ch") as InboxChannel | "all") || "all"} open={query.get("c")} counts={counts} />;
    case "notifs":
      return <NoticesDrawer url={url} close={close} />;
    case "case":
      return <CaseDrawer url={url} close={close} reference={query.get("ref") ?? ""} tab={query.get("tab") ?? "overview"} />;
    case "new-case":
      return <NewCaseDrawer url={url} close={close} />;
    case "lead":
      return <LeadDrawer close={close} />;
    case "ride":
      return <RideDrawer url={url} close={close} />;
    case "upload":
      return <UploadDrawer url={url} close={close} />;
    case "broadcast":
      return <BroadcastDrawer close={close} />;
    case "assistant":
      return <AssistantDrawer url={url} close={close} q={query.get("tab")} />;
    case "help":
      return <HelpDrawer close={close} />;
    case "account":
      return <AccountDrawer close={close} />;
    case "more":
      return <MoreDrawer url={url} close={close} counts={counts} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------- frame

const WIDTH = { narrow: "md:w-[440px]", mid: "md:w-[580px]", wide: "md:w-[800px]", chat: "md:w-[940px]" };

function Frame({ close, title, sub, lead, tools, size = "mid", padded = true, foot, children }: { close: string; title: React.ReactNode; sub?: React.ReactNode; lead?: React.ReactNode; tools?: React.ReactNode; size?: keyof typeof WIDTH; padded?: boolean; foot?: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <Link href={close} scroll={false} aria-label="Close" className="fixed inset-0 z-[60] bg-[#1c1a36]/30" />
      <aside id="console-drawer" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="drawer-title" className={`fixed inset-y-0 right-0 z-[70] flex w-full flex-col bg-white shadow-[0_10px_40px_rgba(30,32,50,.2)] outline-none ${WIDTH[size]}`}>
        <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
          {lead}
          <div className="min-w-0 flex-1">
            <h3 id="drawer-title" className="truncate text-[17px] font-extrabold text-ink">
              {title}
            </h3>
            {sub ? <small className="block truncate text-xs text-ink-muted">{sub}</small> : null}
          </div>
          {tools}
          <Link href={close} scroll={false} aria-label="Close" className="grid h-[34px] w-[34px] place-items-center rounded-[9px] text-ink-muted hover:bg-surface-muted hover:text-ink">
            <CIcon name="x" />
          </Link>
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto ${padded ? "p-5" : ""}`}>{children}</div>
        {foot ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">{foot}</div> : null}
      </aside>
      <DrawerKeys closeHref={close} />
    </>
  );
}

const when = (iso: string) => {
  const date = new Date(iso);
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins} min`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

const channelTone: Record<InboxChannel, Tone> = { whatsapp: "wa", telegram: "tg", email: "sky", portal: "brand", web: "teal" };
const channelMeta = (channel: InboxChannel) => INBOX_CHANNELS.find((item) => item.key === channel)!;

export function ChannelIcon({ channel }: { channel: InboxChannel }) {
  const meta = channelMeta(channel);
  return (
    <span title={meta.label} className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${TONE[channelTone[channel]]}`}>
      <CIcon name={meta.icon} size={15} />
    </span>
  );
}

// ---------------------------------------------------------------- inbox

const CAN_REPLY: InboxChannel[] = ["telegram", "portal", "web"];

const NOT_CONNECTED: Partial<Record<InboxChannel, string>> = {
  whatsapp: "WhatsApp Business is not connected to the console yet, so WhatsApp messages cannot arrive here. Patients who chose WhatsApp are reached by phone until it is.",
  email: "Mail sent to shifain.com addresses arrives in Resend. It is not linked to the console yet, so emails do not show here.",
};

async function Thread({ url, conversation, back }: { url: string; conversation: Conversation; back: string }) {
  const messages = await threadOf(conversation.key);
  const canReply = CAN_REPLY.includes(conversation.channel);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
        <ChannelIcon channel={conversation.channel} />
        <b className="min-w-0 flex-1 truncate">{conversation.name}</b>
        {conversation.caseRef ? (
          <Link href={withDrawer(url, { d: "case", ref: conversation.caseRef, tab: "messages" })} scroll={false} className={`${btn.ghost} ${btn.sm}`}>
            {conversation.caseRef.slice(0, 12)}…
          </Link>
        ) : null}
      </div>
      <ScrollToEnd className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-[#f6f6fb] p-4">
        {messages.length === 0 ? <Empty>No messages yet.</Empty> : null}
        {messages.map((message) => (
          <div key={message.id} className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-[13.5px] ${message.out ? "self-end rounded-br-md bg-brand text-white" : "self-start rounded-bl-md border border-line bg-white text-ink"}`}>
            <p className="whitespace-pre-line break-words">{message.text}</p>
            <small className={`mt-1 block text-[10.5px] ${message.out ? "text-white/70" : "text-ink-muted"}`}>
              {message.who ? `${message.who} · ` : ""}
              {new Date(message.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            </small>
          </div>
        ))}
      </ScrollToEnd>
      {canReply ? (
        <form action={inboxReplyAction} className="border-t border-line p-3">
          <input type="hidden" name="key" value={conversation.key} />
          <input type="hidden" name="back" value={back} />
          <input type="hidden" name="caseRef" value={conversation.caseRef ?? ""} />
          <input type="hidden" name="botRole" value={conversation.botRole ?? ""} />
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {["Your driver is on the way", "Reports received, thank you", "Calling you in 5 minutes"].map((phrase) => (
              <QuickReply key={phrase} text={phrase} target="console-reply" />
            ))}
          </div>
          <div className="flex gap-2">
            <input id="console-reply" name="text" required autoComplete="off" placeholder={conversation.channel === "telegram" ? "Reply on Telegram" : conversation.channel === "portal" ? "Reply in the patient app" : "Reply in the website chat"} aria-label="Reply" className={field} />
            <button type="submit" className={btn.primary} aria-label="Send">
              <CIcon name="send" size={16} />
            </button>
          </div>
          {conversation.channel === "web" ? (
            <button formAction={handBackAction} className="mt-2 text-xs font-bold text-brand hover:underline">
              Hand back to the assistant
            </button>
          ) : null}
        </form>
      ) : (
        <div className="border-t border-line p-3">
          <Note tone="grey">{NOT_CONNECTED[conversation.channel] ?? "Replies on this channel are not connected yet."}</Note>
        </div>
      )}
    </div>
  );
}

async function InboxDrawer({ url, close, channel, open, counts }: { url: string; close: string; channel: InboxChannel | "all"; open: string | null; counts: Counts }) {
  const all = await conversations();
  const list = all.filter((row) => channel === "all" || row.channel === channel).slice(0, 80);
  const current = open ? (all.find((row) => row.key === open) ?? null) : null;
  const shown = current ?? list[0] ?? null;
  const name = channel === "all" ? "Inbox" : channelMeta(channel).label;
  const back = withDrawer(url, { d: "inbox", ch: channel, c: shown?.key });
  return (
    <Frame
      close={close}
      size="chat"
      padded={false}
      title={name}
      sub={`${counts.waiting[channel]} waiting for a reply`}
      lead={channel === "all" ? <Chip icon="msg" /> : <Chip icon={channelMeta(channel).icon} tone={channelTone[channel]} />}
      tools={
        <div className="hidden gap-1 overflow-x-auto lg:flex">
          {[{ key: "all", label: "All" }, ...INBOX_CHANNELS].map((item) => (
            <Link key={item.key} href={withDrawer(url, { d: "inbox", ch: item.key })} scroll={false} aria-current={channel === item.key ? "page" : undefined} className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-bold ${channel === item.key ? "bg-brand text-white" : "text-ink-muted hover:text-ink"}`}>
              {item.label}
              {counts.waiting[item.key as InboxChannel | "all"] ? ` ${counts.waiting[item.key as InboxChannel | "all"]}` : ""}
            </Link>
          ))}
        </div>
      }
    >
      <div className="grid h-full min-h-0 md:grid-cols-[300px_1fr]">
        <div className={`min-h-0 overflow-y-auto border-r border-line ${current ? "hidden md:block" : ""}`}>
          <div className="flex gap-1 overflow-x-auto border-b border-line p-2 lg:hidden">
            {[{ key: "all", label: "All" }, ...INBOX_CHANNELS].map((item) => (
              <Link key={item.key} href={withDrawer(url, { d: "inbox", ch: item.key })} scroll={false} className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-bold ${channel === item.key ? "bg-brand text-white" : "text-ink-muted"}`}>
                {item.label}
              </Link>
            ))}
          </div>
          {channel !== "all" && NOT_CONNECTED[channel] && list.length === 0 ? (
            <div className="p-3">
              <Note tone="grey">{NOT_CONNECTED[channel]}</Note>
            </div>
          ) : null}
          {list.length === 0 && !(channel !== "all" && NOT_CONNECTED[channel]) ? <Empty>No conversations yet.</Empty> : null}
          {list.map((row) => (
            <Link key={row.key} href={withDrawer(url, { d: "inbox", ch: channel, c: row.key })} scroll={false} className={`flex items-center gap-2.5 border-b border-surface-muted px-3.5 py-3 ${shown?.key === row.key ? "bg-brand-tint" : "hover:bg-surface-muted"}`}>
              <ChannelIcon channel={row.channel} />
              <div className="min-w-0 flex-1">
                <b className="flex items-baseline justify-between gap-2 text-[13.5px]">
                  <span className="truncate">{row.name}</span>
                  <span className="shrink-0 text-[11px] font-semibold text-ink-muted">{when(row.at)}</span>
                </b>
                <small className="block truncate text-xs text-ink-muted">{row.last}</small>
              </div>
              {row.waiting ? <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rose-500 px-1.5 text-[10.5px] font-extrabold text-white">{row.waiting}</span> : null}
            </Link>
          ))}
        </div>
        <div className={`min-h-0 ${current ? "flex" : "hidden md:flex"} flex-col`}>
          {current ? (
            <Link href={withDrawer(url, { d: "inbox", ch: channel })} scroll={false} className="m-2 inline-flex w-max items-center gap-1 text-xs font-bold text-brand md:hidden">
              <CIcon name="chev-l" size={14} />
              All chats
            </Link>
          ) : null}
          {shown ? <Thread url={url} conversation={shown} back={back} /> : <Empty>Pick a conversation.</Empty>}
        </div>
      </div>
    </Frame>
  );
}

// ---------------------------------------------------------------- notifications

const resolve = (url: string, href: string) => {
  if (!href.startsWith("?")) return href;
  return withDrawer(url, Object.fromEntries(new URLSearchParams(href.slice(1))));
};

async function NoticesDrawer({ url, close }: { url: string; close: string }) {
  const notices = await notifications();
  return (
    <Frame close={close} size="narrow" title="Notifications" sub={`${notices.length} need someone`} lead={<Chip icon="bell" tone="rose" />}>
      {notices.length === 0 ? <Empty>Nothing needs you right now.</Empty> : null}
      {notices.map((notice, index) => (
        <Row
          key={`${notice.title}-${index}`}
          lead={<Chip icon={notice.icon} tone={notice.tone} small />}
          title={notice.title}
          sub={notice.sub}
          right={
            <Link href={resolve(url, notice.href)} scroll={false} className={`${btn.soft} ${btn.sm}`}>
              Open
            </Link>
          }
        />
      ))}
    </Frame>
  );
}

// ---------------------------------------------------------------- case

const CASE_TABS = [
  ["overview", "Overview"],
  ["plan", "Plan"],
  ["schedule", "Schedule"],
  ["reports", "Reports"],
  ["messages", "Messages"],
  ["family", "Family"],
  ["payments", "Payments"],
  ["activity", "Activity"],
] as const;

const Dl = ({ rows }: { rows: [string, React.ReactNode][] }) => (
  <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2 text-[13px]">
    {rows.map(([key, value]) => (
      <div key={key} className="contents">
        <dt className="font-semibold text-ink-muted">{key}</dt>
        <dd className="min-w-0 break-words text-ink">{value || "—"}</dd>
      </div>
    ))}
  </dl>
);

const Sect = ({ children }: { children: React.ReactNode }) => <div className="mb-2 mt-1 text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">{children}</div>;
const Panel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <section className={`rounded-2xl border border-line bg-white p-4 ${className}`}>{children}</section>;

async function CaseDrawer({ url, close, reference, tab }: { url: string; close: string; reference: string; tab: string }) {
  const record = await readOr<(JourneyCase & { appointments?: Appointment[] }) | null>(null, (db) => db.collection<JourneyCase & { appointments?: Appointment[] }>("cases").findOne({ _id: reference }));
  if (!record) {
    return (
      <Frame close={close} title="Case not found" size="narrow">
        <Empty>This case does not exist any more.</Empty>
      </Frame>
    );
  }
  const [ctx, coords, providers, rows, partners, settings] = await Promise.all([careContext(record), consoleCoordinators(), consoleProviders(), caseRows(), listPartners(), getSettings()]);
  const row = rows.find((item) => item.id === record._id);
  const here = withDrawer(url, { d: "case", ref: record._id, tab });
  const drivers = providers.filter((item) => item.kind === "driver");
  const providerName = new Map(providers.map((item) => [item._id, item.name]));
  const caseBack = url.startsWith("/admin/cases") ? withoutDrawer(url) : "/admin/cases";
  const partnerName = record.referredBy ? partners.find((item) => item._id === record.referredBy)?.name ?? record.referredBy : null;
  let body: React.ReactNode = null;

  if (tab === "overview") {
    const openChanges = (record.requests ?? []).filter((item) => item.status === "open");
    const calls = (record.appointments ?? []).filter((item) => item.status === "requested");
    body = (
      <div className="space-y-3">
        {record.status === "plan-failed" ? <Note tone="red" icon="alert">The planner could not finish: {record.planError ?? "no reason given"}. Read the reports and write the plan by hand.</Note> : null}
        {openChanges.map((request) => (
          <Panel key={request.id} className="!bg-brand-tint/40">
            <p className="mb-2 flex items-center gap-2 text-[13px] font-bold">
              <CIcon name="repeat" size={16} />
              Doctor change requested · {request.reasons.join(", ") || "no reason given"}
            </p>
            {request.note ? <p className="mb-2 text-[13px] text-ink-soft">“{request.note}”</p> : null}
            <form action={deskChangeAction} className="flex flex-wrap gap-2">
              <input type="hidden" name="reference" value={record._id} />
              <input type="hidden" name="back" value={here} />
              <input type="hidden" name="id" value={request.id} />
              <input name="reply" placeholder="Reply to the patient" className={`${field} min-w-48 flex-1`} />
              <button name="status" value="accepted" className={`${btn.ok} ${btn.sm} !h-10`}>
                Accept
              </button>
              <button name="status" value="declined" className={`${btn.danger} ${btn.sm} !h-10`}>
                Decline
              </button>
            </form>
          </Panel>
        ))}
        {calls.map((call) => (
          <Panel key={call.id} className="!bg-saffron-tint/50">
            <p className="mb-2 flex items-center gap-2 text-[13px] font-bold">
              <CIcon name="phone" size={16} />
              Call request: {call.kind}, {call.date} {call.window} ({call.timezone}) · {call.language}
            </p>
            {call.note ? <p className="mb-2 text-[13px] text-ink-soft">“{call.note}”</p> : null}
            <form action={deskCallAction} className="flex flex-wrap gap-2">
              <input type="hidden" name="reference" value={record._id} />
              <input type="hidden" name="back" value={here} />
              <input type="hidden" name="id" value={call.id} />
              <input name="slot" placeholder="Agreed time & link, e.g. 26 Oct 10:30 Zoom" className={`${field} min-w-48 flex-1`} />
              <button name="status" value="confirmed" className={`${btn.ok} ${btn.sm} !h-10`}>
                Confirm
              </button>
              <button name="status" value="declined" className={`${btn.ghost} ${btn.sm} !h-10`}>
                Decline
              </button>
            </form>
          </Panel>
        ))}
        <div className="grid gap-3 lg:grid-cols-2">
          <Panel>
            <Sect>Case</Sect>
            <Dl
              rows={[
                ["Treatment", row?.treatment ?? record.statedNeed],
                ["Hospital", ctx.hospital?.name ?? record.requested?.hospitalName ?? null],
                ["Asked for", describeRequest(record.requested)],
                ["Stage", <Pill key="s" tone={record.status === "plan-failed" ? "red" : "brand"}>{STATUS_LABEL[record.status]}</Pill>],
                ["Source", row?.source ?? null],
                ["Partner", partnerName],
                ["Country", record.patient.country],
                ["Phone", record.patient.phone],
                ["Email", record.patient.email],
                ["Language", record.locale.toUpperCase()],
                ["Arrival", arrivalDate(record)],
                ["Quote", record.billing?.quote != null ? `${record.billing.currency} ${record.billing.quote.toLocaleString()}` : null],
                ["Next", row?.next ?? null],
              ]}
            />
          </Panel>
          <Panel>
            <Sect>People</Sect>
            <form action={caseCoordinatorAction} className="flex items-center gap-2 border-b border-surface-muted pb-2.5">
              <input type="hidden" name="id" value={record._id} />
              <input type="hidden" name="back" value={here} />
              <Av text={ctx.coordinator ? initialsOf(ctx.coordinator.name) : "—"} />
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[13.5px]">{ctx.coordinator?.name ?? "Unassigned"}</b>
                <small className="text-xs text-ink-muted">Coordinator</small>
              </div>
              <select name="coordinatorId" defaultValue={record.care?.coordinatorId ?? ""} aria-label="Coordinator" className={`${field} !h-9 !w-36`}>
                <option value="">Unassigned</option>
                {coords.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <button className={`${btn.soft} ${btn.sm}`}>Save</button>
            </form>
            <Row lead={<Chip icon="steth" tone="rose" small />} title={ctx.doctor?.name ?? "To be assigned"} sub="Treating doctor" />
            <Row lead={<Chip icon="car" tone="amber" small />} title={ctx.driver?.name ?? "No driver yet"} sub={ctx.driver?.vehicle?.model ? `Driver · ${ctx.driver.vehicle.model}` : "Driver"} />
            <Row lead={<Chip icon="languages" tone="brand" small />} title={ctx.interpreter?.name ?? "No interpreter yet"} sub="Interpreter" />
            <Row lead={<Chip icon="bed" tone="teal" small />} title={ctx.hotel?.name ?? "No hotel yet"} sub={record.care?.room ? `Hotel · room ${record.care.room}` : "Hotel"} />
            <Link href={`/admin/cases/${record._id}#care`} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-bold text-brand hover:underline">
              Change the care team
              <CIcon name="chev-r" size={14} />
            </Link>
          </Panel>
        </div>
        {!record.referredBy && partners.some((item) => item.status === "active") ? (
          <Panel>
            <Sect>Credit to a partner</Sect>
            <form action={attributeCaseAction} className="flex flex-wrap gap-2">
              <input type="hidden" name="id" value={record._id} />
              <input type="hidden" name="back" value={caseBack} />
              <select name="partnerId" defaultValue="" className={`${field} min-w-48 flex-1`}>
                <option value="" disabled>
                  A partner who sent this patient…
                </option>
                {partners
                  .filter((item) => item.status === "active")
                  .map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name}
                    </option>
                  ))}
              </select>
              <button className={`${btn.ghost} !h-10`}>Credit</button>
            </form>
          </Panel>
        ) : null}
        <details className="rounded-2xl border border-line bg-white p-4">
          <summary className="cursor-pointer text-[13px] font-bold text-brand">Edit patient details</summary>
          <form action={saveCaseAction} className="mt-3 grid gap-x-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={record._id} />
            <input type="hidden" name="back" value={caseBack} />
            <input type="hidden" name="status" value={record.status} />
            <label className={label}>
              Name
              <input name="name" defaultValue={record.patient.name} className={field} />
            </label>
            <label className={label}>
              Phone
              <input name="phone" defaultValue={record.patient.phone} className={field} />
            </label>
            <label className={label}>
              Country
              <input name="country" defaultValue={record.patient.country} className={field} />
            </label>
            <label className={label}>
              Email
              <input name="email" defaultValue={record.patient.email ?? ""} className={field} />
            </label>
            <label className={`${label} sm:col-span-2`}>
              Stated need
              <input name="statedNeed" defaultValue={record.statedNeed ?? ""} className={field} />
            </label>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <button className={btn.primary}>Save changes</button>
              <button formAction={deleteCaseAction} className={btn.danger}>
                Delete this case
              </button>
            </div>
          </form>
        </details>
      </div>
    );
  }

  if (tab === "plan") {
    const plan = record.plan;
    const [diseases, treatments, cities] = await Promise.all([listDiseases().catch(() => []), listTreatments().catch(() => []), listCities().catch(() => [])]);
    body = (
      <div className="space-y-3">
        {record.status === "plan-failed" || record.status === "new" || !plan ? (
          <form action={rerunPlannerAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={record._id} />
            <input type="hidden" name="back" value={here} />
            <button className={btn.soft}>
              <CIcon name="repeat" size={16} />
              Run the planner again
            </button>
            <span className="text-xs text-ink-muted">Or write the plan yourself below.</span>
          </form>
        ) : null}
        <details open={!plan} className="rounded-2xl border border-line bg-white p-4">
          <summary className="cursor-pointer text-[13.5px] font-bold">{plan ? "Edit the plan by hand" : "Write the plan by hand"}</summary>
          <form action={writePlanAction} className="mt-3">
            <input type="hidden" name="id" value={record._id} />
            <input type="hidden" name="back" value={here} />
            <label className={label}>
              What we understood — the patient reads this, in their language ({record.locale})
              <textarea name="understanding" required defaultValue={plan?.understanding ?? ""} className={area} />
            </label>
            <div className="grid gap-x-3 sm:grid-cols-3">
              <label className={label}>
                Condition
                <select name="diseaseCode" defaultValue={plan?.diseaseCode ?? ""} className={field}>
                  <option value="">Not sure yet</option>
                  {diseases.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name.en}
                    </option>
                  ))}
                </select>
              </label>
              <label className={label}>
                Treatment
                <select name="treatmentCode" defaultValue={plan?.recommendedTreatmentCode ?? ""} className={field}>
                  <option value="">Not decided yet</option>
                  {treatments.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.name.en}
                    </option>
                  ))}
                </select>
              </label>
              <label className={label}>
                City
                <select name="city" defaultValue={plan?.destinationCity ?? ""} className={field}>
                  <option value="">Not decided yet</option>
                  {cities.map((item) => (
                    <option key={item._id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={label}>
                Nights in hospital
                <input name="inpatientNights" type="number" min={0} defaultValue={plan?.stay.inpatientNights ?? ""} placeholder="From the catalogue" className={field} />
              </label>
              <label className={label}>
                Days in the country
                <input name="daysInCountry" type="number" min={0} defaultValue={plan?.stay.daysInCountry ?? ""} placeholder="From the catalogue" className={field} />
              </label>
            </div>
            <fieldset className={label}>
              Package
              <div className="mt-1.5 flex flex-wrap gap-3 text-[13px] font-medium text-ink">
                {PLAN_PACKAGE_OPTIONS.map((item) => (
                  <label key={item} className="flex items-center gap-1.5">
                    <input type="checkbox" name="packages" value={item} defaultChecked={plan ? plan.suggestedPackage.includes(item) : ["visa-support", "airport-transfers", "accommodation", "interpreter"].includes(item)} />
                    {item}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-x-3 sm:grid-cols-2">
              <label className={label}>
                Questions for the patient (one per line)
                <textarea name="questions" defaultValue={plan?.questionsForPatient.join("\n") ?? ""} className={area} />
              </label>
              <label className={label}>
                Reports still needed (one per line)
                <textarea name="missing" defaultValue={plan?.missingReports.join("\n") ?? ""} className={area} />
              </label>
            </div>
            <label className={label}>
              Urgent warning for the patient (only if they should see a doctor now)
              <input name="redFlag" defaultValue={plan?.redFlag?.present ? plan.redFlag.message : ""} className={field} />
            </label>
            <button className={btn.primary}>
              <CIcon name="check" size={16} />
              Save the plan and tell the patient
            </button>
          </form>
        </details>
        {plan ? (
          <Panel>
            <Sect>What the planner understood</Sect>
            <p className="text-[13.5px] leading-relaxed text-ink">{plan.understanding}</p>
            {plan.redFlag?.present ? <div className="mt-2"><Note tone="red" icon="alert">{plan.redFlag.message}</Note></div> : null}
            <Sect>
              <span className="mt-3 block">Stay</span>
            </Sect>
            <p className="text-[13px]">
              {plan.stay.daysInCountry} days in the country · {plan.stay.inpatientNights} nights in hospital{plan.destinationCity ? ` · ${plan.destinationCity}` : ""}
            </p>
            {plan.itinerary.length ? (
              <>
                <Sect>
                  <span className="mt-3 block">Itinerary</span>
                </Sect>
                {plan.itinerary.map((item, index) => (
                  <Row key={`${item.day}-${index}`} lead={<span className="w-14 shrink-0 text-xs font-bold text-ink-soft">{item.day}</span>} title={item.title} sub={item.detail} />
                ))}
              </>
            ) : null}
            {plan.suggestedPackage.length ? (
              <>
                <Sect>
                  <span className="mt-3 block">Package</span>
                </Sect>
                <div className="flex flex-wrap gap-1.5">
                  {plan.suggestedPackage.map((item) => (
                    <Pill key={item} tone="teal">
                      {item}
                    </Pill>
                  ))}
                </div>
              </>
            ) : null}
            {plan.missingReports.length ? (
              <>
                <Sect>
                  <span className="mt-3 block">Reports still missing</span>
                </Sect>
                <ul className="list-disc pl-5 text-[13px]">
                  {plan.missingReports.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </Panel>
        ) : (
          <Note tone="grey">No plan yet{record.planError ? `: ${record.planError}` : "."}</Note>
        )}
        {record.description ? (
          <Panel>
            <Sect>In the patient’s words</Sect>
            <p className="whitespace-pre-line text-[13px]">{record.description}</p>
          </Panel>
        ) : null}
        {record.preferences?.notes?.length ? (
          <Panel>
            <Sect>Added by the patient</Sect>
            <p className="whitespace-pre-line text-[13px]">{record.preferences.notes.map((note) => note.text).join("\n")}</p>
          </Panel>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <a href={`/${record.locale}/plan/${record._id}`} target="_blank" rel="noopener noreferrer" className={btn.ghost}>
            <CIcon name="external" size={16} />
            Open the plan page
          </a>
          <Link href={`/admin/cases/${record._id}`} className={btn.soft}>
            <CIcon name="pencil" size={16} />
            Edit in the care desk
          </Link>
        </div>
      </div>
    );
  }

  if (tab === "schedule") {
    const items = [...(record.journey ?? [])].sort((a, b) => `${a.date ?? "9"}${a.time ?? ""}`.localeCompare(`${b.date ?? "9"}${b.time ?? ""}`));
    const rides = [...(record.rides ?? [])].reverse();
    body = (
      <div className="space-y-3">
        <Panel>
          <Sect>Journey</Sect>
          {items.length === 0 ? <Empty>Nothing dated yet.</Empty> : null}
          {items.map((item) => (
            <Row key={item.id} lead={<span className="w-[70px] shrink-0 text-xs font-bold text-ink-soft">{item.date ?? "No date"}{item.time ? <><br />{item.time}</> : null}</span>} title={item.title} sub={[item.place, item.detail].filter(Boolean).join(" · ")} right={<Pill tone={item.status === "done" ? "green" : item.status === "booked" ? "brand" : item.status === "cancelled" ? "grey" : "amber"}>{item.status}</Pill>} />
          ))}
        </Panel>
        <Panel>
          <Sect>Cars</Sect>
          {rides.length === 0 ? <Empty>No cars called.</Empty> : null}
          {rides.map((ride) => (
            <form key={ride.id} action={deskRideAction} className="flex flex-wrap items-center gap-2 border-b border-surface-muted py-2.5 last:border-b-0">
              <input type="hidden" name="reference" value={record._id} />
              <input type="hidden" name="back" value={here} />
              <input type="hidden" name="id" value={ride.id} />
              <div className="min-w-40 flex-1">
                <b className="block text-[13px]">To {ride.address || ride.to}</b>
                <small className="text-xs text-ink-muted">
                  {ride.when === "now" ? "As soon as possible" : ride.when.replace("T", " ")} · {ride.passengers} passenger{ride.passengers === 1 ? "" : "s"}
                  {ride.driverId ? ` · ${providerName.get(ride.driverId) ?? "driver"}` : ""}
                </small>
              </div>
              <select name="driverId" defaultValue={ride.driverId ?? ""} aria-label="Driver" className={`${field} !h-9 !w-36`}>
                <option value="">No driver</option>
                {drivers.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select name="status" defaultValue={ride.status} aria-label="Progress" className={`${field} !h-9 !w-32`}>
                {RIDE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button className={`${btn.soft} ${btn.sm}`}>Save</button>
            </form>
          ))}
          <Link href={withDrawer(url, { d: "ride" })} scroll={false} className={`${btn.ghost} ${btn.sm} mt-2`}>
            <CIcon name="car" size={15} />
            Book a car
          </Link>
        </Panel>
        <Note tone="brand" icon="calendar">
          Changes here update the patient’s calendar in their app. Add or edit journey items in the{" "}
          <Link href={`/admin/cases/${record._id}#journey`} className="font-bold underline">
            care desk
          </Link>
          .
        </Note>
      </div>
    );
  }

  if (tab === "reports") {
    body = (
      <div className="space-y-3">
        <Panel>
          {record.reports.length === 0 ? <Empty>No files yet.</Empty> : null}
          {[...record.reports].reverse().map((file, index) => (
            <Row
              key={file.id ?? index}
              lead={<Chip icon="file" tone={file.kind === "bill" ? "green" : file.kind === "prescription" ? "amber" : "sky"} small />}
              title={file.filename}
              sub={`${file.source === "hospital" ? "Hospital" : file.source === "shifain" ? "Shifain" : "Patient"} · ${file.kind ?? "report"}`}
              right={
                file.id ? (
                  <a href={`/api/admin/report/${record._id}/${record._id}-${file.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Open ${file.filename}`} className="grid h-[34px] w-[34px] place-items-center rounded-[9px] text-ink-muted hover:bg-surface-muted">
                    <CIcon name="download" size={16} />
                  </a>
                ) : (
                  <Pill>not stored</Pill>
                )
              }
            />
          ))}
        </Panel>
        <form action={deskUploadAction} className="rounded-2xl border border-dashed border-brand/30 bg-brand-tint/30 p-4">
          <input type="hidden" name="reference" value={record._id} />
          <input type="hidden" name="back" value={here} />
          <div className="grid gap-x-3 sm:grid-cols-2">
            <label className={label}>
              Type
              <select name="kind" className={field}>
                <option value="report">Report</option>
                <option value="prescription">Prescription</option>
                <option value="bill">Bill</option>
              </select>
            </label>
            <label className={label}>
              From
              <select name="source" className={field}>
                <option value="hospital">Hospital</option>
                <option value="shifain">Shifain</option>
              </select>
            </label>
          </div>
          <input type="file" name="files" multiple required accept="application/pdf,image/*" className="block w-full text-[13px]" />
          <button className={`${btn.primary} mt-3`}>
            <CIcon name="upload" size={16} />
            Upload and share with the patient
          </button>
        </form>
        <Note tone="amber" icon="alert">
          Files are deleted after {settings.reportRetentionDays} days under the current storage setting{record.reportsExpireAt ? ` (these on ${record.reportsExpireAt.slice(0, 10)})` : ""}.
        </Note>
      </div>
    );
  }

  if (tab === "messages") {
    const threads = (await conversations()).filter((item) => item.caseRef === record._id);
    const portal: Conversation = threads.find((item) => item.channel === "portal") ?? { key: `portal:${record._id}`, channel: "portal", name: record.patient.name, caseRef: record._id, last: "", at: record.createdAt, waiting: 0, telegramChatId: null, botRole: null };
    const others = threads.filter((item) => item.key !== portal.key);
    body = (
      <div className="space-y-3">
        {others.length ? (
          <div className="flex flex-wrap gap-2">
            {others.map((item) => (
              <Link key={item.key} href={withDrawer(url, { d: "inbox", ch: item.channel, c: item.key })} scroll={false} className={`${btn.ghost} ${btn.sm}`}>
                <ChannelIcon channel={item.channel} />
                {channelMeta(item.channel).label} chat
              </Link>
            ))}
          </div>
        ) : null}
        <div className="h-[60vh] overflow-hidden rounded-2xl border border-line">
          <Thread url={url} conversation={portal} back={here} />
        </div>
      </div>
    );
  }

  if (tab === "family") {
    const family = record.family ?? [];
    body = (
      <Panel>
        {family.length === 0 ? <Empty>No family added in the app.</Empty> : null}
        {family.map((member) => (
          <form key={member.id} action={deskFamilyAction} className="flex flex-wrap items-center gap-2.5 border-b border-surface-muted py-2.5 last:border-b-0">
            <input type="hidden" name="reference" value={record._id} />
            <input type="hidden" name="back" value={here} />
            <input type="hidden" name="id" value={member.id} />
            <Av text={initialsOf(member.name)} />
            <div className="min-w-40 flex-1">
              <b className="block text-[13.5px]">{member.name}</b>
              <small className="text-xs text-ink-muted">
                {member.relation} · {member.travelling ? "travelling" : "at home"} · {member.access.join(", ") || "no access"}
              </small>
            </div>
            {member.travelling ? (
              <>
                <select name="passport" defaultValue={member.passport} aria-label="Passport" className={`${field} !h-9 !w-32`}>
                  <option value="missing">Passport missing</option>
                  <option value="uploaded">Uploaded</option>
                  <option value="verified">Verified</option>
                </select>
                <button className={`${btn.soft} ${btn.sm}`}>Save</button>
              </>
            ) : null}
          </form>
        ))}
      </Panel>
    );
  }

  if (tab === "payments") {
    const billing = record.billing;
    const due = balanceDue(billing);
    body = (
      <div className="space-y-3">
        <Panel>
          <Dl
            rows={[
              ["Quote", billing?.quote != null ? `${billing.currency} ${billing.quote.toLocaleString()}` : "Not confirmed yet"],
              ["Paid", `${billing?.currency ?? "USD"} ${paidTotal(billing).toLocaleString()}`],
              ["Balance", due != null ? `${billing?.currency} ${due.toLocaleString()}${billing?.dueNote ? ` · ${billing.dueNote}` : ""}` : "—"],
            ]}
          />
          {(billing?.payments ?? []).length ? (
            <>
              <Sect>
                <span className="mt-3 block">Payments</span>
              </Sect>
              {billing!.payments.map((payment) => (
                <Row key={payment.id} lead={<Chip icon="coins" tone="green" small />} title={`${billing!.currency} ${payment.amount.toLocaleString()}`} sub={`${payment.method} · ${payment.at.slice(0, 10)}${payment.note ? ` · ${payment.note}` : ""}`} />
              ))}
            </>
          ) : null}
        </Panel>
        <form action={deskPaymentAction} className="rounded-2xl border border-line bg-white p-4">
          <input type="hidden" name="reference" value={record._id} />
          <input type="hidden" name="back" value={here} />
          <Sect>Record a payment</Sect>
          <div className="grid gap-x-3 sm:grid-cols-3">
            <label className={label}>
              Amount
              <input name="amount" inputMode="decimal" required className={field} />
            </label>
            <label className={label}>
              Method
              <select name="method" className={field}>
                {["card", "bank transfer", "cash", "payment link"].map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </label>
            <label className={label}>
              Date
              <input type="date" name="at" defaultValue={indiaToday()} className={field} />
            </label>
          </div>
          <input name="note" placeholder="Note (optional)" className={field} />
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={btn.primary}>Record payment</button>
            <Link href={`/admin/cases/${record._id}#billing`} className={btn.ghost}>
              Quote and lines
            </Link>
          </div>
        </form>
      </div>
    );
  }

  if (tab === "activity") {
    const edits = [...(record.planEdits ?? [])].reverse().slice(0, 60);
    body = (
      <Panel>
        {edits.map((change, index) => (
          <Row key={`${change.at}-${index}`} lead={<span className="w-[86px] shrink-0 text-xs font-bold text-ink-soft">{new Date(change.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>} title={<span className="whitespace-normal font-semibold">{change.change}</span>} sub={change.via} />
        ))}
        <Row lead={<span className="w-[86px] shrink-0 text-xs font-bold text-ink-soft">{new Date(record.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>} title="Case opened" sub={row?.source ?? undefined} />
      </Panel>
    );
  }

  return (
    <Frame
      close={close}
      size="wide"
      title={record.patient.name}
      sub={`${record._id} · ${record.patient.country} · ${record.locale.toUpperCase()}`}
      lead={<Av text={initialsOf(record.patient.name)} size="lg" />}
      tools={
        <div className="hidden items-center gap-1 sm:flex">
          <a href={`tel:${record.patient.phone.replace(/[^\d+]/g, "")}`} aria-label="Call" className="grid h-[34px] w-[34px] place-items-center rounded-[9px] text-ink-muted hover:bg-surface-muted">
            <CIcon name="phone" size={18} />
          </a>
          <Link href={withDrawer(url, { d: "case", ref: record._id, tab: "messages" })} scroll={false} aria-label="Messages" className="grid h-[34px] w-[34px] place-items-center rounded-[9px] text-ink-muted hover:bg-surface-muted">
            <CIcon name="msg" size={18} />
          </Link>
          {record.patient.email ? (
            <a href={`mailto:${record.patient.email}`} aria-label="Email" className="grid h-[34px] w-[34px] place-items-center rounded-[9px] text-ink-muted hover:bg-surface-muted">
              <CIcon name="mail" size={18} />
            </a>
          ) : null}
        </div>
      }
      foot={
        <>
          <form action={caseStageAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={record._id} />
            <input type="hidden" name="back" value={here} />
            <select name="status" defaultValue={record.status} aria-label="Stage" className={`${field} !w-auto`}>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
            </select>
            <button className={btn.ghost}>Set stage</button>
          </form>
          <form action={caseNoteAction} className="flex min-w-56 flex-1 items-center gap-2">
            <input type="hidden" name="id" value={record._id} />
            <input type="hidden" name="back" value={withDrawer(url, { d: "case", ref: record._id, tab: "activity" })} />
            <input name="note" placeholder="Add a note for the team" aria-label="Note" className={field} />
            <button className={btn.ghost} aria-label="Add note">
              <CIcon name="pencil" size={16} />
            </button>
          </form>
          <Link href={`/admin/cases/${record._id}`} className={btn.primary}>
            Care desk
          </Link>
        </>
      }
    >
      <nav className="-mx-1 mb-4 flex gap-1 overflow-x-auto border-b border-line" aria-label="Case">
        {CASE_TABS.map(([key, name]) => (
          <Link key={key} href={withDrawer(url, { d: "case", ref: record._id, tab: key })} scroll={false} aria-current={tab === key ? "page" : undefined} className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-bold ${tab === key ? "border-brand text-brand" : "border-transparent text-ink-muted hover:text-ink"}`}>
            {name}
          </Link>
        ))}
      </nav>
      {body}
    </Frame>
  );
}

// ---------------------------------------------------------------- quick actions

const AREAS = ["Not sure yet", "Cardiac", "Oncology", "Orthopaedics", "Neurosurgery", "Organ transplant", "Fertility & IVF", "Eye care", "Other"];

async function NewCaseDrawer({ url, close }: { url: string; close: string }) {
  const coords = await consoleCoordinators();
  return (
    <Frame
      close={close}
      title="New case"
      sub="A patient who called, wrote or walked in"
      lead={<Chip icon="plus" />}
      foot={
        <>
          <Link href={close} scroll={false} className={btn.ghost}>
            Cancel
          </Link>
          <button form="new-case" className={btn.primary}>
            Create case
          </button>
        </>
      }
    >
      <form id="new-case" action={newCaseAction} encType="multipart/form-data">
        <input type="hidden" name="back" value={url} />
        <label className={label}>
          Patient name
          <input name="name" required placeholder="Full name" className={field} />
        </label>
        <CountryChannel countries={COUNTRIES.map((item) => ({ name: item.name, code: item.code, dial: item.dial }))} telegramFirst={[...TELEGRAM_FIRST]} />
        <label className={label}>
          Email
          <input name="email" type="email" placeholder="Optional" className={field} />
        </label>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <label className={label}>
            Treatment area
            <select name="area" className={field}>
              {AREAS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            How they reached us
            <select name="how" className={field}>
              {["Phone call", "WhatsApp", "Telegram", "Email", "Partner referral", "Walk-in"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            Coordinator
            <select name="coordinatorId" className={field}>
              <option value="">Unassigned</option>
              {coords.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Language
            <select name="locale" className={field}>
              <option value="en">English</option>
              <option value="ru">Русский</option>
              <option value="uz">Oʻzbekcha</option>
            </select>
          </label>
        </div>
        <label className={label}>
          What they told you
          <textarea name="told" placeholder="Symptoms, diagnosis, what they want" className={area} />
        </label>
        <label className={label}>
          Reports
          <input type="file" name="files" multiple accept="application/pdf,image/*" className="mt-1.5 block w-full text-[13px]" />
        </label>
      </form>
    </Frame>
  );
}

function LeadDrawer({ close }: { close: string }) {
  return (
    <Frame
      close={close}
      title="Add lead"
      sub="Someone interested, not yet a case"
      lead={<Chip icon="user-plus" tone="sky" />}
      foot={
        <>
          <Link href={close} scroll={false} className={btn.ghost}>
            Cancel
          </Link>
          <button form="new-lead" className={btn.primary}>
            Save lead
          </button>
        </>
      }
    >
      <form id="new-lead" action={saveLeadAction}>
        <input type="hidden" name="status" value="new" />
        <div className="grid gap-x-3 sm:grid-cols-2">
          <label className={label}>
            Name
            <input name="name" required className={field} />
          </label>
          <label className={label}>
            Phone
            <input name="phone" inputMode="tel" className={field} />
          </label>
          <label className={label}>
            Email
            <input name="email" type="email" className={field} />
          </label>
          <label className={label}>
            Country
            <select name="country" className={field} defaultValue="">
              <option value="">Unknown</option>
              {COUNTRIES.map((item) => (
                <option key={item.code}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            Came via
            <select name="source" className={field}>
              {["phone", "whatsapp", "telegram", "email", "partner", "walk-in", "other"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            Interested in
            <input name="need" placeholder="e.g. knee replacement" className={field} />
          </label>
        </div>
        <label className={label}>
          Note
          <textarea name="note" className={area} />
        </label>
      </form>
    </Frame>
  );
}

async function RideDrawer({ url, close }: { url: string; close: string }) {
  const [cases, providers] = await Promise.all([allCases(), consoleProviders()]);
  const live = cases.filter((record) => record.status === "confirmed" || isHere(record));
  const drivers = providers.filter((item) => item.kind === "driver" && item.active);
  const today = indiaToday();
  return (
    <Frame
      close={close}
      title="Book a ride"
      sub="The patient follows it in their app"
      lead={<Chip icon="car" tone="amber" />}
      foot={
        <>
          <Link href={close} scroll={false} className={btn.ghost}>
            Cancel
          </Link>
          <button form="new-ride" className={btn.primary} disabled={!live.length}>
            Book ride
          </button>
        </>
      }
    >
      {!live.length ? <Note tone="grey">No confirmed patients yet. A ride is booked for a confirmed case.</Note> : null}
      <form id="new-ride" action={deskNewRideAction}>
        <input type="hidden" name="back" value={withoutDrawer(url)} />
        <label className={label}>
          Patient
          <select name="reference" required className={field}>
            {live.map((record) => (
              <option key={record._id} value={record._id}>
                {record.patient.name} · {record._id.slice(0, 12)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <label className={label}>
            To
            <select name="to" className={field}>
              {RIDE_PLACES.map((place) => (
                <option key={place}>{place}</option>
              ))}
            </select>
          </label>
          <label className={label}>
            Address or note
            <input name="address" placeholder="Terminal 3, gate 4" className={field} />
          </label>
          <label className={label}>
            Date
            <input type="date" name="date" defaultValue={today} className={field} />
          </label>
          <label className={label}>
            Time
            <input type="time" name="time" defaultValue="10:00" className={field} />
          </label>
          <label className={label}>
            Driver
            <select name="driverId" className={field}>
              <option value="">The case’s driver</option>
              {drivers.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.name}
                  {item.vehicle?.model ? ` · ${item.vehicle.model}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Passengers
            <input type="number" name="passengers" min={1} max={8} defaultValue={1} className={field} />
          </label>
        </div>
        <Note tone="brand" icon="send">
          The ride shows in the patient’s app with its progress, and stays in open items until it is completed.
        </Note>
      </form>
    </Frame>
  );
}

async function UploadDrawer({ url, close }: { url: string; close: string }) {
  const cases = (await allCases()).filter((record) => record.status !== "closed");
  return (
    <Frame
      close={close}
      title="Upload reports"
      sub="From the hospital or the desk"
      lead={<Chip icon="upload" tone="teal" />}
      foot={
        <>
          <Link href={close} scroll={false} className={btn.ghost}>
            Cancel
          </Link>
          <button form="upload-files" className={btn.primary}>
            Upload
          </button>
        </>
      }
    >
      <form id="upload-files" action={deskUploadAction} encType="multipart/form-data">
        <input type="hidden" name="back" value={withoutDrawer(url)} />
        <label className={label}>
          Case
          <select name="reference" required className={field}>
            {cases.map((record) => (
              <option key={record._id} value={record._id}>
                {record.patient.name} · {record._id.slice(0, 12)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <label className={label}>
            Type
            <select name="kind" className={field}>
              <option value="report">Report or scan</option>
              <option value="prescription">Prescription</option>
              <option value="bill">Bill</option>
            </select>
          </label>
          <label className={label}>
            From
            <select name="source" className={field}>
              <option value="hospital">Hospital</option>
              <option value="shifain">Shifain</option>
            </select>
          </label>
        </div>
        <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-brand/40 bg-brand-tint/30 text-[13px] font-semibold text-brand">
          <CIcon name="upload" />
          Choose PDF or photos
          <input type="file" name="files" multiple required accept="application/pdf,image/*" className="max-w-[90%] text-xs text-ink-soft" />
        </label>
        <div className="mt-3">
          <Note tone="brand" icon="phone-d">
            Files show in the patient’s app under Reports.
          </Note>
        </div>
      </form>
    </Frame>
  );
}

function BroadcastDrawer({ close }: { close: string }) {
  return (
    <Frame
      close={close}
      title="Broadcast"
      sub="A notice in every partner’s portal"
      lead={<Chip icon="megaphone" tone="rose" />}
      foot={
        <>
          <Link href={close} scroll={false} className={btn.ghost}>
            Cancel
          </Link>
          <button form="new-broadcast" className={btn.primary}>
            Publish
          </button>
        </>
      }
    >
      <form id="new-broadcast" action={saveBroadcastAction}>
        <label className={label}>
          Title
          <input name="title" required className={field} />
        </label>
        <label className={label}>
          Message
          <textarea name="body" required className={`${area} min-h-[140px]`} />
        </label>
        <div className="grid gap-x-3 sm:grid-cols-2">
          <label className={label}>
            Who sees it
            <select name="audience" className={field}>
              <option value="all">All partners</option>
              <option value="country">Partners in one country</option>
              <option value="specialty">Partners in one specialty</option>
            </select>
          </label>
          <label className={label}>
            Country or specialty
            <input name="audienceValue" placeholder="Only for a narrower audience" className={field} />
          </label>
          <label className={label}>
            Show until
            <input type="date" name="expiresAt" className={field} />
          </label>
          <label className="mb-3 flex items-center gap-2 self-end text-[13px] font-semibold">
            <input type="checkbox" name="pinned" className="h-4 w-4 accent-brand" />
            Pin to the top
          </label>
        </div>
      </form>
    </Frame>
  );
}

// ---------------------------------------------------------------- assistant, help, account, more

const QUESTIONS = [
  { key: "arrivals", q: "Who lands this week?" },
  { key: "unassigned", q: "Which cases have no coordinator?" },
  { key: "waiting", q: "Who is waiting for a reply?" },
  { key: "failed", q: "Which plans need a person?" },
  { key: "balances", q: "Who still owes a balance?" },
  { key: "rides", q: "Which cars are still open?" },
];

async function AssistantDrawer({ url, close, q }: { url: string; close: string; q: string | null }) {
  const [cases, rows, convs] = await Promise.all([allCases(), caseRows(), conversations()]);
  const today = indiaToday();
  const caseHref = (reference: string) => withDrawer(url, { d: "case", ref: reference });
  let answer: { title: string; sub: string; href: string }[] | null = null;
  if (q === "arrivals") {
    answer = cases
      .filter((record) => {
        const arrival = arrivalDate(record);
        return arrival && arrival >= today && arrival <= addDays(today, 7);
      })
      .map((record) => ({ title: record.patient.name, sub: `Arrives ${arrivalDate(record)}`, href: caseHref(record._id) }));
  } else if (q === "unassigned") {
    answer = rows.filter((row) => !row.coordinatorId && row.status !== "closed").map((row) => ({ title: row.name, sub: `${row.treatment} · ${STATUS_LABEL[row.status]}`, href: caseHref(row.id) }));
  } else if (q === "waiting") {
    answer = convs.filter((row) => row.waiting).map((row) => ({ title: row.name, sub: `${row.waiting} on ${channelMeta(row.channel).label} · ${row.last}`, href: withDrawer(url, { d: "inbox", ch: row.channel, c: row.key }) }));
  } else if (q === "failed") {
    answer = cases.filter((record) => record.status === "plan-failed").map((record) => ({ title: record.patient.name, sub: record.planError ?? "Planner failed", href: caseHref(record._id) }));
  } else if (q === "balances") {
    answer = cases
      .filter((record) => (balanceDue(record.billing) ?? 0) > 0)
      .map((record) => ({ title: record.patient.name, sub: `${record.billing!.currency} ${balanceDue(record.billing)!.toLocaleString()}${record.billing?.dueNote ? ` · ${record.billing.dueNote}` : ""}`, href: withDrawer(url, { d: "case", ref: record._id, tab: "payments" }) }));
  } else if (q === "rides") {
    answer = cases.flatMap((record) =>
      (record.rides ?? []).filter((ride) => ["requested", "assigned", "on-the-way", "arrived"].includes(ride.status)).map((ride) => ({ title: record.patient.name, sub: `${ride.status} · to ${ride.address || ride.to}`, href: withDrawer(url, { d: "case", ref: record._id, tab: "schedule" }) })),
    );
  }
  const asked = QUESTIONS.find((item) => item.key === q);
  return (
    <Frame close={close} size="narrow" title="AI assistant" sub="Ask about cases, arrivals and money" lead={<Chip icon="sparkles" />}>
      <div className="mb-3 rounded-2xl border border-line bg-[#f6f6fb] p-3 text-[13px] text-ink-soft">Pick a question. Answers come straight from today’s cases, so they are always current.</div>
      <div className="flex flex-wrap gap-2">
        {QUESTIONS.map((item) => (
          <Link key={item.key} href={withDrawer(url, { d: "assistant", tab: item.key })} scroll={false} className={`inline-flex h-9 items-center rounded-[10px] border px-3 text-[12.5px] font-semibold ${q === item.key ? "border-brand/30 bg-brand-tint text-brand" : "border-line bg-white text-ink-soft hover:border-brand/30"}`}>
            {item.q}
          </Link>
        ))}
      </div>
      {asked && answer ? (
        <div className="mt-4">
          <Sect>{asked.q}</Sect>
          {answer.length === 0 ? <Empty>Nobody right now.</Empty> : null}
          {answer.map((item, index) => (
            <Row key={`${item.title}-${index}`} title={item.title} sub={item.sub} href={item.href} right={<CIcon name="chev-r" size={16} className="text-ink-muted" />} />
          ))}
        </div>
      ) : null}
      <form action="/admin/cases" method="get" className="mt-5 flex gap-2">
        <input name="q" placeholder="Find a patient, case or hospital" aria-label="Search" className={field} />
        <button className={btn.primary} aria-label="Search">
          <CIcon name="search" size={16} />
        </button>
      </form>
    </Frame>
  );
}

function HelpDrawer({ close }: { close: string }) {
  const tips: [string, string, string][] = [
    ["home", "Home", "What needs someone now, who is on the ground today, and the pipeline at a glance."],
    ["case", "Cases", "Every case as a board by stage or as a list. Tick cases to assign, move or message them together."],
    ["calendar", "Care desk", "Arrivals, rides, hospital visits and departures by the hour, today and tomorrow."],
    ["msg", "Inbox", "Telegram, the patient app and website chats in one place. Reply where the patient wrote."],
    ["plus", "Quick actions", "New case, lead, ride, report upload and partner broadcast — from any page, on the right."],
    ["layout", "Website", "Click any text on the homepage to change it, in all three languages, then publish."],
    ["gear", "Settings", "Logins, coordinators, report storage, Telegram, the AI assistant and the database."],
  ];
  return (
    <Frame close={close} size="narrow" title="Help" sub="How the console is laid out" lead={<Chip icon="help" tone="sky" />}>
      {tips.map(([icon, title, text]) => (
        <Row key={title} lead={<Chip icon={icon} small />} title={title} sub={<span className="whitespace-normal">{text}</span>} />
      ))}
      <p className="mt-4 text-xs text-ink-muted">
        Press <kbd className="rounded border border-line px-1">/</kbd> to search, <kbd className="rounded border border-line px-1">Esc</kbd> to close a panel.
      </p>
    </Frame>
  );
}

async function AccountDrawer({ close }: { close: string }) {
  const actor = (await currentActor()) || "Owner";
  return (
    <Frame close={close} size="narrow" title={actor} sub="Owner console" lead={<Av text={initialsOf(actor) || "S"} size="lg" />}>
      <Row lead={<Chip icon="users" small />} title="Team & logins" sub="Coordinators, partners and their access" href="/admin/access" right={<CIcon name="chev-r" size={16} className="text-ink-muted" />} />
      <Row lead={<Chip icon="gear" small />} title="Settings" sub="How the console, the site and the app behave" href="/admin/settings" right={<CIcon name="chev-r" size={16} className="text-ink-muted" />} />
      <form action={logoutAction} className="mt-4">
        <button className={`${btn.ghost} w-full`}>
          <CIcon name="logout" size={16} />
          Sign out
        </button>
      </form>
    </Frame>
  );
}

function MoreDrawer({ url, close, counts }: { url: string; close: string; counts: Counts }) {
  const cell = "relative flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-white px-2 py-3 text-center text-[11.5px] font-semibold text-ink-soft";
  return (
    <Frame close={close} size="narrow" title="More" lead={<Chip icon="grid" />}>
      <Sect>Sections</Sect>
      <div className="grid grid-cols-3 gap-2">
        {SECTIONS.map((item) => (
          <Link key={item.id} href={item.href} className={cell}>
            <CIcon name={item.icon} />
            {item.label}
          </Link>
        ))}
      </div>
      <Sect>
        <span className="mt-4 block">Quick actions</span>
      </Sect>
      <div className="grid grid-cols-3 gap-2">
        {[
          ["new-case", "plus", "New case"],
          ["lead", "user-plus", "Add lead"],
          ["ride", "car", "Book a ride"],
          ["upload", "upload", "Upload reports"],
          ["broadcast", "megaphone", "Broadcast"],
          ["notifs", "bell", "Notifications"],
        ].map(([d, icon, name]) => (
          <Link key={d} href={withDrawer(url, { d })} scroll={false} className={cell}>
            <CIcon name={icon} />
            {name}
            {d === "notifs" && counts.notifications ? <span className="absolute right-2 top-2 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{counts.notifications}</span> : null}
          </Link>
        ))}
      </div>
      <Sect>
        <span className="mt-4 block">Messages</span>
      </Sect>
      <div className="grid grid-cols-3 gap-2">
        {INBOX_CHANNELS.map((channel) => (
          <Link key={channel.key} href={withDrawer(url, { d: "inbox", ch: channel.key })} scroll={false} className={cell}>
            <CIcon name={channel.icon} />
            {channel.label}
            {counts.waiting[channel.key] ? <span className="absolute right-2 top-2 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{counts.waiting[channel.key]}</span> : null}
          </Link>
        ))}
      </div>
    </Frame>
  );
}
