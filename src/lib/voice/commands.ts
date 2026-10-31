import "server-only";
import { listCities, listTreatments, priceBandsFor, type Treatment } from "../catalogue";
import {
  casesForEmail,
  casesForPhone,
  editPackage,
  getCase,
  addPatientNote,
  setPatientEmail,
  setPreference,
  type PatientCase,
  type PlanEdit,
} from "../cases";
import { replanCase } from "../case-flow";
import {
  currentPatient,
  endPatientSession,
  findCaseForSignIn,
  requestEmailCode,
  startPatientEmailSession,
  startPatientSession,
  verifyEmailCode,
  type PatientIdentity,
} from "../patient-auth";
import { provenIdentity, sendCaseCode, verifyCaseCode } from "../case-codes";
import { allowHit } from "../rate-limit";
import { getContent } from "../store";
import { getSettings } from "../settings";
import { notifyOps } from "../mailer";
import type { Locale } from "../i18n";
import {
  markHumanRequested,
  profileOf,
  setWebIntakeState,
  resetWebIntake,
  setPendingCommand,
  updateWebIntakeFields,
  type PendingCommand,
  type WebIntake,
} from "../web-intake";
import {
  COMMAND_NAMES,
  readCity,
  readCode,
  readCompanions,
  readEmail,
  readLanguage,
  readMonth,
  readPhone,
  readReference,
  readService,
  restOf,
  slotsFor,
  yesNo,
  type CommandName,
  type ParsedCommand,
} from "./intents";
import { PAGE_WORDS, SERVICE_WORDS, STATUS_WORDS, say, type SayKey, type SayLang } from "./command-copy";
import { voiceForGender } from "./voices";
import { matchTreatment } from "./treatments";
import { nextProfileStep, profileQuestion, profileSuggestions } from "../assistant/profile";

/** Something the browser does after the reply: open a page, switch language, change voice. */
export type ClientAction =
  | { type: "navigate"; href: string }
  | { type: "locale"; locale: Locale }
  | { type: "voice"; naturalId?: string; gender?: "female" | "male"; rate?: "slower" | "faster" | "normal"; openPicker?: boolean };

/** A button under the reply — a link the patient taps, since a voice turn cannot open one itself. */
export type ReplyLink = { kind: "whatsapp" | "phone" | "attach" | "page"; label: string; href?: string };

export type CommandOutcome = {
  reply: string;
  action?: ClientAction;
  links?: ReplyLink[];
  /** The chat goes on as an intake, e.g. after "make me a plan". */
  state?: string;
  caseReference?: string;
  /** Quick replies to show under the message. */
  suggestions?: string[];
  /** Everything a case needs is known: the caller opens it now. */
  openCase?: boolean;
};

type Ctx = {
  sessionId: string;
  intake: WebIntake;
  text: string;
  lang: SayLang;
  locale: Locale;
  /** The caller's address, for the sign-in attempt limit. */
  ip?: string;
};

/** Sign-in steps: at most five tries an hour for this conversation and for this address. */
const SIGN_IN_TRIES = 5;
const SIGN_IN_WINDOW_MS = 60 * 60_000;
function mayTrySignIn(ctx: Ctx): boolean {
  return allowHit(`signin-ip:${ctx.ip ?? "unknown"}`, SIGN_IN_TRIES, SIGN_IN_WINDOW_MS) && allowHit(`signin-chat:${ctx.sessionId}`, SIGN_IN_TRIES, SIGN_IN_WINDOW_MS);
}

export function isCommandName(value: unknown): value is CommandName {
  return typeof value === "string" && (COMMAND_NAMES as readonly string[]).includes(value);
}

const edit = (change: string): PlanEdit => ({ at: new Date().toISOString(), via: "voice", change });

/** Long references are hard to listen to; the last four characters are enough to tell cases apart. */
const ending = (reference: string) => reference.slice(-4);

async function cityNames(): Promise<string[]> {
  return (await listCities().catch(() => [])).map((city) => city.name);
}

