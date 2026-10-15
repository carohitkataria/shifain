import "server-only";
import { listCities } from "../catalogue";
import { getCase } from "../cases";
import { startPatientSession } from "../patient-auth";
import type { Locale } from "../i18n";
import { generateChatReply, generateIntakeReply, type ConversationMessage } from "../voice-agent";
import {
  activeCommand,
  createCaseFromWebIntake,
  getOrCreateWebIntake,
  profileOf,
  pushWebIntakeMessage,
  setPendingCommand,
  setWebIntakeProfileExtras,
  setWebIntakeState,
  updateWebIntakeFields,
  type WebIntake,
} from "../web-intake";
import { parseCommand, slotsFor } from "../voice/intents";
import { continueCommand, runCommand, type ClientAction, type CommandOutcome, type ReplyLink } from "../voice/commands";
import { STATUS_WORDS, sayLang, type SayLang } from "../voice/command-copy";
import { getAssistantConfig } from "./config";
import { instantAnswer } from "./knowledge";
import {
  guessLanguage,
  nextProfileStep,
  profileQuestion,
  profileSuggestions,
  readProfileAnswer,
  thanksFor,
  type ProfileStep,
} from "./profile";

/** What the chat shows (and speaks) after one patient message. */
export type TurnReply = {
  reply: string;
  state: string;
  caseReference?: string | null;
  action?: ClientAction;
  links?: ReplyLink[];
  /** Quick replies under the message. */
  suggestions?: string[];
  /** A coordinator is handling this chat; the assistant is quiet. */
  handoff?: boolean;
  /** Which path answered — shown in the admin test console. */
  via: "command" | "instant" | "ai" | "scripted" | "profile" | "handoff";
};

type TurnInput = {
  sessionId: string;
  text: string;
  /** The language the patient spoke in, when the recogniser knows it. */
  detectedLanguage?: string;
  locale: Locale;
  /** Admin test console: nothing is opened or signed in for real. */
  dryRun?: boolean;
};

const HANDOFF_NOTE: Record<SayLang, string> = {
  en: "A coordinator is looking after your chat now and will reply here shortly.",
  ru: "С вами сейчас координатор — он ответит здесь в ближайшее время.",
  uz: "Hozir siz bilan koordinator — u tez orada shu yerda javob beradi.",
};

const CASE_OPENED: Record<SayLang, string> = {
  en: "Thank you, {name}. Your case is open — reference ending {ref}. Your free plan is being prepared now; it takes about a minute and I'm opening it for you. A coordinator will also contact you on {phone} within 24 hours. You're signed in on this device, so you can ask me “what's my case status” any time.",
  ru: "Спасибо, {name}. Заявка открыта — номер заканчивается на {ref}. Бесплатный план готовится, это около минуты — открываю его. Координатор также свяжется с вами по номеру {phone} в течение 24 часов. Вы вошли на этом устройстве — спрашивайте «какой статус моей заявки» в любое время.",
  uz: "Rahmat, {name}. Arizangiz ochildi — raqami {ref} bilan tugaydi. Bepul reja tayyorlanmoqda, bir daqiqacha — uni ochyapman. Koordinator 24 soat ichida {phone} raqami orqali bog'lanadi. Siz bu qurilmada tizimga kirdingiz — istalgan vaqtda «arizam qanday holatda» deb so'rang.",
};

const TEST_CASE_NOTE = "(Test mode) Everything a case needs is here, so a real chat would open the case now, sign the patient in and open their plan page.";

const historyOf = (intake: WebIntake): ConversationMessage[] =>
  intake.messages.slice(-16).map((message) => ({
    role: message.role === "user" ? "user" : "assistant",
    content: message.content,
  }));

/**
 * One turn of the website conversation, by text or voice. In order, and
 * stopping at the first that answers:
 *
 *   1. a coordinator has taken over → stay quiet
 *   2. an app command ("case status", "add visa support") → done in code
 *   3. a contact-detail question we asked (name, phone…) → read in code
 *   4. an instant answer from the knowledge base → no AI
 *   5. the AI, for conversation — one structured call, with a scripted fallback
 */
