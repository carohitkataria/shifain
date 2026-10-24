/**
 * The patient's journey once a plan exists: who is looking after them, what is
 * booked, what is still open. Pure functions only, so the to-do list, the
 * calendar and the plan status read the same everywhere (patient app,
 * coordinator desk, admin) and can be tested without a database.
 */

// ---------------------------------------------------------------- types

export type ProviderKind = "driver" | "hotel" | "interpreter";

/** A driver and vehicle, a partner hotel or an interpreter the desk can assign to a case. */
export type Provider = {
  _id: string;
  kind: ProviderKind;
  name: string;
  phone: string | null;
  /** A Telegram username (without @) or phone. */
  telegram: string | null;
  whatsapp: string | null;
  city: string | null;
  languages: string[];
  /** Drivers. */
  vehicle: { model: string | null; plate: string | null; colour: string | null; seats: number | null } | null;
  /** Hotels. */
  address: string | null;
  hospitalIds: string[];
  distanceKm: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  note: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Who looks after the case, set by the desk. The hospital and doctor default to the ones the patient asked for. */
export type CareTeam = {
  coordinatorId: string | null;
  hospitalId: string | null;
  doctorId: string | null;
  driverId: string | null;
  interpreterId: string | null;
  hotelId: string | null;
  room: string | null;
  /** YYYY-MM-DD */
  checkIn: string | null;
  checkOut: string | null;
  wifi: string | null;
  /** Ward and bed at the hospital, once admitted. */
  ward: string | null;
  updatedAt: string | null;
};

export const JOURNEY_KINDS = [
  "visa",
  "flight-in",
  "pickup",
  "hotel",
  "consult",
  "admission",
  "procedure",
  "physio",
  "discharge",
  "follow-up",
  "flight-out",
  "other",
] as const;
export type JourneyKind = (typeof JOURNEY_KINDS)[number];
export type JourneyStatus = "pending" | "booked" | "done" | "cancelled";

/** One dated element of the trip, booked and kept current by the desk. */
export type JourneyItem = {
  id: string;
  kind: JourneyKind;
  title: string;
  status: JourneyStatus;
  /** YYYY-MM-DD */
  date: string | null;
  /** HH:MM */
  time: string | null;
  place: string | null;
  detail: string | null;
  bring: string | null;
  updatedAt: string;
};

export const RIDE_STATUSES = ["requested", "assigned", "on-the-way", "arrived", "completed", "cancelled"] as const;
export type RideStatus = (typeof RIDE_STATUSES)[number];
export const RIDE_PLACES = ["hospital", "hotel", "airport", "pharmacy", "food", "other"] as const;
export type RidePlace = (typeof RIDE_PLACES)[number];

/** A car the patient called. Progress is set by the desk; it is an open item until it is completed or cancelled. */
export type Ride = {
  id: string;
  to: RidePlace;
  /** Free text when `to` is "other", or the desk's note on the address. */
  address: string | null;
  /** "now", or YYYY-MM-DDTHH:MM local time. */
  when: string;
  passengers: number;
  status: RideStatus;
  driverId: string | null;
  note: string | null;
  requestedAt: string;
  updatedAt: string;
};

export type CaseTask = {
  id: string;
  title: string;
  detail: string | null;
  /** YYYY-MM-DD */
  due: string | null;
  /** Who has to act: the patient, or the desk. */
  owner: "patient" | "desk";
  /** A portal section the task is done in. */
  section: string | null;
  status: "open" | "done";
  createdAt: string;
  doneAt: string | null;
};

export const CHANGE_REASONS = ["opinion", "language", "gender", "dates", "cost", "other"] as const;
export type ChangeReason = (typeof CHANGE_REASONS)[number];

export type DoctorChangeRequest = {
  id: string;
  kind: "doctor-change";
  reasons: ChangeReason[];
  doctorId: string | null;
  note: string | null;
  status: "open" | "accepted" | "declined";
  reply: string | null;
  createdAt: string;
  updatedAt: string;
};

export const PERSONAL_EVENT_KINDS = ["family", "medicine", "note"] as const;
export type PersonalEvent = {
  id: string;
  kind: (typeof PERSONAL_EVENT_KINDS)[number];
  title: string;
  date: string;
  time: string | null;
  tellDesk: boolean;
  createdAt: string;
};

export const FAMILY_RELATIONS = ["spouse", "child", "parent", "sibling", "friend", "other"] as const;
export const FAMILY_ACCESS = ["reports", "calendar", "payments"] as const;
export type FamilyAccess = (typeof FAMILY_ACCESS)[number];

export type FamilyMember = {
  id: string;
  name: string;
  relation: (typeof FAMILY_RELATIONS)[number];
  phone: string | null;
  email: string | null;
  travelling: boolean;
  access: FamilyAccess[];
  passport: "missing" | "uploaded" | "verified";
  addedAt: string;
};

export type Payment = { id: string; amount: number; method: string; at: string; note: string | null };
export type Billing = {
  /** The confirmed, all-inclusive price; null until the hospital confirms it. */
  quote: number | null;
  currency: "USD" | "INR" | "EUR";
  lines: { label: string; amount: number }[];
  payments: Payment[];
  /** When or how the balance is due, in the desk's words. */
  dueNote: string | null;
};

export const DOC_KEYS = ["passport", "visa", "invitation", "ticket", "consent", "insurance"] as const;
export type DocKey = (typeof DOC_KEYS)[number];
export type DocStatus = "needed" | "uploaded" | "verified" | "issued" | "signed" | "optional";
export type DocItem = { key: DocKey; status: DocStatus; reportId: string | null; note: string | null; updatedAt: string };

export const CHANNELS = ["telegram", "whatsapp", "call", "email"] as const;
export type ContactChannel = (typeof CHANNELS)[number];

/** Everything the journey adds to a case. Each is optional: cases opened before a plan have none. */
export type JourneyFields = {
  care?: CareTeam;
  journey?: JourneyItem[];
  rides?: Ride[];
  tasks?: CaseTask[];
  requests?: DoctorChangeRequest[];
  events?: PersonalEvent[];
  /** The patient's own note on any calendar entry, by its id. */
  eventNotes?: Record<string, string>;
  family?: FamilyMember[];
  billing?: Billing;
  documents?: DocItem[];
};

/** What the journey reads from the case besides its own fields. */
export type CaseView = JourneyFields & {
  _id: string;
  status: string;
  plan: {
    itinerary: { day: string; title: string; detail: string }[];
    suggestedPackage: string[];
    missingReports: string[];
  } | null;
  reports: { id?: string; filename: string; kind?: string; source?: string }[];
  appointments?: { id: string; kind: string; date: string; window: string; status: string; confirmedSlot?: string | null; updatedAt: string; requestedAt: string }[];
  preferences?: { companionsVisible?: boolean; channels?: string[]; mainChannel?: string };
};

export const emptyCare = (): CareTeam => ({
  coordinatorId: null,
  hospitalId: null,
  doctorId: null,
  driverId: null,
  interpreterId: null,
  hotelId: null,
  room: null,
  checkIn: null,
  checkOut: null,
  wifi: null,
  ward: null,
  updatedAt: null,
});

// ---------------------------------------------------------------- helpers

export const isIsoDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
export const isTime = (value: unknown): value is string => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const addDays = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const live = (item: { status: string }) => item.status !== "cancelled";

export const OPEN_RIDE: RideStatus[] = ["requested", "assigned", "on-the-way", "arrived"];
export const rideStep = (status: RideStatus) => Math.max(0, ["requested", "assigned", "on-the-way", "arrived", "completed"].indexOf(status));

/** The first dated item of a kind that is still on. */
export const journeyOf = (record: Pick<CaseView, "journey">, kind: JourneyKind) =>
  (record.journey ?? []).filter((item) => item.kind === kind && live(item)).sort((a, b) => (a.date ?? "9").localeCompare(b.date ?? "9"))[0] ?? null;

/** When the patient lands: the inbound flight, else the hotel check-in. */
export function arrivalDate(record: Pick<CaseView, "journey" | "care">): string | null {
  const flight = journeyOf(record, "flight-in");
  if (flight?.date) return flight.date;
  return record.care?.checkIn ?? null;
}

export const paidTotal = (billing: Billing | undefined) => (billing?.payments ?? []).reduce((sum, item) => sum + item.amount, 0);
export const balanceDue = (billing: Billing | undefined) => (billing?.quote != null ? Math.max(0, billing.quote - paidTotal(billing)) : null);

/** The default checklist: a passport is always needed; the desk adds the rest as they apply. */
export function documentList(record: Pick<CaseView, "documents">): DocItem[] {
  const stored = record.documents ?? [];
  const passport = stored.find((item) => item.key === "passport") ?? { key: "passport" as const, status: "needed" as const, reportId: null, note: null, updatedAt: "" };
  return [passport, ...stored.filter((item) => item.key !== "passport")].sort((a, b) => DOC_KEYS.indexOf(a.key) - DOC_KEYS.indexOf(b.key));
}

// ---------------------------------------------------------------- journey stepper

export const STAGES = ["plan", "visa", "travel", "admit", "treat", "recover", "home"] as const;
export type Stage = (typeof STAGES)[number];

/** How many stages are behind the patient, from what is booked and today's date. */
export function stagesDone(record: CaseView, today: string): number {
  // A closed case is over, whatever was or was not booked through the app.
  if (record.status === "closed") return STAGES.length;
  const doneBy = (kind: JourneyKind) => {
    const item = journeyOf(record, kind);
    return Boolean(item && (item.status === "done" || (item.date && item.date < today) || (item.date === today && item.status === "booked" && kind !== "flight-out")));
  };
  const visa = documentList(record).find((item) => item.key === "visa");
  const checks = [
    Boolean(record.plan) && record.status !== "planning",
    visa ? visa.status === "issued" || visa.status === "verified" : doneBy("visa"),
    doneBy("flight-in") || doneBy("pickup"),
    doneBy("admission"),
    doneBy("procedure"),
    doneBy("discharge"),
    doneBy("flight-out") || record.status === "closed",
  ];
  let count = 0;
  for (const ok of checks) {
    if (!ok) break;
    count += 1;
  }
  return count;
}

// ---------------------------------------------------------------- plan status grid

export type PlanTileStatus = "ok" | "due" | "sch" | "off";
export type PlanTile = { key: string; icon: string; status: PlanTileStatus; value: string | null; detail: string | null };

const PACKAGE_FOR: Record<string, string> = {
  visa: "visa-support",
  flights: "flights",
  pickup: "airport-transfers",
  hotel: "accommodation",
  interpreter: "interpreter",
};

/** Nine tiles, one per element of the plan, from what the desk has booked. */
export function planTiles(record: CaseView, names: { driver?: string | null; hotel?: string | null; interpreter?: string | null }): PlanTile[] {
  const wants = (key: string) => !PACKAGE_FOR[key] || (record.plan?.suggestedPackage ?? []).includes(PACKAGE_FOR[key]);
  const dated = (item: JourneyItem | null, ok: boolean): PlanTile["status"] => (item ? (item.status === "done" || ok ? "ok" : item.status === "booked" ? "sch" : "due") : "due");
  const visa = documentList(record).find((item) => item.key === "visa");
  const flightIn = journeyOf(record, "flight-in");
  const admission = journeyOf(record, "admission");
  const procedure = journeyOf(record, "procedure");
  const physio = journeyOf(record, "physio") ?? journeyOf(record, "follow-up");
  const due = balanceDue(record.billing);
  const off = (key: string, tile: PlanTile): PlanTile => (wants(key) ? tile : { ...tile, status: "off", value: null });

  return [
    off("visa", {
      key: "visa",
      icon: "shield",
      status: visa ? (visa.status === "issued" || visa.status === "verified" ? "ok" : "due") : dated(journeyOf(record, "visa"), false),
      value: visa?.status ?? journeyOf(record, "visa")?.status ?? null,
      detail: visa?.note ?? null,
    }),
    off("flights", { key: "flights", icon: "plane", status: dated(flightIn, flightIn?.status === "booked"), value: flightIn?.date ?? null, detail: flightIn?.place ?? null }),
    off("pickup", { key: "pickup", icon: "car", status: names.driver ? "ok" : "due", value: names.driver ?? null, detail: null }),
    off("hotel", { key: "hotel", icon: "bed", status: names.hotel ? "ok" : "due", value: names.hotel ?? null, detail: record.care?.room ?? null }),
    off("interpreter", { key: "interpreter", icon: "translate", status: names.interpreter ? "ok" : "due", value: names.interpreter ?? null, detail: null }),
    { key: "admission", icon: "hospital", status: admission ? dated(admission, false) : "due", value: admission?.date ?? null, detail: admission?.place ?? null },
    { key: "procedure", icon: "heart", status: procedure ? dated(procedure, false) : "due", value: procedure?.date ?? null, detail: procedure?.place ?? null },
    { key: "physio", icon: "pill", status: physio ? dated(physio, false) : "off", value: physio?.date ?? null, detail: physio?.title ?? null },
    {
      key: "balance",
      icon: "wallet",
      status: due == null ? "off" : due === 0 ? "ok" : "due",
      value: due == null ? null : String(due),
      detail: record.billing?.dueNote ?? null,
    },
  ];
}

// ---------------------------------------------------------------- to-do

export type TodoItem = {
  id: string;
  /** What kind of open item it is, for its icon and wording. */
  kind: "task" | "document" | "family-passport" | "ride" | "call" | "doctor-change" | "balance" | "missing-report";
  /** Waiting on the patient, or on the desk. */
  owner: "patient" | "desk";
  title: string;
  sub: string | null;
  section: string;
  at: string;
};

/** Everything still open on the case, the patient's own actions first. */
export function todoList(record: CaseView): TodoItem[] {
  const items: TodoItem[] = [];
  for (const task of record.tasks ?? []) {
    if (task.status !== "open") continue;
    items.push({ id: `task-${task.id}`, kind: "task", owner: task.owner, title: task.title, sub: task.due ?? task.detail, section: task.section ?? "tasks", at: task.createdAt });
  }
  for (const doc of documentList(record)) {
    if (doc.status === "needed") items.push({ id: `doc-${doc.key}`, kind: "document", owner: "patient", title: doc.key, sub: doc.note, section: "documents", at: doc.updatedAt });
    if (doc.status === "uploaded") items.push({ id: `doc-${doc.key}`, kind: "document", owner: "desk", title: doc.key, sub: "uploaded", section: "documents", at: doc.updatedAt });
  }
  for (const member of record.family ?? []) {
    if (member.travelling && member.passport === "missing") {
      items.push({ id: `fam-${member.id}`, kind: "family-passport", owner: "patient", title: member.name, sub: null, section: "family", at: member.addedAt });
    }
  }
  for (const missing of record.plan?.missingReports ?? []) {
    items.push({ id: `missing-${missing.slice(0, 24)}`, kind: "missing-report", owner: "patient", title: missing, sub: null, section: "reports", at: "" });
  }
  for (const ride of record.rides ?? []) {
    if (OPEN_RIDE.includes(ride.status)) {
      items.push({ id: `ride-${ride.id}`, kind: "ride", owner: "desk", title: ride.to, sub: ride.status, section: "stay", at: ride.updatedAt });
    }
  }
  for (const call of record.appointments ?? []) {
    if (call.status === "requested") items.push({ id: `call-${call.id}`, kind: "call", owner: "desk", title: call.kind, sub: call.date, section: "calendar", at: call.requestedAt });
  }
  for (const request of record.requests ?? []) {
    if (request.status === "open") items.push({ id: `req-${request.id}`, kind: "doctor-change", owner: "desk", title: "doctor-change", sub: null, section: "case", at: request.createdAt });
  }
  const due = balanceDue(record.billing);
  if (due) items.push({ id: "balance", kind: "balance", owner: "patient", title: String(due), sub: record.billing?.dueNote ?? null, section: "payments", at: "" });
  return items.sort((a, b) => (a.owner === b.owner ? b.at.localeCompare(a.at) : a.owner === "patient" ? -1 : 1));
}

// ---------------------------------------------------------------- calendar

export type CalendarTone = "violet" | "sky" | "teal" | "amber" | "rose" | "green";
export type CalendarEvent = {
  id: string;
  /** YYYY-MM-DD; null for a plan day not yet tied to a date. */
  date: string | null;
  time: string | null;
  title: string;
  where: string | null;
  with: string | null;
  bring: string | null;
  tone: CalendarTone;
  source: "journey" | "plan" | "call" | "doctor" | "ride" | "mine";
  status: string | null;
};

const TONE: Record<JourneyKind, CalendarTone> = {
  visa: "green",
  "flight-in": "sky",
  pickup: "sky",
  hotel: "teal",
  consult: "violet",
  admission: "violet",
  procedure: "rose",
  physio: "violet",
  discharge: "violet",
  "follow-up": "violet",
  "flight-out": "sky",
  other: "teal",
};

const WINDOW_TIME: Record<string, string> = { morning: "10:00", afternoon: "14:00", evening: "18:00" };

/** The first day number in a plan line ("Day 3", "Days 4–5"), or null. */
export const planDayNumber = (label: string) => {
  const match = /(\d+)/.exec(label);
  return match ? Number(match[1]) : null;
};

/**
 * The calendar the plan creates. Booked journey items, calls, doctor visits,
 * rides and the patient's own entries; and the plan's day-by-day itinerary,
 * dated from the arrival once it is known, on any day the desk has not booked
 * yet. A re-plan rewrites the itinerary, so the calendar follows it.
 */
export function calendarEvents(
  record: CaseView,
  extra: { doctorVisits?: { id: string; date: string; start: string; status: string; doctor: string | null; place: string | null }[] } = {},
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const item of record.journey ?? []) {
    if (!live(item)) continue;
    events.push({ id: `j-${item.id}`, date: item.date, time: item.time, title: item.title, where: item.place, with: item.detail, bring: item.bring, tone: TONE[item.kind], source: "journey", status: item.status });
  }
  for (const visit of extra.doctorVisits ?? []) {
    if (visit.status === "cancelled") continue;
    events.push({ id: `d-${visit.id}`, date: visit.date, time: visit.start, title: visit.doctor ?? "Doctor", where: visit.place, with: null, bring: null, tone: "violet", source: "doctor", status: visit.status });
  }
  for (const call of record.appointments ?? []) {
    if (call.status !== "requested" && call.status !== "confirmed") continue;
    events.push({ id: `c-${call.id}`, date: call.date, time: WINDOW_TIME[call.window] ?? null, title: call.kind, where: call.confirmedSlot ?? null, with: null, bring: null, tone: "amber", source: "call", status: call.status });
  }
  for (const ride of record.rides ?? []) {
    if (ride.when === "now" || !live(ride)) continue;
    const [date, time] = ride.when.split("T");
    events.push({ id: `r-${ride.id}`, date, time: time ?? null, title: ride.to, where: ride.address, with: null, bring: null, tone: "sky", source: "ride", status: ride.status });
  }
  for (const own of record.events ?? []) {
    events.push({ id: `m-${own.id}`, date: own.date, time: own.time, title: own.title, where: null, with: null, bring: null, tone: "amber", source: "mine", status: null });
  }

  const arrival = arrivalDate(record);
  const booked = new Set(events.filter((event) => event.source === "journey" && event.date).map((event) => event.date));
  for (const [index, line] of (record.plan?.itinerary ?? []).entries()) {
    const day = planDayNumber(line.day);
    const date = arrival && day ? addDays(arrival, day - 1) : null;
    if (date && booked.has(date)) continue;
    events.push({ id: `p-${index}`, date, time: null, title: line.title, where: null, with: line.detail, bring: null, tone: "teal", source: "plan", status: line.day });
  }

  return events.sort((a, b) => `${a.date ?? "9999"}${a.time ?? "99"}`.localeCompare(`${b.date ?? "9999"}${b.time ?? "99"}`));
}

