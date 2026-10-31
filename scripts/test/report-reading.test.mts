/**
 * Reading a report in the chat (src/lib/assistant/report-rules.ts): what the
 * AI is asked, how its answer is checked, and how the reply is built. No AI.
 *
 *   node --experimental-strip-types scripts/test/report-reading.test.mts
 */
import assert from "node:assert/strict";
import { hospitalList, mergeCondition, readReportResult, reportPrompt } from "../../src/lib/assistant/report-rules.ts";

const specialties = [
  { code: "cardiology", name: "Cardiology" },
  { code: "orthopaedics", name: "Orthopaedics" },
];

// The prompt: the patient's language, the catalogue's specialties, and no diagnosis of its own.
const prompt = reportPrompt("Russian", specialties, "это мой анализ");
assert.match(prompt.system, /written in Russian/);
assert.match(prompt.system, /cardiology \(Cardiology\)/);
assert.match(prompt.system, /never add a diagnosis of your own/i);
assert.match(prompt.user, /это мой анализ/);

// A lab report, read.
const reading = readReportResult(
  {
    isMedical: true,
    documentType: "Lipid panel",
    findings: "LDL cholesterol 4.9 mmol/L, marked high; triglycerides 2.6 mmol/L, high.",
    specialtyCode: "cardiology",
    treatment: "cardiology evaluation",
    condition: "High LDL cholesterol and triglycerides on a recent blood test.",
    urgent: false,
    reply: "Это анализ липидов: в нём отмечен повышенный холестерин ЛПНП. Обычно этим занимается кардиолог. Наши врачи изучат его для вашего бесплатного плана.",
  },
  specialties,
);
assert.ok(reading);
assert.equal(reading.specialtyCode, "cardiology");
assert.equal(reading.treatment, "cardiology evaluation");
assert.equal(reading.urgent, false);

// A specialty the catalogue does not hold is dropped, so no hospital list is invented for it.
assert.equal(readReportResult({ isMedical: true, specialtyCode: "astrology", reply: "…" }, specialties)?.specialtyCode, null);

// Not a medical document: nothing reaches the intake.
const holiday = readReportResult({ isMedical: false, documentType: "Hotel booking", findings: "x", specialtyCode: "cardiology", treatment: "x", condition: "x", urgent: true, reply: "This looks like a hotel booking." }, specialties);
assert.ok(holiday);
assert.equal(holiday.findings, "");
assert.equal(holiday.specialtyCode, null);
assert.equal(holiday.treatment, "");
assert.equal(holiday.condition, "");
assert.equal(holiday.urgent, false);

// No words for the patient: not a reading at all.
assert.equal(readReportResult({ isMedical: true, reply: "  " }, specialties), null);

// The reply names at most three hospitals.
assert.equal(
  hospitalList([
    { name: "A", city: "Delhi" },
    { name: "B", city: "Gurugram" },
    { name: "C", city: "Chennai" },
    { name: "D", city: "Mumbai" },
  ]),
  "A (Delhi), B (Gurugram), C (Chennai)",
);

// The intake keeps what the patient said and adds what each report shows, once.
assert.equal(mergeCondition(null, "High LDL."), "Report: High LDL.");
assert.equal(mergeCondition("Chest pain when walking.", "High LDL."), "Chest pain when walking. Report: High LDL.");
assert.equal(mergeCondition("Chest pain. Report: High LDL.", "High LDL."), "Chest pain. Report: High LDL.");
assert.equal(mergeCondition("Chest pain.", ""), "Chest pain.");

console.log("report reading: prompt, checks and reply pieces pass");
