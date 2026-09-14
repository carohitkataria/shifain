import "server-only";
import { MongoClient, type Db } from "mongodb";

const DB_NAME = process.env.MONGODB_DB || "shifain";

/**
 * Next reloads server modules on every edit, and each reload would otherwise
 * open a fresh connection pool until Atlas starts refusing them. The promise
 * lives on globalThis so a reload reuses the pool it already has.
 */
const globalForMongo = globalThis as typeof globalThis & {
  __shifainMongo?: Promise<MongoClient>;
};

/** True when the app has somewhere to read the catalogue from. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

function client(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set.");
  globalForMongo.__shifainMongo ??= new MongoClient(uri, {
    // A page render must not hang on a database that is not answering.
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
  })
    .connect()
    .then((connected) => {
      // Say so once, on the first connection of the process. A read that falls
      // back silently is the whole point of readOr, which also means a wrong
      // MONGODB_URI looks exactly like a site with nothing in it yet. The
      // deployment should be able to tell you which it is without anyone
      // having to guess from an empty page.
      console.log(`[shifain] connected to ${DB_NAME}.`);
      return connected;
    })
    .catch((error) => {
      // Let the next call try again rather than caching a rejected promise,
      // and never print the connection string: Mongo's own errors name hosts
      // only, but a wrapped error elsewhere could carry more.
      globalForMongo.__shifainMongo = undefined;
      const message = (error instanceof Error ? error.message : String(error)).replace(
        /mongodb(\+srv)?:\/\/[^@\s]*@/gi,
        "mongodb$1://<credentials>@",
      );
      console.error(`[shifain] could not connect to ${DB_NAME}: ${message}`);
      throw error;
    });
  return globalForMongo.__shifainMongo;
}

export async function getDb(): Promise<Db> {
  return (await client()).db(DB_NAME);
}

/**
 * Runs a read that the page can live without. The homepage still renders when
 * the database is unreachable — it falls back to whatever the caller passes.
 */
export async function readOr<T>(fallback: T, read: (db: Db) => Promise<T>): Promise<T> {
  if (!isDatabaseConfigured()) return fallback;
  try {
    return await read(await getDb());
  } catch (error) {
    console.error("[shifain] database read failed, using fallback:", error);
    return fallback;
  }
}
