import "server-only";
import {
  sendMessage,
  answerCallback,
  getFile,
  downloadFile,
  sendVoice,
  type BotRole,
  type TgUpdate,
} from "./telegram";
import {
  getTelegramContact,
  upsertTelegramContact,
  updateContactState,
  linkContactToCase,
  rememberContactReferral,
  saveMessage,
} from "./crm-messages";
import {
  STAGE_LABEL,
  describeOffer,
  ensureReferralCode,
  linkPartnerTelegram,
  normaliseCode,
  partnerByCode,
  partnerByTelegramChat,
  pipelineOf,
  referralLinks,
  resolveOffer,
  shortName,
  verifyTelegramLinkPayload,
} from "./referrals";
import { listReferrals, money } from "./partners";
import { normalisePhone } from "./patient-auth";
import { confirmTelegramLogin, pendingTelegramLogin } from "./telegram-login";
import { casesForPhone, getCase } from "./cases";
import { createLead } from "./telegram-leads";
import { isElevenLabsConfigured, transcribeAudio, textToSpeech } from "./elevenlabs";
import { generateReply, generateIntakeReply, type ConversationMessage } from "./voice-agent";
import {
  getOrCreateIntake,
  updateIntakeFields,
  pushIntakeMessage,
  setIntakeState,
  isIntakeReady,
  createCaseFromIntake,
  nextProfileQuestion,
  storeIntakeFile,
  countryFromPhone,
} from "./conversation-intake";

/**
 * Patient bot conversation flow (hybrid LLM + code):
 *
 *   /start → welcome message
 *     ↓ text/voice → AI medical conversation (LLM extracts treatment + condition)
 *     ↓ LLM signals ready → code-driven profile questions (country, name if needed)
 *     ↓ profile complete → case auto-created → status menu
 *     ↓ photo/document → stored as report, attached to intake
 *     ↓ contact shared → phone + country auto-detected
 *     ↓ /status <ref> → case status lookup
 */

// ---------------------------------------------------------------- voice history

const conversationCache = new Map<number, { messages: ConversationMessage[]; ts: number }>();
const MAX_HISTORY = 10;
const CACHE_TTL = 30 * 60 * 1000;

function getHistory(chatId: number): ConversationMessage[] {
  const entry = conversationCache.get(chatId);
  if (!entry || Date.now() - entry.ts > CACHE_TTL) {
    conversationCache.delete(chatId);
    return [];
  }
  return entry.messages;
}

function pushHistory(chatId: number, role: "user" | "assistant", content: string): void {
  const history = getHistory(chatId);
  history.push({ role, content });
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
  conversationCache.set(chatId, { messages: history, ts: Date.now() });
}

// ---------------------------------------------------------------- auto-fill helpers

function autoFillFromTelegram(
  msg?: TgUpdate["message"] | null,
  contact?: { phone?: string | null } | null,
): { name?: string; phone?: string; country?: string } {
  const result: { name?: string; phone?: string; country?: string } = {};

  if (msg?.from) {
    const firstName = msg.from.first_name;
    const lastName = msg.from.last_name;
    result.name = lastName ? `${firstName} ${lastName}` : firstName;
  }

  const phone = contact?.phone;
  if (phone) {
    result.phone = phone;
    const country = countryFromPhone(phone);
    if (country) result.country = country;
  }

  return result;
}

// ---------------------------------------------------------------- medical chat (LLM-powered)

async function handleMedicalChat(
  chatId: number,
  userId: number,
  text: string,
  patientLanguage?: string,
): Promise<void> {
  const contact = await getTelegramContact("patient", userId);
  const autoFill = autoFillFromTelegram(null, contact);
  const intake = await getOrCreateIntake(userId, chatId, autoFill);

  await pushIntakeMessage(userId, "user", text);

  const history = intake.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const { reply, extracted } = await generateIntakeReply(
    text,
    history,
    intake.fields,
    patientLanguage,
  );

  const { readyToSubmit, ...fieldUpdates } = extracted;
  if (Object.values(fieldUpdates).some(Boolean)) {
    await updateIntakeFields(userId, fieldUpdates);
  }

  await pushIntakeMessage(userId, "assistant", reply);
  await sendMessage("patient", { chatId, text: reply });

  await saveMessage({
    channel: "telegram",
    direction: "outbound",
    contactType: "lead",
    contactId: null,
    caseReference: null,
    telegramChatId: chatId,
    senderName: "ShifaIn AI",
    text: reply,
    metadata: { ai: true, extracted: Object.values(fieldUpdates).some(Boolean) ? fieldUpdates : null },
    status: "delivered",
  });

  if (readyToSubmit) {
    await transitionToProfile(chatId, userId);
  }

  if (!intake.messages.length) {
    await createLead({
      name: contact ? `${contact.firstName} ${contact.lastName ?? ""}`.trim() : "Telegram user",
      phone: contact?.phone ?? null,
      email: null,
      country: null,
      need: text,
      source: "telegram",
    });
  }

  await updateContactState("patient", userId, "intake");
}

