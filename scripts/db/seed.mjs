#!/usr/bin/env node
/**
 * Creates the ShifaIn catalogue collections with their validators and indexes,
 * then upserts the seed data from src/data/catalogue.
 *
 *   MONGODB_URI="mongodb+srv://..." node scripts/db/seed.mjs
 *
 * Idempotent: re-running updates records in place by _id and never duplicates.
 * Records a hospital or doctor has since been verified or published are left
 * alone unless --force is passed, so a re-seed cannot undo a tie-up.
 *
 * Catalogue collections are also pruned: a row whose _id has disappeared from
 * the seed file is deleted, so renaming a code leaves no orphan behind. Only
 * collections the seed fully owns are pruned — never a provider record, and
 * never a row the business authored.
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { MongoClient } from "mongodb";
import { COLLECTIONS } from "./collections.mjs";

const DATA_DIR = path.join(process.cwd(), "src", "data", "catalogue");
const DB_NAME = process.env.MONGODB_DB || "shifain";
const FORCE = process.argv.includes("--force");

/** Collections whose rows the business edits after seeding. */
const PROVIDER_COLLECTIONS = new Set(["hospitals", "doctors"]);

/**
 * Collections the seed fully owns. Nothing else writes to them, so a row the
 * seed no longer lists is stale and gets deleted.
 */
const SEED_OWNED = new Set([
  "categories", "specialties", "capabilities", "cities",
  "diseases", "treatments",
  "disease_specialty_map", "disease_treatment_map", "treatment_specialty_map",
  "matching_rules", "price_bands", "sources",
]);

/**
 * Collections the seed shares with the business. A stale row is deleted only
 * when the seed put it there in the first place — a mapping someone authored
 * or a partner supplied stays.
 */
const RESEARCH_ONLY_PRUNE = { hospital_doctor_map: { "provenance.method": "third-party-research" } };

/** Deletes rows the seed used to own but no longer lists. */
async function prune(db, name, ids) {
  const scope = SEED_OWNED.has(name) ? {} : RESEARCH_ONLY_PRUNE[name];
  if (!scope) return;

  const res = await db.collection(name).deleteMany({ ...scope, _id: { $nin: ids } });
  if (res.deletedCount > 0) {
    console.log(`${"".padEnd(31)} · ${res.deletedCount} stale row(s) pruned`);
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(DB_NAME);

  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));

  for (const { name, validator, indexes } of COLLECTIONS) {
    if (existing.has(name)) {
      await db.command({ collMod: name, validator, validationLevel: "moderate" });
    } else {
      await db.createCollection(name, { validator, validationLevel: "moderate" });
    }
    for (const index of indexes) {
      await db.collection(name).createIndex(index.key, index.options ?? {});
    }
  }

  const files = (await readdir(DATA_DIR)).filter((f) => f.endsWith(".json"));
  let totalUpserts = 0;

  for (const file of files) {
    const name = path.basename(file, ".json");
    if (!COLLECTIONS.some((c) => c.name === name)) {
      console.warn(`skipping ${file} — no collection defined`);
      continue;
    }
    const rows = JSON.parse(await readFile(path.join(DATA_DIR, file), "utf8"));
    if (rows.length === 0) {
      console.log(`${name.padEnd(26)} 0 seed rows (collection ready)`);
      continue;
    }

    const ops = rows.map((row) => {
      const { _id, ...rest } = row;
      // Never clobber work the team has done on a provider record.
      const guard =
        PROVIDER_COLLECTIONS.has(name) && !FORCE
          ? { _id, "publication.state": "research", partnerStatus: "prospect" }
          : { _id };
      return { updateOne: { filter: guard, update: { $set: rest, $setOnInsert: { _id } }, upsert: true } };
    });

    try {
      const res = await db.collection(name).bulkWrite(ops, { ordered: false });
      const touched = res.upsertedCount + res.modifiedCount;
      totalUpserts += touched;
      console.log(`${name.padEnd(26)} ${String(rows.length).padStart(4)} rows · ${touched} written`);
    } catch (error) {
      // A guarded upsert collides when the record exists but has moved on from
      // `research`. That is the protection working, not a failure.
      const dupes = error?.writeErrors?.filter((e) => e.code === 11000).length ?? 0;
      const others = (error?.writeErrors?.length ?? 0) - dupes;
      if (others > 0) throw error;
      console.log(`${name.padEnd(26)} ${String(rows.length).padStart(4)} rows · ${dupes} left as-is (already verified or published)`);
    }

    await prune(db, name, rows.map((r) => r._id));
  }

  console.log(`\n${totalUpserts} records written to ${DB_NAME}`);
  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
