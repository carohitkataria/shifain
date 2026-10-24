import "server-only";
import { cache } from "react";
import { readOr } from "./db";
import type { L } from "./content-types";
import type { CaseStatus } from "./cases";
import type { CrmMessage } from "./crm-messages";
import type { JourneyCase } from "./journey";
import type { PartnerApplication } from "./partners";
import type { PartnerUser } from "./partner-auth";
import type { Provider } from "./journey-rules";
import { arrivalDate, balanceDue, journeyOf, OPEN_RIDE } from "./journey-rules";
import { indiaNow, indiaToday } from "./patient-app";
import { listWebChats, type WebChatSummary } from "./web-intake";
import type { Appointment } from "./patient-portal";

/**
 * What the owner console reads besides the pages it already had: the badges on
 * the rail and ribbon, what needs someone now, every conversation across the
 * channels, the cases as a board, and what is happening on the ground today.
 * Every read falls back to nothing when the database is away, so the console
 * still opens.
 */

export type ConsoleCase = JourneyCase & { appointments?: Appointment[] };

// ---------------------------------------------------------------- stages

/** The board's columns. "In treatment" is a confirmed case whose patient has arrived. */
export const BOARD = [
  { key: "new", label: "New", color: "#7c3aed" },
  { key: "planning", label: "Planning", color: "#0284c7" },
  { key: "planned", label: "Plan ready", color: "#0d9488" },
  { key: "confirmed", label: "Confirmed", color: "#f08c1e" },
  { key: "treatment", label: "In treatment", color: "#e11d48" },
  { key: "closed", label: "Closed", color: "#9aa3b5" },
] as const;
export type BoardKey = (typeof BOARD)[number]["key"];

export const STATUS_LABEL: Record<CaseStatus, string> = {
  new: "Received",
  planning: "Reading reports",
  planned: "Plan ready",
  "plan-failed": "Needs a coordinator",
  confirmed: "Confirmed",
  closed: "Closed",
};

export const STATUSES: CaseStatus[] = ["new", "planning", "planned", "plan-failed", "confirmed", "closed"];

/** Whether the patient is here: arrived, and not yet flown home. */
export function isHere(record: ConsoleCase, today = indiaToday()): boolean {
  if (record.status !== "confirmed") return false;
  const arrival = arrivalDate(record);
  if (!arrival || arrival > today) return false;
  const out = journeyOf(record, "flight-out");
  return !(out?.date && out.date < today);
}

export function boardKey(record: ConsoleCase, today = indiaToday()): BoardKey {
  if (record.status === "plan-failed") return "planning";
  if (record.status === "confirmed") return isHere(record, today) ? "treatment" : "confirmed";
  return record.status;
}

// ---------------------------------------------------------------- shared reads

const activeCasesRead = cache(() =>
  readOr<ConsoleCase[]>([], (db) => db.collection<ConsoleCase>("cases").find({}).sort({ updatedAt: -1, createdAt: -1 }).limit(600).toArray()),
);

/** Every case the console works with, newest activity first. Cached per request. */
export const allCases = activeCasesRead;

const coordinatorsRead = cache(() =>
  readOr<Pick<PartnerUser, "_id" | "name" | "email" | "status">[]>([], (db) =>
    db.collection<PartnerUser>("partner_users").find({ role: "coordinator" }, { projection: { name: 1, email: 1, status: 1 } }).sort({ name: 1 }).toArray(),
  ),
);
export const consoleCoordinators = coordinatorsRead;

const providersRead = cache(() => readOr<Provider[]>([], (db) => db.collection<Provider>("providers").find({}).sort({ kind: 1, name: 1 }).toArray()));
export const consoleProviders = providersRead;

const hospitalNamesRead = cache(() =>
  readOr<{ _id: string; name: string; city?: string }[]>([], (db) => db.collection<{ _id: string; name: string; city?: string }>("hospitals").find({}, { projection: { name: 1, city: 1 } }).toArray()),
);

const treatmentNamesRead = cache(() => readOr<{ _id: string; name: L }[]>([], (db) => db.collection<{ _id: string; name: L }>("treatments").find({}, { projection: { name: 1 } }).toArray()));

const messagesRead = cache(() =>
  readOr<CrmMessage[]>([], (db) => db.collection<CrmMessage>("crm_messages").find({}).sort({ createdAt: -1 }).limit(1500).toArray()),
);

const webChatsRead = cache(() => readOr<WebChatSummary[]>([], () => listWebChats(80)));

