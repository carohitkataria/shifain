/**
 * The translated languages (Arabic, Hindi, Bengali, French, …): which text the
 * page translator sends, how a batch is checked, how the AI's answer is read,
 * and which language a visitor lands on.
 */
import assert from "node:assert/strict";
import { cleanBatch, needsTranslation, readTranslations, MAX_BATCH } from "../../src/lib/page-translation-rules.ts";
import { LOCALES, LOCALE_META, TRANSLATED_LOCALES, contentLocale, isTranslatedLocale, resolveLocale } from "../../src/lib/i18n.ts";
import { t } from "../../src/lib/localize.ts";

// The languages: thirteen, Arabic right to left, the new ones read the English.
assert.equal(LOCALES.length, 13);
assert.deepEqual([...TRANSLATED_LOCALES].sort(), ["ar", "bg", "bn", "es", "fr", "hi", "pt", "ro", "sq"]);
assert.equal(LOCALE_META.ar.dir, "rtl");
for (const locale of LOCALES) assert.ok(LOCALE_META[locale].short && LOCALE_META[locale].label, locale);
assert.equal(contentLocale("fr"), "en");
assert.equal(contentLocale("oz"), "uz");
assert.equal(contentLocale("ru"), "ru");
assert.ok(isTranslatedLocale("hi") && !isTranslatedLocale("ru") && !isTranslatedLocale("xx"));
assert.equal(t({ en: "Book now", ru: "Записаться", uz: "Yozilish" }, "fr"), "Book now", "the translator starts from the English");

// Visitors land in their language: by country, then by browser.
assert.equal(resolveLocale({ country: "BD" }), "bn");
assert.equal(resolveLocale({ country: "IQ" }), "ar");
assert.equal(resolveLocale({ country: "SN" }), "fr");
assert.equal(resolveLocale({ acceptLanguage: "es-MX,es;q=0.9,en;q=0.5" }), "es");
assert.equal(resolveLocale({ acceptLanguage: "sq-AL" }), "sq");
assert.equal(resolveLocale({ country: "IQ", cookie: "en" }), "en", "an explicit choice wins");

// What is sent: words, not brand, numbers, emails, codes; in Arabic/Hindi/Bengali/Bulgarian only what is still English.
assert.ok(needsTranslation("Get your free treatment plan", "fr"));
assert.ok(needsTranslation("  Book now ", "ar"));
for (const same of ["ShifaIn", "+91 75030 70727", "care@shifain.com", "UZ48213", "JCI", "$4,500 – $7,000", "https://shifain.com", "7"]) {
  assert.equal(needsTranslation(same, "es"), false, same);
}
assert.equal(needsTranslation("احصل على خطة علاج مجانية", "ar"), false, "already Arabic");
assert.equal(needsTranslation("मुफ़्त उपचार योजना", "hi"), false, "already Hindi");
assert.equal(needsTranslation("Безплатен план за лечение", "bg"), false, "already Bulgarian");
assert.ok(needsTranslation("Plan gratuit", "fr"), "Latin-script languages cannot tell, and the stored copy decides");
assert.equal(needsTranslation("x".repeat(900), "fr"), false, "too long for one piece of page text");

// A batch is cleaned before any AI sees it.
const batch = cleanBatch(["Book now", "Book  now", 42, "ShifaIn", "Talk to a coordinator", ...Array.from({ length: 100 }, (_, i) => `Sentence number ${i}`)], "pt");
assert.equal(batch[0], "Book now");
assert.equal(batch.filter((text) => text === "Book now").length, 1, "whitespace variants are one entry");
assert.ok(!batch.includes("ShifaIn"));
assert.ok(batch.length <= MAX_BATCH);
assert.deepEqual(cleanBatch("not a list", "pt"), []);

// The AI's reply is used only when it is a list of the same length.
assert.deepEqual(readTranslations('["Réserver", "Parler à un coordinateur"]', 2), ["Réserver", "Parler à un coordinateur"]);
assert.deepEqual(readTranslations('```json\n["Réserver"]\n```', 1), ["Réserver"]);
assert.equal(readTranslations('["Réserver"]', 2), null, "wrong length");
assert.equal(readTranslations('["Réserver", ""]', 2), null, "a blank translation");
assert.equal(readTranslations("not json", 1), null);
assert.equal(readTranslations({ reply: "x" }, 1), null);

console.log("page translation: 13 languages, what is sent, batches, the AI's reply, landing language");