// ------------------------------------------------------------- whose cases

async function identity(): Promise<PatientIdentity | null> {
  return currentPatient().catch(() => null);
}

/**
 * The cases this person may act on: those of the signed-in patient, and the
 * one this very conversation opened. Nothing is found by a phone number or
 * email someone merely says aloud.
 */
async function ownedCases(ctx: Ctx, who: PatientIdentity | null): Promise<PatientCase[]> {
  const found: PatientCase[] = [];
  if (who) {
    found.push(...(await (who.kind === "email" ? casesForEmail(who.email, 10) : casesForPhone(who.digits, 10)).catch(() => [])));
  }
  if (ctx.intake.caseReference && !found.some((item) => item._id === ctx.intake.caseReference)) {
    const own = await getCase(ctx.intake.caseReference).catch(() => null);
    if (own) found.push(own);
  }
  return found.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function treatmentLabel(item: Treatment, lang: SayLang): string {
  return item.name?.[lang] || item.name?.en || item._id;
}

// ------------------------------------------------------------- running

/**
 * Carries out a command and says what happened. A command that needs more
 * — an email, a city, a yes — remembers where it got to on the conversation
 * and picks up from the next message (see `continueCommand`).
 */
export async function runCommand(ctx: Ctx, command: ParsedCommand): Promise<CommandOutcome> {
  const { lang, locale } = ctx;
  const slots = command.slots;
  const line = (key: SayKey, vars?: Record<string, string | number>) => say(key, lang, vars);

  switch (command.name) {
    case "help":
      return { reply: line("help") };

    case "cancel":
      await setPendingCommand(ctx.sessionId, null);
      return { reply: line("cancelled") };

    case "repeat": {
      const last = [...ctx.intake.messages].reverse().find((message) => message.role === "assistant");
      return { reply: last?.content ?? line("nothingToRepeat") };
    }

    case "emergency":
      return { reply: line("emergency") };

    case "start_case": {
      if (ctx.intake.caseReference) {
        await setPendingCommand(ctx.sessionId, { name: "start_case", step: "confirm_new", data: { rest: slots.rest ?? "" } });
        return { reply: line("alreadyHaveCase", { reference: `…${ending(ctx.intake.caseReference)}` }) };
      }
      return beginCase(ctx, slots.rest ?? "");
    }

    case "sign_in": {
      if (await identity()) return { reply: line("signedIn") };
      if (slots.email) return sendCode(ctx, slots.email, {});
      // This conversation opened a case: the code goes to the contacts on it.
      if (ctx.intake.caseReference && !slots.reference) {
        if (!mayTrySignIn(ctx)) return { reply: line("tooManyTries") };
        const own = await getCase(ctx.intake.caseReference).catch(() => null);
        const sent = own ? await sendCaseCode(own).catch(() => ({ status: "failed" as const })) : { status: "none" as const };
        if (sent.status === "none" || sent.status === "failed") return { reply: line("caseCodeNoChannel") };
        await setPendingCommand(ctx.sessionId, { name: "sign_in", step: "case_code", data: { reference: ctx.intake.caseReference } });
        return { reply: line("ownCaseCodeSent") };
      }
      if (slots.reference) {
        await setPendingCommand(ctx.sessionId, { name: "sign_in", step: "phone", data: { reference: slots.reference } });
        return { reply: line("askPhone") };
      }
      return askToSignIn(ctx, null);
    }

    case "sign_out":
      await endPatientSession();
      await setPendingCommand(ctx.sessionId, null);
      return { reply: line("signedOut") };

    case "upload_report":
      return { reply: line("upload"), links: [{ kind: "attach", label: lang === "ru" ? "Прикрепить" : lang === "uz" ? "Biriktirish" : "Attach report" }] };

    case "cost":
      return priceOf(ctx, slots.rest ?? "");

    case "hospitals":
    case "doctors":
    case "treatments":
    case "conditions":
    case "home": {
      const path = command.name === "home" ? "" : `/${command.name}`;
      return { reply: line("opening", { what: PAGE_WORDS[command.name][lang] }), action: { type: "navigate", href: `/${locale}${path}` } };
    }

    case "portal": {
      const signedIn = Boolean(await identity());
      return {
        reply: line("opening", { what: PAGE_WORDS.portal[lang] }),
        action: { type: "navigate", href: `/${locale}/portal/patient${signedIn ? "" : "/login"}` },
      };
    }

    case "human": {
      await markHumanRequested(ctx.sessionId);
      const settings = await getSettings();
      // The console's test chat never pages a real coordinator.
      if (!ctx.sessionId.startsWith("admin-test-")) await notifyOps(settings.opsEmail, "A patient asked for a coordinator", [
        "Someone in the website chat asked to talk to a person.",
        ctx.intake.caseReference ? `Their case: ${ctx.intake.caseReference}` : "They have no case yet.",
        "Nothing clinical is in this email.",
      ]).catch(() => undefined);
      const links = await contactLinks(lang);
      return { reply: line(links.length ? "human" : "humanNoContact"), links };
    }

    case "whatsapp":
    case "call": {
      const links = (await contactLinks(lang)).filter((link) => link.kind === (command.name === "whatsapp" ? "whatsapp" : "phone"));
      if (links.length === 0) return runCommand(ctx, { name: "human", slots: {} });
      return { reply: line(command.name), links };
    }

    case "language": {
      if (!slots.language) {
        await setPendingCommand(ctx.sessionId, { name: "language", step: "which", data: {} });
        return { reply: line("whichLanguage") };
      }
      return { reply: say("language", slots.language), action: { type: "locale", locale: slots.language } };
    }

    case "voice": {
      if (!slots.gender && !slots.rate) return { reply: line("voiceMenu"), action: { type: "voice", openPicker: true } };
      return {
        reply: line("voiceChanged"),
        action: {
          type: "voice",
          gender: slots.gender,
          rate: slots.rate,
          naturalId: slots.gender ? voiceForGender(slots.gender).id : undefined,
        },
      };
    }

    // Everything below acts on the patient's own case.
    default:
      return onOwnCase(ctx, command);
  }
}

async function onOwnCase(ctx: Ctx, command: ParsedCommand): Promise<CommandOutcome> {
  const { lang, locale } = ctx;
  const line = (key: SayKey, vars?: Record<string, string | number>) => say(key, lang, vars);
  const who = await identity();
  const cases = await ownedCases(ctx, who);

  if (cases.length === 0) {
    if (!who) return askToSignIn(ctx, command.name);
    return { reply: line("noCases") };
  }
  const current = cases[0];
  const slots = command.slots;

  switch (command.name) {
    case "case_status":
      return { reply: await describeCase(current, lang), caseReference: current._id };

    case "my_cases": {
      if (cases.length === 1) return { reply: await describeCase(current, lang), caseReference: current._id };
      const list = cases
        .slice(0, 3)
        .map((item) => `…${ending(item._id)} — ${STATUS_WORDS[item.status]?.[lang] ?? item.status}`)
        .join("; ");
      return { reply: line("casesList", { count: cases.length, list }) };
    }

    case "open_plan":
      return {
        reply: current.status === "planning" ? line("planNotReady") : line("opening", { what: PAGE_WORDS.plan[lang] }),
        action: { type: "navigate", href: `/${locale}/plan/${current._id}` },
        caseReference: current._id,
      };

    case "edit_plan":
      await setPendingCommand(ctx.sessionId, null);
      return { reply: line("editMenu") };

    case "add_service":
    case "remove_service": {
      const service = slots.service;
      if (!service) {
        await setPendingCommand(ctx.sessionId, { name: command.name, step: "service", data: {} });
        return { reply: line("whichService") };
      }
      if (!current.plan) return { reply: line(current.status === "planning" ? "planBusy" : "noCases") };
      const include = command.name === "add_service";
      await editPackage(current._id, service, include, edit(`${include ? "Added" : "Removed"} ${service}`));
      await setPendingCommand(ctx.sessionId, null);
      return {
        reply: line(include ? "serviceAdded" : "serviceRemoved", { service: SERVICE_WORDS[service][lang] }),
        caseReference: current._id,
      };
    }

    case "set_city": {
      const cities = await cityNames();
      const city = slots.city ?? readCity(ctx.text, cities);
      if (!city) {
        await setPendingCommand(ctx.sessionId, { name: "set_city", step: "city", data: {} });
        return { reply: line("whichCity", { cities: cities.slice(0, 8).join(", ") }) };
      }
      await setPreference(current._id, "city", city, edit(`Prefers ${city}`));
      await setPendingCommand(ctx.sessionId, null);
      return { reply: line("citySet", { city }), caseReference: current._id };
    }

    case "set_travel": {
      const month = slots.month ?? readMonth(ctx.text);
      if (!month) {
        await setPendingCommand(ctx.sessionId, { name: "set_travel", step: "month", data: {} });
        return { reply: line("whichMonth") };
      }
      await setPreference(current._id, "travel", month, edit(`Travel: ${month}`));
      await setPendingCommand(ctx.sessionId, null);
      return { reply: line("travelSet", { month }), caseReference: current._id };
    }

    case "set_companions": {
      const count = slots.companions ?? readCompanions(ctx.text);
      if (count === undefined) return { reply: line("editMenu") };
      await setPreference(current._id, "companions", count, edit(`Companions: ${count}`));
      return { reply: count === 0 ? line("companionsNone") : line("companionsSet", { count }), caseReference: current._id };
    }

    case "add_details":
      await setPendingCommand(ctx.sessionId, { name: "add_details", step: "details", data: { reference: current._id } });
      return { reply: line("askDetails") };

    case "replan":
      return startReplan(ctx, current._id);

    case "add_email": {
      const email = slots.email ?? readEmail(ctx.text);
      if (!email) {
        await setPendingCommand(ctx.sessionId, { name: "add_email", step: "email", data: { reference: current._id } });
        return { reply: line("askEmail") };
      }
      await setPendingCommand(ctx.sessionId, { name: "add_email", step: "confirm", data: { reference: current._id, email } });
      return { reply: line("emailConfirm", { email }) };
    }

    default:
      return { reply: line("help") };
  }
}

/**
 * Picks a half-finished command back up with the patient's answer. Returns
 * null when the message is not an answer, so it is handled as new.
 */
export async function continueCommand(ctx: Ctx, pending: PendingCommand): Promise<CommandOutcome | null> {
  const { lang } = ctx;
  const line = (key: SayKey, vars?: Record<string, string | number>) => say(key, lang, vars);
  const text = ctx.text;
  const answer = yesNo(text);
  const then = typeof pending.data.then === "string" && isCommandName(pending.data.then) ? pending.data.then : null;

  switch (`${pending.name}:${pending.step}`) {
    case "start_case:confirm_new": {
      if (answer === "no") {
        await setPendingCommand(ctx.sessionId, null);
        return { reply: line("cancelled") };
      }
      if (answer !== "yes") return { reply: line("sayYesNo") };
      const fresh = await resetWebIntake(ctx.sessionId, ctx.intake);
      return beginCase({ ...ctx, intake: fresh }, String(pending.data.rest ?? ""));
    }

    case "sign_in:method": {
      const email = readEmail(text);
      if (email) return sendCode(ctx, email, pending.data);
      const reference = readReference(text);
      if (reference) {
        await setPendingCommand(ctx.sessionId, { name: "sign_in", step: "phone", data: { ...pending.data, reference } });
        return { reply: line("askPhone") };
      }
      if (/reference|case number|номер заявки|номер случая|ariza raqam|holat raqam/i.test(text)) {
        await setPendingCommand(ctx.sessionId, { name: "sign_in", step: "reference", data: { ...pending.data } });
        return { reply: line("askReference") };
      }
      if (/\b(new|first time|don'?t have)\b|впервые|нет заявки|новый|новая|yangi|birinchi marta/i.test(text)) {
        return beginCase(ctx, "");
      }
      return { reply: line("askEmailAgain") };
    }

    case "sign_in:code": {
      if (/reference|case number|номер заявки|номер случая|ariza raqam|holat raqam/i.test(text)) {
        await setPendingCommand(ctx.sessionId, { name: "sign_in", step: "reference", data: { ...pending.data } });
        return { reply: line("askReference") };
      }
      const code = readCode(text);
      if (!code) return { reply: line("askCodeAgain") };
      if (!mayTrySignIn(ctx)) return { reply: line("tooManyTries") };
      const verified = await verifyEmailCode(String(pending.data.email), code).catch(() => null);
      if (!verified) return { reply: line("codeWrong") };
      await startPatientEmailSession(verified);
      return signedInThen(ctx, then, String(pending.data.thenText ?? ""));
    }

    case "sign_in:reference": {
      const reference = readReference(text);
      if (!reference) return { reply: line("referenceAgain") };
      if (!mayTrySignIn(ctx)) return { reply: line("tooManyTries") };
      await setPendingCommand(ctx.sessionId, { name: "sign_in", step: "phone", data: { ...pending.data, reference } });
      return { reply: line("askPhone") };
    }

    case "sign_in:phone": {
      const phone = readPhone(text);
      if (!phone) return { reply: line("askPhone") };
      if (!mayTrySignIn(ctx)) return { reply: line("tooManyTries") };
      // The number and phone only find the case. The code goes to a contact
      // already on it — never to the number typed here — and the same reply
      // is given whether or not anything matched.
      const record = await findCaseForSignIn(String(pending.data.reference), phone).catch(() => null);
      if (record) await sendCaseCode(record).catch((error) => console.error("[shifain] chat case code failed", error));
      await setPendingCommand(ctx.sessionId, { name: "sign_in", step: "case_code", data: { ...pending.data } });
      return { reply: line("caseCodeSent") };
    }

    case "sign_in:case_code": {
      const code = readCode(text);
      if (!code) return { reply: line("askCodeAgain") };
      if (!mayTrySignIn(ctx)) return { reply: line("tooManyTries") };
      const verified = await verifyCaseCode(String(pending.data.reference), code).catch(() => null);
      const proven = verified ? provenIdentity(verified.record, verified.via) : null;
      if (!proven) return { reply: line("caseCodeWrong") };
      if (proven.kind === "email") await startPatientEmailSession(proven.email);
      else await startPatientSession(proven.digits);
      return signedInThen(ctx, then, String(pending.data.thenText ?? ""));
    }

    case "add_service:service":
    case "remove_service:service": {
      const service = readService(text);
      if (!service) return null;
      return runCommand(ctx, { name: pending.name as CommandName, slots: { service } });
    }

    case "set_city:city": {
      const city = readCity(text, await cityNames());
      if (!city) return null;
      return runCommand(ctx, { name: "set_city", slots: { city } });
    }

    case "set_travel:month": {
      const month = readMonth(text) ?? (text.trim().split(/\s+/).length <= 4 ? text.trim() : undefined);
      if (!month) return null;
      return runCommand(ctx, { name: "set_travel", slots: { month } });
    }

    case "language:which": {
      const language = readLanguage(text);
      if (!language) return null;
      await setPendingCommand(ctx.sessionId, null);
      return { reply: say("language", language), action: { type: "locale", locale: language } };
    }

    case "add_details:details": {
      const reference = String(pending.data.reference);
      if (!(await mayAct(ctx, reference))) return null;
      await addPatientNote(reference, text, edit("Added medical details"));
      const settings = await getSettings();
      if (!settings.plannerEnabled) {
        await setPendingCommand(ctx.sessionId, null);
        return { reply: line("detailsSavedNoReplan") };
      }
      await setPendingCommand(ctx.sessionId, { name: "replan", step: "confirm", data: { reference } });
      return { reply: line("detailsSaved") };
    }

    case "replan:confirm": {
      if (answer === "no") {
        await setPendingCommand(ctx.sessionId, null);
        return { reply: line("detailsSavedNoReplan") };
      }
      if (answer !== "yes") return { reply: line("sayYesNo") };
      return startReplan(ctx, String(pending.data.reference));
    }

    case "add_email:email": {
      const email = readEmail(text);
      if (!email) return { reply: line("askEmailAgain") };
      await setPendingCommand(ctx.sessionId, { name: "add_email", step: "confirm", data: { ...pending.data, email } });
      return { reply: line("emailConfirm", { email }) };
    }

    case "add_email:confirm": {
      if (answer === "no") {
        await setPendingCommand(ctx.sessionId, { name: "add_email", step: "email", data: { reference: pending.data.reference } });
        return { reply: line("askEmail") };
      }
      if (answer !== "yes") return { reply: line("sayYesNo") };
      const reference = String(pending.data.reference);
      if (!(await mayAct(ctx, reference))) return null;
      const email = String(pending.data.email);
      await setPatientEmail(reference, email, edit("Added an email address"));
      await setPendingCommand(ctx.sessionId, null);
      return { reply: line("emailSaved", { email }) };
    }

    case "cost:treatment":
      return priceOf(ctx, text);
  }
  return null;
}

/** Checks again, at the moment of acting, that this person may change this case. */
async function mayAct(ctx: Ctx, reference: string): Promise<boolean> {
  const cases = await ownedCases(ctx, await identity());
  return cases.some((item) => item._id === reference);
}

/**
 * "Create my account" / "make me a plan": picks up from what the patient has
 * already said in this conversation rather than starting over. With the
 * medical picture clear it goes straight to the few contact details.
 */
async function beginCase(ctx: Ctx, phrase: string): Promise<CommandOutcome> {
  await setPendingCommand(ctx.sessionId, null);
  const treatments = await listTreatments().catch(() => []);
  const match = matchTreatment(restOf(phrase), treatments);
  if (match && !ctx.intake.fields.treatment) {
    await updateWebIntakeFields(ctx.sessionId, { treatment: treatmentLabel(match, "en") });
  }
  const treatment = ctx.intake.fields.treatment ?? (match ? treatmentLabel(match, "en") : null);

  if (treatment && ctx.intake.fields.condition) {
    await setWebIntakeState(ctx.sessionId, "collecting_profile");
    const step = nextProfileStep(profileOf(ctx.intake));
    if (step) {
      return {
        reply: `${say("startHaveEnough", ctx.lang)} ${profileQuestion(step, ctx.lang)}`,
        state: "collecting_profile",
        suggestions: profileSuggestions(step, ctx.lang),
      };
    }
    return { reply: say("startHaveEnough", ctx.lang), state: "collecting_profile", openCase: true };
  }
  if (match) {
    return { reply: say("startWithTreatment", ctx.lang, { treatment: treatmentLabel(match, ctx.lang) }), state: "medical_chat" };
  }
  if (ctx.intake.fields.condition) return { reply: say("startNeedTreatment", ctx.lang), state: "medical_chat" };
  return { reply: say("startAsk", ctx.lang), state: "medical_chat" };
}

/** Asks who they are, remembering what they wanted so it runs once they are in. */
async function askToSignIn(ctx: Ctx, then: CommandName | null): Promise<CommandOutcome> {
  await setPendingCommand(ctx.sessionId, { name: "sign_in", step: "method", data: { then: then ?? "", thenText: then ? ctx.text : "" } });
  return { reply: say("needSignIn", ctx.lang) };
}

async function sendCode(ctx: Ctx, email: string, carry: PendingCommand["data"]): Promise<CommandOutcome> {
  // The answer is the same whether or not we know the address, and the code
  // itself is never spoken or shown: it proves the person reads that inbox.
  await requestEmailCode(email).catch((error) => console.error("[shifain] voice sign-in code failed", error));
  await setPendingCommand(ctx.sessionId, { name: "sign_in", step: "code", data: { ...carry, email } });
  return { reply: say("codeSent", ctx.lang, { email }) };
}

async function signedInThen(ctx: Ctx, then: CommandName | null, thenText: string): Promise<CommandOutcome> {
  await setPendingCommand(ctx.sessionId, null);
  const signedIn = say("signedIn", ctx.lang);
  if (!then) return { reply: signedIn };
  const cities = await cityNames();
  const next = await runCommand({ ...ctx, text: thenText }, { name: then, slots: slotsFor(then, thenText, cities) });
  return { ...next, reply: `${signedIn} ${next.reply}` };
}

async function startReplan(ctx: Ctx, reference: string): Promise<CommandOutcome> {
  await setPendingCommand(ctx.sessionId, null);
  if (!(await mayAct(ctx, reference))) return { reply: say("noCases", ctx.lang) };
  const result = await replanCase(reference);
  const key: SayKey =
    result === "started" ? "replanning" : result === "busy" ? "planBusy" : result === "limit" ? "replanLimit" : "detailsSavedNoReplan";
  return {
    reply: say(key, ctx.lang),
    action: result === "started" || result === "busy" ? { type: "navigate", href: `/${ctx.locale}/plan/${reference}` } : undefined,
    caseReference: reference,
  };
}

async function describeCase(item: PatientCase, lang: SayLang): Promise<string> {
  const parts = [say("status", lang, { reference: `…${ending(item._id)}`, status: STATUS_WORDS[item.status]?.[lang] ?? item.status })];
  if (item.plan && item.status !== "planning") {
    const treatments = await listTreatments().catch(() => []);
    const code = item.plan.recommendedTreatmentCode;
    const treatment = treatments.find((entry) => entry._id === code);
    const city = item.preferences?.city ?? item.plan.destinationCity;
    if (treatment) {
      parts.push(
        say("statusPlan", lang, {
          treatment: treatmentLabel(treatment, lang),
          city: city ? ` (${city})` : "",
          days: item.plan.stay.daysInCountry,
        }),
      );
    }
    parts.push(say("statusNext", lang));
  }
  return parts.join(" ");
}

async function priceOf(ctx: Ctx, phrase: string): Promise<CommandOutcome> {
  const treatments = await listTreatments().catch(() => []);
  let match = matchTreatment(restOf(phrase), treatments);
  if (!match) {
    // "How much will it cost?" — about their own plan, when they have one.
    const own = (await ownedCases(ctx, await identity()))[0];
    const code = own?.plan?.recommendedTreatmentCode;
    match = code ? (treatments.find((item) => item._id === code) ?? null) : null;
  }
  if (!match) {
    const pending = ctx.intake.command;
    if (pending?.name === "cost") {
      await setPendingCommand(ctx.sessionId, null);
      return { reply: say("costUnknown", ctx.lang) };
    }
    await setPendingCommand(ctx.sessionId, { name: "cost", step: "treatment", data: {} });
    return { reply: say("costWhich", ctx.lang) };
  }
  await setPendingCommand(ctx.sessionId, null);
  const [band] = await priceBandsFor([match._id]).catch(() => []);
  if (!band) return { reply: say("costUnknown", ctx.lang) };
  const money = (value: number) => value.toLocaleString("en-US");
  return { reply: say("costRange", ctx.lang, { treatment: treatmentLabel(match, ctx.lang), min: money(band.min), max: money(band.max) }) };
}

async function contactLinks(lang: SayLang): Promise<ReplyLink[]> {
  const contact = (await getContent().catch(() => null))?.contact;
  const links: ReplyLink[] = [];
  if (contact?.whatsapp) {
    links.push({ kind: "whatsapp", label: "WhatsApp", href: `https://wa.me/${contact.whatsapp.replace(/\D/g, "")}` });
  }
  if (contact?.phone) {
    links.push({
      kind: "phone",
      label: lang === "ru" ? "Позвонить" : lang === "uz" ? "Qo'ng'iroq qilish" : "Call us",
      href: `tel:${contact.phone.replace(/[^\d+]/g, "")}`,
    });
  }
  return links;
}
