/**
 * Part B: every command declares the level it needs, the gate decides in code,
 * codes go only to contacts on the case, and speech never reads out a whole
 * number. No database, no AI.
 *
 *   node --experimental-strip-types scripts/test/access-levels.test.mts
 */
import assert from "node:assert/strict";
import { COMMAND_LEVELS, gate, levelOf, speakable } from "../../src/lib/access-levels.ts";
import { codeDestinations } from "../../src/lib/access-rules.ts";
import { COMMAND_NAMES, parseCommand } from "../../src/lib/voice/intents.ts";

// Every command has a declared level — and nothing is declared that is not a command.
for (const name of COMMAND_NAMES) assert.ok(COMMAND_LEVELS[name], `command "${name}" has no access level`);
assert.deepEqual(Object.keys(COMMAND_LEVELS).sort(), [...COMMAND_NAMES].sort());

// Who has what.
assert.equal(levelOf({ signedIn: false, conversationCase: null }), "public");
assert.equal(levelOf({ signedIn: false, conversationCase: "UZ48213" }), "conversation");
assert.equal(levelOf({ signedIn: true, conversationCase: null }), "verified");

// The gate.
const now = Date.parse("2026-10-31T12:00:00Z");
const hour = 3_600_000;
assert.equal(gate("hospitals", "public", null, 24, now), "allow", "public things for anyone");
assert.equal(gate("case_status", "conversation", null, 24, now), "allow", "the chat's own case status");
assert.equal(gate("my_cases", "conversation", null, 24, now), "verify", "all cases need a verified patient");
assert.equal(gate("reports", "conversation", null, 24, now), "verify", "reports at conversation level trigger a code, not the reports");
assert.equal(gate("add_service", "public", null, 24, now), "verify");
assert.equal(gate("reports", "verified", now - 2 * hour, 24, now), "allow", "a recent sign-in opens reports");
assert.equal(gate("reports", "verified", now - 25 * hour, 24, now), "reverify", "a day-old sign-in asks again");
assert.equal(gate("reports", "verified", null, 24, now), "reverify", "an unknown sign-in time asks again");
assert.equal(gate("add_email", "verified", now - 5 * hour, 4, now), "reverify", "the window is the setting");
assert.equal(gate("set_city", "verified", now - 72 * hour, 24, now), "allow", "a plan change is verified, not sensitive");

// "Show my reports" is its own command, in each language.
assert.equal(parseCommand("show my reports")?.name, "reports");
assert.equal(parseCommand("покажи мои анализы")?.name, "reports");
assert.equal(parseCommand("show my plan")?.name, "open_plan");

// A code goes only to contacts on the case.
const record = { patient: { phone: "+998 90 123 45 67", email: "aziz@example.com" }, accountEmail: null };
const all = { telegramVerifiedPhones: ["998901234567"], whatsapp: true, email: true };
assert.deepEqual(codeDestinations(record, all), [
  { via: "telegram", to: "998901234567" },
  { via: "whatsapp", to: "998901234567" },
  { via: "email", to: "aziz@example.com" },
]);
assert.deepEqual(
  codeDestinations(record, { telegramVerifiedPhones: ["998935550011"], whatsapp: false, email: false }),
  [],
  "a Telegram chat with another number is not the case's",
);
for (const destination of codeDestinations(record, all)) {
  assert.ok(destination.to === "998901234567" || destination.to === "aziz@example.com", "never anything but the case's own contacts");
}
assert.deepEqual(codeDestinations({ patient: { phone: "12345", email: null }, accountEmail: null }, all), [], "no whole number, no email: nowhere");

// Speech never reads out a whole number, email or case number.
assert.equal(speakable("Your case UZ48213 is open; we'll call +998 90 123 45 67 or write to aziz@example.com."), "Your case case ending 2 1 3 is open; we'll call number ending 4 5 6 7 or write to your email.");
assert.equal(speakable("Заявка UZ48213", "ru"), "Заявка заявка с окончанием 2 1 3");
assert.equal(speakable("SH-ABCD-1234-EFGH-5678"), "case ending 6 7 8");
assert.equal(speakable("It costs 4,500 to 6,000 USD"), "It costs 4,500 to 6,000 USD", "prices are not phone numbers");

console.log("access levels: every command declared, gate, code destinations and speech pass");
