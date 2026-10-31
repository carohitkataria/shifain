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
import { instantAnswer, knowledgeForPrompt, sameWord, stem } from "../../src/lib/assistant/knowledge.ts";
import { maskContacts, suggestKeywords, worthListing } from "../../src/lib/assistant/unanswered-rules.ts";
import type { KnowledgeEntry } from "../../src/lib/assistant/config.ts";
import { orderFor, rankGeminiModels } from "../../src/lib/ai/providers.ts";
import { isGeneralQuestion } from "../../src/lib/assistant/stats.ts";

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
// Russian and Uzbek endings: any form of the keyword matches.
for (const asked of ["Нужна ли виза?", "Как получить визу?", "Сколько стоит оформление визы?", "А с визой помогаете?"]) {
  assert.equal(instantAnswer(asked, entries, "ru")?.text, "Нужен паспорт.", asked);
}
const uzEntries: KnowledgeEntry[] = [
  { id: "4", title: "Visa", answer: { en: "Passport.", uz: "Pasport kerak." }, keywords: ["viza"], instant: true, enabled: true },
  { id: "5", title: "Payment", answer: { en: "Pay the hospital.", ru: "Оплата в больнице." }, keywords: ["оплата", "to'lov"], instant: true, enabled: true },
];
for (const asked of ["Vizani qanday olaman?", "Vizaga yordam berasizmi?", "Vizalar qancha?"]) assert.equal(instantAnswer(asked, uzEntries, "uz")?.text, "Pasport kerak.", asked);
assert.equal(instantAnswer("Как происходит оплату?", uzEntries, "ru")?.text, "Оплата в больнице.");
assert.equal(instantAnswer("To'lovni qanday qilaman?", uzEntries, "uz")?.text, "Pay the hospital.");
assert.equal(stem("визу"), "виз");
assert.ok(sameWord("визани", "виза"), "Uzbek Cyrillic ending");
assert.equal(stem("vizaga"), "viza");
assert.ok(sameWord("лечения", "лечение"));
assert.ok(!sameWord("вид", "виза"), "a short different word is not a form of the keyword");
assert.ok(!sameWord("pay", "paper"));
assert.equal(instantAnswer("Где посмотреть вид на город?", entries, "ru"), null);
assert.match(knowledgeForPrompt("how do I pay", entries), /^- Payment/);
assert.doesNotMatch(knowledgeForPrompt("anything", entries), /Retired/);

// language
assert.equal(guessLanguage("У меня болит сердце"), "ru");
assert.equal(guessLanguage("Menga yordam kerak"), "uz");
assert.equal(guessLanguage("I have chest pain"), "en");
assert.equal(guessLanguage("Otam nafas ololmayapti"), "uz", "an Uzbek ending, no listed word");
assert.equal(guessLanguage("Салом, визага ёрдам берасизми?"), "uz", "Uzbek in Cyrillic");
assert.equal(guessLanguage("Тиззам оғрияпти"), "uz", "Uzbek letters");
assert.equal(guessLanguage("Сколько стоит лечение?"), "ru");
assert.equal(guessLanguage("Is yoga allowed after surgery?"), "en");
assert.equal(guessLanguage("+998 90 123"), null);
assert.equal(guessLanguage("Anna"), null);

// Gemini model order: chat tries the cheap, fast "lite" models first; plans the full ones
const listed = rankGeminiModels(
  ["gemini-3.8-flash", "gemini-3.8-flash-lite", "gemini-3.7-flash-lite", "gemini-3.9-flash-preview", "gemini-flash-latest", "gemini-3.8-flash-image"].map(
    (name) => ({ name: `models/${name}`, supportedGenerationMethods: ["generateContent"] }),
  ),
);
assert.deepEqual(orderFor(listed, "chat").slice(0, 2), ["gemini-3.8-flash-lite", "gemini-3.7-flash-lite"]);
assert.equal(orderFor(listed, "plan")[0], "gemini-flash-latest");
assert.ok(!listed.includes("gemini-3.9-flash-preview"), "previews are skipped while stable models exist");
assert.ok(!listed.includes("gemini-3.8-flash-image"));

// which questions are worth remembering for the team
assert.equal(isGeneralQuestion("Do I need a visa for India?"), true);
assert.equal(isGeneralQuestion("Сколько стоит замена колена?"), true);
assert.equal(isGeneralQuestion("Anna Petrova"), false);
assert.equal(isGeneralQuestion("My father has had chest pain for three months and the doctor in Tashkent says he needs a bypass soon"), false);

// Unanswered questions: contacts masked, keywords suggested.
assert.equal(maskContacts("Call me on +998 90 123 45 67 or a.b@mail.uz about UZ48213"), "Call me on [number] or [email] about [case]");
assert.equal(maskContacts("Is surgery possible at 72?"), "Is surgery possible at 72?", "a short number stays");
for (const said of ["my case uz48213", "my case U Z 48 213", "my case UZ 48213", "my case SH-AB12-CD34-EF56-GH78", "my case sh ab12 cd34 ef56 gh78", "my case AB12CD34EF56GH78", "my case 48213"]) {
  assert.doesNotMatch(maskContacts(said), /48\s?213|AB12|ab12|GH78/i, said);
}
assert.ok(worthListing("Do you arrange hotels?"));
assert.ok(!worthListing("ok"));
assert.deepEqual(suggestKeywords("Do you arrange hotels for my family?"), ["arrange", "hotels", "family"]);
assert.deepEqual(suggestKeywords("Сколько стоит гостиница для семьи?"), ["стоит", "гостиница", "семьи"]);
assert.deepEqual(suggestKeywords("Mehmonxona qancha turadi?"), ["mehmonxona", "turadi"]);

console.log("assistant: profile readers and knowledge matching pass");
