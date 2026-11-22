/**
 * The visitor counter against the in-memory database: a person is counted
 * once a day, every page view is counted, and the report adds the days up.
 * Run with the scenario hooks, which put the fake database in place:
 *
 *   node --conditions=react-server --import ./scripts/test/scenario-hooks.mjs --experimental-strip-types scripts/test/visitor-store.test.mts
 */
import assert from "node:assert/strict";
const { resetFakeDb, fakeCollection } = await import("./fakes/db.mts");
const { recordVisit, visitorReport } = await import("../../src/lib/visitors.ts");

resetFakeDb();
const day1 = new Date("2026-11-20T10:00:00Z");
const day2 = new Date("2026-11-21T09:00:00Z");
const aziz = { ip: "203.0.113.7", userAgent: "Mozilla/5.0 (iPhone) Mobile" };
const dilnoza = { ip: "198.51.100.4", userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/130" };
const home = { page: "/", lang: "uz", source: "Telegram", device: "phone", country: "UZ" } as const;

await recordVisit(home, aziz, day1);
await recordVisit({ ...home, page: "/treatments", source: "Direct" }, aziz, day1); // same person, same day
await recordVisit({ page: "/", lang: "ru", source: "Google", device: "computer", country: "KZ" }, dilnoza, day1);
await recordVisit(home, aziz, day2); // a new day counts again

const report = await visitorReport(3, new Date("2026-11-21T23:00:00Z"));
assert.equal(report.visitors, 3); // Aziz on two days, Dilnoza once
assert.equal(report.views, 4);
assert.deepEqual(report.days.map((item) => [item.day, item.visitors, item.views]), [["2026-11-19", 0, 0], ["2026-11-20", 2, 3], ["2026-11-21", 1, 1]]);
assert.deepEqual(report.pages, [{ key: "/", value: 3 }, { key: "/treatments", value: 1 }]);
assert.deepEqual(report.sources, [{ key: "Telegram", value: 2 }, { key: "Google", value: 1 }]); // the page they landed on decides
assert.deepEqual(report.countries, [{ key: "UZ", value: 2 }, { key: "KZ", value: 1 }]);
assert.equal(report.since, "2026-11-20");

// nothing identifying is stored: no address, no browser description
const stored = JSON.stringify([...fakeCollection("visit_counts"), ...fakeCollection("visit_seen")]);
assert.ok(!stored.includes("203.0.113.7") && !stored.includes("iPhone") && !stored.includes("198.51.100.4"));

console.log("visitor store: once a day per person, every view, days added up, nothing identifying kept");
