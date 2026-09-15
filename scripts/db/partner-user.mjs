#!/usr/bin/env node
/**
 * Creates or updates a partner login — the sign-in a referring doctor, a
 * hospital desk or a coordinator uses.
 *
 *   MONGODB_URI="mongodb+srv://..." node scripts/db/partner-user.mjs \
 *     --email dr.rao@example.com --name "Dr A Rao" --role doctor \
 *     [--doctor-id d-dr-naresh-trehan] [--hospital-id h-...] [--password '...'] \
 *     [--suspend]
 *
 * With no --password, one is generated and printed once. It is never stored in
 * readable form and cannot be recovered — re-run with a new one to reset it.
 */
import crypto from "node:crypto";
import { MongoClient } from "mongodb";
import { hashPassword } from "../../src/lib/password.mjs";

const DB_NAME = process.env.MONGODB_DB || "shifain";
const ROLES = new Set(["doctor", "hospital", "coordinator"]);

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
  }

  const email = (arg("email") || "").trim().toLowerCase();
  const name = arg("name") || "";
  const role = arg("role") || "doctor";
  const suspend = process.argv.includes("--suspend");

  if (!email || !name) {
    console.error("Both --email and --name are required.");
    process.exit(1);
  }
  if (!ROLES.has(role)) {
    console.error(`--role must be one of: ${[...ROLES].join(", ")}`);
    process.exit(1);
  }

  const password = arg("password") || crypto.randomBytes(12).toString("base64url");

  const client = new MongoClient(uri);
  await client.connect();
  const users = client.db(DB_NAME).collection("partner_users");

  const existing = await users.findOne({ email });
  const record = {
    email,
    name,
    role,
    doctorId: arg("doctor-id") ?? existing?.doctorId ?? null,
    hospitalId: arg("hospital-id") ?? existing?.hospitalId ?? null,
    passwordHash: hashPassword(password),
    status: suspend ? "suspended" : "active",
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    lastLoginAt: existing?.lastLoginAt ?? null,
  };

  await users.updateOne(
    { email },
    { $set: record, $setOnInsert: { _id: `pu-${crypto.randomBytes(8).toString("hex")}` } },
    { upsert: true },
  );

  console.log(`${existing ? "Updated" : "Created"} ${role} login for ${email}`);
  if (!arg("password")) {
    console.log(`\n  password: ${password}\n`);
    console.log("Give this to them over a channel you trust. It is not recoverable.");
  }

  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
