/**
 * Who may see what (src/lib/access-rules.ts) and the public chat's limiter.
 * No database, no cookies.
 *
 *   node --experimental-strip-types scripts/test/access.test.mts
 */
import assert from "node:assert/strict";
import {
  caseNumber,
  countryCodeFor,
  invitedMember,
  isCaseReference,
  mayViewPlan,
  phonesMatch,
  viewerOf,
  type Identity,
} from "../../src/lib/access-rules.ts";
import { allowHit } from "../../src/lib/rate-limit.ts";
import type { FamilyMember } from "../../src/lib/journey-rules.ts";

// ---------------------------------------------------------------- A2: a phone tail is not a phone number
assert.equal(phonesMatch("+998 90 123 45 67", "998901234567"), true, "same number, other spacing");
assert.equal(phonesMatch("+998 90 123 45 67", "90 123 45 67"), true, "without the country code");
assert.equal(phonesMatch("+998 90 123 45 67", "234567"), false, "a six-digit tail no longer signs in");
assert.equal(phonesMatch("+998 90 123 45 67", "01234567"), false, "eight digits are not a whole number");
assert.equal(phonesMatch("+998 90 123 45 67", "+7 90 123 45 67"), false, "the same tail behind another country code");
assert.equal(phonesMatch("", ""), false);
assert.equal(phonesMatch(null, "998901234567"), false);

// ---------------------------------------------------------------- A2: case numbers
assert.equal(countryCodeFor("Uzbekistan"), "UZ");
assert.equal(countryCodeFor("uzbekistan"), "UZ");
assert.equal(countryCodeFor("Unknown", "+998 90 123 45 67"), "UZ", "from the phone's country code");
assert.equal(countryCodeFor("Unknown", "+7 701 000 00 00"), "XX", "+7 is two countries: no guess");
assert.equal(countryCodeFor(null, null), "XX");
assert.equal(caseNumber("UZ", () => 0.48213), "UZ48213");
assert.equal(caseNumber("UZ", () => 0), "UZ00000", "always five digits");
assert.equal(caseNumber("uz?", () => 0.5), "XX50000", "a bad prefix is never used");
for (let i = 0; i < 200; i++) assert.match(caseNumber("KZ"), /^KZ\d{5}$/);
assert.equal(isCaseReference("UZ48213"), true);
assert.equal(isCaseReference("SH-ABCD-1234-EFGH-5678"), true, "older references stay valid");
assert.equal(isCaseReference("SH-ABCD-1234-EFGH"), true);
assert.equal(isCaseReference("UZ4821"), false);
assert.equal(isCaseReference("uz48213"), false, "callers upper-case first");

// ---------------------------------------------------------------- A3: family phones
const member = (phone: string, access: FamilyMember["access"]): FamilyMember => ({
  id: "f1",
  name: "Dilnoza",
  relation: "spouse",
  phone,
  email: null,
  travelling: false,
  access,
  passport: "missing",
  addedAt: "2026-10-01T00:00:00.000Z",
});
const record = (family: FamilyMember[]) => ({ patient: { phone: "+998 90 123 45 67", email: "aziz@example.com" }, accountEmail: null, family });
const patientPhone: Identity = { kind: "phone", digits: "998901234567" };
const familyPhone: Identity = { kind: "phone", digits: "998935550011" };

assert.deepEqual(viewerOf(patientPhone, record([])), { role: "patient" });
assert.deepEqual(viewerOf({ kind: "email", email: "Aziz@Example.com" }, record([])), { role: "patient" });
assert.equal(viewerOf(familyPhone, record([member("+998 93 555 00 11", [])])), null, "a family phone alone shows nothing");
assert.equal(invitedMember(familyPhone, record([member("+998 93 555 00 11", [])])), null);
assert.equal(viewerOf(familyPhone, record([member("+998 93 555 00 11", ["reports"])]))?.role, "family", "an invite with access does");
assert.equal(viewerOf({ kind: "phone", digits: "550011" }, record([member("+998 93 555 00 11", ["reports"])])), null, "and only for the whole number");
assert.equal(viewerOf({ kind: "email", email: "" }, { patient: { phone: "", email: "" }, accountEmail: "" }), null, "blank never matches blank");

// ---------------------------------------------------------------- the plan page
const nobody = { viewer: null, team: false, referrer: false, openedHere: false };
assert.equal(mayViewPlan(nobody), false, "a case number alone opens nothing");
assert.equal(mayViewPlan({ ...nobody, openedHere: true }), true, "the browser that opened the case");
assert.equal(mayViewPlan({ ...nobody, team: true }), true);
assert.equal(mayViewPlan({ ...nobody, referrer: true }), true);
assert.equal(mayViewPlan({ ...nobody, viewer: { role: "patient" } }), true);
assert.equal(mayViewPlan({ ...nobody, viewer: { role: "family", member: member("+998935550011", ["calendar"]) } }), false, "family without reports");
assert.equal(mayViewPlan({ ...nobody, viewer: { role: "family", member: member("+998935550011", ["reports"]) } }), true);

// ---------------------------------------------------------------- A4: the 31st turn in ten minutes waits
const key = `test-chat-${Date.now()}`;
const results = Array.from({ length: 31 }, () => allowHit(key, 30, 10 * 60_000));
assert.equal(results.slice(0, 30).every(Boolean), true);
assert.equal(results[30], false, "the 31st turn is refused");
assert.equal(allowHit(`${key}-other`, 30, 10 * 60_000), true, "another conversation is unaffected");

console.log("access: phone matching, case numbers, family invites, plan access and the chat limit pass");