// ---------------------------------------------------------------- profile collection (code-driven, no LLM)

async function transitionToProfile(chatId: number, userId: number): Promise<void> {
  await setIntakeState(userId, "collecting_profile");
  const intake = await getOrCreateIntake(userId, chatId);

  if (isIntakeReady(intake.fields)) {
    await createCaseFromIntake(intake);
    return;
  }

  const q = nextProfileQuestion(intake.fields);
  if (q) {
    await sendMessage("patient", {
      chatId,
      text: q.question,
      keyboard: q.buttons,
    });
  } else if (isIntakeReady(intake.fields)) {
    await createCaseFromIntake(intake);
  }
}

async function handleProfileAnswer(
  chatId: number,
  userId: number,
  answer: string,
): Promise<void> {
  const intake = await getOrCreateIntake(userId, chatId);
  const q = nextProfileQuestion(intake.fields);

  if (!q) {
    if (isIntakeReady(intake.fields)) {
      await createCaseFromIntake(intake);
    }
    return;
  }

  await updateIntakeFields(userId, { [q.field]: answer });
  await pushIntakeMessage(userId, "user", answer);

  const updatedIntake = await getOrCreateIntake(userId, chatId);
  const next = nextProfileQuestion(updatedIntake.fields);

  if (next) {
    await sendMessage("patient", {
      chatId,
      text: next.question,
      keyboard: next.buttons,
    });
    return;
  }

  if (isIntakeReady(updatedIntake.fields)) {
    await createCaseFromIntake(updatedIntake);
  }
}

// ---------------------------------------------------------------- file uploads

async function handleFileUpload(
  chatId: number,
  userId: number,
  msg: TgUpdate["message"],
): Promise<void> {
  if (!msg) return;

  let fileId: string;
  let fileName: string;
  let mimeType: string;
  let fileSize: number;

  if (msg.document) {
    fileId = msg.document.file_id;
    fileName = msg.document.file_name ?? "document";
    mimeType = msg.document.mime_type ?? "application/octet-stream";
    fileSize = msg.document.file_size ?? 0;
  } else if (msg.photo?.length) {
    const largest = msg.photo[msg.photo.length - 1];
    fileId = largest.file_id;
    fileName = "photo.jpg";
    mimeType = "image/jpeg";
    fileSize = largest.file_size ?? 0;
  } else {
    return;
  }

  const contact = await getTelegramContact("patient", userId);
  const autoFill = autoFillFromTelegram(msg, contact);
  await getOrCreateIntake(userId, chatId, autoFill);

  try {
    const fileInfo = await getFile("patient", fileId);
    if (!fileInfo.file_path) {
      await sendMessage("patient", { chatId, text: "Could not process the file. Please try again." });
      return;
    }

    const fileBuffer = await downloadFile("patient", fileInfo.file_path);

    await storeIntakeFile(userId, {
      fileName,
      mimeType,
      fileSize: fileBuffer.byteLength,
      data: fileBuffer,
    });

    await sendMessage("patient", {
      chatId,
      text: `📎 <b>File received:</b> ${fileName}\n\nYour report has been saved and will be attached to your case. You can send more files, or continue describing your medical needs.`,
    });
  } catch (error) {
    console.error("[shifain] file upload error:", error);
    await sendMessage("patient", {
      chatId,
      text: "I had trouble processing that file. Please try again or send it in a different format.",
    });
  }

  if (msg.caption?.trim()) {
    await handlePatientText(chatId, userId, msg.caption.trim(), "intake");
  }
}

// ---------------------------------------------------------------- voice messages