// ---------------------------------------------------------------- inbox

export type InboxChannel = "telegram" | "whatsapp" | "email" | "portal" | "web";
export const INBOX_CHANNELS: { key: InboxChannel; label: string; icon: string; tone: "tg" | "wa" | "sky" | "brand" | "teal" }[] = [
  { key: "whatsapp", label: "WhatsApp", icon: "wa", tone: "wa" },
  { key: "telegram", label: "Telegram", icon: "tg", tone: "tg" },
  { key: "email", label: "Email", icon: "mail", tone: "sky" },
  { key: "portal", label: "Patient app", icon: "phone-d", tone: "brand" },
  { key: "web", label: "Website chat", icon: "msg", tone: "teal" },
];

export type Conversation = {
  key: string;
  channel: InboxChannel;
  name: string;
  caseRef: string | null;
  last: string;
  at: string;
  /** Messages from them since our last reply: what is waiting on us. */
  waiting: number;
  telegramChatId: number | null;
  botRole: "patient" | "partner" | null;
};

export type ThreadMessage = { id: string; out: boolean; text: string; at: string; who: string | null };

const asChannel = (channel: CrmMessage["channel"]): InboxChannel | null =>
  channel === "telegram" || channel === "whatsapp" || channel === "email" || channel === "portal" ? channel : null;

const keyOf = (message: CrmMessage) => `${message.channel}:${message.telegramChatId ?? message.caseReference ?? message.contactId ?? "none"}`;

/** Every conversation, one row each, newest first; website chats included. */
export const conversations = cache(async (): Promise<Conversation[]> => {
  const [messages, cases, chats] = await Promise.all([messagesRead(), activeCasesRead(), webChatsRead()]);
  const caseName = new Map(cases.map((item) => [item._id, item.patient.name]));
  const groups = new Map<string, CrmMessage[]>();
  for (const message of messages) {
    if (!asChannel(message.channel)) continue;
    const key = keyOf(message);
    const list = groups.get(key);
    if (list) list.push(message);
    else groups.set(key, [message]);
  }
  const rows: Conversation[] = [];
  for (const [key, list] of groups) {
    // Newest first, so the leading inbound run is what has not been answered.
    let waiting = 0;
    for (const message of list) {
      if (message.direction === "outbound") break;
      waiting += 1;
    }
    const latest = list[0];
    const inbound = list.find((message) => message.direction === "inbound" && message.senderName);
    const meta = (latest.metadata ?? {}) as { botRole?: string };
    rows.push({
      key,
      channel: asChannel(latest.channel)!,
      name: (latest.caseReference && caseName.get(latest.caseReference)) || inbound?.senderName || latest.caseReference || "Unknown",
      caseRef: latest.caseReference,
      last: latest.text,
      at: latest.createdAt,
      waiting,
      telegramChatId: latest.telegramChatId,
      botRole: meta.botRole === "partner" ? "partner" : latest.channel === "telegram" ? "patient" : null,
    });
  }
  for (const chat of chats) {
    const lastMessage = chat.lastMessage;
    rows.push({
      key: `web:${chat.id}`,
      channel: "web",
      name: chat.name || chat.phone || "Website visitor",
      caseRef: chat.caseReference,
      last: lastMessage?.content ?? "",
      at: chat.updatedAt,
      // A visitor waiting is one who asked for a person and has not been taken over.
      waiting: chat.humanRequestedAt && !chat.handoff ? 1 : 0,
      telegramChatId: null,
      botRole: null,
    });
  }
  return rows.sort((a, b) => b.at.localeCompare(a.at));
});

export async function waitingBy(): Promise<Record<InboxChannel | "all", number>> {
  const rows = await conversations();
  const out = { all: 0, telegram: 0, whatsapp: 0, email: 0, portal: 0, web: 0 } as Record<InboxChannel | "all", number>;
  for (const row of rows) {
    out[row.channel] += row.waiting;
    out.all += row.waiting;
  }
  return out;
}

/** One conversation's messages, oldest first. */
export async function threadOf(key: string): Promise<ThreadMessage[]> {
  if (key.startsWith("web:")) {
    const { findWebIntake } = await import("./web-intake");
    const intake = await readOr(null, () => findWebIntake(key.slice(4)));
    return (intake?.messages ?? []).map((message, index) => ({ id: `${index}`, out: message.role !== "user", text: message.content, at: message.ts, who: message.role === "assistant" ? "AI assistant" : message.role === "coordinator" ? "Coordinator" : null }));
  }
  const messages = await messagesRead();
  return messages
    .filter((message) => keyOf(message) === key)
    .slice(0, 200)
    .reverse()
    .map((message) => ({ id: message._id, out: message.direction === "outbound", text: message.text, at: message.createdAt, who: message.direction === "outbound" ? message.senderName : null }));
}

