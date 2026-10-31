/**
 * Part C: the assistant's data tools (src/lib/assistant/tool-rules.ts). The
 * hospital comes from the conversation, not the AI; only listed fields come
 * back; research-stage hospitals and unconsented doctors never appear.
 *
 *   node --experimental-strip-types scripts/test/tools.test.mts
 */
import assert from "node:assert/strict";
import {
  TOOL_DEFINITIONS,
  bandRow,
  doctorsAt,
  hospitalNamed,
  hospitalOnPage,
  hospitalsFor,
  languageCode,
  maskReference,
  matchSpecialty,
  type ToolDoctor,
  type ToolHospital,
} from "../../src/lib/assistant/tool-rules.ts";
import { COMMAND_LEVELS } from "../../src/lib/access-levels.ts";
import { parseCommand } from "../../src/lib/voice/intents.ts";

const published = { publication: { state: "published" } };
const research = { publication: { state: "research" } };
const hospital = (id: string, name: string, city: string, state = published): ToolHospital => ({
  _id: id,
  name,
  city,
  specialtyCodes: ["cardiology", "orthopaedics"],
  accreditations: [{ body: "JCI" }, "NABH"],
  ...state,
});
const artemis = hospital("h-artemis", "Artemis Hospital", "Gurugram");
const medanta = hospital("h-medanta", "Medanta – The Medicity", "Gurugram");
const apollo = hospital("h-apollo", "Indraprastha Apollo Hospital", "Delhi", research);

const doctor = (id: string, name: string, specialtyCode: string, extra: Partial<ToolDoctor> = {}): ToolDoctor => ({
  _id: id,
  name,
  consentToList: true,
  specialtyCode,
  specialties: [{ code: specialtyCode }],
  languages: ["en", "ru"],
  ...published,
  ...extra,
});
const doctors = [
  doctor("d-a1", "Dr Artemis Cardio", "cardiology"),
  doctor("d-a2", "Dr Artemis Ortho", "orthopaedics", { languages: ["en"] }),
  doctor("d-a3", "Dr Hidden", "cardiology", { consentToList: false }),
  doctor("d-m1", "Dr Medanta Cardio", "cardiology"),
  doctor("d-p1", "Dr Apollo Cardio", "cardiology"),
];
const links = [
  { hospitalId: "h-artemis", doctorId: "d-a1" },
  { hospitalId: "h-artemis", doctorId: "d-a2" },
  { hospitalId: "h-artemis", doctorId: "d-a3" },
  { hospitalId: "h-medanta", doctorId: "d-m1" },
  { hospitalId: "h-apollo", doctorId: "d-p1" },
];
const schedules = [
  { hospitalId: "h-artemis", doctorId: "d-a1", day: "wed" },
  { hospitalId: "h-artemis", doctorId: "d-a1", day: "mon" },
  { hospitalId: "h-medanta", doctorId: "d-a2", day: "fri" },
];
const specialties = [
  { _id: "cardiology", name: { en: "Cardiology" } },
  { _id: "orthopaedics", name: { en: "Orthopaedics" } },
  { _id: "neurology", name: { en: "Neurology" } },
];

// Every tool declares the level it needs; none asks the AI for a hospital or a case.
for (const tool of TOOL_DEFINITIONS) {
  assert.ok(["public", "conversation", "verified"].includes(tool.level), `${tool.name} has a level`);
  assert.ok(!Object.keys(tool.parameters).some((name) => /hospital|case|reference|phone|email/i.test(name)), `${tool.name} takes no hospital or case from the AI`);
}
assert.ok(COMMAND_LEVELS, "commands keep their own levels");

// With Artemis chosen, a cardiologist question returns only Artemis cardiologists who agreed to be listed.
const atArtemis = doctorsAt({ hospital: artemis, doctors, links, schedules, specialties, specialty: "cardiologist" });
assert.deepEqual(atArtemis.map((row) => row.name), ["Dr Artemis Cardio"]);
assert.deepEqual(atArtemis[0].days, ["mon", "wed"], "days at this hospital only, in order");
assert.deepEqual(Object.keys(atArtemis[0]).sort(), ["days", "languages", "name", "specialty"], "only the listed fields");
assert.deepEqual(atArtemis[0].languages, ["English", "Russian"]);
assert.deepEqual(doctorsAt({ hospital: artemis, doctors, links, schedules, specialties, language: "Russian" }).map((row) => row.name), ["Dr Artemis Cardio"]);