async function handleVoiceMessage(chatId: number, userId: number, fileId: string): Promise<void> {
  if (!isElevenLabsConfigured()) {
    await sendMessage("patient", {
      chatId,
      text: "🎤 Voice messages are not yet available. Please type your message instead.",
    });
    return;
  }

  await sendMessage("patient", {
    chatId,
    text: "🎧 Processing your voice message...",
  });

  const fileInfo = await getFile("patient", fileId);
  if (!fileInfo.file_path) {
    await sendMessage("patient", { chatId, text: "Could not download the voice file. Please try again." });
    return;
  }

  const audioBuffer = await downloadFile("patient", fileInfo.file_path);
  const transcription = await transcribeAudio(audioBuffer);
  if (!transcription.text.trim()) {
    await sendMessage("patient", { chatId, text: "I couldn't understand the audio. Could you try again or type your message?" });
    return;
  }

  const contact = await getTelegramContact("patient", userId);

  await saveMessage({
    channel: "telegram",
    direction: "inbound",
    contactType: contact?.contactType === "patient" ? "patient" : "lead",
    contactId: contact?.contactId ?? null,
    caseReference: contact?.caseReference ?? null,
    telegramChatId: chatId,
    senderName: contact ? `${contact.firstName} ${contact.lastName ?? ""}`.trim() : null,
    text: `[voice] ${transcription.text}`,
    metadata: { telegramUserId: userId, language: transcription.language_code, voice: true },
    status: "delivered",
  });

  const autoFill = autoFillFromTelegram(null, contact);
  const intake = await getOrCreateIntake(userId, chatId, autoFill);

  if (intake.complete) {
    const history = getHistory(chatId);
    const reply = await generateReply(transcription.text, history, transcription.language_code);
    pushHistory(chatId, "user", transcription.text);
    pushHistory(chatId, "assistant", reply);
    try {
      const speechBuffer = await textToSpeech({ text: reply, languageCode: transcription.language_code });
      await sendVoice("patient", chatId, speechBuffer, reply);
    } catch {
      await sendMessage("patient", { chatId, text: reply });
    }
    return;
  }

  if (intake.state === "collecting_profile") {
    await handleProfileAnswer(chatId, userId, transcription.text);
    return;
  }

  // Medical chat via LLM
  await pushIntakeMessage(userId, "user", transcription.text);
  const history = intake.messages.map((m) => ({ role: m.role, content: m.content }));
  const { reply, extracted } = await generateIntakeReply(
    transcription.text,
    history,
    intake.fields,
    transcription.language_code,
  );

  const { readyToSubmit, ...fieldUpdates } = extracted;
  if (Object.values(fieldUpdates).some(Boolean)) {
    await updateIntakeFields(userId, fieldUpdates);
  }
  await pushIntakeMessage(userId, "assistant", reply);

  try {
    const speechBuffer = await textToSpeech({ text: reply, languageCode: transcription.language_code });
    await sendVoice("patient", chatId, speechBuffer, reply);
  } catch {
    await sendMessage("patient", { chatId, text: reply });
  }

  if (readyToSubmit) {
    await transitionToProfile(chatId, userId);
  }

  if (!intake.messages.length && contact) {
    await createLead({
      name: `${contact.firstName} ${contact.lastName ?? ""}`.trim(),
      phone: contact?.phone ?? null,
      email: null,
      country: null,
      need: transcription.text,
      source: "telegram",
    });
  }
  await updateContactState("patient", userId, "intake");
}

// ---------------------------------------------------------------- patient bot

async function handlePatientUpdate(update: TgUpdate): Promise<void> {
  const msg = update.message;
  const cb = update.callback_query;

  if (cb) {
    await handlePatientCallback(cb.from.id, cb.message?.chat.id ?? cb.from.id, cb.data ?? "", cb.id);
    return;
  }

  if (!msg) return;

  const chatId = msg.chat.id;
  const userId = msg.from?.id ?? chatId;
  const text = msg.text?.trim() ?? "";

  let contact = await getTelegramContact("patient", userId);

  if (!contact) {
    contact = await upsertTelegramContact({
      telegramUserId: userId,
      telegramChatId: chatId,
      username: msg.from?.username ?? null,
      firstName: msg.from?.first_name ?? "User",
      lastName: msg.from?.last_name ?? null,
      languageCode: msg.from?.language_code ?? null,
      phone: null,
      contactType: "unknown",
      contactId: null,
      caseReference: null,
      botRole: "patient",
      state: "start",
      stateData: null,
    });
  }

  if (msg.contact?.phone_number) {
    if (contact.state === "login" && typeof contact.stateData?.token === "string") {
      await handleLoginContact(chatId, userId, contact.stateData.token, msg.contact, msg.from?.first_name ?? null);
      return;
    }
    await handlePhoneShared(chatId, userId, msg.contact.phone_number);
    return;
  }

  // Handle file uploads (photos, documents, reports)
  if (msg.photo || msg.document) {
    await handleFileUpload(chatId, userId, msg);
    return;
  }

  const voiceFileId = msg.voice?.file_id ?? msg.audio?.file_id;
  if (voiceFileId) {
    await handleVoiceMessage(chatId, userId, voiceFileId);
    return;
  }

  if (text.startsWith("/")) {
    await handlePatientCommand(chatId, userId, text, contact.state);
    return;
  }

  await handlePatientText(chatId, userId, text, contact.state);
}

