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

// ---------------------------------------------------------------- Gemini model choice

/**
 * Google retires Gemini model names on its own schedule (2.0-flash and
 * 1.5-flash both went), so the model is not hardcoded. GEMINI_MODEL pins one;
 * otherwise the key's own model list is read and the best stable Flash model
 * that supports generateContent is used, re-checked every six hours.
 */
const GEMINI_LIST_URL = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000";
const MODEL_LIST_TTL = 6 * 60 * 60 * 1000;
let geminiModelCache: { models: string[]; at: number } | null = null;

type GeminiModelInfo = { name: string; supportedGenerationMethods?: string[] };

const SPECIALISED = /(image|tts|audio|live|embed|vision|robotics|computer|native|aqa|learnlm|gemma)/;
const UNSTABLE = /(exp|preview|thinking)/;

export function rankGeminiModels(models: GeminiModelInfo[]): string[] {
  const usable = models
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .filter((name) => name.includes("flash") && !SPECIALISED.test(name));
  const stable = usable.filter((name) => !UNSTABLE.test(name));
  const pool = stable.length > 0 ? stable : usable;

  const version = (name: string) => Number(/gemini-(\d+(?:\.\d+)?)/.exec(name)?.[1] ?? 0);
  const score = (name: string) =>
    (name === "gemini-flash-latest" ? 1000 : 0) + version(name) * 10 - (name.includes("lite") ? 5 : 0) -
    (/-\d{3}$/.test(name) ? 1 : 0);
  return [...new Set(pool)].sort((a, b) => score(b) - score(a)).slice(0, 4);
}

async function geminiModels(preferred?: string): Promise<string[]> {
  const pinned = preferred?.trim() || process.env.GEMINI_MODEL?.trim();
  if (!geminiModelCache || Date.now() - geminiModelCache.at > MODEL_LIST_TTL) {
    let models: string[] = [];
    try {
      const res = await fetch(GEMINI_LIST_URL, { headers: { "x-goog-api-key": process.env.GEMINI_API_KEY! } });
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
      models: models.length > 0 ? models : ["gemini-flash-latest"],
      at: models.length > 0 ? Date.now() : Date.now() - MODEL_LIST_TTL + 5 * 60 * 1000,
    };
  }
  const list = geminiModelCache.models;
  return pinned ? [pinned, ...list.filter((m) => m !== pinned)] : list;
}

const isModelMissing = (error: unknown) => /\b404\b|not found|no longer available/i.test(String(error));
/** Google's overload is per model, so a busy model is a reason to try the next one too. */
const isModelBusy = (error: unknown) =>
  /\b503\b|\b500\b|overloaded|high demand|unavailable/i.test(String(error));

/** Tries each candidate model in turn, moving on only when Google says the model does not exist. */
export async function withGeminiModel<T>(
  run: (model: string) => Promise<T>,
  preferred?: string,
): Promise<T> {
  const candidates = await geminiModels(preferred);
  let lastError: unknown = new Error("No Gemini model available.");
  for (const model of candidates) {
    try {
      return await run(model);
    } catch (error) {
      lastError = error;
      if (isModelBusy(error)) {
        console.error(`[shifain] Gemini model ${model} is busy, trying the next one`);
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
