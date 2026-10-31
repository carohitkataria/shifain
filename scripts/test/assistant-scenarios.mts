/**
 * The assistant's test conversations (Part E1): every scenario in
 * scripts/test/assistant-scenarios/*.json is played through handleWebTurn
 * with dryRun, on an in-memory database seeded with the catalogue, and each
 * reply is checked against what must and must not appear.
 *
 *   npm run test:assistant            scripted AI replies (also part of npm test)
 *   npm run test:assistant -- --live  the real providers (GEMINI_API_KEY and/or ANTHROPIC_API_KEY)
 *   npm run test:assistant -- --only price --verbose   one category, every reply printed
 *
 * With scripted replies, each turn's `ai` steps say what the model "does":
 * call a tool, or respond. Tools and everything else run for real, and
 * "{{result}}" in a scripted reply is filled from the real tool result — so
 * what reaches the patient is still decided by the app's own code. Live,
 * the `ai` steps are ignored and the same checks apply to the real replies.
 */
import assert from "node:assert/strict";
import http from "node:http";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { AddressInfo } from "node:net";

type Step = { call: string; args?: Record<string, unknown> } | { respond: Record<string, unknown> };
type Turn = {
  say: string;
  /** Spoken: the recogniser's language comes with it. */
  voice?: string;
  ai?: Step[];
  must?: string[];
  mustNot?: string[];
  via?: string | string[];
  /** The reply is shown in Cyrillic (Uzbek Cyrillic page). */
  cyrillic?: boolean;
  /** Checks only the scripted run can make (what the app did, not what a model chose). */
  scriptedOnly?: { must?: string[]; mustNot?: string[] };
};
type Scenario = {
  id: string;
  category: string;
  locale: "en" | "ru" | "uz" | "oz";
  /** Starting state: chat fields, extra documents, cookies, a page hospital. */
  state?: {
    intake?: Record<string, unknown>;
    db?: Record<string, Record<string, unknown>[]>;
    cookies?: Record<string, string>;
    pageHospitalId?: string;
  };
  turns: Turn[];
};

const args = process.argv.slice(2);
const live = args.includes("--live");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const DIR = path.join(import.meta.dirname, "assistant-scenarios");

// ---------------------------------------------------------------- the scripted model

let script: Step[] = [];
const called: string[] = [];

/** What runTool hands back (src/lib/assistant/tools.ts), as far as a summary needs. */
type ToolResponse = {
  error?: string;
  hospital?: string | null;
  doctors?: { name: string; specialty: string; days?: string[] }[];
  hospitals?: { name: string; city: string }[];
  price?: { treatment: string; from: number; to: number; currency: string; note: string };
  case?: { stage: string; nextStep: string; reference: string };
};
type Part = { text?: string; functionResponse?: { name: string; response: ToolResponse } };
type GeminiRequest = {
  tools?: { functionDeclarations?: unknown[] }[];
  contents?: { role: string; parts?: Part[] }[];
  toolConfig?: { functionCallingConfig?: { allowedFunctionNames?: string[] } };
};

function summarise(response: ToolResponse): string {
  if (response.error) return String(response.error);
  if (Array.isArray(response.doctors)) {
    return response.doctors.length
      ? response.doctors.map((d) => `${d.name} (${d.specialty}${d.days?.length ? `; ${d.days.join(", ")}` : ""})`).join("; ")
      : `no matching doctors listed at ${response.hospital ?? "this hospital"}`;
  }
  if (Array.isArray(response.hospitals)) return response.hospitals.map((h) => `${h.name}, ${h.city}`).join("; ") || "no hospitals found";
  if (response.price) return `${response.price.treatment}: ${response.price.from}–${response.price.to} ${response.price.currency} (${response.price.note})`;
  if (response.case) return `stage: ${response.case.stage}; next: ${response.case.nextStep}; case ${response.case.reference}`;
  return JSON.stringify(response);
}

const DEFAULT_RESPOND = { reply: "Could you tell me a little more?", ready: false, command: "none" };