async function handlePatientCommand(
  chatId: number,
  userId: number,
  text: string,
  _state: string,
): Promise<void> {
  const [cmd, ...args] = text.split(/\s+/);

  switch (cmd.toLowerCase()) {
    case "/start": {
      // t.me/<bot>?start=ref_CODE arrives as "/start ref_CODE".
      const payload = args[0] ?? "";
      // t.me/<bot>?start=login_TOKEN: signing in to the website.
      if (payload.startsWith("login_")) {
        await startLogin(chatId, userId, payload.slice(6));
        return;
      }
      if (payload.startsWith("ref_")) {
        const code = normaliseCode(payload.slice(4));
        if (code && (await partnerByCode(code).catch(() => null))) {
          await rememberContactReferral("patient", userId, code).catch(() => undefined);
        }
      }
      await updateContactState("patient", userId, "welcome");
      await sendMessage("patient", {
        chatId,
        text:
          "🏥 <b>Welcome to ShifaIn</b>\n\n" +
          "I'm the ShifaIn care assistant, and a coordinator is on hand if you'd rather talk to a person. Just tell me what you need — no forms to fill out.\n\n" +
          "You can:\n" +
          "• <b>Describe your medical need</b> — I'll ask a few questions and create your treatment plan\n" +
          "• <b>Send a voice message</b> — speak in any language, I'll understand\n" +
          "• <b>Send medical reports</b> — photos or PDFs of scans, lab results\n" +
          "• Check your case status with /status\n\n" +
          "Simply start by telling me what treatment you're looking for, and I'll guide you through the rest.",
        requestContact: true,
      });
      break;
    }

    case "/status": {
      const ref = args[0]?.toUpperCase();
      if (!ref) {
        await sendMessage("patient", {
          chatId,
          text: "Please provide your case reference:\n<code>/status SH-XXXX-XXXX-XXXX-XXXX</code>",
        });
        return;
      }
      await lookupCaseStatus(chatId, userId, ref);
      break;
    }

    case "/help":
      await sendMessage("patient", {
        chatId,
        text:
          "📋 <b>How can I help?</b>\n\n" +
          "/status &lt;reference&gt; — Check your case status\n" +
          "/plan — View your treatment plan\n" +
          "/contact — Reach your coordinator\n" +
          "/language — Change language\n\n" +
          "Or just type your question and a coordinator will respond.",
        keyboard: [
          [
            { text: "📊 My case status", callback_data: "action:status" },
            { text: "💬 Ask a question", callback_data: "action:query" },
          ],
          [
            { text: "📞 Call coordinator", callback_data: "action:contact" },
            { text: "💰 Cost estimate", callback_data: "action:estimate" },
          ],
        ],
      });
      break;

    case "/plan": {
      const contact = await getTelegramContact("patient", userId);
      if (contact?.caseReference) {
        await lookupCaseStatus(chatId, userId, contact.caseReference);
      } else {
        await sendMessage("patient", {
          chatId,
          text: "I don't have a case linked to your account yet. Share your phone number or use /status with your reference.",
          requestContact: true,
        });
      }
      break;
    }

    case "/contact":
      await sendMessage("patient", {
        chatId,
        text:
          "📞 <b>Reach your coordinator</b>\n\n" +
          "• Type your message here and a coordinator will reply\n" +
          "• Or call/WhatsApp us directly\n\n" +
          "Your coordinator typically responds within 30 minutes during business hours.",
      });
      break;

    case "/language":
      await sendMessage("patient", {
        chatId,
        text: "🌐 Choose your language:",
        keyboard: [
          [
            { text: "🇬🇧 English", callback_data: "lang:en" },
            { text: "🇷🇺 Русский", callback_data: "lang:ru" },
            { text: "🇺🇿 O'zbek", callback_data: "lang:uz" },
          ],
        ],
      });
      break;

    default:
      await sendMessage("patient", {
        chatId,
        text: "I didn't recognise that command. Type /help to see what I can do.",
      });
  }
}

