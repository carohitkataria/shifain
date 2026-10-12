import "server-only";
import crypto from "node:crypto";
import { getDb, readOr } from "../db";

/**
 * What the ShifaIn team teaches its assistant, edited in the console under
 * Assistant: standing instructions, and a knowledge base of answers. Both
 * reach every AI reply (website chat, voice and Telegram); a knowledge entry
 * marked "instant" is also given straight back, with no AI call at all, when
 * a patient's message matches its keywords.
 */
export type KnowledgeEntry = {
  id: string;
  title: string;
  /** The answer, in English, and optionally in Russian and Uzbek. */
  answer: { en: string; ru?: string; uz?: string };
  /** Phrases that mean a message is asking this, e.g. "visa", "medical visa", "виза". */
  keywords: string[];
  /** Reply with this answer directly, without the AI. */
  instant: boolean;
  enabled: boolean;
};

export type AssistantConfig = {
  /** Standing instructions, added to every AI prompt. */
  instructions: string;
  entries: KnowledgeEntry[];
  updatedAt: string | null;
};

/** Starting knowledge: what the site already says, so the assistant says the same. */
export const STARTER_ENTRIES: KnowledgeEntry[] = [
  {
    id: "starter-estimate",
    title: "How the estimate is worked out",
    answer: {
      en: "We read your reports, match you with accredited hospitals and give you an itemised estimate. The treating hospital confirms the final plan and price within 48 hours.",
      ru: "Мы изучаем ваши документы, подбираем аккредитованные больницы и даём подробную смету. Больница подтверждает окончательный план и цену в течение 48 часов.",
      uz: "Hujjatlaringizni o'qiymiz, akkreditatsiyalangan shifoxonalarni tanlaymiz va batafsil smeta beramiz. Shifoxona yakuniy reja va narxni 48 soat ichida tasdiqlaydi.",
    },
    keywords: ["how is the estimate", "how do you calculate", "how is the price", "как считается", "smeta qanday"],
    instant: false,
    enabled: true,
  },
  {
    id: "starter-visa",
    title: "Medical visa",
    answer: {
      en: "For a medical visa you need a valid passport, the hospital's invitation letter (we arrange it), your medical reports and proof of funds. Your coordinator walks you through each step.",
      ru: "Для медицинской визы нужны действующий паспорт, приглашение от больницы (мы его оформим), медицинские документы и подтверждение средств. Координатор поможет на каждом шаге.",
      uz: "Tibbiy viza uchun amaldagi pasport, shifoxona taklifnomasi (biz tayyorlaymiz), tibbiy hujjatlar va mablag' tasdig'i kerak. Koordinator har bir qadamda yordam beradi.",
    },
    keywords: ["visa", "medical visa", "виза", "визу", "viza"],
    instant: false,
    enabled: true,
  },
  {
    id: "starter-follow",
    title: "Following a case",
    answer: {
      en: "Once you send your details you get a patient page with live updates, from the doctor's review to travel planning. You can also just ask me “what's my case status”.",
      ru: "После отправки данных у вас появится страница пациента с обновлениями — от заключения врача до планирования поездки. Можно просто спросить меня «какой статус моей заявки».",
      uz: "Ma'lumotlaringizni yuborganingizdan so'ng, shifokor xulosasidan safar rejasigacha yangilanadigan bemor sahifasi paydo bo'ladi. Menga «arizam qanday holatda» deb so'rashingiz ham mumkin.",
    },
    keywords: ["track my case", "follow my case", "how do i follow", "отслеживать", "kuzatish"],
    instant: false,
    enabled: true,
  },
];

const DEFAULT: AssistantConfig = { instructions: "", entries: STARTER_ENTRIES, updatedAt: null };
const ID = "assistant";
type Stored = AssistantConfig & { _id: string };

let cache: { value: AssistantConfig; at: number } | null = null;
const TTL = 30_000;

/** Never throws: an unreachable database means the assistant runs on its defaults. */
export async function getAssistantConfig(): Promise<AssistantConfig> {
  if (cache && Date.now() - cache.at < TTL) return cache.value;
  const stored = await readOr<Stored | null>(null, (db) => db.collection<Stored>("assistant_config").findOne({ _id: ID }));
  const value: AssistantConfig = stored
    ? { instructions: stored.instructions ?? "", entries: stored.entries ?? [], updatedAt: stored.updatedAt ?? null }
    : DEFAULT;
  cache = { value, at: Date.now() };
  return value;
}

export async function saveAssistantConfig(config: Omit<AssistantConfig, "updatedAt">): Promise<void> {
  const db = await getDb();
  const updatedAt = new Date().toISOString();
  await db.collection<Stored>("assistant_config").updateOne(
    { _id: ID },
    { $set: { instructions: config.instructions.slice(0, 6000), entries: config.entries.slice(0, 200), updatedAt } },
    { upsert: true },
  );
  cache = null;
}

export function newEntryId(): string {
  return `kb-${crypto.randomBytes(5).toString("hex")}`;
}
