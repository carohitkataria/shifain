/**
 * What one page view says about a visit, read without cookies and without
 * keeping anything that identifies a person: which page (case numbers taken
 * out), which language, where the visitor came from, what kind of device,
 * which country, and whether it is a robot. Pure, so it is tested directly
 * (scripts/test/visitors.test.mts).
 */
import { LOCALES, type Locale } from "./i18n";

export type VisitFacts = {
  /** The page, without the language and without anything private: "/", "/treatments/cardiac-care", "/plan/[case]". */
  page: string;
  lang: Locale | "other";
  source: string;
  device: "phone" | "tablet" | "computer";
  country: string;
};

const LOCALE_SET = new Set<string>(LOCALES);

/** The page a path is, across languages. Case numbers and anything after "?" never reach the count. */
export function pageOf(rawPath: string): { page: string; lang: Locale | "other" } | null {
  if (typeof rawPath !== "string" || !rawPath.startsWith("/") || rawPath.length > 300) return null;
  const path = rawPath.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const parts = path.split("/").filter(Boolean);
  const lang = parts[0] && LOCALE_SET.has(parts[0]) ? (parts.shift() as Locale) : "other";
  if (parts[0] === "admin" || parts[0] === "api" || parts[0] === "coordinator") return null;
  // A plan's address is its case number: counted as "a plan page", never by number.
  if (parts[0] === "plan" && parts[1] && parts[1] !== "results" && parts[1] !== "wizard") parts.splice(1, parts.length - 1, "[case]");
  const page = `/${parts.map((part) => part.replace(/[^\w\-[\]]/g, "").slice(0, 60)).join("/")}`;
  return { page: page === "/" ? "/" : page.replace(/\/+$/, ""), lang };
}

const SOURCES: [RegExp, string][] = [
  [/(^|\.)google\./, "Google"],
  [/(^|\.)bing\.com$/, "Bing"],
  [/(^|\.)yandex\./, "Yandex"],
  [/(^|\.)duckduckgo\.com$/, "DuckDuckGo"],
  [/(^|\.)(t\.me|telegram\.org|telegram\.me)$/, "Telegram"],
  [/(^|\.)(wa\.me|whatsapp\.com|whatsapp\.net)$/, "WhatsApp"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, "Facebook"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"],
  [/(^|\.)linkedin\.com$/, "LinkedIn"],
  [/(^|\.)(x\.com|twitter\.com|t\.co)$/, "X (Twitter)"],
  [/(^|\.)(vk\.com|ok\.ru)$/, "VK / OK"],
  [/(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com)$/, "AI assistant"],
];

const UTM_NAMES: Record<string, string> = {
  google: "Google",
  telegram: "Telegram",
  tg: "Telegram",
  whatsapp: "WhatsApp",
  wa: "WhatsApp",
  facebook: "Facebook",
  fb: "Facebook",
  instagram: "Instagram",
  ig: "Instagram",
  youtube: "YouTube",
  email: "Email",
  newsletter: "Email",
};

/**
 * Where the visitor came from. A link we shared can say so itself
 * ("?utm_source=whatsapp"); a partner's link carries "?ref="; otherwise the
 * site the browser says it came from, by name; nothing at all is "Direct"
 * (typed, a bookmark, or an app that hides where it opened from — WhatsApp
 * and Telegram often do).
 */
export function sourceOf(referrer: string, path: string, ownHosts: string[]): string {
  const query = new URLSearchParams((path.split("?")[1] ?? "").split("#")[0]);
  const utm = (query.get("utm_source") ?? "").trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 30);
  if (utm) return UTM_NAMES[utm] ?? utm;
  if (query.get("ref")) return "Partner link";
  let host = "";
  try {
    host = referrer ? new URL(referrer).hostname.toLowerCase().replace(/^www\./, "") : "";
  } catch {
    host = "";
  }
  if (!host) return "Direct";
  if (ownHosts.some((own) => host === own.replace(/^www\./, ""))) return "Direct";
  for (const [pattern, name] of SOURCES) if (pattern.test(host)) return name;
  // Another site: by its name, so a mention somewhere shows up as itself.
  return host.slice(0, 60);
}

/** Phone, tablet or computer, from the browser's own description. */
export function deviceOf(userAgent: string): VisitFacts["device"] {
  const ua = userAgent || "";
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Android|Windows Phone|Opera Mini/i.test(ua)) return "phone";
  return "computer";
}

/** Search engines, link previews, uptime checks and scripts: not people. */
export function isRobot(userAgent: string): boolean {
  const ua = userAgent || "";
  if (!ua || ua.length < 20) return true;
  return /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp\/|telegrambot|embedly|curl|wget|python|node-fetch|axios|go-http|java\/|headless|lighthouse|pagespeed|uptime|monitor|pingdom|statuscake|render\/health/i.test(ua);
}

/**
 * The country, from the edge's own header when there is one, otherwise from
 * the browser's time zone (people almost always keep their phone on local
 * time). Only the country is kept, never the zone itself.
 */