async function handlePatientCallback(
  userId: number,
  chatId: number,
  data: string,
  callbackId: string,
): Promise<void> {
  await answerCallback("patient", callbackId);

  // Handle profile collection callbacks (e.g. "profile:country:Uzbekistan")
  if (data.startsWith("profile:")) {
    const parts = data.split(":");
    const field = parts[1];
    const value = parts.slice(2).join(":");
    if (field === "country" && value) {
      await handleProfileAnswer(chatId, userId, value);
    }
    return;
  }

  const [prefix, value] = data.split(":");

  switch (prefix) {
    case "lang":
      await updateContactState("patient", userId, "ready", { lang: value });
      await sendMessage("patient", {
        chatId,
        text: "✅ Language updated. Type /help to see what I can do.",
      });
      break;

    case "action":
      switch (value) {
        case "status": {
          const contact = await getTelegramContact("patient", userId);
          if (contact?.caseReference) {
            await lookupCaseStatus(chatId, userId, contact.caseReference);
          } else {
            await sendMessage("patient", {
              chatId,
              text: "Send your case reference:\n<code>/status SH-XXXX-XXXX-XXXX-XXXX</code>\n\nOr share your phone number to find your case.",
              requestContact: true,
            });
          }
          break;
        }
        case "query":
          await updateContactState("patient", userId, "awaiting_query");
          await sendMessage("patient", {
            chatId,
            text: "Type your question and a coordinator will get back to you:",
          });
          break;
        case "contact":
          await sendMessage("patient", {
            chatId,
            text: "📞 Type your message and a coordinator will respond within 30 minutes during business hours.",
          });
          break;
        case "estimate":
          await updateContactState("patient", userId, "awaiting_estimate");
          await sendMessage("patient", {
            chatId,
            text: "Tell me what treatment you're looking for and I'll get you an estimate. Include:\n\n• Treatment/procedure name\n• Your country\n• Any specific requirements",
          });
          break;
      }
      break;
  }
}

/** Sign-in with Telegram, step one: ask for the phone number Telegram itself vouches for. */
async function startLogin(chatId: number, userId: number, token: string): Promise<void> {
  if (!(await pendingTelegramLogin(token))) {
    await sendMessage("patient", {
      chatId,
      text: "⌛ This sign-in link has expired. Go back to the ShifaIn website and press <b>Sign in with Telegram</b> again.",
    });
    return;
  }
  await updateContactState("patient", userId, "login", { token });
  await sendMessage("patient", {
    chatId,
    text:
      "🔐 <b>Sign in to ShifaIn</b>\n\n" +
      "Tap <b>Share my phone number</b> below. Telegram confirms the number is yours, and the website signs you in — no code to type.\n\n" +
      "Didn't try to sign in? Just ignore this message.",
    requestContact: true,
  });
}

/** Step two: the shared contact must be the sender's own, not a card forwarded from someone else. */
async function handleLoginContact(
  chatId: number,
  userId: number,
  token: string,
  shared: { phone_number: string; user_id?: number },
  firstName: string | null,
): Promise<void> {
  if (shared.user_id !== userId) {
    await sendMessage("patient", {
      chatId,
      text: "That looks like someone else's contact. Please use the <b>Share my phone number</b> button, which sends your own.",
      requestContact: true,
    });
    return;
  }
  const digits = normalisePhone(shared.phone_number);
  const confirmed = await confirmTelegramLogin(token, { digits, telegramUserId: userId, name: firstName });
  await handlePhoneSaved(chatId, userId, digits);
  await sendMessage("patient", {
    chatId,
    text: confirmed
      ? "✅ <b>You're signed in.</b> Go back to your browser — the ShifaIn website is opening your account.\n\nYou can also send me your reports here, and I'll message you when your case moves."
      : "⌛ This sign-in link has expired. Go back to the ShifaIn website and press <b>Sign in with Telegram</b> again.",
  });
}

/** Remembers a verified number on the contact without starting the intake conversation. */
async function handlePhoneSaved(chatId: number, userId: number, digits: string): Promise<void> {
  const existing = await getTelegramContact("patient", userId);
  await upsertTelegramContact({
    telegramUserId: userId,
    telegramChatId: chatId,
    username: existing?.username ?? null,
    firstName: existing?.firstName ?? "User",
    lastName: existing?.lastName ?? null,
    languageCode: existing?.languageCode ?? null,
    phone: digits,
    contactType: "patient",
    contactId: existing?.contactId ?? null,
    caseReference: existing?.caseReference ?? null,
    botRole: "patient",
    state: "ready",
    stateData: null,
  });
  const latest = (await casesForPhone(digits, 1))[0];
  if (latest && !existing?.caseReference) await linkContactToCase("patient", userId, latest._id, null).catch(() => undefined);
}