function scriptedModel(body: GeminiRequest): object {
  const tools = Boolean(body.tools?.[0]?.functionDeclarations);
  const lastResponse = (body.contents ?? []).flatMap((c) => c.parts ?? []).reverse().find((p) => p.functionResponse);
  const allowed = body.toolConfig?.functionCallingConfig?.allowedFunctionNames;
  let step = script.shift();
  // Only `respond` is offered on the last round: skip any call the script still has.
  while (step && "call" in step && (!tools || allowed)) step = script.shift();
  const respond = step && "respond" in step ? { ...DEFAULT_RESPOND, ...step.respond } : DEFAULT_RESPOND;
  if (typeof respond.reply === "string" && respond.reply.includes("{{result}}")) {
    respond.reply = respond.reply.replace("{{result}}", lastResponse?.functionResponse ? summarise(lastResponse.functionResponse.response) : "(no tool was called)");
  }
  if (tools) {
    const call = step && "call" in step ? { name: step.call, args: step.args ?? {} } : { name: "respond", args: respond };
    called.push(call.name);
    return { candidates: [{ content: { role: "model", parts: [{ functionCall: call }] }, finishReason: "STOP", index: 0 }] };
  }
  return { candidates: [{ content: { role: "model", parts: [{ text: JSON.stringify(respond) }] }, finishReason: "STOP", index: 0 }] };
}

async function startScriptedModel(): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      res.writeHead(200, { "content-type": "application/json" });
      if (req.method === "GET") {
        res.end(JSON.stringify({ models: [{ name: "models/gemini-scripted-flash", supportedGenerationMethods: ["generateContent"] }] }));
        return;
      }
      res.end(JSON.stringify(scriptedModel(JSON.parse(raw || "{}"))));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return server;
}

// ---------------------------------------------------------------- environment, before the app loads

process.env.PARTNER_SECRET ||= "scenario-secret-at-least-16";
process.env.NODE_ENV ||= "test";
delete process.env.ELEVENLABS_API_KEY;
delete process.env.RESEND_API_KEY;
delete process.env.TELEGRAM_PATIENT_BOT_TOKEN;
delete process.env.WHATSAPP_TOKEN;
let server: http.Server | null = null;
if (!live) {
  server = await startScriptedModel();
  process.env.GEMINI_API_KEY = "scripted";
  process.env.GEMINI_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  delete process.env.GEMINI_CHAT_MODEL;
  delete process.env.ANTHROPIC_API_KEY;
} else if (!process.env.GEMINI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
  console.error("--live needs GEMINI_API_KEY or ANTHROPIC_API_KEY.");
  process.exit(2);
}

const { resetFakeDb, fakeCollection } = await import("./fakes/db.mts");
const { resetFakeCookies } = await import("./fakes/next-headers.mts");
const { handleWebTurn } = await import("../../src/lib/assistant/web-turn.ts");
const { getOrCreateWebIntake } = await import("../../src/lib/web-intake.ts");
const { forScreen } = await import("../../src/lib/voice/reply-script.ts");

// ---------------------------------------------------------------- the catalogue every scenario starts from

const catalogue = async (name: string) => JSON.parse(await readFile(path.join(process.cwd(), "src", "data", "catalogue", `${name}.json`), "utf8"));
const fixtures = JSON.parse(await readFile(path.join(DIR, "_fixtures.json"), "utf8")) as Record<string, Record<string, unknown>[]>;
const seed = {
  treatments: await catalogue("treatments"),
  specialties: await catalogue("specialties"),
  cities: await catalogue("cities"),
  price_bands: await catalogue("price_bands"),
  ...fixtures,
};

// ---------------------------------------------------------------- running

type Outcome = { id: string; category: string; turn: number; ok: boolean; problems: string[]; reply: string };

const test = (pattern: string, text: string) => new RegExp(pattern, "iu").test(text);

