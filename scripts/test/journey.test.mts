/**
 * The patient journey, without a database: the to-do list, the calendar the
 * plan creates, the plan status tiles, the journey stepper, companions and
 * the messenger suggested for a country.
 *
 *   node --experimental-strip-types scripts/test/journey.test.mts
 */
import assert from "node:assert/strict";
import {
  calendarEvents,
  companionMatches,
  contactChannels,
  documentList,
  nextEvent,
  notificationFeed,
  planDayNumber,
  planTiles,
  rideStep,
  stagesDone,
  suggestedMessenger,
  todoList,
  type CaseView,
  type CompanionCandidate,
} from "../../src/lib/journey-rules.ts";

const NOW = "2026-10-20T10:00:00.000Z";
const plan = {
  itinerary: [
    { day: "Day 1", title: "Arrive", detail: "Pickup" },
    { day: "Day 2", title: "Consultation", detail: "Tests" },
    { day: "Days 3–4", title: "Surgery", detail: "Theatre" },
  ],
  suggestedPackage: ["flights", "airport-transfers", "accommodation"],
  missingReports: ["Blood tests"],
};
const base: CaseView = { _id: "SH-1", status: "confirmed", plan, reports: [] };

// messenger by country
assert.equal(suggestedMessenger("UZ"), "telegram");
assert.equal(suggestedMessenger("kz"), "telegram");
assert.equal(suggestedMessenger("KE"), "whatsapp");
assert.equal(suggestedMessenger(null), "whatsapp");
assert.deepEqual(contactChannels(undefined, "UZ"), { channels: ["telegram", "email"], main: "telegram" });
assert.deepEqual(contactChannels({ channels: ["whatsapp", "call"], mainChannel: "call" }, "UZ"), { channels: ["whatsapp", "call"], main: "call" });
assert.deepEqual(contactChannels({ channels: ["email"], mainChannel: "telegram" }, "UZ"), { channels: ["email"], main: "email" });

// the plan's day labels
assert.equal(planDayNumber("Day 1"), 1);
assert.equal(planDayNumber("Days 3–4"), 3);
assert.equal(planDayNumber("Arrival"), null);

// without an arrival, the plan's days are on the calendar but not dated
let events = calendarEvents(base);
assert.equal(events.filter((event) => event.source === "plan").length, 3);
assert.ok(events.every((event) => event.date === null));

// with an arrival, they are dated from it; a day the desk booked is not doubled
const booked: CaseView = {
  ...base,
  journey: [
    { id: "a", kind: "flight-in", title: "Land", status: "booked", date: "2026-11-02", time: "05:55", place: "DEL", detail: null, bring: null, updatedAt: NOW },
    { id: "b", kind: "procedure", title: "Surgery", status: "booked", date: "2026-11-04", time: "08:00", place: "OT 2", detail: null, bring: null, updatedAt: NOW },
    { id: "c", kind: "other", title: "Cancelled thing", status: "cancelled", date: "2026-11-05", time: null, place: null, detail: null, bring: null, updatedAt: NOW },
  ],
};
events = calendarEvents(booked);
assert.deepEqual(
  events.map((event) => [event.date, event.source, event.title]),
  [
    ["2026-11-02", "journey", "Land"],
    ["2026-11-03", "plan", "Consultation"],
    ["2026-11-04", "journey", "Surgery"],
  ],
);
assert.equal(nextEvent(events, "2026-11-03")?.title, "Consultation");
assert.equal(nextEvent(events, "2026-11-04", "09:00"), null);

// rides, calls and the patient's own entries join the calendar
events = calendarEvents({
  ...booked,
  rides: [{ id: "r", to: "hospital", address: null, when: "2026-11-03T08:30", passengers: 2, status: "assigned", driverId: null, note: null, requestedAt: NOW, updatedAt: NOW }],
  appointments: [{ id: "k", kind: "doctor", date: "2026-11-03", window: "afternoon", status: "requested", updatedAt: NOW, requestedAt: NOW }],
  events: [{ id: "m", kind: "family", title: "Son arrives", date: "2026-11-06", time: "14:00", tellDesk: true, createdAt: NOW }],
});
assert.deepEqual(
  events.filter((event) => event.date === "2026-11-03").map((event) => `${event.time} ${event.source}`),
  ["08:30 ride", "14:00 call", "null plan"],
);
assert.ok(events.some((event) => event.source === "mine" && event.date === "2026-11-06"));