async function handlePhoneShared(chatId: number, userId: number, phone: string): Promise<void> {
  const digits = normalisePhone(phone);
  await upsertTelegramContact({
    telegramUserId: userId,
    telegramChatId: chatId,
    username: null,
    firstName: "User",
    lastName: null,
    languageCode: null,
    phone: digits,
    contactType: "patient",
    contactId: null,
    caseReference: null,
    botRole: "patient",
    state: "ready",
    stateData: null,
  });

  // Auto-fill phone and country into any active intake
  const detectedCountry = countryFromPhone(digits);
  const intake = await getOrCreateIntake(userId, chatId, {
    phone: digits,
    country: detectedCountry ?? undefined,
  });

  // If intake is waiting for profile info and this fills it, continue
  if (intake.state === "collecting_profile") {
    if (isIntakeReady(intake.fields)) {
      await createCaseFromIntake(intake);
      return;
    }
    const q = nextProfileQuestion(intake.fields);
    if (q) {
      await sendMessage("patient", {
        chatId,
        text: `📱 Phone saved!${detectedCountry ? ` Country detected: ${detectedCountry}.` : ""}\n\n${q.question}`,
        keyboard: q.buttons,
      });
      return;
    }
  }

  const cases = await casesForPhone(digits, 5);

  if (cases.length > 0) {
    const latest = cases[0];
    await linkContactToCase("patient", userId, latest._id, null);
    await updateContactState("patient", userId, "ready");

    const statusEmoji = {
      new: "🆕", planning: "⏳", planned: "✅",
      "plan-failed": "⚠️", confirmed: "🎯", closed: "📁",
    } as const;

    let text = "📱 <b>Phone linked!</b> I found your case(s):\n\n";
    for (const c of cases) {
      text += `${statusEmoji[c.status] ?? "•"} <code>${c._id}</code> — ${c.status}\n`;
    }
    text += "\nType /status to check details, or ask me anything.";

    await sendMessage("patient", {
      chatId,
      text,
      keyboard: [
        [
          { text: "📊 View latest case", callback_data: "action:status" },
          { text: "💬 Ask a question", callback_data: "action:query" },
        ],
      ],
    });
  } else {
    await updateContactState("patient", userId, "ready");
    await sendMessage("patient", {
      chatId,
      text:
        `📱 Phone number saved.${detectedCountry ? ` Country: ${detectedCountry}.` : ""}\n\n` +
        "Tell me what medical help you need and I'll create your case — no forms required!",
    });
  }
}

async function handlePatientText(
  chatId: number,
  userId: number,
  text: string,
  state: string,
): Promise<void> {
  if (!text) return;

  const contact = await getTelegramContact("patient", userId);

  await saveMessage({
    channel: "telegram",
    direction: "inbound",
    contactType: contact?.contactType === "patient" ? "patient" : "lead",
    contactId: contact?.contactId ?? null,
    caseReference: contact?.caseReference ?? null,
    telegramChatId: chatId,
    senderName: contact ? `${contact.firstName} ${contact.lastName ?? ""}`.trim() : null,
    text,
    metadata: { telegramUserId: userId, state },
    status: "delivered",
  });

  if (state === "admin_handling") return;

  try {
    const autoFill = autoFillFromTelegram(null, contact);
    const intake = await getOrCreateIntake(userId, chatId, autoFill);

    if (intake.complete) {
      const history = intake.messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await generateReply(text, history);
      pushHistory(chatId, "user", text);
      pushHistory(chatId, "assistant", reply);
      await sendMessage("patient", { chatId, text: reply });
      await saveMessage({
        channel: "telegram",
        direction: "outbound",
        contactType: "patient",
        contactId: contact?.contactId ?? null,
        caseReference: contact?.caseReference ?? null,
        telegramChatId: chatId,
        senderName: "ShifaIn AI",
        text: reply,
        metadata: { ai: true },
        status: "delivered",
      });
      return;
    }

    if (intake.state === "collecting_profile") {
      await handleProfileAnswer(chatId, userId, text);
      return;
    }

    // medical_chat state → LLM handles
    await handleMedicalChat(chatId, userId, text);
  } catch (error) {
    console.error("[shifain] conversational intake error:", error);
    const fallback =
      "I'm sorry, I had trouble processing that. A coordinator will review your message and get back to you.\n\n" +
      "For quick actions, type /help.";
    await sendMessage("patient", { chatId, text: fallback });
    await saveMessage({
      channel: "telegram",
      direction: "outbound",
      contactType: contact?.contactType === "patient" ? "patient" : "lead",
      contactId: contact?.contactId ?? null,
      caseReference: contact?.caseReference ?? null,
      telegramChatId: chatId,
      senderName: "ShifaIn AI",
      text: fallback,
      metadata: { ai: true, error: true },
      status: "delivered",
    });
  }
}

