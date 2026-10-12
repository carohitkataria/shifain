/**
 * The assistant's code-driven parts: reading contact details from what a
 * patient says or types, and matching their questions to the knowledge the
 * team has written. No database, no AI.
 *
 *   node --experimental-strip-types scripts/test/assistant.test.mts
 */
import assert from "node:assert/strict";
import {
  guessLanguage,
  countryFromDial,
  nextProfileStep,
  readCountry,
  readName,
  readProfileAnswer,
} from "../../src/lib/assistant/profile.ts";
import { instantAnswer, knowledgeForPrompt } from "../../src/lib/assistant/knowledge.ts";
import type { KnowledgeEntry } from "../../src/lib/assistant/config.ts";

// names
assert.equal(readName("My name is rohit kataria"), "Rohit Kataria");
assert.equal(readName("Anna Petrova."), "Anna Petrova");
assert.equal(readName("Меня зовут Анна"), "Анна");
assert.equal(readName("Mening ismim Dilnoza"), "Dilnoza");
assert.equal(readName("McDonald O'Neil"), "McDonald O'Neil");
assert.equal(readName("yes"), undefined);
assert.equal(readName("what is the best plan for me for heart surgery"), undefined);
assert.equal(readName("+998 90 123 45 67"), undefined);

// phone and the country it implies
assert.deepEqual(readProfileAnswer("phone", "plus nine nine eight 90 123 45 67"), { value: "998901234567", country: "Uzbekistan" });
assert.equal(readProfileAnswer("phone", "I don't have one").value, undefined);
assert.equal(countryFromDial("8801712345678"), "Bangladesh");
assert.equal(countryFromDial("79161234567"), undefined); // +7: Russia or Kazakhstan, so we ask
assert.equal(countryFromDial("2348031234567"), "Nigeria");

// country
assert.equal(readCountry("I'm from Uzbekistan"), "Uzbekistan");
assert.equal(readCountry("Узбекистан"), "Uzbekistan");
assert.equal(readCountry("o'zbekiston"), "Uzbekistan");
assert.equal(readCountry("Казахстан"), "Kazakhstan");
assert.equal(readCountry("from Dubai"), "United Arab Emirates");
assert.equal(readProfileAnswer("country", "Narnia").value, "Narnia"); // kept as typed rather than refused

// email, or skipping it
assert.deepEqual(readProfileAnswer("email", "rohit dot k at gmail dot com"), { value: "rohit.k@gmail.com" });
assert.deepEqual(readProfileAnswer("email", "skip"), { skipped: true });
assert.deepEqual(readProfileAnswer("email", "Пропустить"), { skipped: true });
assert.deepEqual(readProfileAnswer("email", "hmm"), {});

// order of questions
assert.equal(nextProfileStep({ name: null, phone: null, country: null }), "name");
assert.equal(nextProfileStep({ name: "A", phone: null, country: null }), "phone");
assert.equal(nextProfileStep({ name: "A", phone: "998", country: null }), "country");
assert.equal(nextProfileStep({ name: "A", phone: "998", country: "Uzbekistan" }), "email");
assert.equal(nextProfileStep({ name: "A", phone: "998", country: "Uzbekistan", emailSkipped: true }), null);

// knowledge
const entries: KnowledgeEntry[] = [
  { id: "1", title: "Visa", answer: { en: "You need a passport.", ru: "Нужен паспорт." }, keywords: ["visa", "виза"], instant: true, enabled: true },
  { id: "2", title: "Payment", answer: { en: "Pay the hospital directly." }, keywords: ["payment", "pay"], instant: false, enabled: true },
  { id: "3", title: "Old", answer: { en: "Retired." }, keywords: ["visa"], instant: true, enabled: false },
];
assert.equal(instantAnswer("Do I need a visa?", entries, "en")?.text, "You need a passport.");
assert.equal(instantAnswer("Нужна ли виза?", entries, "ru")?.text, "Нужен паспорт.");
assert.equal(instantAnswer("Нужна ли виза?", entries, "uz")?.text, "You need a passport."); // falls back to English
assert.equal(instantAnswer("How do I pay?", entries, "en"), null); // not marked instant: the AI uses it instead
assert.equal(
  instantAnswer("My father has had chest pain for months and the doctor in Tashkent said he may need a bypass, and we also need a visa to travel", entries, "en"),
  null,
); // a story, not a quick question
assert.match(knowledgeForPrompt("how do I pay", entries), /^- Payment/);
assert.doesNotMatch(knowledgeForPrompt("anything", entries), /Retired/);

// language
assert.equal(guessLanguage("У меня болит сердце"), "ru");
assert.equal(guessLanguage("Menga yordam kerak"), "uz");
assert.equal(guessLanguage("I have chest pain"), "en");
assert.equal(guessLanguage("+998 90 123"), null);
assert.equal(guessLanguage("Anna"), null);

console.log("assistant: profile readers and knowledge matching pass");