// A stale link is a past affiliation; a schedule only counts between its dates.
const moved = doctorsAt({
  hospital: artemis,
  doctors: [...doctors, doctor("d-a4", "Dr Former", "cardiology"), doctor("d-a5", "Dr Later", "cardiology")],
  links: [...links, { hospitalId: "h-artemis", doctorId: "d-a4", stale: true }],
  schedules: [
    { hospitalId: "h-artemis", doctorId: "d-a1", day: "wed" },
    { hospitalId: "h-artemis", doctorId: "d-a1", day: "fri", validTo: "2026-01-31" },
    { hospitalId: "h-artemis", doctorId: "d-a1", day: "sat", validFrom: "2027-03-01" },
    { hospitalId: "h-artemis", doctorId: "d-a5", day: "tue", validFrom: "2027-03-01" },
  ],
  specialties,
  specialty: "cardiology",
  today: "2026-10-31",
});
assert.deepEqual(moved.map((row) => row.name), ["Dr Artemis Cardio"], "no stale link, no schedule that has not started");
assert.deepEqual(moved[0].days, ["wed"], "expired and future schedule days are left out");

// Opened from a hospital's profile page: that hospital, by id only.
assert.equal(hospitalOnPage("/ru/hospitals/h-artemis"), "h-artemis");
assert.equal(hospitalOnPage("/en/hospitals/h%20x/"), "h x");
assert.equal(hospitalOnPage("/en/hospitals"), null);
assert.equal(hospitalOnPage("/en/doctors/d-1"), null);
assert.equal(hospitalOnPage(42), null);

// The patient names another hospital mid-chat: the list follows.
const switched = hospitalNamed("Actually, what about Medanta?", [artemis, medanta, apollo]);
assert.equal(switched?._id, "h-medanta");
assert.deepEqual(doctorsAt({ hospital: switched, doctors, links, schedules, specialties, specialty: "cardiology" }).map((row) => row.name), ["Dr Medanta Cardio"]);
assert.equal(hospitalNamed("Is the hospital good?", [artemis, medanta]), null, "a generic word names no hospital");

// A research-stage hospital never appears in any tool result.
assert.equal(hospitalNamed("What about Apollo?", [artemis, medanta, apollo]), null);
assert.deepEqual(doctorsAt({ hospital: apollo, doctors, links, schedules, specialties }), []);
const listed = hospitalsFor({ hospitals: [artemis, medanta, apollo] });
assert.deepEqual(listed.map((row) => row.name).sort(), ["Artemis Hospital", "Medanta – The Medicity"]);
assert.deepEqual(Object.keys(listed[0]).sort(), ["accreditation", "city", "name"]);
assert.deepEqual(listed[0].accreditation, ["JCI", "NABH"]);
assert.deepEqual(hospitalsFor({ hospitals: [artemis, apollo], city: "Delhi" }), [], "Delhi's only hospital here is research-stage");
assert.deepEqual(hospitalsFor({ hospitals: [artemis], specialtyCodes: ["neurology"] }), []);

// Matching what the AI passes.
assert.deepEqual(matchSpecialty("cardiologist", specialties), ["cardiology"]);
assert.deepEqual(matchSpecialty("orthopedic surgeon", specialties), ["orthopaedics"]);
assert.deepEqual(matchSpecialty("", specialties), []);
assert.equal(languageCode("Russian"), "ru");
assert.equal(languageCode("ru"), "ru");
assert.equal(languageCode("русский"), "ru");

// Prices are labelled indicative; case numbers are masked.
assert.match(bandRow("Knee replacement", { min: 4500, max: 6500, currency: "USD" })!.note, /indicative/);
assert.equal(bandRow("Knee replacement", null), null);
assert.equal(maskReference("UZ48213"), "…213");

// A question about a city goes to the assistant (and its tools); a preference still sets the city.
assert.equal(parseCommand("Which hospitals in Delhi do you work with?", ["Delhi"]), null);
assert.equal(parseCommand("I'd prefer Delhi", ["Delhi"])?.name, "set_city");

console.log("tools: hospital from the conversation, listed fields only, nothing unpublished");