/** The next dated entry from now. */
export function nextEvent(events: CalendarEvent[], today: string, now = "00:00"): CalendarEvent | null {
  return events.find((event) => event.date && (event.date > today || (event.date === today && (event.time ?? "23:59") >= now))) ?? null;
}

// ---------------------------------------------------------------- notifications

export type FeedItem = { id: string; at: string; kind: string; title: string; sub: string | null; section: string };

/** What changed on the case, newest first, from the timestamps the records already carry. */
export function notificationFeed(record: CaseView, desk: { at: string; text: string }[] = []): FeedItem[] {
  const feed: FeedItem[] = [];
  for (const item of record.journey ?? []) {
    if (item.status !== "pending") feed.push({ id: `j-${item.id}-${item.updatedAt}`, at: item.updatedAt, kind: `journey-${item.status}`, title: item.title, sub: item.date, section: "calendar" });
  }
  for (const ride of record.rides ?? []) {
    if (ride.status !== "requested") feed.push({ id: `r-${ride.id}-${ride.updatedAt}`, at: ride.updatedAt, kind: `ride-${ride.status}`, title: ride.to, sub: null, section: "stay" });
  }
  for (const task of record.tasks ?? []) {
    if (task.owner === "patient") feed.push({ id: `t-${task.id}`, at: task.createdAt, kind: "task", title: task.title, sub: task.due, section: "tasks" });
  }
  for (const payment of record.billing?.payments ?? []) {
    feed.push({ id: `p-${payment.id}`, at: payment.at, kind: "payment", title: String(payment.amount), sub: record.billing?.currency ?? null, section: "payments" });
  }
  for (const doc of record.documents ?? []) {
    if (doc.updatedAt && doc.status !== "needed" && doc.status !== "uploaded") feed.push({ id: `d-${doc.key}-${doc.updatedAt}`, at: doc.updatedAt, kind: `doc-${doc.status}`, title: doc.key, sub: null, section: "documents" });
  }
  for (const call of record.appointments ?? []) {
    if (call.status === "confirmed" || call.status === "declined") feed.push({ id: `c-${call.id}`, at: call.updatedAt, kind: `call-${call.status}`, title: call.kind, sub: call.confirmedSlot ?? call.date, section: "calendar" });
  }
  for (const request of record.requests ?? []) {
    if (request.status !== "open") feed.push({ id: `q-${request.id}`, at: request.updatedAt, kind: `change-${request.status}`, title: "doctor-change", sub: request.reply, section: "case" });
  }
  for (const [index, message] of desk.entries()) {
    feed.push({ id: `m-${index}-${message.at}`, at: message.at, kind: "message", title: message.text.slice(0, 80), sub: null, section: "messages" });
  }
  return feed.filter((item) => item.at).sort((a, b) => b.at.localeCompare(a.at));
}