// ---------------------------------------------------------------- case rows

export type CaseRow = {
  id: string;
  name: string;
  initials: string;
  country: string;
  locale: string;
  treatment: string;
  hospital: string | null;
  status: CaseStatus;
  board: BoardKey;
  coordinatorId: string | null;
  coordinator: string | null;
  source: string;
  channel: InboxChannel | null;
  waiting: number;
  value: number | null;
  currency: string;
  updatedAt: string;
  next: string;
  flag: boolean;
  doctorChange: boolean;
  callRequest: boolean;
};

const SOURCE: Record<string, string> = { website: "Website", "web-chat": "Web chat", telegram: "Telegram", "partner-portal": "Partner", coordinator: "Desk" };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

/** What comes next on a case, in a few words. */
function nextOf(record: ConsoleCase, today: string): string {
  if (record.status === "plan-failed") return "Plan failed — read the reports";
  if (record.status === "new") return record.reports.length ? `${record.reports.length} report${record.reports.length === 1 ? "" : "s"} in, waiting` : "Waiting to be read";
  if (record.status === "planning") return "Plan being drafted";
  const call = (record.appointments ?? []).find((item) => item.status === "requested");
  if (call) return `Call requested ${call.date}, ${call.window}`;
  const upcoming = (record.journey ?? [])
    .filter((item) => item.status !== "cancelled" && item.status !== "done" && item.date && item.date >= today)
    .sort((a, b) => `${a.date}${a.time ?? ""}`.localeCompare(`${b.date}${b.time ?? ""}`))[0];
  if (upcoming) return `${upcoming.title} · ${upcoming.date === today ? "today" : upcoming.date}${upcoming.time ? ` ${upcoming.time}` : ""}`;
  if (record.status === "planned") return "Plan sent, waiting on the patient";
  if (record.status === "closed") return "Closed";
  return "Nothing booked yet";
}

export const caseRows = cache(async (): Promise<CaseRow[]> => {
  const [cases, coords, hospitals, treatments, convs] = await Promise.all([activeCasesRead(), coordinatorsRead(), hospitalNamesRead(), treatmentNamesRead(), conversations()]);
  const today = indiaToday();
  const coordName = new Map(coords.map((item) => [item._id, item.name]));
  const hospitalName = new Map(hospitals.map((item) => [item._id, item.name]));
  const treatmentName = new Map(treatments.map((item) => [item._id, item.name.en]));
  const waitingFor = new Map<string, { n: number; channel: InboxChannel }>();
  for (const row of convs) {
    if (!row.caseRef) continue;
    const current = waitingFor.get(row.caseRef);
    if (!current || row.waiting > current.n) waitingFor.set(row.caseRef, { n: Math.max(row.waiting, current?.n ?? 0), channel: row.channel });
  }
  return cases.map((record) => {
    const hospitalId = record.care?.hospitalId ?? record.requested?.hospitalId ?? null;
    const plan = record.plan as { recommendedTreatmentCode?: string | null } | null;
    const main = record.preferences?.mainChannel;
    const chat = waitingFor.get(record._id);
    return {
      id: record._id,
      name: record.patient.name,
      initials: initials(record.patient.name),
      country: record.patient.country,
      locale: record.locale,
      treatment: (plan?.recommendedTreatmentCode && treatmentName.get(plan.recommendedTreatmentCode)) || record.statedNeed || "Not yet known",
      hospital: (hospitalId && hospitalName.get(hospitalId)) || record.requested?.hospitalName || null,
      status: record.status,
      board: boardKey(record, today),
      coordinatorId: record.care?.coordinatorId ?? null,
      coordinator: (record.care?.coordinatorId && coordName.get(record.care.coordinatorId)) || null,
      source: SOURCE[record.source ?? ""] ?? (record.referredBy ? "Partner" : "Website"),
      channel: chat?.channel ?? (main === "telegram" ? "telegram" : main === "whatsapp" ? "whatsapp" : main === "email" ? "email" : null),
      waiting: chat?.n ?? 0,
      value: record.billing?.quote ?? null,
      currency: record.billing?.currency ?? "USD",
      updatedAt: record.updatedAt ?? record.createdAt,
      next: nextOf(record, today),
      flag: record.status === "plan-failed",
      doctorChange: (record.requests ?? []).some((item) => item.status === "open"),
      callRequest: (record.appointments ?? []).some((item) => item.status === "requested"),
    };
  });
});

