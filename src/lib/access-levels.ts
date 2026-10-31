/**
 * What each thing the assistant can do needs, and whether this person has it.
 * Decided in code, never by the AI: the AI may name a command, but the gate
 * below runs before the command does. Pure, so it can be tested.
 *
 *   public        anyone — treatments, hospitals, doctors, starting prices, the process
 *   conversation  the chat that opened a case — that one case's status, reference masked
 *   verified      passed a one-time code, a verified Telegram number or a password —
 *                 plan changes, reports, payments, family, contact details
 *
 * Some verified actions are sensitive (opening reports, payment links, adding
 * family, changing contact details): they also need a verification no older
 * than the window set in Settings (24 hours unless changed).
 */
import type { CommandName } from "./voice/intents";

export type AccessLevel = "public" | "conversation" | "verified";

export const LEVEL_RANK: Record<AccessLevel, number> = { public: 0, conversation: 1, verified: 2 };

/** Every command, and what it needs. A command missing here fails the type check and the test. */
export const COMMAND_LEVELS: Record<CommandName, { level: AccessLevel; sensitive?: boolean }> = {
  help: { level: "public" },
  start_case: { level: "public" },
  sign_in: { level: "public" },
  sign_out: { level: "public" },
  upload_report: { level: "public" },
  cost: { level: "public" },
  hospitals: { level: "public" },
  doctors: { level: "public" },
  treatments: { level: "public" },
  conditions: { level: "public" },
  human: { level: "public" },
  whatsapp: { level: "public" },
  call: { level: "public" },
  language: { level: "public" },
  voice: { level: "public" },
  repeat: { level: "public" },
  cancel: { level: "public" },
  home: { level: "public" },
  portal: { level: "public" },
  emergency: { level: "public" },
  // The case this conversation opened: its status, and its plan page (the browser that opened it may see it).
  case_status: { level: "conversation" },
  open_plan: { level: "conversation" },
  // Everything else about a case is the patient's, once they have proved who they are.
  my_cases: { level: "verified" },
  edit_plan: { level: "verified" },
  set_city: { level: "verified" },
  add_service: { level: "verified" },
  remove_service: { level: "verified" },
  set_travel: { level: "verified" },
  set_companions: { level: "verified" },
  add_details: { level: "verified" },
  replan: { level: "verified" },
  reports: { level: "verified", sensitive: true },
  add_email: { level: "verified", sensitive: true },
};

export type Gate = "allow" | "verify" | "reverify";

/**
 * Whether to run a command now, or first ask for a code. `verifiedAt` is when
 * this browser last proved who it is (null if never); a sensitive command
 * needs that to be within the window.
 */
export function gate(
  command: CommandName,
  have: AccessLevel,
  verifiedAt: number | null,
  windowHours: number,
  now: number = Date.now(),
): Gate {
  const need = COMMAND_LEVELS[command];
  if (LEVEL_RANK[have] < LEVEL_RANK[need.level]) return "verify";
  if (need.sensitive && (verifiedAt === null || now - verifiedAt > windowHours * 3_600_000)) return "reverify";
  return "allow";
}

/** The level this person has: a verified session, the case this chat opened, or nothing yet. */
export function levelOf(input: { signedIn: boolean; conversationCase: string | null }): AccessLevel {
  if (input.signedIn) return "verified";
  return input.conversationCase ? "conversation" : "public";
}

// ---------------------------------------------------------------- what a voice may say

/**
 * Speech never reads out a whole phone number, email, case number or report
 * reference: a phone becomes "your number ending 4567", a case number "your
 * case ending 213". The text on screen keeps them; only what is spoken changes.
 */
const SPOKEN = {
  en: { email: "your email", caseEnding: "case ending {n}", numberEnding: "number ending {n}" },
  ru: { email: "ваша почта", caseEnding: "заявка с окончанием {n}", numberEnding: "номер с окончанием {n}" },
  uz: { email: "emailingiz", caseEnding: "oxiri {n} bo'lgan ariza", numberEnding: "oxiri {n} bo'lgan raqam" },
} as const;

export function speakable(text: string, lang: "en" | "ru" | "uz" = "en"): string {
  const words = SPOKEN[lang] ?? SPOKEN.en;
  const tail = (template: string, n: string) => template.replace("{n}", n.split("").join(" "));
  return text
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, words.email)
    .replace(/\bSH-[A-Z0-9]{4}(?:-[A-Z0-9]{4}){2,3}\b/g, (ref) => tail(words.caseEnding, ref.slice(-3)))
    .replace(/\b[A-Z]{2}\d{5}\b/g, (ref) => tail(words.caseEnding, ref.slice(-3)))
    .replace(/\+?\d[\d\s().-]{7,}\d/g, (phone) => {
      const digits = phone.replace(/\D/g, "");
      return digits.length >= 8 ? tail(words.numberEnding, digits.slice(-4)) : phone;
    });
}
