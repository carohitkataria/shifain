/**
 * The visitor counter's rules (src/lib/visitor-rules.ts): which page a view
 * is, where the visitor came from, the device, robots and the country.
 */
import assert from "node:assert/strict";
import { countryOf, deviceOf, isRobot, pageOf, sourceOf } from "../../src/lib/visitor-rules.ts";

// pages: one name across languages; case numbers and queries never kept
assert.deepEqual(pageOf("/en"), { page: "/", lang: "en" });
assert.deepEqual(pageOf("/ru/treatments/cardiac-care?utm_source=x"), { page: "/treatments/cardiac-care", lang: "ru" });
assert.deepEqual(pageOf("/uz/plan/UZ12345"), { page: "/plan/[case]", lang: "uz" });
assert.deepEqual(pageOf("/en/plan/UZ12345/extra"), { page: "/plan/[case]", lang: "en" });
assert.deepEqual(pageOf("/en/portal/patient/case?case=UZ12345"), { page: "/portal/patient/case", lang: "en" });
assert.deepEqual(pageOf("/en/"), { page: "/", lang: "en" });
assert.equal(pageOf("/admin/cases"), null);
assert.equal(pageOf("/api/visit"), null);
assert.equal(pageOf("https://evil.example/"), null);
assert.equal(pageOf("/" + "a".repeat(400)), null);

// sources
const own = ["shifain.com"];
assert.equal(sourceOf("https://www.google.com/", "/en", own), "Google");
assert.equal(sourceOf("https://www.google.co.uz/", "/uz", own), "Google");
assert.equal(sourceOf("https://t.me/shifaincare", "/ru", own), "Telegram");
assert.equal(sourceOf("https://web.telegram.org/k/", "/ru", own), "Telegram");
assert.equal(sourceOf("https://l.facebook.com/l.php", "/en", own), "Facebook");
assert.equal(sourceOf("", "/en", own), "Direct");
assert.equal(sourceOf("https://shifain.com/en/faq", "/en", own), "Direct"); // moving around the site is not a source
assert.equal(sourceOf("", "/en?utm_source=whatsapp", own), "WhatsApp");
assert.equal(sourceOf("https://www.google.com/", "/en?utm_source=tg", own), "Telegram"); // the link's own label wins
assert.equal(sourceOf("", "/en?ref=PARTNER1", own), "Partner link");
assert.equal(sourceOf("https://medtourism-forum.example/thread", "/en", own), "medtourism-forum.example");
assert.equal(sourceOf("not a url", "/en", own), "Direct");

// devices and robots
assert.equal(deviceOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148"), "phone");
assert.equal(deviceOf("Mozilla/5.0 (Linux; Android 14; SM-S918B) Mobile Safari/537.36"), "phone");
assert.equal(deviceOf("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"), "tablet");
assert.equal(deviceOf("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0"), "computer");
assert.ok(isRobot("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"));
assert.ok(isRobot("WhatsApp/2.23.20.0 A"));
assert.ok(isRobot("TelegramBot (like TwitterBot)"));
assert.ok(isRobot("curl/8.4.0"));
assert.ok(isRobot(""));
assert.ok(!isRobot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"));

// countries: the network's header first, then the time zone
assert.equal(countryOf("UZ", "Europe/London"), "UZ");
assert.equal(countryOf(null, "Asia/Tashkent"), "UZ");
assert.equal(countryOf("XX", "Asia/Dhaka"), "BD");
assert.equal(countryOf("", "Asia/Kolkata"), "IN");
assert.equal(countryOf(null, "Mars/Olympus"), "??");

console.log("visitors: pages, sources, devices, robots and countries pass");
