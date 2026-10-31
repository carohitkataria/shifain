/**
 * Understands what a patient asked the app to do — "what's my case status",
 * "add visa support to my plan", "sign me in" — with plain patterns, in
 * English, Russian and Uzbek. No AI model is called here: most commands are
 * a handful of words, and matching them costs nothing and answers instantly.
 * Only a message that matches nothing goes on to the AI, which can still
 * name a command (see COMMAND_NAMES) when the patient phrased it unusually.
 *
 * Pure functions, no database: tested in scripts/test/voice-intents.test.mts.
 */
import { COUNTRIES } from "../countries";

export const COMMAND_NAMES = [
  "help",
  "start_case",
  "case_status",
  "my_cases",
  "open_plan",
  "edit_plan",
  "set_city",
  "add_service",
  "remove_service",
  "set_travel",
  "set_companions",
  "add_details",
  "replan",
  "add_email",
  "sign_in",
  "sign_out",
  "upload_report",
  "reports",
  "cost",
  "hospitals",
  "doctors",
  "treatments",
  "conditions",
  "human",
  "whatsapp",
  "call",
  "language",
  "voice",
  "repeat",
  "cancel",
  "home",
  "portal",
  "emergency",
] as const;

export type CommandName = (typeof COMMAND_NAMES)[number];

export const SERVICES = [
  "flights",
  "airport-transfers",
  "visa-support",
  "accommodation",
  "interpreter",
  "local-sim",
  "meals",
  "post-treatment-followup",
] as const;

export type Service = (typeof SERVICES)[number];

export type Slots = {
  email?: string;
  phone?: string;
  code?: string;
  reference?: string;
  city?: string;
  service?: Service;
  language?: "en" | "ru" | "uz";
  gender?: "female" | "male";
  rate?: "slower" | "faster" | "normal";
  month?: string;
  companions?: number;
  /** What is left once the command words are taken out, e.g. the treatment in "how much is a knee replacement". */
  rest?: string;
};

export type ParsedCommand = { name: CommandName; slots: Slots };

// ------------------------------------------------------------- normalising