async function lookupCaseStatus(chatId: number, userId: number, reference: string): Promise<void> {
  const record = await getCase(reference);
  if (!record) {
    await sendMessage("patient", {
      chatId,
      text: `❌ No case found with reference <code>${reference}</code>.\n\nPlease check and try again.`,
    });
    return;
  }

  await linkContactToCase("patient", userId, reference, null);

  const statusMap: Record<string, string> = {
    new: "🆕 <b>New</b> — We've received your enquiry",
    planning: "⏳ <b>Planning</b> — Your treatment plan is being prepared",
    planned: "✅ <b>Planned</b> — Your treatment plan is ready",
    "plan-failed": "⚠️ <b>Needs attention</b> — A coordinator will reach out",
    confirmed: "🎯 <b>Confirmed</b> — Your treatment is confirmed",
    closed: "📁 <b>Closed</b> — This case is complete",
  };

  let text = `📋 <b>Case ${reference}</b>\n\n`;
  text += `Status: ${statusMap[record.status] ?? record.status}\n`;
  text += `Patient: ${record.patient.name}\n`;
  if (record.statedNeed) text += `Need: ${record.statedNeed}\n`;
  text += `\nOpened: ${new Date(record.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

  if (record.plan) {
    text += "\n\n📄 Your treatment plan is available. Visit the patient portal for full details.";
  }

  await sendMessage("patient", {
    chatId,
    text,
    keyboard: [
      [
        { text: "💬 Ask about this case", callback_data: "action:query" },
        { text: "📞 Contact coordinator", callback_data: "action:contact" },
      ],
    ],
  });
}

// ---------------------------------------------------------------- partner bot

async function handlePartnerUpdate(update: TgUpdate): Promise<void> {
  const msg = update.message;
  const cb = update.callback_query;

  if (cb) {
    await answerCallback("partner", cb.id);
    await sendMessage("partner", {
      chatId: cb.message?.chat.id ?? cb.from.id,
      text: "Feature coming soon. Please use the partner portal for now.",
    });
    return;
  }

  if (!msg) return;

  const chatId = msg.chat.id;
  const userId = msg.from?.id ?? chatId;
  const text = msg.text?.trim() ?? "";

  let contact = await getTelegramContact("partner", userId);
  if (!contact) {
    contact = await upsertTelegramContact({
      telegramUserId: userId,
      telegramChatId: chatId,
      username: msg.from?.username ?? null,
      firstName: msg.from?.first_name ?? "Doctor",
      lastName: msg.from?.last_name ?? null,
      languageCode: msg.from?.language_code ?? null,
      phone: null,
      contactType: "partner",
      contactId: null,
      caseReference: null,
      botRole: "partner",
      state: "start",
      stateData: null,
    });
  }

  if (msg.contact?.phone_number) {
    await upsertTelegramContact({
      ...contact,
      phone: normalisePhone(msg.contact.phone_number),
      state: "ready",
      stateData: null,
    });
    await sendMessage("partner", {
      chatId,
      text:
        "📱 Phone linked! A coordinator will connect your Telegram with your partner account.\n\n" +
        "Use /help to see available commands.",
    });
    return;
  }

  if (text.startsWith("/")) {
    await handlePartnerCommand(chatId, userId, text);
    return;
  }

  await saveMessage({
    channel: "telegram",
    direction: "inbound",
    contactType: "partner",
    contactId: contact.contactId,
    caseReference: null,
    telegramChatId: chatId,
    senderName: `${contact.firstName} ${contact.lastName ?? ""}`.trim(),
    text,
    metadata: { telegramUserId: userId },
    status: "delivered",
  });

  await sendMessage("partner", {
    chatId,
    text: "💬 Message received. A coordinator will respond shortly.\n\nFor quick actions, type /help.",
  });
}

const NOT_LINKED =
  "🔗 This chat is not connected to a partner account yet.\n\n" +
  "Open your ShifaIn partner portal and tap <b>Connect Telegram</b> — your referral updates will arrive here.";

async function handlePartnerCommand(chatId: number, _userId: number, text: string): Promise<void> {
  const [cmd, ...args] = text.split(/\s+/);

  switch (cmd.toLowerCase()) {
    case "/start": {
      const linkedId = args[0] ? verifyTelegramLinkPayload(args[0]) : null;
      if (linkedId) {
        const partner = await linkPartnerTelegram(linkedId, chatId);
        if (partner) {
          await sendMessage("partner", {
            chatId,
            text:
              `✅ <b>Connected, ${partner.name}.</b>\n\n` +
              "You'll get an update here each time a patient you referred moves forward.\n\n" +
              "/cases — your referred patients\n/earnings — commission summary\n/refer — your referral link",
          });
          return;
        }
      }
      await sendMessage("partner", {
        chatId,
        text:
          "🤝 <b>Welcome to ShifaIn Partner Bot</b>\n\n" +
          "I can help you with:\n" +
          "• Track your referred patients\n" +
          "• Receive case updates\n" +
          "• View commission reports\n" +
          "• Get notices and announcements\n\n" +
          "Share your phone number to link your partner account.",
        requestContact: true,
      });
      break;
    }

    case "/help":
      await sendMessage("partner", {
        chatId,
        text:
          "📋 <b>Partner Commands</b>\n\n" +
          "/cases — Your referred patients\n" +
          "/refer — Submit a new referral\n" +
          "/notices — Latest announcements\n" +
          "/earnings — Commission summary\n" +
          "/contact — Reach ShifaIn team\n\n" +
          "Full features are available in the partner portal.",
      });
      break;

    case "/cases": {
      const partner = await partnerByTelegramChat(chatId);
      if (!partner) {
        await sendMessage("partner", { chatId, text: NOT_LINKED });
        break;
      }
      const rows = await listReferrals({ partnerUserId: partner._id });
      if (rows.length === 0) {
        await sendMessage("partner", { chatId, text: "No referrals yet. Send /refer for your link." });
        break;
      }
      const lines = rows
        .slice(0, 15)
        .map((row) => `• ${shortName(row.patientName)} — <b>${STAGE_LABEL[row.status]}</b>`);
      await sendMessage("partner", {
        chatId,
        text: `📋 <b>Your referrals</b> (${rows.length})\n\n${lines.join("\n")}${rows.length > 15 ? "\n…" : ""}`,
      });
      break;
    }

    case "/earnings": {
      const partner = await partnerByTelegramChat(chatId);
      if (!partner) {
        await sendMessage("partner", { chatId, text: NOT_LINKED });
        break;
      }
      const rows = await listReferrals({ partnerUserId: partner._id });
      const p = pipelineOf(rows, partner.referralStats?.clicks ?? 0);
      const currency = rows[0]?.currency ?? "USD";
      await sendMessage("partner", {
        chatId,
        text:
          `💰 <b>Earnings</b>\n\n` +
          `Earned: <b>${money(p.earned, currency)}</b>\n` +
          `Awaiting payout: ${money(p.pending, currency)}\n` +
          `Paid: ${money(p.paid, currency)}\n\n` +
          `Referrals: ${p.total} · Treated: ${p.counts.treated}`,
      });
      break;
    }

    case "/refer": {
      const partner = await partnerByTelegramChat(chatId);
      if (!partner) {
        await sendMessage("partner", { chatId, text: NOT_LINKED });
        break;
      }
      const code = await ensureReferralCode(partner);
      const links = await referralLinks(code);
      const offer = await resolveOffer(partner, null);
      await sendMessage("partner", {
        chatId,
        text:
          `🔗 <b>Your referral link</b>\n${links.web}\n\n` +
          (links.telegram ? `Telegram: ${links.telegram}\n\n` : "") +
          `Code: <code>${code}</code>\n\n` +
          `Patients who start from your link are credited to you. ${describeOffer(offer)}`,
      });
      break;
    }

    case "/notices":
      await sendMessage("partner", {
        chatId,
        text: "📢 Announcements are on your partner portal dashboard.",
      });
      break;

    case "/contact":
      await sendMessage("partner", {
        chatId,
        text: "📞 Type your message and the ShifaIn team will respond here.",
      });
      break;

    default:
      await sendMessage("partner", {
        chatId,
        text: "I didn't recognise that command. Type /help to see what I can do.",
      });
  }
}

// ---------------------------------------------------------------- dispatch

export async function handleUpdate(role: BotRole, update: TgUpdate): Promise<void> {
  try {
    if (role === "patient") {
      await handlePatientUpdate(update);
    } else {
      await handlePartnerUpdate(update);
    }
  } catch (error) {
    console.error(`[shifain] telegram ${role} bot error:`, error);
  }
}