// ---------------------------------------------------------------- on the ground

export type CareKind = "arrival" | "ride" | "hospital" | "departure" | "stay" | "other";
export type CareEvent = {
  id: string;
  caseRef: string;
  patient: string;
  locale: string;
  kind: CareKind;
  title: string;
  date: string;
  time: string | null;
  where: string | null;
  assigned: string | null;
  state: "done" | "now" | "next" | "unassigned";
  /** A ride, so the desk can set its progress and driver. */
  rideId: string | null;
};

const KIND_OF: Record<string, CareKind> = {
  "flight-in": "arrival",
  pickup: "arrival",
  "flight-out": "departure",
  hotel: "stay",
  consult: "hospital",
  admission: "hospital",
  procedure: "hospital",
  physio: "hospital",
  discharge: "hospital",
  "follow-up": "hospital",
};

export const addDays = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Everything dated on one day across live cases: journey items and the cars called. */
export async function careEvents(day: string): Promise<CareEvent[]> {
  const [cases, providers] = await Promise.all([activeCasesRead(), providersRead()]);
  const name = new Map(providers.map((item) => [item._id, item.name]));
  const today = indiaToday();
  const now = indiaNow();
  const stateOf = (date: string, time: string | null, done: boolean): CareEvent["state"] => {
    if (done) return "done";
    if (date === today && time && Math.abs(toMinutes(time) - toMinutes(now)) <= 45) return "now";
    return "next";
  };
  const out: CareEvent[] = [];
  for (const record of cases) {
    if (record.status === "closed") continue;
    for (const item of record.journey ?? []) {
      if (item.date !== day || item.status === "cancelled") continue;
      const kind = KIND_OF[item.kind] ?? "other";
      const assigned = kind === "arrival" ? name.get(record.care?.driverId ?? "") ?? null : name.get(record.care?.interpreterId ?? "") ?? null;
      out.push({
        id: `${record._id}:${item.id}`,
        caseRef: record._id,
        patient: record.patient.name,
        locale: record.locale,
        kind,
        title: item.title,
        date: item.date,
        time: item.time,
        where: item.place,
        assigned,
        state: stateOf(item.date, item.time, item.status === "done"),
        rideId: null,
      });
    }
    for (const ride of record.rides ?? []) {
      if (ride.status === "cancelled") continue;
      const date = ride.when === "now" ? ride.requestedAt.slice(0, 10) : ride.when.slice(0, 10);
      if (date !== day) continue;
      const time = ride.when === "now" ? null : ride.when.slice(11, 16);
      const driver = ride.driverId ? name.get(ride.driverId) ?? null : null;
      out.push({
        id: `${record._id}:${ride.id}`,
        caseRef: record._id,
        patient: record.patient.name,
        locale: record.locale,
        kind: "ride",
        title: `Car to ${ride.address || ride.to}`,
        date,
        time,
        where: ride.address,
        assigned: driver,
        state: ride.status === "completed" ? "done" : !driver ? "unassigned" : ride.status === "on-the-way" || ride.status === "arrived" ? "now" : stateOf(date, time, false),
        rideId: ride.id,
      });
    }
  }
  return out.sort((a, b) => (a.time ?? "00:00").localeCompare(b.time ?? "00:00"));
}

const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

// ---------------------------------------------------------------- needs you now

export type Notice = { icon: string; tone: "red" | "brand" | "amber" | "sky" | "teal" | "rose"; title: string; sub: string; href: string };

const caseLink = (reference: string, tab?: string) => `?d=case&ref=${encodeURIComponent(reference)}${tab ? `&tab=${tab}` : ""}`;