// the to-do list: the patient's own first, then what the desk is doing
const todo = todoList({
  ...booked,
  tasks: [{ id: "t", title: "Sign consent", detail: null, due: "2026-10-30", owner: "patient", section: "documents", status: "open", createdAt: NOW, doneAt: null }],
  rides: [{ id: "r", to: "hotel", address: null, when: "now", passengers: 1, status: "on-the-way", driverId: null, note: null, requestedAt: NOW, updatedAt: NOW }],
  family: [{ id: "f", name: "Dilnoza", relation: "spouse", phone: null, email: null, travelling: true, access: [], passport: "missing", addedAt: NOW }],
  billing: { quote: 1000, currency: "USD", lines: [], payments: [{ id: "p", amount: 400, method: "card", at: NOW, note: null }], dueNote: null },
});
assert.deepEqual(
  todo.map((item) => `${item.owner}:${item.kind}`).sort(),
  ["desk:ride", "patient:balance", "patient:document", "patient:family-passport", "patient:missing-report", "patient:task"].sort(),
);
assert.equal(todo.find((item) => item.kind === "balance")?.title, "600");
assert.equal(todo.at(-1)?.owner, "desk");
assert.equal(rideStep("requested"), 0);
assert.equal(rideStep("arrived"), 3);
assert.equal(rideStep("completed"), 4);

// a passport is always on the checklist
assert.deepEqual(documentList(base).map((doc) => [doc.key, doc.status]), [["passport", "needed"]]);

// plan tiles: what is booked, what is still to do, what is not part of this plan
const tiles = planTiles({ ...booked, documents: [{ key: "visa", status: "issued", reportId: null, note: null, updatedAt: NOW }] }, { driver: "Ravi", hotel: null, interpreter: null });
const tile = (key: string) => tiles.find((item) => item.key === key)!;
assert.equal(tile("visa").status, "off"); // visa support is not in this plan's package
assert.equal(tile("flights").status, "ok"); // a booked inbound flight counts as done on the plan
assert.equal(tile("pickup").status, "ok");
assert.equal(tile("hotel").status, "due");
assert.equal(tile("interpreter").status, "off");
assert.equal(tile("balance").status, "off"); // no confirmed price yet

// the journey stepper
assert.equal(stagesDone(base, "2026-10-20"), 1); // plan, no visa yet
assert.equal(stagesDone({ ...booked, documents: [{ key: "visa", status: "issued", reportId: null, note: null, updatedAt: NOW }] }, "2026-11-03"), 3);

// notifications come from the records' own timestamps, newest first
const feed = notificationFeed(
  { ...booked, billing: { quote: 1000, currency: "USD", lines: [], payments: [{ id: "p", amount: 400, method: "card", at: "2026-10-21T00:00:00.000Z", note: null }], dueNote: null } },
  [{ at: "2026-10-22T00:00:00.000Z", text: "Hello" }],
);
assert.equal(feed[0].kind, "message");
assert.ok(feed.some((item) => item.kind === "payment"));

// companions: same country, overlapping dates, both visible
const me: CompanionCandidate = { reference: "A", firstName: "Aziz K.", country: "Uzbekistan", locale: "ru", visible: true, hotelId: "h1", hospitalId: "x", city: "Gurgaon", from: "2026-11-02", to: "2026-11-14" };
const others: CompanionCandidate[] = [
  { ...me, reference: "B", firstName: "Bek T." },
  { ...me, reference: "C", hotelId: "h2", from: "2026-12-01", to: "2026-12-10" },
  { ...me, reference: "D", country: "Kenya" },
  { ...me, reference: "E", visible: false },
  { ...me, reference: "F", hotelId: "h2", hospitalId: "y", city: "gurgaon", from: "2026-11-10", to: null },
];
const found = companionMatches(me, others);
assert.deepEqual(found.hotel.map((item) => item.reference), ["B"]);
assert.deepEqual(found.hospital.map((item) => item.reference), ["B"]);
assert.deepEqual(found.city.map((item) => item.reference), ["B", "F"]);

console.log("journey: calendar, to-do, plan tiles, stepper, notifications, companions and channels pass");
