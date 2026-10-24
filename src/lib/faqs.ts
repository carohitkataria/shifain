import "server-only";
import crypto from "node:crypto";
import { getDb, isDatabaseConfigured, readOr } from "./db";
import { FAQ_CATEGORIES, STARTER_FAQS, type FaqCategory } from "./faq-content";
import type { L } from "./content-types";
import type { KnowledgeEntry } from "./assistant/config";

export { FAQ_CATEGORIES, type FaqCategory } from "./faq-content";

export type Faq = {
  _id: string;
  category: FaqCategory;
  question: L;
  answer: L;
  /** Words that mean a patient is asking this, for the assistant. */
  keywords: string[];
  order: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

type SeedMark = { _id: string; at: string };

/** Copies the starter questions in once. After that the console owns them; deleting one keeps it deleted. */
async function seedOnce(): Promise<void> {
  const db = await getDb();
  const marks = db.collection<SeedMark>("faq_meta");
  if (await marks.findOne({ _id: "seeded" })) return;
  const now = new Date().toISOString();
  const faqs = db.collection<Faq>("faqs");
  for (const [index, item] of STARTER_FAQS.entries()) {
    await faqs.updateOne(
      { _id: item.id },
      { $setOnInsert: { category: item.category, question: item.question, answer: item.answer, keywords: item.keywords, order: (index + 1) * 10, published: true, createdAt: now, updatedAt: now } },
      { upsert: true },
    );
  }
  await marks.updateOne({ _id: "seeded" }, { $setOnInsert: { at: now } }, { upsert: true });
}

const byOrder = (a: Faq, b: Faq) =>
  FAQ_CATEGORIES.findIndex((c) => c.key === a.category) - FAQ_CATEGORIES.findIndex((c) => c.key === b.category) || a.order - b.order;

/** Every FAQ, in category then page order. Starter questions when there is no database. */
export async function listFaqs({ publishedOnly = true }: { publishedOnly?: boolean } = {}): Promise<Faq[]> {
  const starters: Faq[] = STARTER_FAQS.map((item, index) => ({ _id: item.id, ...item, order: (index + 1) * 10, published: true, createdAt: "", updatedAt: "" }));
  if (!isDatabaseConfigured()) return starters;
  await seedOnce().catch(() => undefined);
  const stored = await readOr<Faq[] | null>(null, (db) => db.collection<Faq>("faqs").find(publishedOnly ? { published: true } : {}).toArray());
  return (stored ?? starters).sort(byOrder);
}

/** The FAQs grouped under their categories, empty categories left out. */
export function groupFaqs(faqs: Faq[]): { key: FaqCategory; label: L; items: Faq[] }[] {
  return FAQ_CATEGORIES.map((category) => ({ ...category, items: faqs.filter((faq) => faq.category === category.key) })).filter((group) => group.items.length > 0);
}

export async function saveFaq(input: Omit<Faq, "_id" | "createdAt" | "updatedAt"> & { _id: string | null }): Promise<string> {
  const db = await getDb();
  const now = new Date().toISOString();
  const id = input._id || `faq-${crypto.randomBytes(5).toString("hex")}`;
  const { _id, ...fields } = input;
  void _id;
  await db.collection<Faq>("faqs").updateOne({ _id: id }, { $set: { ...fields, updatedAt: now }, $setOnInsert: { createdAt: now } }, { upsert: true });
  return id;
}

export async function deleteFaq(id: string): Promise<void> {
  await (await getDb()).collection<Faq>("faqs").deleteOne({ _id: id });
}

/** The published FAQs as knowledge the assistant can quote; matched by their keywords and question words. */
export async function faqKnowledge(): Promise<KnowledgeEntry[]> {
  const faqs = await listFaqs().catch(() => [] as Faq[]);
  return faqs.map((faq) => ({
    id: `faq:${faq._id}`,
    title: faq.question.en,
    answer: { en: faq.answer.en, ru: faq.answer.ru, uz: faq.answer.uz },
    keywords: [...faq.keywords, faq.question.en, faq.question.ru, faq.question.uz].filter(Boolean),
    instant: false,
    enabled: true,
  }));
}
