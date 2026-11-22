import "server-only";
import crypto from "node:crypto";
import { getDb, readOr } from "./db";
import { dayOf, type VisitFacts } from "./visitor-rules";

/**
 * The site's own visitor count: daily totals and nothing else.
 *
 * No cookie is set and no address is kept. To count a person once a day, the
 * address and browser description are hashed with a key that changes every
 * day and is never stored, so yesterday's visitor cannot be matched with
 * today's, and the hash itself is deleted after two days. What remains are
 * tallies: views per page, and visitors per language, source, device and
 * country.
 */

const COUNTS = "visit_counts";
const SEEN = "visit_seen";

type Dimension = "total" | "page" | "lang" | "source" | "device" | "country";
type CountRow = { _id: string; day: string; dim: Dimension; key: string; views: number; visitors: number };

let indexed: Promise<unknown> | null = null;

function dailyKey(day: string): Buffer {
  const secret = process.env.ADMIN_SECRET || process.env.PARTNER_SECRET || "shifain-development-visits";
  return crypto.createHmac("sha256", secret).update(`visits:${day}`).digest();
}

/** Counts one page view. Never throws: a count is never worth an error on someone's page. */
export async function recordVisit(facts: VisitFacts, who: { ip: string; userAgent: string }, at = new Date()): Promise<void> {
  try {
    const day = dayOf(at);
    const db = await getDb();
    indexed ??= Promise.all([
      db.collection(SEEN).createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      db.collection(COUNTS).createIndex({ day: 1, dim: 1 }),
    ]).catch(() => (indexed = null));

    const visitor = crypto.createHmac("sha256", dailyKey(day)).update(`${who.ip}|${who.userAgent}`).digest("base64url").slice(0, 22);
    // First view today from this browser? Inserting its hash succeeds only once.
    const fresh = await db
      .collection<{ _id: string; expiresAt: Date }>(SEEN)
      .insertOne({ _id: `${day}:${visitor}`, expiresAt: new Date(at.getTime() + 2 * 86_400_000) })
      .then(() => true)
      .catch(() => false);

    const bump = (dim: Dimension, key: string, views: number, visitors: number) => ({
      updateOne: {
        filter: { _id: `${day}|${dim}|${key}` },
        update: { $setOnInsert: { day, dim, key }, $inc: { views, visitors } },
        upsert: true,
      },
    });
    const operations = [bump("total", "all", 1, fresh ? 1 : 0), bump("page", facts.page, 1, 0)];
    // Who visited is counted once a day, by the first page they opened.
    if (fresh) {
      operations.push(bump("lang", facts.lang, 0, 1), bump("source", facts.source, 0, 1), bump("device", facts.device, 0, 1), bump("country", facts.country, 0, 1));
    }
    await db.collection<CountRow>(COUNTS).bulkWrite(operations as never, { ordered: false });
  } catch (error) {
    console.error("[shifain] could not count a visit", error);
  }
}

export type VisitorReport = {
  from: string;
  to: string;
  visitors: number;
  views: number;
  days: { day: string; visitors: number; views: number }[];
  pages: { key: string; value: number }[];
  langs: { key: string; value: number }[];
  sources: { key: string; value: number }[];
  devices: { key: string; value: number }[];
  countries: { key: string; value: number }[];
  /** The first day anything was counted, if ever. */
  since: string | null;
};

/** The last `days` days, today included. */
export async function visitorReport(days: number, now = new Date()): Promise<VisitorReport> {
  const to = dayOf(now);
  const from = dayOf(new Date(now.getTime() - (days - 1) * 86_400_000));
  const [rows, first] = await Promise.all([
    readOr<CountRow[]>([], (db) => db.collection<CountRow>(COUNTS).find({ day: { $gte: from, $lte: to } }).toArray()),
    readOr<CountRow | null>(null, (db) => db.collection<CountRow>(COUNTS).find({ dim: "total" }).sort({ day: 1 }).limit(1).next()),
  ]);
  const sum = (dim: Dimension, field: "views" | "visitors") => {
    const totals = new Map<string, number>();
    for (const row of rows) if (row.dim === dim) totals.set(row.key, (totals.get(row.key) ?? 0) + (row[field] ?? 0));
    return [...totals.entries()].map(([key, value]) => ({ key, value })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
  };
  const totals = new Map(rows.filter((row) => row.dim === "total").map((row) => [row.day, row]));
  const dayList = Array.from({ length: days }, (_, index) => {
    const day = dayOf(new Date(now.getTime() - (days - 1 - index) * 86_400_000));
    const row = totals.get(day);
    return { day, visitors: row?.visitors ?? 0, views: row?.views ?? 0 };
  });
  return {
    from,
    to,
    visitors: dayList.reduce((total, item) => total + item.visitors, 0),
    views: dayList.reduce((total, item) => total + item.views, 0),
    days: dayList,
    pages: sum("page", "views"),
    langs: sum("lang", "visitors"),
    sources: sum("source", "visitors"),
    devices: sum("device", "visitors"),
    countries: sum("country", "visitors"),
    since: first?.day ?? null,
  };
}
