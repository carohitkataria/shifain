import "server-only";
import crypto from "node:crypto";
import { getDb, readOr } from "../db";

/**
 * How the assistant answers, counted per day, and the questions it needed the
 * AI for. Shown under AI assistant in the console, so the team can see what
 * costs credits and turn frequent questions into free instant answers.
 */
export type AnswerPath = "command" | "instant" | "profile" | "greeting" | "ai" | "scripted" | "handoff";

type DayStats = { _id: string } & Partial<Record<AnswerPath, number>>;

export type AskedQuestion = {
  _id: string;
  text: string;
  count: number;
  lastReply: string;
  lastAt: string;
  lang: string;
};

const today = () => new Date().toISOString().slice(0, 10);

/** Never throws: counting must not cost a patient their reply. */
export async function countAnswer(path: AnswerPath): Promise<void> {
  try {
    const db = await getDb();
    await db.collection<DayStats>("assistant_stats").updateOne({ _id: today() }, { $inc: { [path]: 1 } }, { upsert: true });
  } catch {
    /* not counted */
  }
}

const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/** A general question worth remembering — not a story, a name or a number. */
export function isGeneralQuestion(text: string): boolean {
  const value = text.trim();
  const words = value.split(/\s+/).length;
  if (words < 3 || words > 20) return false;
  return /\?\s*$/.test(value) || /^(what|how|why|which|when|where|who|can|could|do|does|is|are|should|сколько|как|что|почему|какой|когда|где|можно|нужн|qanday|nima|qancha|nega|qachon|qayerda|mumkin)\b/i.test(value);
}

/** Remembers a question the AI answered, so repeats show up for the team. */
export async function rememberQuestion(text: string, reply: string, lang: string): Promise<void> {
  if (!isGeneralQuestion(text) || !reply) return;
  const key = crypto.createHash("sha1").update(normalise(text)).digest("hex").slice(0, 20);
  try {
    const db = await getDb();
    await db.collection<AskedQuestion>("assistant_questions").updateOne(
      { _id: key },
      {
        $set: { text: text.trim().slice(0, 300), lastReply: reply.slice(0, 1200), lastAt: new Date().toISOString(), lang },
        $inc: { count: 1 },
      },
      { upsert: true },
    );
  } catch {
    /* not remembered */
  }
}

export async function recentStats(days = 7): Promise<{ total: number; byPath: Record<AnswerPath, number> }> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const rows = await readOr<DayStats[]>([], (db) =>
    db.collection<DayStats>("assistant_stats").find({ _id: { $gte: since } }).toArray(),
  );
  const byPath: Record<AnswerPath, number> = { command: 0, instant: 0, profile: 0, greeting: 0, ai: 0, scripted: 0, handoff: 0 };
  for (const row of rows) {
    for (const key of Object.keys(byPath) as AnswerPath[]) byPath[key] += row[key] ?? 0;
  }
  return { total: Object.values(byPath).reduce((a, b) => a + b, 0), byPath };
}

export async function topQuestions(limit = 12): Promise<AskedQuestion[]> {
  return readOr<AskedQuestion[]>([], (db) =>
    db.collection<AskedQuestion>("assistant_questions").find({}).sort({ count: -1, lastAt: -1 }).limit(limit).toArray(),
  );
}

export async function forgetQuestion(id: string): Promise<void> {
  const db = await getDb();
  await db.collection<AskedQuestion>("assistant_questions").deleteOne({ _id: id });
}