export const notifications = cache(async (): Promise<Notice[]> => {
  const [cases, apps, chats] = await Promise.all([
    activeCasesRead(),
    readOr<PartnerApplication[]>([], (db) => db.collection<PartnerApplication>("partner_applications").find({ status: { $in: ["new", "reviewing"] } }).toArray()),
    webChatsRead(),
  ]);
  const today = indiaToday();
  const soon = new Date(Date.now() + 3 * 86_400_000).toISOString();
  const out: Notice[] = [];
  for (const record of cases) {
    if (record.status === "plan-failed") out.push({ icon: "alert", tone: "red", title: `Plan failed for ${record.patient.name}`, sub: record.planError ?? "The planner could not read the reports", href: caseLink(record._id) });
    for (const request of record.requests ?? []) {
      if (request.status === "open") out.push({ icon: "repeat", tone: "brand", title: "Doctor change requested", sub: `${record.patient.name} — ${request.reasons.join(", ") || "no reason given"}`, href: caseLink(record._id) });
    }
    for (const call of record.appointments ?? []) {
      if (call.status === "requested") out.push({ icon: "phone", tone: "amber", title: "Call request waiting", sub: `${record.patient.name} — ${call.date}, ${call.window}`, href: caseLink(record._id) });
    }
    for (const ride of record.rides ?? []) {
      if (ride.status === "requested") out.push({ icon: "car", tone: "amber", title: "Car requested", sub: `${record.patient.name} — to ${ride.address || ride.to}${ride.when === "now" ? ", now" : `, ${ride.when.replace("T", " ")}`}`, href: caseLink(record._id, "schedule") });
    }
    for (const task of record.tasks ?? []) {
      if (task.status === "open" && task.owner === "desk" && (!task.due || task.due <= today)) out.push({ icon: "check", tone: "sky", title: task.title, sub: `${record.patient.name}${task.due ? ` · due ${task.due}` : ""}`, href: caseLink(record._id) });
    }
    if (record.reports.length && record.reportsExpireAt && record.reportsExpireAt < soon && record.reportsExpireAt > new Date().toISOString()) {
      out.push({ icon: "file", tone: "teal", title: "Reports expire soon", sub: `${record.patient.name} — ${record.reportsExpireAt.slice(0, 10)}`, href: "/admin/system/settings" });
    }
  }
  const fresh = cases.filter((record) => record.status === "new" && !record.care?.coordinatorId).length;
  if (fresh) out.push({ icon: "user-plus", tone: "brand", title: `${fresh} new case${fresh === 1 ? "" : "s"} without a coordinator`, sub: "Assign someone who speaks their language", href: "/admin/cases?f=unassigned" });
  if (apps.length) out.push({ icon: "users", tone: "sky", title: `${apps.length} partner application${apps.length === 1 ? "" : "s"}`, sub: "Waiting for a decision", href: "/admin/partners/applications" });
  const humans = chats.filter((chat) => chat.humanRequestedAt && !chat.handoff).length;
  if (humans) out.push({ icon: "msg", tone: "rose", title: `${humans} website visitor${humans === 1 ? "" : "s"} asked for a person`, sub: "Take over the chat", href: "?d=inbox&ch=web" });
  return out;
});

/** The badges on the rail and the ribbon. */
export async function badges() {
  const [rows, notices, waiting, apps] = await Promise.all([
    caseRows(),
    notifications(),
    waitingBy(),
    readOr<number>(0, (db) => db.collection("partner_applications").countDocuments({ status: { $in: ["new", "reviewing"] } })),
  ]);
  return {
    cases: rows.filter((row) => row.status === "new" && !row.coordinatorId).length,
    partners: apps,
    notifications: notices.length,
    waiting,
  };
}

// ---------------------------------------------------------------- home

export async function homeNumbers() {
  const [cases, rows] = await Promise.all([activeCasesRead(), caseRows()]);
  const today = indiaToday();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const thisWeek = cases.filter((record) => record.createdAt >= weekAgo).length;
  const lastWeek = cases.filter((record) => record.createdAt >= twoWeeksAgo && record.createdAt < weekAgo).length;
  const here = cases.filter((record) => isHere(record, today));
  const inAWeek = addDays(today, 7);
  const arriving = cases.filter((record) => {
    const arrival = arrivalDate(record);
    return record.status !== "closed" && arrival && arrival > today && arrival <= inAWeek;
  });
  const quoted = cases.filter((record) => record.status !== "closed" && record.billing?.quote && (record.billing.currency ?? "USD") === "USD");
  const pipeline = quoted.reduce((sum, record) => sum + (record.billing?.quote ?? 0), 0);
  const due = quoted.reduce((sum, record) => sum + (balanceDue(record.billing) ?? 0), 0);
  const trend = lastWeek ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : null;
  return {
    thisWeek,
    trend,
    active: rows.filter((row) => row.status !== "closed").length,
    here,
    arriving: arriving.length,
    pipeline,
    due,
    openRides: cases.reduce((sum, record) => sum + (record.rides ?? []).filter((ride) => OPEN_RIDE.includes(ride.status)).length, 0),
  };
}