export async function handleWebTurn(input: TurnInput): Promise<TurnReply> {
  const { sessionId, text, locale } = input;
  let intake = await getOrCreateWebIntake(sessionId);
  // The patient's language: what the recogniser heard, what they typed, what they used before, the page.
  const guessed = guessLanguage(text);
  const lang = sayLang(input.detectedLanguage ?? guessed ?? intake.language ?? locale);
  const history = historyOf(intake); // read before this message is stored
  await pushWebIntakeMessage(sessionId, "user", text);
  if (!intake.locale || (guessed && guessed !== intake.language)) {
    await setWebIntakeProfileExtras(sessionId, { locale: intake.locale ?? locale, ...(guessed ? { language: guessed } : {}) });
  }

  const done = async (reply: TurnReply): Promise<TurnReply> => {
    if (reply.reply) await pushWebIntakeMessage(sessionId, "assistant", reply.reply);
    return reply;
  };

  // 1. A person is handling this chat.
  if (intake.handoff) {
    const alreadySaid = intake.messages.slice(-6).some((message) => message.content === HANDOFF_NOTE[lang]);
    return done({ reply: alreadySaid ? "" : HANDOFF_NOTE[lang], state: intake.state, handoff: true, via: "handoff" });
  }

  // 2. Commands.
  const cities = (await listCities().catch(() => [])).map((city) => city.name);
  const ctx = { sessionId, intake, text, lang, locale };
  const aiLanguage = input.detectedLanguage ?? guessed ?? intake.language;
  const command = await commandTurn(ctx, cities);
  if (command) return done(await afterCommand(input, command, lang));

  // 3. Contact details, once the medical picture is clear.
  if (intake.state === "collecting_profile" && !intake.complete) {
    const step = nextProfileStep(profileOf(intake));
    if (step) {
      const answer = readProfileAnswer(step, text);
      const looksLikeQuestion = isQuestionOrStatement(text);
      if (answer.value || answer.skipped) {
        await saveProfileAnswer(sessionId, step, answer.value, answer.skipped, answer.country, intake);
        intake = await getOrCreateWebIntake(sessionId);
        return done(await askNextOrOpen(input, intake, lang, step === "name" ? thanksFor(answer.value, lang) : ""));
      }
      if (!looksLikeQuestion) {
        return done({
          reply: profileQuestion(step, lang, true),
          state: "collecting_profile",
          suggestions: profileSuggestions(step, lang),
          via: "profile",
        });
      }
      // A question in the middle ("why do you need my number?"): answer it, then ask again.
      const answered = await generateChatReply(text, history, aiLanguage, {
        caseSummary:
          "You are collecting the patient's contact details so a coordinator can prepare their free plan and reach them. Answer their question briefly; do not ask for any detail yourself — the system asks next.",
      });
      return done({
        reply: `${answered.reply} ${profileQuestion(step, lang)}`.trim(),
        state: "collecting_profile",
        suggestions: profileSuggestions(step, lang),
        via: "ai",
      });
    }
    return done(await askNextOrOpen(input, intake, lang, ""));
  }

  // 4. Instant answers the team has written.
  const config = await getAssistantConfig();
  const instant = instantAnswer(text, config.entries, lang);
  if (instant) {
    return done({ reply: instant.text, state: intake.complete ? "complete" : intake.state, caseReference: intake.caseReference, via: "instant" });
  }

  // 5. Conversation.
  if (intake.complete) {
    const { reply, command: named } = await generateChatReply(text, history, aiLanguage, {
      commands: true,
      caseSummary: await caseSummary(intake),
    });
    if (named) {
      const outcome = await runCommand({ ...ctx, intake }, { name: named, slots: slotsFor(named, text, cities) });
      return done(await afterCommand(input, outcome, lang));
    }
    return done({ reply, state: "complete", caseReference: intake.caseReference, via: "ai" });
  }

  const turn = await generateIntakeReply(text, history, intake.fields, aiLanguage, { commands: true });
  if (turn.command) {
    const outcome = await runCommand({ ...ctx, intake }, { name: turn.command, slots: slotsFor(turn.command, text, cities) });
    return done(await afterCommand(input, outcome, lang));
  }

  const { readyToSubmit, email, ...fields } = turn.extracted;
  // Details volunteered early ("I'm Anna, +998…") are kept, after the same checks as when asked.
  const volunteered = {
    name: fields.name ? readProfileAnswer("name", fields.name).value : undefined,
    phone: fields.phone ? readProfileAnswer("phone", fields.phone).value : undefined,
    country: fields.country ? readProfileAnswer("country", fields.country).value : undefined,
  };
  await updateWebIntakeFields(sessionId, {
    treatment: fields.treatment,
    condition: fields.condition,
    duration: fields.duration,
    previousTreatment: fields.previousTreatment,
    age: fields.age,
    ...volunteered,
  });
  if (email && readProfileAnswer("email", email).value) await setWebIntakeProfileExtras(sessionId, { email });
  intake = await getOrCreateWebIntake(sessionId);

  const ready = Boolean(intake.fields.treatment && intake.fields.condition) || (readyToSubmit && Boolean(intake.fields.treatment));
  if (ready) {
    await setWebIntakeState(sessionId, "collecting_profile");
    intake = await getOrCreateWebIntake(sessionId);
    return done({ ...(await askNextOrOpen(input, intake, lang, turn.reply)), via: "ai" });
  }
  return done({ reply: turn.reply, state: "medical_chat", via: "ai" });
}

