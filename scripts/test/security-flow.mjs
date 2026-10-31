/**
 * Part A security, end to end against a running server and its database:
 *
 *   1. A stranger opens a case in the chat with someone else's phone number.
 *      They get no session: the portal sends them to sign in, the chat lists
 *      only the case they just opened, and the other patient's plan page
 *      does not open. Their own new plan does (this browser opened it).
 *   2. A case number alone opens no plan page, and the status API answers
 *      "unknown" for it.
 *   3. Case number + a six-digit phone tail sends no code; the full number does
 *      (checked in the database: a code waits only for the second).
 *   4. The 31st chat turn in ten minutes from one conversation gets a polite
 *      wait message.
 *
 *   MONGODB_URI=… MONGODB_DB=… BASE_URL=http://localhost:3130 node scripts/test/security-flow.mjs
 *
 * Uses its own test records (phone +998 90 000 11 22) and removes them after.
 */
import crypto from "node:crypto";
import { MongoClient } from "mongodb";

const BASE = process.env.BASE_URL || "http://localhost:3130";
const client = new MongoClient(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/");
const db = client.db(process.env.MONGODB_DB || "shifain_test");
const VICTIM_PHONE = "+998 90 000 11 22";
const VICTIM_REF = "UZ90001";

let bad = 0;
const check = (ok, label, extra = "") => {
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${extra ? ` :: ${extra}` : ""}`);
};

/** A browser: keeps cookies between requests. */
function browser() {
  const jar = new Map();
  const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  return async (path, init = {}) => {
    const response = await fetch(`${BASE}${path}`, { ...init, redirect: "manual", headers: { ...(init.headers ?? {}), cookie: cookieHeader() } });
    for (const line of response.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(";");
      const at = pair.indexOf("=");
      jar.set(pair.slice(0, at), pair.slice(at + 1));
    }
    return response;
  };
}

const say = async (go, message) => {
  const response = await go("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, locale: "en" }) });
  return { status: response.status, ...(await response.json().catch(() => ({}))) };
};

await db.collection("cases").deleteMany({ "patient.phone": VICTIM_PHONE });
await db.collection("case_codes").deleteMany({ _id: VICTIM_REF });
const now = new Date().toISOString();
await db.collection("cases").insertOne({
  _id: VICTIM_REF,
  status: "planned",
  createdAt: now,
  updatedAt: now,
  locale: "en",
  patient: { name: "Victim Patient", phone: VICTIM_PHONE, country: "Uzbekistan", email: "victim@example.com" },
  statedNeed: "cardiac surgery",
  intakeRoute: "description",
  description: "Private medical history",
  answers: null,
  reports: [],
  reportsExpireAt: null,
  plan: null,
  planError: null,
  source: "website",
  referredBy: null,
});

// ---------------------------------------------------------------- 1. a stranger opens a case with the victim's number
const stranger = browser();
const script = [
  "make me a plan",
  "I need a knee replacement. Both knees have hurt for two years and my doctor says they must be replaced.",
  "Mallory Stranger",
  VICTIM_PHONE,
  "Uzbekistan",
  "skip",
];
let reply = null;
for (const line of script) {
  reply = await say(stranger, line);
  if (reply.caseReference && reply.state === "complete") break;
}
const opened = reply?.caseReference;
check(Boolean(opened) && opened !== VICTIM_REF, "the chat opened a new case", `${opened} :: ${reply?.reply?.slice(0, 90)}`);
check(/^[A-Z]{2}\d{5}$/.test(opened ?? ""), "the new case number is two letters and five digits", opened);
check(!/signed in/i.test(reply?.reply ?? ""), "the reply does not say they are signed in");

const portal = await stranger("/en/portal/patient");
check(portal.status >= 300 && portal.status < 400 && /\/login/.test(portal.headers.get("location") ?? ""), "the portal sends the stranger to sign in", `${portal.status} ${portal.headers.get("location")}`);

const mine = await say(stranger, "show my cases");
check(!(mine.reply ?? "").includes(VICTIM_REF.slice(-4)) && !(mine.reply ?? "").includes("cardiac"), "the chat shows only the case it opened", mine.reply?.slice(0, 120));

const theirPlan = await stranger(`/en/plan/${VICTIM_REF}`);
check(theirPlan.status >= 300 && theirPlan.status < 400, "the other patient's plan page does not open", `${theirPlan.status}`);
const ownPlan = await stranger(`/en/plan/${opened}`);
check(ownPlan.status === 200, "the stranger's own new plan opens in the browser that opened it", `${ownPlan.status}`);

// ---------------------------------------------------------------- Part B: levels
// (Last for this browser: planting the code below makes it the proven owner of that phone.)
const reportsAsk = await say(stranger, "show my reports");
check(!reportsAsk.action && /code/i.test(reportsAsk.reply ?? ""), "asking for reports at conversation level sends a code, not the reports", reportsAsk.reply?.slice(0, 100));
const pending = await db.collection("case_codes").findOne({ _id: opened });
check(Boolean(pending), "the code waits for the case the chat opened");
// With the signing secret (as in dev.sh), plant a known code and finish the sign-in in the chat.
if (process.env.PARTNER_SECRET && pending) {
  const hash = crypto.createHmac("sha256", process.env.PARTNER_SECRET).update(`code:case:${opened}:123456`).digest("base64url");
  await db.collection("case_codes").updateOne({ _id: opened }, { $set: { codeHash: hash, via: "whatsapp", attempts: 0 } });
  const after = await say(stranger, "123456");
  check(after.action?.href?.endsWith("/portal/patient/reports") === true, "after the right code, the reports open in the same turn", `${after.reply?.slice(0, 80)} ${JSON.stringify(after.action)}`);
}


// ---------------------------------------------------------------- 2. a case number alone
const anyone = browser();
const plan = await anyone(`/en/plan/${VICTIM_REF}`);
check(plan.status >= 300 && plan.status < 400 && /error=plan/.test(plan.headers.get("location") ?? ""), "a bare case number asks to sign in", plan.headers.get("location") ?? "");
const status = await anyone(`/api/case/${VICTIM_REF}/status`);
check(status.status === 404, "the status API says unknown for it", `${status.status}`);

// ---------------------------------------------------------------- 3. case number + phone only finds; the code proves
const signIn = async (phone) => {
  const go = browser();
  const page = await go("/en/portal/patient/login?with=reference");
  const html = await page.text();
  const action = html.match(/name="\$ACTION_ID_([0-9a-f]+)"/)?.[1];
  const form = new FormData();
  if (action) form.append(`$ACTION_ID_${action}`, "");
  form.append("locale", "en");
  form.append("reference", VICTIM_REF);
  form.append("phone", phone);
  return go("/en/portal/patient/login?with=reference", { method: "POST", body: form });
};
await db.collection("case_codes").deleteMany({ _id: VICTIM_REF });
const tail = await signIn("001122");
check(!(await db.collection("case_codes").findOne({ _id: VICTIM_REF })), "a six-digit phone tail sends no code", `${tail.status}`);
const whole = await signIn("90 000 11 22");
check(Boolean(await db.collection("case_codes").findOne({ _id: VICTIM_REF })), "the whole number sends a code to the contact on the case", `${whole.status}`);
check(!(whole.headers.getSetCookie?.() ?? []).some((line) => line.startsWith("shifain_patient=")), "and signs nobody in yet");

// ---------------------------------------------------------------- 4. the chat limit
const chatty = browser();
let last = null;
for (let i = 0; i < 31; i++) last = await say(chatty, "hi");
check(last.status === 429 && /wait/i.test(last.reply ?? ""), "the 31st turn in ten minutes waits", `${last.status} ${last.reply?.slice(0, 80)}`);

// ---------------------------------------------------------------- tidy up
await db.collection("cases").deleteMany({ "patient.phone": VICTIM_PHONE });
await db.collection("case_codes").deleteMany({ _id: VICTIM_REF });
await client.close();
console.log(bad ? `\n${bad} check(s) failed` : "\nsecurity flow: all checks pass");
process.exit(bad ? 1 : 0);