// ---------------------------------------------------------------- companions

export type CompanionCandidate = {
  reference: string;
  firstName: string;
  country: string;
  locale: string;
  visible: boolean;
  hotelId: string | null;
  hospitalId: string | null;
  city: string | null;
  from: string | null;
  to: string | null;
};

const overlaps = (a: CompanionCandidate, b: CompanionCandidate) =>
  !a.from || !b.from || ((b.to ?? b.from) >= a.from && (a.to ?? a.from) >= b.from);

/**
 * People from the same country, here at the same time, who both chose to be
 * seen: grouped by the same hotel, the same hospital, or the same city.
 */
export function companionMatches(me: CompanionCandidate, others: CompanionCandidate[]) {
  const pool = others.filter((other) => other.reference !== me.reference && other.visible && other.country === me.country && overlaps(me, other));
  return {
    hotel: me.hotelId ? pool.filter((other) => other.hotelId === me.hotelId) : [],
    hospital: me.hospitalId ? pool.filter((other) => other.hospitalId === me.hospitalId) : [],
    city: me.city ? pool.filter((other) => other.city && other.city.toLowerCase() === me.city!.toLowerCase()) : [],
  };
}

// ---------------------------------------------------------------- channels

/** Telegram is the everyday messenger in these countries (ISO codes); elsewhere WhatsApp. */
export const TELEGRAM_FIRST = new Set(["RU", "UA", "BY", "KZ", "UZ", "TJ", "KG", "TM", "GE", "AM", "AZ", "MD", "MN", "IR"]);
export const suggestedMessenger = (countryCode: string | null | undefined): "telegram" | "whatsapp" =>
  countryCode && TELEGRAM_FIRST.has(countryCode.toUpperCase()) ? "telegram" : "whatsapp";

/** The patient's chosen channels, or the suggestion for their country. */
export function contactChannels(
  preferences: { channels?: string[]; mainChannel?: string } | undefined,
  countryCode: string | null,
): { channels: ContactChannel[]; main: ContactChannel } {
  const chosen = (preferences?.channels ?? []).filter((item): item is ContactChannel => (CHANNELS as readonly string[]).includes(item));
  const suggested = suggestedMessenger(countryCode);
  const channels = chosen.length ? chosen : [suggested, "email" as const];
  const main = (CHANNELS as readonly string[]).includes(preferences?.mainChannel ?? "") && channels.includes(preferences!.mainChannel as ContactChannel)
    ? (preferences!.mainChannel as ContactChannel)
    : channels[0];
  return { channels, main };
}
