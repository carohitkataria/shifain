/**
 * Part D: which voice model speaks, who listens, the pinned chat model, and
 * Cyrillic Uzbek voiced from Latin.
 *
 *   node --conditions=react-server --import ./scripts/test/resolve-ts.mjs --experimental-strip-types scripts/test/voice-engine.test.mts
 */
import assert from "node:assert/strict";
import { FLASH_LANGUAGES, baseLanguage, listensOnServer, ttsModelFor } from "../../src/lib/voice/engine-rules.ts";
import { forScreen } from "../../src/lib/voice/reply-script.ts";
import { speechModel } from "../../src/lib/elevenlabs.ts";
import { pickCandidates, providerHealth } from "../../src/lib/ai/providers.ts";
import { speakable } from "../../src/lib/access-levels.ts";

// D1. Uzbek goes to the wide model, Russian to Flash v2.5.
assert.equal(FLASH_LANGUAGES.size, 32);
assert.deepEqual(ttsModelFor("uz"), { modelId: "eleven_v3" }, "uz → wide model, no language_code");
assert.deepEqual(ttsModelFor("ru"), { modelId: "eleven_flash_v2_5", languageCode: "ru" }, "ru → Flash v2.5");
for (const lang of ["kk", "ky", "tg", "az", "hy", "fa", "oz", "uzb", "uz-Cyrl-UZ"]) assert.equal(ttsModelFor(lang).modelId, "eleven_v3", lang);
for (const lang of ["en", "hi", "tr", "vi", "no", "rus", "en-GB"]) assert.equal(ttsModelFor(lang).modelId, "eleven_flash_v2_5", lang);
assert.deepEqual(ttsModelFor(""), { modelId: "eleven_flash_v2_5" }, "unknown language: Flash detects it");
assert.equal(baseLanguage("uzb"), "uz", "Scribe's three-letter codes");
// Both overridable; language_code only for Flash and Turbo.
const env = { ELEVENLABS_MODEL: "eleven_turbo_v2_5", ELEVENLABS_MODEL_WIDE: "eleven_v4" };
assert.deepEqual(ttsModelFor("ru", env), { modelId: "eleven_turbo_v2_5", languageCode: "ru" });
assert.deepEqual(ttsModelFor("uz", env), { modelId: "eleven_v4" });
assert.deepEqual(ttsModelFor("ru", { ELEVENLABS_MODEL: "eleven_multilingual_v2" }), { modelId: "eleven_multilingual_v2" });

// What the request really sends (elevenlabs.ts reads the environment).
delete process.env.ELEVENLABS_MODEL;
delete process.env.ELEVENLABS_MODEL_WIDE;
assert.equal(speechModel({ languageCode: "uz" }).modelId, "eleven_v3", "a uz speech request uses the wide model");
assert.equal(speechModel({ languageCode: "ru" }).modelId, "eleven_flash_v2_5", "a ru speech request uses Flash v2.5");
process.env.ELEVENLABS_MODEL_WIDE = "eleven_v4";
assert.equal(speechModel({ languageCode: "uz" }).modelId, "eleven_v4", "ELEVENLABS_MODEL_WIDE");
delete process.env.ELEVENLABS_MODEL_WIDE;

// D2. The server listens for uz/kk/ky/tg and where the browser has no recogniser; the admin can force it.
const base = { serverVoice: true, canRecord: true, hasRecogniser: true, forceServer: false };
assert.equal(listensOnServer({ ...base, languages: ["uz"] }), true);
assert.equal(listensOnServer({ ...base, languages: ["oz"] }), true, "Cyrillic Uzbek page");
assert.equal(listensOnServer({ ...base, languages: ["en", "kk-KZ"] }), true, "a Kazakh device");
assert.equal(listensOnServer({ ...base, languages: ["ru", "ru-RU"] }), false, "Russian: the browser hears it");
assert.equal(listensOnServer({ ...base, hasRecogniser: false, languages: ["ru"] }), true, "no recogniser");
assert.equal(listensOnServer({ ...base, forceServer: true, languages: ["en"] }), true, "admin forces it");
assert.equal(listensOnServer({ ...base, serverVoice: false, languages: ["uz"] }), false, "no server voice: the browser tries");
assert.equal(listensOnServer({ ...base, canRecord: false, languages: ["uz"] }), false);

// D3. A pinned chat model goes first, even while resting, and shows as pinned.
const now = Date.now();
const busy = new Map([["gemini-2.5-flash", now + 60_000]]);
assert.deepEqual(pickCandidates(["gemini-2.5-flash", "gemini-flash-lite-latest", "b"], { pinned: "gemini-2.5-flash", busyUntil: busy, now, attempts: 2 }), [
  "gemini-2.5-flash",
  "gemini-flash-lite-latest",
]);
assert.deepEqual(pickCandidates(["a", "b"], { pinned: null, busyUntil: new Map([["a", now + 1]]), now, attempts: 2 }), ["b"]);
assert.deepEqual(pickCandidates(["a"], { pinned: null, busyUntil: new Map([["a", now + 1]]), now, attempts: 2 }), ["a"], "all resting: try anyway");
process.env.GEMINI_CHAT_MODEL = "gemini-2.5-flash";
const health = providerHealth();
assert.equal(health.gemini.chatPinned, "gemini-2.5-flash", "the health panel shows the pinned model");
assert.equal(health.gemini.chatOrder[0], "gemini-2.5-flash");
delete process.env.GEMINI_CHAT_MODEL;
assert.equal(providerHealth().gemini.chatPinned, null);

// D5. Cyrillic Uzbek: the voice is made from the Latin reply; only the screen is converted.
const latin = "Rahmat! Shifokor sizga qo'ng'iroq qiladi.";
const payload = { reply: latin, speech: speakable(latin, "uz") };
const shown = forScreen(payload, true);
assert.match(String(shown.reply), /[а-яўқғҳ]/i, "the screen shows Cyrillic");
assert.equal(shown.speech, latin, "speech stays Latin");
assert.equal(forScreen(payload, false).reply, latin);

console.log("voice engine: model per language, server listening, pinned chat model, Latin speech");
