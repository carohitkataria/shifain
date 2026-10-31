/**
 * The command parser, without a database or an AI model: what patients say
 * in English, Russian and Uzbek maps to the right command, and what they say
 * about their illness does not.
 *
 *   node --experimental-strip-types scripts/test/voice-intents.test.mts
 */
import assert from "node:assert/strict";
import {
  parseCommand,
  readCode,
  readEmail,
  readPhone,
  readReference,
  readCompanions,
  restOf,
  yesNo,
} from "../../src/lib/voice/intents.ts";
import { guessGender, pickDeviceVoice, rankDeviceVoices } from "../../src/lib/voice/voices.ts";
import { differentTreatments, matchTreatment, newTreatmentRequest } from "../../src/lib/voice/treatments.ts";
import { readFile } from "node:fs/promises";
import path from "node:path";

const CITIES = ["Delhi", "Gurgaon", "Chennai", "Bangalore", "Mumbai", "Hyderabad"];

const expect: [string, string | null][] = [
  // account, plan, status
  ["Create my account", "start_case"],
  ["I want to make a plan for knee replacement", "start_case"],
  ["Зарегистрируйте меня", "start_case"],
  ["Reja tuzib bering", "start_case"],
  ["What's my case status?", "case_status"],
  ["Is my plan ready?", "case_status"],
  ["Какой статус моей заявки", "case_status"],
  ["Arizam qanday holatda", "case_status"],
  ["Show my plan", "open_plan"],
  ["Покажи мой план", "open_plan"],
  ["I want to edit my plan", "edit_plan"],
  ["Add visa support to my plan", "add_service"],
  ["I need an interpreter", "add_service"],
  ["Remove the hotel from my plan", "remove_service"],
  ["I don't need flights", "remove_service"],
  ["Уберите переводчика", "remove_service"],
  ["Tarjimon kerak emas", "remove_service"],
  ["I'd prefer Chennai instead", "set_city"],
  ["I will travel in March", "set_travel"],
  ["I'm coming with my wife", "set_companions"],
  ["Regenerate my plan", "replan"],
  ["I want to add more details", "add_details"],
  ["Add my email john@example.com", "add_email"],
  // account access
  ["Sign me in", "sign_in"],
  ["Войти", "sign_in"],
  ["Log out", "sign_out"],
  // browsing
  ["How much does a knee replacement cost?", "cost"],
  ["Сколько стоит шунтирование", "cost"],
  ["Show me hospitals in Delhi", "hospitals"],
  ["Find a cardiac surgeon", "doctors"],
  ["Take me home", "home"],
  ["Open my dashboard", "portal"],
  ["I want to upload my reports", "upload_report"],
  // people and settings
  ["Can I talk to a real person?", "human"],
  ["Call me back please", "human"],
  ["Message you on WhatsApp", "whatsapp"],
  ["Speak Russian please", "language"],
  ["Use a female voice", "voice"],
  ["Please speak slower", "voice"],
  ["Ayol ovozi bilan gapiring", "voice"],
  ["Repeat that", "repeat"],
  ["Cancel", "cancel"],
  ["What can you do?", "help"],
  ["I can't breathe and my chest hurts", "emergency"],
  // conversation, not commands
  ["My father has had chest pain for three months and the doctor said he needs a bypass", null],
  ["I lost my voice after the operation", null],
  ["Do I need a visa?", null],
  ["У меня болит колено уже два года", null],
  ["Hello", null],
  // the welcome's quick replies
  ["Get a free treatment plan", "start_case"],
  ["How much does treatment cost?", "cost"],
  ["Check my case", "case_status"],
  ["Talk to a person", "human"],
  ["Start a new case", "start_case"],
  ["Case status", "case_status"],
  ["Нужен план лечения", "start_case"],
  ["Статус моей заявки", "case_status"],
  ["Связаться с человеком", "human"],
  ["Открыть новую заявку", "start_case"],
  ["Bepul reja kerak", "start_case"],
  ["Arizam holati", "case_status"],
  ["Odam bilan gaplashish", "human"],
  ["Yangi ariza och", "start_case"],
  ["What is the best hospital for me?", null], // a question for the assistant, not a page to open
  ["My doctor told me I need surgery on my spine", null],
];

for (const [text, name] of expect) {
  assert.equal(parseCommand(text, CITIES)?.name ?? null, name, `"${text}" should be ${name}`);
}

// slots
assert.equal(parseCommand("Add visa support", CITIES)?.slots.service, "visa-support");
assert.equal(parseCommand("Remove airport pickup", CITIES)?.slots.service, "airport-transfers");
assert.equal(parseCommand("I'd prefer Bengaluru instead", CITIES)?.slots.city, "Bangalore");
assert.equal(parseCommand("Speak Uzbek", CITIES)?.slots.language, "uz");
assert.equal(parseCommand("Use a male voice", CITIES)?.slots.gender, "male");
assert.equal(parseCommand("Use a female voice", CITIES)?.slots.gender, "female");
assert.equal(parseCommand("Talk slower", CITIES)?.slots.rate, "slower");
assert.equal(parseCommand("I will travel in March", CITIES)?.slots.month, "March");
assert.equal(restOf("How much does a knee replacement cost in India?"), "knee replacement");
assert.equal(restOf("Сколько стоит шунтирование в Индии"), "шунтирование");

