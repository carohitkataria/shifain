/**
 * The few details a case needs once the medical picture is clear — name,
 * phone, country, and optionally email — asked one at a time and read from
 * whatever the patient says or types, in English, Russian or Uzbek. No AI:
 * these are short answers with a known shape. Pure, so it is tested directly.
 */
import { COUNTRIES } from "../countries";
import { readEmail, readPhone } from "../voice/intents";

export type ProfileStep = "name" | "phone" | "country" | "email";
type Lang = "en" | "ru" | "uz";

export type ProfileFields = {
  name: string | null;
  phone: string | null;
  country: string | null;
  email?: string | null;
  /** The patient said "skip" to email. */
  emailSkipped?: boolean;
};

/** What to ask next, or null when the case can open. */
export function nextProfileStep(fields: ProfileFields): ProfileStep | null {
  if (!fields.name) return "name";
  if (!fields.phone) return "phone";
  if (!fields.country) return "country";
  if (!fields.email && !fields.emailSkipped) return "email";
  return null;
}

const NAME_PREFIX =
  /^(my name is|my name's|name is|i am|i'm|this is|it's|call me|меня зовут|моё имя|мое имя|я|mening ismim|ismim|men)\s+/i;

/** Replies that are not names, however name-shaped: "yes", "hello", "I don't know". */
const NOT_A_NAME =
  /^(yes|yeah|no|nope|ok|okay|hi|hello|hey|thanks|thank you|sure|what|why|skip|none|nothing|help|да|нет|ок|привет|спасибо|зачем|почему|ha|yo'q|salom|rahmat|nima|nega)$/i;

/** A person's name from "my name is Anna Petrova", or just "Anna Petrova". */
export function readName(text: string): string | undefined {
  let value = text.trim().replace(/[.!?,]+$/g, "");
  value = value.replace(NAME_PREFIX, "").trim();
  if (!/^[\p{L}][\p{L}'’\- ]{0,58}[\p{L}]$/u.test(value)) return undefined;
  const words = value.split(/\s+/);
  if (words.length > 5) return undefined;
  if (NOT_A_NAME.test(value)) return undefined;
  // "anna petrova" → "Anna Petrova"; leave names typed with their own capitals alone.
  if (value === value.toLowerCase()) {
    value = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  }
  return value;
}

/** The country a phone number belongs to, from its dialling code (longest match wins). */
export function countryFromDial(digits: string): string | undefined {
  const clean = digits.replace(/\D/g, "");
  const matches = COUNTRIES.filter((country) => clean.startsWith(country.dial));
  const longest = Math.max(0, ...matches.map((country) => country.dial.length));
  const best = matches.filter((country) => country.dial.length === longest);
  // +7 is both Russia and Kazakhstan: ask rather than guess.
  return best.length === 1 ? best[0].name : undefined;
}

const COUNTRY_ALIASES: Record<string, string> = {
  узбекистан: "Uzbekistan", "o'zbekiston": "Uzbekistan", ozbekiston: "Uzbekistan", uzbekiston: "Uzbekistan",
  россия: "Russia", rossiya: "Russia", казахстан: "Kazakhstan", "qozog'iston": "Kazakhstan",
  таджикистан: "Tajikistan", tojikiston: "Tajikistan", кыргызстан: "Kyrgyzstan", киргизия: "Kyrgyzstan",
  "qirg'iziston": "Kyrgyzstan", туркменистан: "Turkmenistan", turkmaniston: "Turkmenistan",
  азербайджан: "Azerbaijan", армения: "Armenia", грузия: "Georgia", беларусь: "Belarus", украина: "Ukraine",
  афганистан: "Afghanistan", "afg'oniston": "Afghanistan", монголия: "Mongolia", ирак: "Iraq", иран: "Iran",
  uae: "United Arab Emirates", emirates: "United Arab Emirates", dubai: "United Arab Emirates",
  uk: "United Kingdom", england: "United Kingdom", britain: "United Kingdom", usa: "United States", america: "United States",
};

/** A country named in free text: "I'm from Uzbekistan", "Узбекистан". */
export function readCountry(text: string): string | undefined {
  const value = ` ${text.toLowerCase().replace(/[‘’ʻʼ`]/g, "'").replace(/[^\p{L}' ]+/gu, " ").replace(/\s+/g, " ")} `;
  for (const [alias, name] of Object.entries(COUNTRY_ALIASES)) {
    if (value.includes(` ${alias} `) && COUNTRIES.some((country) => country.name === name)) return name;
  }
  const byLength = [...COUNTRIES].sort((a, b) => b.name.length - a.name.length);
  return byLength.find((country) => value.includes(` ${country.name.toLowerCase()} `))?.name;
}

const SKIP = /^(skip|no|no thanks|not now|later|i don'?t have (one|an email)|none|нет|пропустить|пропусти|не надо|потом|yo'q|o'tkazib yubor|keyin)(?=$|[\s.!,])/i;

export type ProfileAnswer = { value?: string; skipped?: boolean; country?: string };

/** Reads the answer to one profile question. Undefined value means "ask again". */
export function readProfileAnswer(step: ProfileStep, text: string): ProfileAnswer {
  switch (step) {
    case "name":
      return { value: readName(text) };
    case "phone": {
      const phone = readPhone(text);
      return phone ? { value: phone, country: countryFromDial(phone) } : {};
    }
    case "country":
      return { value: readCountry(text) ?? (/^[\p{L}][\p{L} '\-]{2,40}$/u.test(text.trim()) ? text.trim() : undefined) };
    case "email": {
      const email = readEmail(text);
      if (email) return { value: email };
      return SKIP.test(text.trim()) ? { skipped: true } : {};
    }
  }
}

const COPY: Record<ProfileStep, Record<Lang, { ask: string; again: string }>> = {
  name: {
    en: { ask: "May I have your full name?", again: "Sorry, I didn't catch your name. Could you say or type your full name?" },
    ru: { ask: "Как вас зовут? Имя и фамилия, пожалуйста.", again: "Извините, не расслышал имя. Назовите, пожалуйста, имя и фамилию." },
    uz: { ask: "To'liq ismingiz qanday?", again: "Kechirasiz, ismingizni tushunmadim. To'liq ismingizni ayting yoki yozing." },
  },
  phone: {
    en: { ask: "What's your WhatsApp or phone number, with the country code? Your coordinator will contact you there.", again: "I need the number with its country code, for example +998 90 123 45 67." },
    ru: { ask: "Ваш номер WhatsApp или телефона с кодом страны? Координатор свяжется с вами по нему.", again: "Нужен номер с кодом страны, например +998 90 123 45 67." },
    uz: { ask: "WhatsApp yoki telefon raqamingiz, mamlakat kodi bilan? Koordinator shu raqam orqali bog'lanadi.", again: "Raqam mamlakat kodi bilan kerak, masalan +998 90 123 45 67." },
  },
  country: {
    en: { ask: "Which country will you be travelling from?", again: "Which country is that? For example Uzbekistan, Bangladesh or Nigeria." },
    ru: { ask: "Из какой страны вы приедете?", again: "Какая это страна? Например, Узбекистан, Казахстан или Россия." },
    uz: { ask: "Qaysi mamlakatdan kelasiz?", again: "Qaysi mamlakat? Masalan, O'zbekiston, Qozog'iston yoki Rossiya." },
  },
  email: {
    en: { ask: "Last one: your email, so you can sign in and get your plan there? Or say “skip”.", again: "I didn't catch an email address. Try spelling it, like “anna dot k at gmail dot com”, or say “skip”." },
    ru: { ask: "И последнее: ваш email, чтобы входить в кабинет и получить план? Или скажите «пропустить».", again: "Не расслышал адрес. Продиктуйте по буквам или скажите «пропустить»." },
    uz: { ask: "Oxirgisi: emailingiz, kabinetga kirish va rejani olish uchun? Yoki «o'tkazib yubor» deng.", again: "Email manzilini tushunmadim. Harflab ayting yoki «o'tkazib yubor» deng." },
  },
};

export function profileQuestion(step: ProfileStep, lang: Lang, again = false): string {
  const line = COPY[step][lang] ?? COPY[step].en;
  return again ? line.again : line.ask;
}

const THANKS: Record<Lang, string> = { en: "Thank you, {name}.", ru: "Спасибо, {name}.", uz: "Rahmat, {name}." };

/** "Thank you, Anna." — said once, right after they give their name. */
export function thanksFor(name: string | null | undefined, lang: Lang): string {
  const first = (name ?? "").split(" ")[0];
  return first ? THANKS[lang].replace("{name}", first) : "";
}

/** Quick replies to show under a question, where they help. */
export function profileSuggestions(step: ProfileStep, lang: Lang): string[] {
  if (step === "country") return ["Uzbekistan", "Kazakhstan", "Tajikistan", "Bangladesh", "Nigeria", "Iraq"];
  if (step === "email") return [lang === "ru" ? "Пропустить" : lang === "uz" ? "O'tkazib yubor" : "Skip"];
  return [];
}

const UZBEK_LATIN = /\b(men|meni|menga|kerak|rahmat|salom|assalomu|qanday|qancha|nima|uchun|bilan|emas|yo'q|o'zbek|shifokor|kasal|og'riq|davolash|yordam)\b|[og]'[a-z]/i;

/**
 * The language a message is written in, when it is clear: Cyrillic is read
 * as Russian, a few common Uzbek words as Uzbek, plain Latin as English.
 * Short or mixed messages (a name, a number) say nothing.
 */
export function guessLanguage(text: string): Lang | null {
  const letters = text.replace(/[^\p{L}]/gu, "");
  if (letters.length < 4) return null;
  const cyrillic = (letters.match(/\p{Script=Cyrillic}/gu) ?? []).length;
  if (cyrillic / letters.length > 0.5) return "ru";
  if (UZBEK_LATIN.test(text)) return "uz";
  if (/^[a-z]+$/i.test(letters) && text.trim().split(/\s+/).length >= 3) return "en";
  return null;
}