export function countryOf(edgeCountry: string | null | undefined, timeZone: string | null | undefined): string {
  const code = (edgeCountry ?? "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(code) && code !== "XX" && code !== "T1") return code;
  const zone = (timeZone ?? "").trim();
  return TIME_ZONE_COUNTRY[zone] ?? "??";
}

/** Time zone → country, for the countries Shifain serves and the ones visitors most often come from. */
const TIME_ZONE_COUNTRY: Record<string, string> = {
  // Central Asia and the Caucasus
  "Asia/Tashkent": "UZ", "Asia/Samarkand": "UZ",
  "Asia/Almaty": "KZ", "Asia/Qostanay": "KZ", "Asia/Aqtobe": "KZ", "Asia/Aqtau": "KZ", "Asia/Atyrau": "KZ", "Asia/Oral": "KZ", "Asia/Qyzylorda": "KZ",
  "Asia/Bishkek": "KG", "Asia/Dushanbe": "TJ", "Asia/Ashgabat": "TM",
  "Asia/Baku": "AZ", "Asia/Yerevan": "AM", "Asia/Tbilisi": "GE",
  // Russia and neighbours
  "Europe/Moscow": "RU", "Europe/Samara": "RU", "Europe/Volgograd": "RU", "Europe/Kaliningrad": "RU", "Asia/Yekaterinburg": "RU",
  "Asia/Omsk": "RU", "Asia/Novosibirsk": "RU", "Asia/Krasnoyarsk": "RU", "Asia/Irkutsk": "RU", "Asia/Vladivostok": "RU",
  "Europe/Kiev": "UA", "Europe/Kyiv": "UA", "Europe/Minsk": "BY", "Europe/Chisinau": "MD",
  // South Asia
  "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Dhaka": "BD", "Asia/Karachi": "PK", "Asia/Kathmandu": "NP",
  "Asia/Colombo": "LK", "Asia/Thimphu": "BT", "Indian/Maldives": "MV", "Asia/Kabul": "AF",
  // Middle East
  "Asia/Dubai": "AE", "Asia/Riyadh": "SA", "Asia/Muscat": "OM", "Asia/Qatar": "QA", "Asia/Bahrain": "BH", "Asia/Kuwait": "KW",
  "Asia/Baghdad": "IQ", "Asia/Tehran": "IR", "Asia/Amman": "JO", "Asia/Beirut": "LB", "Asia/Damascus": "SY", "Asia/Aden": "YE",
  "Asia/Jerusalem": "IL", "Europe/Istanbul": "TR", "Africa/Cairo": "EG",
  // Africa
  "Africa/Lagos": "NG", "Africa/Nairobi": "KE", "Africa/Addis_Ababa": "ET", "Africa/Dar_es_Salaam": "TZ", "Africa/Kampala": "UG",
  "Africa/Accra": "GH", "Africa/Khartoum": "SD", "Africa/Johannesburg": "ZA", "Africa/Lusaka": "ZM", "Africa/Harare": "ZW",
  "Africa/Kinshasa": "CD", "Africa/Luanda": "AO", "Africa/Maputo": "MZ", "Africa/Algiers": "DZ", "Africa/Casablanca": "MA",
  "Africa/Tunis": "TN", "Africa/Dakar": "SN", "Africa/Abidjan": "CI", "Africa/Douala": "CM", "Africa/Mogadishu": "SO",
  // Europe
  "Europe/London": "GB", "Europe/Dublin": "IE", "Europe/Paris": "FR", "Europe/Berlin": "DE", "Europe/Madrid": "ES", "Europe/Lisbon": "PT",
  "Europe/Rome": "IT", "Europe/Amsterdam": "NL", "Europe/Brussels": "BE", "Europe/Vienna": "AT", "Europe/Zurich": "CH",
  "Europe/Stockholm": "SE", "Europe/Oslo": "NO", "Europe/Copenhagen": "DK", "Europe/Helsinki": "FI", "Europe/Warsaw": "PL",
  "Europe/Prague": "CZ", "Europe/Budapest": "HU", "Europe/Bucharest": "RO", "Europe/Sofia": "BG", "Europe/Athens": "GR",
  "Europe/Tirane": "AL", "Europe/Belgrade": "RS", "Europe/Riga": "LV", "Europe/Vilnius": "LT", "Europe/Tallinn": "EE",
  // East and South-East Asia, Oceania
  "Asia/Singapore": "SG", "Asia/Kuala_Lumpur": "MY", "Asia/Jakarta": "ID", "Asia/Bangkok": "TH", "Asia/Manila": "PH",
  "Asia/Ho_Chi_Minh": "VN", "Asia/Yangon": "MM", "Asia/Shanghai": "CN", "Asia/Hong_Kong": "HK", "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR", "Asia/Ulaanbaatar": "MN", "Australia/Sydney": "AU", "Australia/Melbourne": "AU", "Pacific/Auckland": "NZ",
  // Americas
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US", "America/Los_Angeles": "US", "America/Phoenix": "US",
  "America/Toronto": "CA", "America/Vancouver": "CA", "America/Mexico_City": "MX", "America/Sao_Paulo": "BR",
  "America/Argentina/Buenos_Aires": "AR", "America/Bogota": "CO", "America/Lima": "PE", "America/Santiago": "CL",
};

/** The calendar day a visit belongs to, in UTC: "2026-11-22". */
export const dayOf = (at: Date) => at.toISOString().slice(0, 10);