/** Lower case, one kind of apostrophe, single spaces. Keeps @ and dots for emails. */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʻʼ`´]/g, "'")
    .replace(/ё/g, "е")
    .replace(/[!?,;:"«»()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.]+$/, "");
}

const wordCount = (text: string) => text.split(" ").filter(Boolean).length;

// ------------------------------------------------------------- slot readers

const NUMBER_WORDS: Record<string, string> = {
  zero: "0", oh: "0", o: "0", one: "1", two: "2", to: "2", too: "2", three: "3", four: "4", for: "4",
  five: "5", six: "6", seven: "7", eight: "8", ate: "8", nine: "9",
  ноль: "0", нуль: "0", один: "1", одна: "1", два: "2", две: "2", три: "3", четыре: "4", пять: "5",
  шесть: "6", семь: "7", восемь: "8", девять: "9",
  nol: "0", bir: "1", ikki: "2", uch: "3", "to'rt": "4", besh: "5", olti: "6", yetti: "7",
  sakkiz: "8", "to'qqiz": "9",
};

/**
 * Digits as spoken: "nine nine eight, 90 123 45 67", "double five". Number
 * words only count inside a run of digits, so "two" in "I have two kids"
 * stays a word unless it sits among other digits.
 */
export function spokenDigits(text: string): string {
  const tokens = normalise(text).replace(/[-–—/]/g, " ").split(" ");
  let out = "";
  let repeat = 1;
  for (const token of tokens) {
    if (token === "double" || token === "двойная") { repeat = 2; continue; }
    if (token === "triple") { repeat = 3; continue; }
    if (token === "plus" || token === "плюс") continue;
    const value = /^\+?\d+$/.test(token) ? token.replace("+", "") : NUMBER_WORDS[token];
    if (value !== undefined) out += value.repeat(repeat);
    repeat = 1;
  }
  return out;
}

export function readPhone(text: string): string | undefined {
  const digits = spokenDigits(text);
  return digits.length >= 7 && digits.length <= 15 ? digits : undefined;
}

/** A six-digit sign-in code. */
export function readCode(text: string): string | undefined {
  const digits = spokenDigits(text);
  return digits.length === 6 ? digits : undefined;
}

/** "john dot smith at gmail dot com" → john.smith@gmail.com */
export function readEmail(text: string): string | undefined {
  const direct = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  if (direct) return direct[0].toLowerCase().replace(/\.$/, "");

  const spoken = ` ${normalise(text)} `
    .replace(/\s(at|собака|эт|ат)\s/g, "@")
    .replace(/\s(dot|точка|nuqta)\s/g, ".")
    .replace(/\s(underscore|нижнее подчеркивание)\s/g, "_")
    .replace(/\s(dash|hyphen|minus|дефис|тире)\s/g, "-");
  const match = spoken.match(/([a-z0-9._%+-]+(?:\s[a-z0-9._%+-]+){0,3})@([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})/i);
  if (!match) return undefined;
  // The local part is often heard as separate words: "john smith at …" → johnsmith
  const local = match[1].split(" ").slice(-3).join("");
  return `${local}@${match[2]}`.toLowerCase();
}

/** The two letters a case number can start with: a country code, or XX when the country was unknown. */
const CASE_PREFIXES = new Set([...COUNTRIES.map((country) => country.code), "XX"]);

/**
 * A case number read aloud or typed: "U Z 4 8 2 1 3" → UZ48213 (two letters,
 * five digits). Older references — SH- and sixteen letters and digits in
 * fours — are still read.
 */
export function readReference(text: string): string | undefined {
  const joined = normalise(text)
    .replace(/\b(dash|hyphen|minus|тире|дефис)\b/g, " ")
    .replace(/\b(zero|oh)\b/g, "0")
    .replace(/[^a-z0-9]/g, "")
    .toUpperCase();
  const legacy = joined.match(/SH([A-Z0-9]{16})/);
  if (legacy) return `SH-${legacy[1].match(/.{4}/g)!.join("-")}`;
  // Two letters that start a word, then five digits, spaced or not: "it's U Z 48 213".
  const spoken = normalise(text).replace(/\b(zero|oh)\b/g, "0").toUpperCase();
  const short = spoken.match(/(?<![A-Z])([A-Z])[\s.-]*([A-Z])[\s.-]*((?:\d[\s.-]*){5})(?!\d)/);
  if (short && CASE_PREFIXES.has(`${short[1]}${short[2]}`)) return `${short[1]}${short[2]}${short[3].replace(/\D/g, "")}`;
  // Only the old sixteen characters, without the SH in front.
  return /^[A-Z0-9]{16}$/.test(joined) && /\d/.test(joined) ? `SH-${joined.match(/.{4}/g)!.join("-")}` : undefined;
}

const YES = /^(yes|yeah|yep|yup|sure|ok|okay|correct|right|please do|go ahead|do it|confirm|that's right|that is right|да|ага|конечно|верно|правильно|давай|хорошо|ha|xa|albatta|to'g'ri|mayli|bo'ladi)( please| пожалуйста| iltimos)?$/;
const NO = /^(no|nope|nah|not now|don't|do not|wrong|incorrect|нет|не надо|неправильно|не сейчас|yo'q|kerak emas|noto'g'ri)( thanks| thank you| спасибо| rahmat)?$/;

export function yesNo(text: string): "yes" | "no" | null {
  const value = normalise(text);
  if (YES.test(value)) return "yes";
  if (NO.test(value)) return "no";
  return null;
}

const SERVICE_WORDS: [Service, RegExp][] = [
  ["visa-support", /visa|виз[ауые]|vizа|viza/],
  ["airport-transfers", /airport|pick ?up|transfer|трансфер|встреч[аиу] в аэропорту|aeroport/],
  ["flights", /flight|plane ticket|air ?ticket|tickets|авиа|билет|перел[её]т|aviachipta|parvoz|chipta/],
  ["accommodation", /hotel|accommodation|apartment|place to stay|lodging|гостиниц|отел|прожива|жиль|mehmonxona|turar joy|yashash joy/],
  ["interpreter", /interpreter|translator|translation|переводчик|tarjimon/],
  ["local-sim", /sim|сим[- ]?карт|simkarta/],
  ["meals", /meal|food|diet|питани|еда|ovqat/],
  ["post-treatment-followup", /follow[- ]?up|aftercare|after care|наблюдени|kuzatuv/],
];

export function readService(text: string): Service | undefined {
  const value = normalise(text);
  return SERVICE_WORDS.find(([, pattern]) => pattern.test(value))?.[0];
}

const LANGUAGES: [Slots["language"], RegExp][] = [
  ["ru", /russian|русск|по-русски|rus til|ruscha/],
  ["uz", /uzbek|узбек|o'zbek|ozbek/],
  ["en", /english|английск|ingliz/],
];

export function readLanguage(text: string): Slots["language"] {
  const value = normalise(text);
  return LANGUAGES.find(([, pattern]) => pattern.test(value))?.[0];
}

const MONTHS: [string, RegExp][] = [
  ["January", /january|январ|yanvar/],
  ["February", /february|феврал|fevral/],
  ["March", /march|март|mart/],
  ["April", /april|апрел|aprel/],
  ["May", /\bmay\b|мае|май|may oy/],
  ["June", /june|июн|iyun/],
  ["July", /july|июл|iyul/],
  ["August", /august|август|avgust/],
  ["September", /september|сентябр|sentabr/],
  ["October", /october|октябр|oktabr/],
  ["November", /november|ноябр|noyabr/],
  ["December", /december|декабр|dekabr/],
];

export function readMonth(text: string): string | undefined {
  const value = normalise(text);
  if (/next week|на следующей неделе|keyingi hafta/.test(value)) return "next week";
  if (/next month|в следующем месяце|keyingi oy/.test(value)) return "next month";
  if (/as soon as possible|asap|urgent|как можно скорее|срочно|tezroq|imkon qadar tez/.test(value)) return "as soon as possible";
  return MONTHS.find(([, pattern]) => pattern.test(value))?.[0];
}

const COUNT_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, a: 1, an: 1,
  один: 1, одним: 1, одного: 1, два: 2, двумя: 2, двух: 2, три: 3, тремя: 3, трех: 3,
  bir: 1, ikki: 2, uch: 3, "to'rt": 4,
};

export function readCompanions(text: string): number | undefined {
  const value = normalise(text);
  if (/\b(alone|by myself|on my own|no one|nobody)\b|один без|одна без|без сопровожд|yolg'iz|o'zim/.test(value)) return 0;
  const match = value.match(/(\d+|one|two|three|four|a|an|один|одним|одного|два|двумя|двух|три|тремя|трех|bir|ikki|uch|to'rt)\s+(companions?|people|persons?|family members?|relatives?|сопровожда\S*|человек\S*|родственник\S*|hamroh\S*|kishi)/);
  if (match) return /^\d+$/.test(match[1]) ? Number(match[1]) : COUNT_WORDS[match[1]];
  if (/with my (wife|husband|son|daughter|mother|father|mom|dad|brother|sister|friend)|с (женой|мужем|сыном|дочерью|мамой|папой|братом|сестрой)|(xotinim|erim|o'g'lim|qizim|onam|otam) bilan/.test(value)) return 1;
  return undefined;
}

/** The first city from the list the text names, or undefined. */
export function readCity(text: string, cities: string[]): string | undefined {
  const value = normalise(text);
  const alias: Record<string, string> = {
    bengaluru: "Bangalore", бангалор: "Bangalore", дели: "Delhi", "нью-дели": "Delhi", "new delhi": "Delhi",
    мумбаи: "Mumbai", бомбей: "Mumbai", bombay: "Mumbai", ченнаи: "Chennai", madras: "Chennai",
    хайдарабад: "Hyderabad", гургаон: "Gurgaon", gurugram: "Gurgaon", калькутта: "Kolkata", calcutta: "Kolkata",
    пуна: "Pune", джайпур: "Jaipur", кочи: "Kochi", ахмадабад: "Ahmedabad", нойда: "Noida",
    dehli: "Delhi", dehliga: "Delhi", mumbayga: "Mumbai", "ченнай": "Chennai",
  };
  for (const [word, city] of Object.entries(alias)) {
    if (value.includes(word) && cities.includes(city)) return city;
  }
  return cities.find((city) => new RegExp(`(^|[^a-z])${city.toLowerCase()}`).test(value));
}

// ------------------------------------------------------------- intents

type Rule = { name: CommandName; test: (value: string, raw: string) => boolean };

const has = (pattern: RegExp) => (value: string) => pattern.test(value);
const short = (pattern: RegExp, maxWords = 6) => (value: string) => wordCount(value) <= maxWords && pattern.test(value);

/** Phrases that mean "show me / take me to / find". */
const SHOW = /\b(show|open|see|view|find|search|list|browse|look (for|at|up)|go to|take me to)\b|покажи|открой|найди|подбери|посмотреть|перейди|ko'rsat|\boch\b|qidir/;

/**
 * Order matters: the first rule that fits wins, so the narrow ones
 * ("edit my plan", "show my plan") come before the broad ones ("plan").
 */
const RULES: Rule[] = [
  {
    name: "emergency",
    test: has(/\b(emergency|can'?t breathe|cannot breathe|not breathing|unconscious|severe chest pain|heart attack now|bleeding (a lot|heavily)|suicid|kill myself)\b|скорая|не могу дышать|без сознания|сильная боль в груди|кровотечение|tez yordam|nafas ololmayapman|hushsiz/),
  },
  { name: "cancel", test: short(/^(cancel|stop|never ?mind|forget it|exit|quit|отмена|отменить|стоп|хватит|не надо|bekor( qil)?|to'xta|kerak emas)$/, 3) },
  { name: "repeat", test: short(/\b(repeat|say (that|it) again|come again|pardon|didn'?t (hear|catch))\b|повтори|не расслышал|ещё раз|еще раз|takrorla|qaytar/, 6) },
  { name: "help", test: short(/^(help|help me|menu|commands?)$|what can (you|i) (do|say|ask)|what are my options|how does this work|что (ты )?умеешь|какие команды|^помощь$|^меню$|nima qila olasan|qanday buyruq|^yordam$/, 8) },
  { name: "sign_out", test: short(/\b(sign|log) ?(me )?out\b|logout|выйти из (аккаунт|кабинет|профил)|выйди из|^выйти$|chiqish|hisobdan chiq/, 6) },
  { name: "sign_in", test: short(/\b(sign|log) ?(me )?in\b|\blogin\b|access my account|войти|вход в (кабинет|аккаунт)|авторизу|kirish|hisobga kir|tizimga kir/, 9) },
  { name: "whatsapp", test: has(/whats ?app|ватсап|вотсап|вацап/) },
  {
    name: "human",
    test: has(/\b(talk|speak|connect|chat)( me)? (to|with) (a |an |the |your )?(human|person|someone|coordinator|agent|operator|representative|real (person|human)|manager|team)\b|\bcall me( back)?\b|callback|\breal person\b|оператор|живым человеком|с человеком|координатор|перезвоните|позвоните мне|odam bilan|operator|menga qo'ng'iroq|qo'ng'iroq qiling/),
  },
  { name: "call", test: short(/\b(call|phone|ring) (you|us|the office|your office)\b|your (phone )?number|позвонить вам|ваш (номер|телефон)|sizga qo'ng'iroq|raqamingiz/, 8) },
  {
    name: "language",
    test: (value) =>
      Boolean(readLanguage(value)) &&
      /\b(speak|talk|switch|change|reply|answer|use)\b|language|говори|перейди|переключи|на (русском|английском|узбекском)|язык|gapir|tilida|tilga|o'tkaz/.test(value),
  },
  {
    name: "voice",
    test: has(
      /\b(change|switch|use|different|another|other|female|male|woman|man|lady|natural|better|select|choose|pick|nicer)\b.{0,20}\bvoice\b|\bvoice\b.{0,12}\b(female|male|woman|man|slower|faster|settings?)\b|\b(speak|talk|read) (more )?(slow(er|ly)?|fast(er)?|quicker)\b|slow down|speed up|(смени|поменя|другой|женск|мужск)\S* голос|голос\S* (смени|поменя)|говори (медленнее|быстрее)|ovoz\S* (o'zgartir|almashtir)|(ayol|erkak) ovoz|sekinroq gapir|tezroq gapir/,
    ),
  },
  { name: "home", test: short(/\b(go|take me) (back )?home\b|home ?page|main page|на главную|главная страница|bosh sahifa/, 6) },
  {
    name: "upload_report",
    test: has(/\b(upload|attach|send|share|add)\b.*\b(reports?|scans?|files?|documents?|x-?rays?|mri|ct|test results?|prescriptions?|pdf|photos?)\b|(загруз|прикреп|отправ)\S* .*(отч[её]т|анализ|снимок|снимки|документ|файл|выписк)|(hisobot|tahlil|fayl|hujjat|rasm|snimka)\S* (yukla|biriktir|yubor)/),
  },
  {
    name: "replan",
    test: has(/\b(redo|regenerate|recalculate|refresh|rebuild|update|recreate)\b (my |the )?(treatment )?(plan|estimate)\b|(обнови|пересчитай|переделай)\S* (мой )?план|rejani (yangila|qayta)/),
  },
  {
    name: "add_details",
    test: has(/\b(add|update|give|tell you|share)\b (some )?(more |new |extra )?(details?|information|info|symptoms?)\b|\bnew symptoms?\b|добав\S* (детал|информац|симптом)|новые симптомы|ma'lumot qo'sh|yangi belgi/),
  },
  { name: "add_email", test: has(/\b(add|update|change|set|use|save)\b.*\be-?mail\b|\bmy e-?mail is\b|(добав|измени|поменя|укаж)\S* .*(почт|e-?mail|имейл)|(email|pochta)\S* (qo'sh|o'zgartir)/) },
  {
    name: "remove_service",
    test: (value) =>
      Boolean(readService(value)) &&
      /\b(remove|drop|exclude|take out|cancel|delete|without|skip)\b|don'?t (need|want)|no need for|do not (need|want)|убер|исключ|не нужн|без |удали|olib tashla|kerak emas|kerakmas|olib tashlang/.test(value),
  },
  {
    name: "add_service",
    test: (value, raw) =>
      Boolean(readService(value)) &&
      /\b(add|include|need|want|would like|i'?d like|book|arrange|get me|yes to)\b|добав|включ|нужен|нужна|нужно|хочу|организу|qo'sh|kerak|tashkil/.test(value) &&
      // "Do I need a visa?" is a question for the assistant, not an order.
      !/\?\s*$/.test(raw) &&
      !/\b(how|do i|does|is it|what)\b|как |нужна ли|нужен ли|qanday|kerakmi/.test(value),
  },
  { name: "set_companions", test: (value) => readCompanions(value) !== undefined && /\b(travel|come|coming|bring|with)\b|companion|сопровожд|поеду|приеду|с собой|hamroh|bilan kel/.test(value) },
  { name: "set_travel", test: (value) => Boolean(readMonth(value)) && /\b(travel|come|coming|arrive|fly|visit|go|be there|dates?)\b|приеду|прилет|поездк|ехать|kelaman|uchaman|safar/.test(value) },
  {
    name: "edit_plan",
    test: has(/\b(edit|change|update|modify|adjust|customi[sz]e)\b (my |the )?(treatment )?(plan|package|estimate)\b|(измени|поменя|редактир|настро)\S* (мой )?(план|пакет)|rejani (o'zgartir|tahrirla)/),
  },
  {
    // Before open_plan: "show my reports" is about the files, not the plan.
    name: "reports",
    test: has(/\b(show|open|see|view|read|where are|display)\b (me )?(my |the )?(medical )?(reports|results|test results|scans|files|documents)\b|^my reports$|(покажи|открой)\S* (мои )?(анализы|заключения|документы|снимки)|^мои анализы$|(hisobot|tahlil|natija)larimni (ko'rsat|och)|^tahlillarim$/),
  },
  {
    name: "open_plan",
    test: has(/\b(show|open|see|view|read|go to|take me to|where('s| is)|display)\b (me )?(my |the )?(treatment )?(plan|estimate|quote)\b|^my plan$|(покажи|открой)\S* (мой )?план|^мой план$|rejamni (ko'rsat|och)|^rejam$/),
  },
  { name: "my_cases", test: has(/\b(my|all my|list my|show my) (cases|requests|enquiries|applications)\b|мои (заявки|дела|обращения)|arizalarim/) },
  {
    name: "case_status",
    test: has(/\bstatus\b|\bcheck (on )?my (case|plan|request|application)\b|\b(where|how) is my (case|plan|request|application|enquiry)\b|\bany (news|update)s?\b|\bwhat'?s (happening|the latest) with my\b|\b(is|has) my (plan|case) (ready|done|finished)\b|статус|что с (моей|моим) (заявк|дел|план)|как (продвигается|дела с)|готов ли (мой )?план|holat|arizam qanday|reja tayyor/),
  },
  {
    name: "start_case",
    test: has(/\b(create|open|make|set ?up|start|register|begin)\b (an |a |my |new )*(account|profile|case|enquiry|request)\b|\bsign ?up\b|\bregister me\b|\b(make|create|get|build|prepare|want|need|start)\b (me )?(a |an |my |new |free )*(treatment )?(plan|estimate|quote)\b|(созда|завест|откр)\S* (нов\S* )?(аккаунт|профиль|кабинет|заявк)|зарегистр|(состав|сдела|получ)\S* план|нужен план|(hisob|profil|ariza) (och|yarat)|ro'yxatdan o't|reja (tuz|kerak|oling|olish)/),
  },
  {
    name: "cost",
    test: has(/\b(how much|cost|costs|price|prices|pricing|fees?|charges?|expensive|cheap|budget)\b|сколько стоит|стоимость|цен[аыу]|расценк|почем|qancha turadi|narx|qiymat|qancha pul/),
  },
  { name: "hospitals", test: (value) => /hospitals?|clinics?|больниц|клиник|госпитал|shifoxona|kasalxona|klinika/.test(value) && SHOW.test(value) },
  { name: "doctors", test: (value) => /doctors?|surgeons?|specialists?|врач|доктор|хирург|специалист|shifokor|doktor|vrach|jarroh/.test(value) && SHOW.test(value) },
  { name: "treatments", test: (value) => /treatments?|procedures?|surgeries|лечени|процедур|операци|davolash|muolaja/.test(value) && SHOW.test(value) && wordCount(value) <= 7 },
  { name: "conditions", test: (value) => /conditions|diseases|illnesses|заболевани|болезн|kasallik/.test(value) && SHOW.test(value) && wordCount(value) <= 7 },
  { name: "portal", test: short(/\bmy (account|dashboard|portal|profile|cabinet)\b|личный кабинет|мой кабинет|мой профиль|shaxsiy kabinet|hisobim/, 7) },
];

/** Words that carry the command rather than its subject, removed to leave e.g. the treatment name. */
const FILLER = new Set(
  (
    "how much does do is are it the a an for of cost costs price prices pricing what whats what's india treatment surgery operation " +
    "please me tell about would will be my show find i need want get make create start plan estimate quote free new to with in " +
    "сколько стоит стоимость цена цены лечение операция операции в индии индия для на мне сделать хочу нужен нужна план " +
    "qancha turadi narxi narx hindistonda uchun reja kerak menga"
  ).split(" "),
);

export function restOf(text: string): string {
  return normalise(text)
    .split(" ")
    .filter((word) => word && !FILLER.has(word))
    .join(" ");
}

/**
 * What the patient asked the app to do, or null when this reads as
 * conversation — a description of an illness, a question — for the
 * assistant to answer.
 */
export function parseCommand(text: string, cities: string[] = []): ParsedCommand | null {
  const value = normalise(text);
  if (!value) return null;
  // A long message is someone telling their story, not giving a command —
  // unless it is an emergency, which is always caught.
  const long = wordCount(value) > 24;

  for (const rule of RULES) {
    if (long && rule.name !== "emergency") break;
    if (!rule.test(value, text)) continue;
    return { name: rule.name, slots: slotsFor(rule.name, text, cities) };
  }

  // "Delhi instead" / "I'd prefer Chennai" — a city with a preference word. A question
  // ("which hospitals in Delhi?") is for the assistant, not a change of plan.
  const city = readCity(value, cities);
  const question = /\?\s*$/.test(text) || /^(which|what|where|how|do|does|is|are|can|could|какие|какая|где|как|есть ли|qaysi|qayerda|qanday)\b/.test(value);
  if (city && !question && /\b(prefer|rather|instead|change|switch|move|want|in)\b|лучше|вместо|предпочит|хочу|afzal|o'rniga|xohlayman/.test(value) && !long) {
    return { name: "set_city", slots: { city } };
  }
  return null;
}

export function slotsFor(name: CommandName, text: string, cities: string[] = []): Slots {
  const value = normalise(text);
  const slots: Slots = {};
  const email = readEmail(text);
  if (email) slots.email = email;
  const city = readCity(value, cities);
  if (city) slots.city = city;

  switch (name) {
    case "sign_in": {
      const reference = readReference(text);
      if (reference) slots.reference = reference;
      break;
    }
    case "add_service":
    case "remove_service":
      slots.service = readService(value);
      break;
    case "language":
      slots.language = readLanguage(value);
      break;
    case "voice":
      if (/female|woman|lady|girl|женск|ayol/.test(value)) slots.gender = "female";
      else if (/\bmale\b|\bman\b|men's|мужск|erkak/.test(value)) slots.gender = "male";
      if (/slow|медленн|sekin/.test(value)) slots.rate = "slower";
      else if (/fast|quick|speed up|быстр|tez/.test(value)) slots.rate = "faster";
      else if (/normal|обычн|oddiy/.test(value)) slots.rate = "normal";
      break;
    case "set_travel":
      slots.month = readMonth(value);
      break;
    case "set_companions":
      slots.companions = readCompanions(value);
      break;
    case "cost":
    case "start_case":
      slots.rest = restOf(text);
      break;
  }
  return slots;
}