const QUESTION_START =
  /^(what|how|why|which|when|where|who|can|could|will|would|is|are|do|does|should|tell me|i want|i need|что|как|почему|зачем|какой|какая|когда|где|кто|можно|могу|nima|qanday|nega|qachon|qayerda|kim|mumkin)\b/i;

/** Not an answer to "what's your name / number" but something to respond to first. */
function isQuestionOrStatement(text: string): boolean {
  const value = text.trim();
  return /\?/.test(value) || QUESTION_START.test(value) || value.split(/\s+/).length >= 6;
}

/** A command, or the answer to one the patient is in the middle of; null for conversation. */
async function commandTurn(ctx: Parameters<typeof runCommand>[0], cities: string[]): Promise<CommandOutcome | null> {
  const parsed = parseCommand(ctx.text, cities);
  if (parsed?.name === "cancel" || parsed?.name === "emergency") return runCommand(ctx, parsed);

  const pending = activeCommand(ctx.intake);
  if (pending) {
    // Free text is the answer here ("tell me what's new"), whatever it says.
    if (pending.step === "details") return continueCommand(ctx, pending);
    // A new command takes over from a half-finished one.
    if (parsed && parsed.name !== pending.name) return runCommand(ctx, parsed);
    const answer = await continueCommand(ctx, pending);
    if (answer) return answer;
    await setPendingCommand(ctx.sessionId, null);
  }
  return parsed ? runCommand(ctx, parsed) : null;
}

async function afterCommand(input: TurnInput, outcome: CommandOutcome, lang: SayLang): Promise<TurnReply> {
  const intake = await getOrCreateWebIntake(input.sessionId);
  if (outcome.openCase) return askNextOrOpen(input, intake, lang, outcome.reply);
  return {
    reply: outcome.reply,
    state: outcome.state ?? (intake.complete ? "complete" : intake.state),
    caseReference: outcome.caseReference ?? intake.caseReference,
    action: outcome.action,
    links: outcome.links,
    suggestions: outcome.suggestions,
    via: "command",
  };
}

async function saveProfileAnswer(
  sessionId: string,
  step: ProfileStep,
  value: string | undefined,
  skipped: boolean | undefined,
  countryFromPhone: string | undefined,
  intake: WebIntake,
): Promise<void> {
  if (step === "email") {
    await setWebIntakeProfileExtras(sessionId, skipped ? { emailSkipped: true } : { email: value });
    return;
  }
  const update: Record<string, string> = { [step]: value! };
  if (step === "phone" && countryFromPhone && !intake.fields.country) update.country = countryFromPhone;
  await updateWebIntakeFields(sessionId, update);
}

/** Asks for the next contact detail, or opens the case when there is none left. */
async function askNextOrOpen(input: TurnInput, intake: WebIntake, lang: SayLang, lead: string): Promise<TurnReply> {
  const step = nextProfileStep(profileOf(intake));
  if (step) {
    return {
      reply: [lead, profileQuestion(step, lang)].filter(Boolean).join(" "),
      state: "collecting_profile",
      suggestions: profileSuggestions(step, lang),
      via: "profile",
    };
  }
  if (input.dryRun) return { reply: [lead, TEST_CASE_NOTE].filter(Boolean).join(" "), state: "collecting_profile", via: "profile" };

  const reference = await createCaseFromWebIntake(intake, input.locale);
  if (intake.fields.phone) await startPatientSession(`+${intake.fields.phone.replace(/\D/g, "")}`).catch(() => undefined);
  const phone = intake.fields.phone ? `+${intake.fields.phone.replace(/\D/g, "")}` : "";
  const reply = CASE_OPENED[lang]
    .replace("{name}", (intake.fields.name ?? "").split(" ")[0])
    .replace("{ref}", reference.slice(-4))
    .replace("{phone}", phone);
  return {
    reply: [lead, reply].filter(Boolean).join(" "),
    state: "complete",
    caseReference: reference,
    action: { type: "navigate", href: `/${input.locale}/plan/${reference}` },
    via: "profile",
  };
}

async function caseSummary(intake: WebIntake): Promise<string> {
  const record = intake.caseReference ? await getCase(intake.caseReference).catch(() => null) : null;
  if (!record) return "The patient already has a case open with ShifaIn.";
  return [
    `Their case (reference ending ${record._id.slice(-4)}) is open. Status: ${STATUS_WORDS[record.status]?.en ?? record.status}.`,
    record.statedNeed ? `They asked about: ${record.statedNeed}.` : "",
    record.plan?.understanding ? `Plan summary: ${record.plan.understanding}` : "",
    "A coordinator contacts them within 24 hours. For changes to the plan or account, set the matching command.",
  ]
    .filter(Boolean)
    .join(" ");
}
