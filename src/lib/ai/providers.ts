import "server-only";

/**
 * Which AI provider answers, shared by the chat, the Telegram bot and the
 * treatment planner: Gemini's model is discovered rather than hardcoded, and
 * a provider out of quota or credit is rested and then used again by itself.
 */

// ---------------------------------------------------------------- quota pauses

export type Provider = "gemini" | "claude";
const pausedUntil: Record<Provider, number> = { gemini: 0, claude: 0 };

const isQuotaError = (text: string) =>
  /\b429\b|quota|rate.?limit|resource.?exhausted|too many requests|credit balance|billing/i.test(text);

/**
 * When a provider says its quota or credit is used up, stop asking it until
 * the time it gives (Google sends a retry delay), then use it again
 * automatically. Meanwhile the next provider, or the scripted intake, answers.
 */
export function pauseDuration(error: unknown): number | null {
  const text = String(error instanceof Error ? error.message : error);
  if (/api key not valid|invalid.?api.?key|authentication|\b401\b|\b403\b/i.test(text)) return 60 * 60 * 1000;
  if (!isQuotaError(text)) return null;
  if (/credit balance|billing/i.test(text)) return 30 * 60 * 1000;
  const seconds =
    Number(/retry in ([\d.]+)\s*s/i.exec(text)?.[1]) ||
    Number(/"?retryDelay"?\s*:\s*"?(\d+)s/i.exec(text)?.[1]) ||
    60;
  return Math.min(60 * 60, Math.max(10, Math.ceil(seconds))) * 1000;
}

export function noteFailure(provider: Provider, error: unknown): void {
  const ms = pauseDuration(error);
  if (ms) {
    pausedUntil[provider] = Date.now() + ms;
    console.error(`[shifain] ${provider} paused for ${Math.round(ms / 1000)}s (quota, credit or key); resumes automatically`);
  }
}

export function available(provider: Provider): boolean {
  const key = provider === "gemini" ? process.env.GEMINI_API_KEY : process.env.ANTHROPIC_API_KEY;
  return Boolean(key) && Date.now() >= pausedUntil[provider];
}

// ---------------------------------------------------------------- health

/**
 * What the console shows under AI assistant → AI health: the last answer and
 * the last failure from each provider. Kept in memory (one server process),
 * which is enough to see "Gemini has been overloaded since 16:00".
 */
export type ProviderHealth = {
  lastOkAt: string | null;
  lastOkModel: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  lastErrorModel: string | null;
};

const health: Record<Provider, ProviderHealth> = {
  gemini: { lastOkAt: null, lastOkModel: null, lastErrorAt: null, lastError: null, lastErrorModel: null },
  claude: { lastOkAt: null, lastOkModel: null, lastErrorAt: null, lastError: null, lastErrorModel: null },
};

export function noteSuccess(provider: Provider, model: string): void {
  health[provider].lastOkAt = new Date().toISOString();
  health[provider].lastOkModel = model;
}

export function noteError(provider: Provider, model: string | null, error: unknown): void {
  health[provider].lastErrorAt = new Date().toISOString();
  health[provider].lastErrorModel = model;
  health[provider].lastError = String(error instanceof Error ? error.message : error).slice(0, 300);
}

export function providerHealth() {
  const now = Date.now();
  const chatPinned = process.env.GEMINI_CHAT_MODEL?.trim() || null;
  const chatOrder = geminiModelCache ? orderFor(geminiModelCache.models, "chat") : [];
  return {
    gemini: {
      configured: Boolean(process.env.GEMINI_API_KEY),
      pausedUntil: pausedUntil.gemini > now ? new Date(pausedUntil.gemini).toISOString() : null,
      models: geminiModelCache?.models ?? [],
      /** GEMINI_CHAT_MODEL: always tried first for chat. */
      chatPinned,
      chatOrder: chatPinned ? [chatPinned, ...chatOrder.filter((model) => model !== chatPinned)] : chatOrder,
      busy: [...busyUntil.entries()].filter(([, until]) => until > now).map(([model]) => model),
      ...health.gemini,
    },
    claude: {
      configured: Boolean(process.env.ANTHROPIC_API_KEY),
      pausedUntil: pausedUntil.claude > now ? new Date(pausedUntil.claude).toISOString() : null,
      ...health.claude,
    },
  };
}

// ---------------------------------------------------------------- Gemini model choice

/**
 * Google retires Gemini model names on its own schedule, so the model is not
 * hardcoded: the key's own model list is read every six hours and ordered
 * for the job.
 *
 * - chat: the "lite" models first. They are the cheapest, the fastest and
 *   have the most free capacity, which is what a patient waiting on a reply
 *   needs. GEMINI_CHAT_MODEL pins one.
 * - plan: the full models first, for quality. GEMINI_MODEL / GEMINI_PLAN_MODEL pin one.
 *
 * Brand-new and preview models are skipped while stable ones exist: they are
 * the ones Google most often reports as overloaded.
 */
export type GeminiTier = "chat" | "plan";

const GEMINI_LIST_URL = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000";
const MODEL_LIST_TTL = 6 * 60 * 60 * 1000;
let geminiModelCache: { models: string[]; at: number } | null = null;

type GeminiModelInfo = { name: string; supportedGenerationMethods?: string[] };

const SPECIALISED = /(image|tts|audio|live|embed|vision|robotics|computer|native|aqa|learnlm|gemma)/;
const UNSTABLE = /(exp|preview|thinking)/;

/** The usable Flash-family models a key can call, stable ones only when there are any. */
export function rankGeminiModels(models: GeminiModelInfo[]): string[] {
  const usable = models
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((name) => name.includes("flash") && !SPECIALISED.test(name));
  const stable = usable.filter((name) => !UNSTABLE.test(name));
  const pool = [...new Set(stable.length > 0 ? stable : usable)];
  return orderFor(pool, "plan").slice(0, 10);
}

const version = (name: string) => Number(/gemini-(\d+(?:\.\d+)?)/.exec(name)?.[1] ?? 0);

/** Orders models for a job; see GeminiTier. */
export function orderFor(models: string[], tier: GeminiTier): string[] {
  const lite = (name: string) => name.includes("lite");
  const score = (name: string) => {
    const latest = name.endsWith("-latest") ? 0.5 : 0; // an alias for the newest, so slightly behind a pinned version for chat
    const dated = /-\d{3}$/.test(name) ? -0.1 : 0;
    if (tier === "chat") return (lite(name) ? 1000 : 0) + version(name) - latest + dated;
    return (lite(name) ? 0 : 1000) + version(name) + (name === "gemini-flash-latest" ? 100 : 0) + dated;
  };
  return [...models].sort((a, b) => score(b) - score(a));
}

/**
 * The models to try, in order. A pinned model always goes first, even while
 * resting after a busy spell — pinning means "this one". The others skip
 * models resting for three minutes; if every one is resting, try the first
 * anyway rather than not at all.
 */
export function pickCandidates(
  all: string[],
  opts: { pinned: string | null; busyUntil: Map<string, number>; now: number; attempts: number },
): string[] {
  const rest = all.filter((model) => model !== opts.pinned);
  const ready = rest.filter((model) => (opts.busyUntil.get(model) ?? 0) <= opts.now);
  const others = ready.length > 0 || opts.pinned ? ready : rest;
  return [...(opts.pinned ? [opts.pinned] : []), ...others].slice(0, opts.attempts);
}

async function geminiModels(tier: GeminiTier, preferred?: string): Promise<string[]> {
  const pinned =
    preferred?.trim() || (tier === "chat" ? process.env.GEMINI_CHAT_MODEL?.trim() : process.env.GEMINI_MODEL?.trim());
  if (!geminiModelCache || Date.now() - geminiModelCache.at > MODEL_LIST_TTL) {
    let models: string[] = [];
    try {
      const res = await fetch(GEMINI_LIST_URL.replace("https://generativelanguage.googleapis.com", geminiBaseUrl()), {
        headers: { "x-goog-api-key": process.env.GEMINI_API_KEY! },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const json = (await res.json()) as { models?: GeminiModelInfo[] };
        models = rankGeminiModels(json.models ?? []);
      } else {
        console.error("[shifain] could not list Gemini models:", res.status);
      }
    } catch (error) {
      console.error("[shifain] could not list Gemini models:", error);
    }
    // A failed listing is retried in five minutes rather than trusted for six hours.
    geminiModelCache = {
      models: models.length > 0 ? models : ["gemini-flash-lite-latest", "gemini-flash-latest"],
      at: models.length > 0 ? Date.now() : Date.now() - MODEL_LIST_TTL + 5 * 60 * 1000,
    };
  }
  const list = orderFor(geminiModelCache.models, tier);
  return pinned ? [pinned, ...list.filter((m) => m !== pinned)] : list;
}

/** Overridable for tests and proxies; Google's own endpoint otherwise. */
export function geminiBaseUrl(): string {
  return process.env.GEMINI_BASE_URL?.trim() || "https://generativelanguage.googleapis.com";
}

const isModelMissing = (error: unknown) => /\b404\b|not found|no longer available/i.test(String(error));
/** Google's overload is per model, so a busy model is a reason to try the next one too. */
const isModelBusy = (error: unknown) =>
  /\b503\b|\b500\b|\b502\b|\b504\b|overloaded|high demand|unavailable|timed? ?out|abort|fetch failed/i.test(String(error));

/** A model Google just called overloaded is left alone for three minutes, so the next patient doesn't wait on it too. */
const busyUntil = new Map<string, number>();
const BUSY_REST = 180_000;

type GeminiOptions = {
  preferred?: string;
  tier?: GeminiTier;
  /** How many models to try before giving up; a patient should not wait on four. */
  attempts?: number;
  /** Per-attempt limit, passed to the request. */
  timeoutMs?: number;
};

/**
 * Runs a Gemini call on the best model for the job, moving to the next model
 * when one is overloaded, missing or too slow — up to `attempts` models.
 */
export async function withGeminiModel<T>(
  run: (model: string, timeoutMs: number) => Promise<T>,
  options: GeminiOptions | string = {},
): Promise<T> {
  const opts: GeminiOptions = typeof options === "string" ? { preferred: options } : options;
  const tier = opts.tier ?? "plan";
  const timeoutMs = opts.timeoutMs ?? (tier === "chat" ? 9000 : 90_000);
  const attempts = opts.attempts ?? (tier === "chat" ? 2 : 4);
  const now = Date.now();
  const all = await geminiModels(tier, opts.preferred);
  const pinned = opts.preferred?.trim() || (tier === "chat" ? process.env.GEMINI_CHAT_MODEL?.trim() : process.env.GEMINI_MODEL?.trim()) || null;
  const candidates = pickCandidates(all, { pinned, busyUntil, now, attempts });

  let lastError: unknown = new Error("No Gemini model available.");
  for (const model of candidates) {
    try {
      const result = await run(model, timeoutMs);
      busyUntil.delete(model);
      noteSuccess("gemini", model);
      return result;
    } catch (error) {
      lastError = error;
      noteError("gemini", model, error);
      if (isModelBusy(error)) {
        busyUntil.set(model, Date.now() + BUSY_REST);
        console.error(`[shifain] Gemini model ${model} is busy or slow, trying the next one`);
        continue;
      }
      if (!isModelMissing(error)) throw error;
      console.error(`[shifain] Gemini model ${model} unavailable, trying the next one`);
      geminiModelCache = geminiModelCache && {
        ...geminiModelCache,
        models: geminiModelCache.models.filter((m) => m !== model),
      };
    }
  }
  throw lastError;
}
