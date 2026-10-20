/**
 * Hospital onboarding rules, without a database: accreditation status from
 * dates, the review gate, and slots computed from a weekly rota.
 *
 *   node --experimental-strip-types scripts/test/onboarding.test.mts
 */
import assert from "node:assert/strict";
import { accreditationStatus, blockers, computeSlots, reviewGate, type GateInput } from "../../src/lib/onboarding-rules.ts";
import { describeRequest } from "../../src/lib/cases.ts";

const TODAY = "2026-10-18";

// accreditation status is derived from dates
assert.equal(accreditationStatus({ validFrom: "2025-01-01", validTo: "2028-01-01", revoked: false }, TODAY), "valid");
assert.equal(accreditationStatus({ validFrom: "2025-01-01", validTo: "2026-12-01", revoked: false }, TODAY), "expiring");
assert.equal(accreditationStatus({ validFrom: "2022-01-01", validTo: "2026-10-17", revoked: false }, TODAY), "expired");
assert.equal(accreditationStatus({ validFrom: "2025-01-01", validTo: "2028-01-01", revoked: true }, TODAY), "revoked");
assert.equal(accreditationStatus({ validFrom: null, validTo: "2028-01-01", revoked: false }, TODAY), "incomplete");

// the gate
const ready: GateInput = {
  hospital: {
    name: "Test Hospital",
    city: "Delhi",
    country: "India",
    hospitalType: "multi-specialty",
    specialtyCodes: ["cardiology"],
    accreditations: [{ code: "NABH", validFrom: "2025-01-01", validTo: "2028-01-01", revoked: false }],
  },
  doctors: [{ name: "Dr A", status: "active", consentToList: true, procedureCount: 2, scheduleCount: 3 }],
  packages: [{ name: "Angioplasty", status: "active", procedureInScope: true, procedureName: "Angioplasty" }],
  commercial: { agreementActive: true, agreementRef: "TIE-1" },
  today: TODAY,
};
assert.deepEqual(blockers(reviewGate(ready), "publish"), []);

const broken = reviewGate({
  ...ready,
  hospital: { ...ready.hospital, hospitalType: "", accreditations: [{ code: "JCI", validFrom: "2020-01-01", validTo: "2023-01-01", revoked: false }] },
  doctors: [{ name: "Dr B", status: "active", consentToList: false, procedureCount: 0, scheduleCount: 0 }],
  packages: [{ name: "Knee", status: "active", procedureInScope: false, procedureName: "Knee replacement" }],
  commercial: { agreementActive: false, agreementRef: null },
});
const steps = (list: typeof broken) => list.map((issue) => issue.step).sort();
assert.deepEqual(steps(blockers(broken, "submit")), ["accreditations", "basics", "doctors", "doctors", "packages"]);
assert.ok(blockers(broken, "publish").some((issue) => issue.step === "commercials"), "publishing needs a signed agreement");
assert.ok(!blockers(broken, "submit").some((issue) => issue.step === "commercials"), "submitting does not");
assert.ok(broken.some((issue) => issue.level === "warn" && /not agreed/.test(issue.message)));

// slots: Monday 09:00–10:00 in 20-minute slots, one booked, one blackout Monday
const slots = computeSlots({
  schedules: [{ hospitalId: "h1", day: "mon", from: "09:00", to: "10:00", slotMinutes: 20, consultType: "both" }],
  blackouts: [{ hospitalId: null, date: "2026-10-26", available: false }],
  booked: [{ hospitalId: "h1", date: "2026-10-19", start: "09:20", status: "confirmed" }],
  from: "2026-10-18", // a Sunday
  days: 14,
});
assert.deepEqual(
  slots.map((slot) => `${slot.date} ${slot.start}-${slot.end}`),
  ["2026-10-19 09:00-09:20", "2026-10-19 09:40-10:00"],
);
// validity window
assert.equal(
  computeSlots({
    schedules: [{ hospitalId: "h1", day: "mon", from: "09:00", to: "09:30", slotMinutes: 15, validFrom: "2026-11-01" }],
    blackouts: [],
    booked: [],
    from: "2026-10-18",
    days: 21,
  }).length,
  2,
);

// booking from a hospital or doctor page: the planner and coordinator are told who was asked for
assert.equal(describeRequest(null), null);
assert.equal(describeRequest({ hospitalId: null, hospitalName: null, doctorId: null, doctorName: null }), null);
assert.equal(
  describeRequest({ hospitalId: "h-a", hospitalName: "Artemis Hospital, Gurgaon", doctorId: null, doctorName: null }),
  "Artemis Hospital, Gurgaon",
);
assert.equal(
  describeRequest({ hospitalId: "h-a", hospitalName: "Artemis Hospital, Gurgaon", doctorId: "d-x", doctorName: "Dr. IPS Oberoi" }),
  "Dr. IPS Oberoi at Artemis Hospital, Gurgaon",
);

console.log("onboarding: accreditation status, review gate, slots and booking requests pass");