async function play(scenario: Scenario): Promise<Outcome[]> {
  const merged: Record<string, Record<string, unknown>[]> = { ...seed };
  for (const [name, docs] of Object.entries(scenario.state?.db ?? {})) merged[name] = [...(merged[name] ?? []), ...docs];
  resetFakeDb(merged);
  resetFakeCookies(scenario.state?.cookies ?? {});
  const sessionId = `scenario-${scenario.id}`;
  if (scenario.state?.intake) {
    await getOrCreateWebIntake(sessionId);
    const [doc] = fakeCollection("web_intakes").filter((item) => item._id === sessionId);
    Object.assign(doc, structuredClone(scenario.state.intake));
  }
  const cyrillicPage = scenario.locale === "oz";
  const outcomes: Outcome[] = [];
  for (const [index, turn] of scenario.turns.entries()) {
    script = structuredClone(turn.ai ?? []);
    called.length = 0;
    const problems: string[] = [];
    let shown = "";
    try {
      const reply = await handleWebTurn({
        sessionId,
        text: turn.say,
        locale: cyrillicPage ? "uz" : scenario.locale,
        detectedLanguage: turn.voice,
        dryRun: true,
        ip: "127.0.0.1",
        pageHospitalId: scenario.state?.pageHospitalId ?? null,
      });
      const screen = forScreen(reply as unknown as Record<string, unknown>, cyrillicPage);
      shown = String(screen.reply ?? "");
      const must = [...(turn.must ?? []), ...(!live ? turn.scriptedOnly?.must ?? [] : [])];
      const mustNot = [...(turn.mustNot ?? []), ...(!live ? turn.scriptedOnly?.mustNot ?? [] : [])];
      for (const pattern of must) if (!test(pattern, shown)) problems.push(`missing /${pattern}/`);
      for (const pattern of mustNot) if (test(pattern, shown)) problems.push(`must not contain /${pattern}/`);
      const via = turn.via ? [turn.via].flat() : [];
      if (via.length && !via.includes(String(reply.via))) problems.push(`answered by ${reply.via}, expected ${via.join(" or ")}`);
      if (turn.cyrillic && !/[а-яўқғҳ]/iu.test(shown)) problems.push("not shown in Cyrillic");
      if (turn.cyrillic && /\b[a-z]{5,}\b/.test(shown.replace(/ShifaIn|https?:\S+/g, ""))) problems.push("Latin words left in a Cyrillic reply");
    } catch (error) {
      problems.push(`threw: ${error instanceof Error ? error.message : String(error)}`);
    }
    outcomes.push({ id: scenario.id, category: scenario.category, turn: index + 1, ok: problems.length === 0, problems, reply: shown });
  }
  return outcomes;
}

const files = (await readdir(DIR)).filter((name) => name.endsWith(".json") && !name.startsWith("_")).sort();
const scenarios: Scenario[] = [];
for (const file of files) {
  const list = JSON.parse(await readFile(path.join(DIR, file), "utf8")) as Scenario[];
  for (const scenario of list) scenarios.push(scenario);
}
const ids = new Set<string>();
for (const scenario of scenarios) {
  assert.ok(!ids.has(scenario.id), `duplicate scenario id ${scenario.id}`);
  ids.add(scenario.id);
}

const chosen = scenarios.filter((scenario) => !only || scenario.category === only || scenario.id === only);
const results: Outcome[] = [];
// The app's own logging (dev sign-in codes, "trying the next model") is noise here unless asked for.
const quiet = !args.includes("--verbose");
const original = { log: console.log, info: console.info, error: console.error, warn: console.warn };
if (quiet) console.log = console.info = console.error = console.warn = () => {};
try {
  for (const scenario of chosen) results.push(...(await play(scenario)));
} finally {
  Object.assign(console, original);
}
server?.close();

// ---------------------------------------------------------------- report

const byScenario = new Map<string, Outcome[]>();
for (const result of results) byScenario.set(result.id, [...(byScenario.get(result.id) ?? []), result]);
const failed = [...byScenario.values()].filter((turns) => turns.some((turn) => !turn.ok));
const languages = new Set(chosen.map((scenario) => scenario.locale));
const voiced = chosen.filter((scenario) => scenario.turns.some((turn) => turn.voice)).length;

if (live || args.includes("--table")) {
  const width = Math.max(...chosen.map((scenario) => scenario.id.length), 8);
  console.log(`\n${"scenario".padEnd(width)}  category        lang  result`);
  for (const scenario of chosen) {
    const turns = byScenario.get(scenario.id) ?? [];
    const bad = turns.filter((turn) => !turn.ok);
    console.log(`${scenario.id.padEnd(width)}  ${scenario.category.padEnd(14)}  ${scenario.locale.padEnd(4)}  ${bad.length ? "FAIL" : "pass"}`);
  }
}
if (args.includes("--verbose")) {
  for (const result of results) console.log(`${result.ok ? "✓" : "✗"} ${result.id} #${result.turn}: ${result.reply.slice(0, 300)}`);
}
for (const turns of failed) {
  for (const turn of turns.filter((item) => !item.ok)) {
    console.log(`\n✗ ${turn.id} (turn ${turn.turn}): ${turn.problems.join("; ")}\n  reply: ${turn.reply.slice(0, 400)}`);
  }
}
const summary = `${chosen.length - failed.length}/${chosen.length} scenarios pass (${results.length} turns; ${[...languages].sort().join(", ")}; ${voiced} spoken) — ${live ? "live providers" : "scripted replies"}`;
console.log(`\nassistant scenarios: ${summary}`);
if (!only) assert.ok(chosen.length >= 40 && chosen.length <= 60, `40–60 scenarios expected, found ${chosen.length}`);
process.exit(failed.length ? 1 : 0);