assert.equal(readEmail("john dot smith at gmail dot com"), "john.smith@gmail.com");
assert.equal(readEmail("my email is Anna@Mail.ru."), "anna@mail.ru");
assert.equal(readEmail("анна собака mail точка ru"), undefined); // Cyrillic local part is not an address
assert.equal(readEmail("anna собака mail точка ru"), "anna@mail.ru");
assert.equal(readCode("my code is 4 8 1 2 0 9"), "481209");
assert.equal(readCode("four eight one two oh nine"), "481209");
assert.equal(readCode("12345"), undefined);
assert.equal(readPhone("plus nine nine eight 90 123 45 67"), "998901234567");
assert.equal(readReference("S H dash A B C D dash 1 2 3 4 dash E F G H dash 5 6 7 8"), "SH-ABCD-1234-EFGH-5678");
assert.equal(readReference("sh-abcd-1234-efgh-5678"), "SH-ABCD-1234-EFGH-5678");
assert.equal(readReference("abc"), undefined);
// Case numbers: two letters and five digits, typed or read aloud.
assert.equal(readReference("UZ48213"), "UZ48213");
assert.equal(readReference("my case number is U Z 4 8 2 1 3"), "UZ48213");
assert.equal(readReference("номер uz 48 213"), "UZ48213");
assert.equal(readReference("UZ482139"), undefined, "six digits is not a case number");
assert.equal(readReference("is 48213"), undefined, "the two letters must start a word");
assert.equal(readCompanions("I'm coming alone"), 0);
assert.equal(readCompanions("two companions"), 2);

assert.equal(yesNo("Yes please"), "yes");
assert.equal(yesNo("Да"), "yes");
assert.equal(yesNo("Ha"), "yes");
assert.equal(yesNo("no thanks"), "no");
assert.equal(yesNo("Yo'q"), "no");
assert.equal(yesNo("maybe later in the week"), null);

// device voices
const voices = [
  { name: "Microsoft David - English (United States)", lang: "en-US", localService: true },
  { name: "Microsoft Aria Online (Natural) - English (United States)", lang: "en-US", localService: false },
  { name: "Google UK English Male", lang: "en-GB", localService: false },
  { name: "Microsoft Guy Online (Natural) - English (United States)", lang: "en-US", localService: false },
  { name: "Milena", lang: "ru-RU", localService: true },
];
assert.equal(rankDeviceVoices(voices, "en")[0].name.includes("Natural"), true);
assert.equal(pickDeviceVoice(voices, "en-US", { deviceName: "", gender: "male" })?.name, "Microsoft Guy Online (Natural) - English (United States)");
assert.equal(pickDeviceVoice(voices, "en-US", { deviceName: "", gender: "female" })?.name, "Microsoft Aria Online (Natural) - English (United States)");
assert.equal(pickDeviceVoice(voices, "ru", { deviceName: "", gender: "" })?.name, "Milena");
assert.equal(guessGender("Google UK English Male"), "male");

// spoken treatment names against the real catalogue
const treatments = JSON.parse(await readFile(path.join(process.cwd(), "src", "data", "catalogue", "treatments.json"), "utf8"));
const spoken: [string, string | null][] = [
  ["knee replacement", "total-knee-replacement"],
  ["heart bypass", "cabg"],
  ["шунтирование", "cabg"],
  ["пересадка почки", "kidney-transplant"],
  ["tizza", "total-knee-replacement"],
  ["ivf", "ivf-cycle"],
  ["cataract surgery", "phacoemulsification"],
  ["hair transplant", "hair-transplant"],
  ["gastric bypass", "gastric-bypass"],
  ["liver transplant", "liver-transplant"],
  ["cochlear implant", "cochlear-implant"],
  ["mastectomy", "mastectomy"],
  ["something unrelated", null],
  // A generic word alone ("full", "surgery") must not price a different treatment.
  ["full-body bionic upgrade", null],
  ["eye surgery", null],
  ["full mouth rehabilitation", "full-mouth-rehab"],
  ["total hip replacement", "total-hip-replacement"],
];
// A particular hospital goes to the assistant's tools, not the directory page.
assert.equal(parseCommand("Show me doctors at Medanta", ["Delhi"]), null);
assert.equal(parseCommand("покажи врачей в клинике Меданта", ["Delhi"]), null);
assert.equal(parseCommand("Artemisdagi shifokorlarni ko'rsat", ["Delhi"]), null);
assert.equal(parseCommand("look at hospitals", ["Delhi"])?.name, "hospitals");
assert.equal(parseCommand("open the doctors page", ["Delhi"])?.name, "doctors");
for (const [phrase, code] of spoken) {
  assert.equal(matchTreatment(phrase, treatments)?._id ?? null, code, `"${phrase}" should be ${code}`);
}

// A changed treatment is followed; a question about one, or the same one again, is not a change.
const switches: [string, string | null, string | null][] = [
  ["I want a knee replacement", "cabg", "total-knee-replacement"],
  ["Actually I need a hip replacement instead", "heart bypass surgery", "total-hip-replacement"],
  ["Мне нужна замена колена", "cabg", "total-knee-replacement"],
  ["I want a knee replacement", "total-knee-replacement", null],
  ["How much does a knee replacement cost?", "cabg", null],
  ["my knee hurts", "cabg", null],
];
for (const [text, current, code] of switches) {
  assert.equal(newTreatmentRequest(text, current, treatments)?._id ?? null, code, `"${text}" after ${current}`);
}
assert.equal(differentTreatments("knee replacement", "heart bypass surgery", treatments), true);
assert.equal(differentTreatments("total knee replacement", "knee replacement surgery", treatments), false);
assert.equal(differentTreatments("cardiology evaluation", "knee replacement", treatments), false);

console.log(`voice intents: ${expect.length} phrases, slot readers and treatment changes pass`);
