/**
 * Drives the parts of the public site a patient actually touches: the enquiry,
 * the three ways of telling us what is wrong, the pages they can click through
 * to, and whether the site opens in the language that fits where they are.
 *
 *   npm i --no-save playwright-core
 *   npm start &
 *   node scripts/test/site-flow.mjs
 */
import { chromium } from "playwright-core";

// localhost, not 127.0.0.1: Next aliases the loopback IP to "localhost" in
// its own redirects, so serving one and fetching the other looks cross-origin.
const BASE = process.env.BASE_URL || "http://localhost:3210";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
const check = (ok, label, extra = "") => {
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${extra ? ` :: ${extra}` : ""}`);
};

for (const width of [390, 1280]) {
  const context = await browser.newContext({ viewport: { width, height: 950 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto(`${BASE}/en`, { waitUntil: "networkidle" });

  // Country comes before the phone, and fills the dialling code in.
  const order = await page.evaluate(() => {
    const c = document.querySelector('#country');
    const p = document.querySelector('#phone');
    return c && p ? (c.compareDocumentPosition(p) & Node.DOCUMENT_POSITION_FOLLOWING) > 0 : null;
  });
  check(order === true, `${width}px  country is asked before the phone number`);

  await page.selectOption("#country", "Uzbekistan");
  check((await page.inputValue('input[name="dial"]')) === "+998", `${width}px  choosing Uzbekistan fills +998`);
  await page.selectOption("#country", "Nigeria");
  check((await page.inputValue('input[name="dial"]')) === "+234", `${width}px  switching to Nigeria fills +234`);
  await page.fill('input[name="dial"]', "+1");
  check((await page.inputValue('input[name="dial"]')) === "+1", `${width}px  and the code stays editable`);

  // Three ways in, and switching keeps what was typed.
  for (const label of ["Upload my reports", "Describe it myself", "Answer a few questions"]) {
    check(await page.locator(`button:has-text("${label}")`).count() > 0, `${width}px  route "${label}" offered`);
  }
  await page.click('button:has-text("Describe it myself")');
  await page.fill("#description", "My father has chest pain when walking.");
  await page.click('button:has-text("Answer a few questions")');
  await page.fill("#answer-age", "62");
  await page.click('button:has-text("Describe it myself")');
  check(
    (await page.inputValue("#description")) === "My father has chest pain when walking.",
    `${width}px  switching route keeps what was already typed`,
  );

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 0, `${width}px  homepage has no horizontal overflow`, `${overflow}px`);
  check(errors.length === 0, `${width}px  no console errors`, errors[0] ?? "");
  await context.close();
}

// Only the chosen route is submitted.
const context = await browser.newContext({ viewport: { width: 1280, height: 950 } });
const page = await context.newPage();
await page.goto(`${BASE}/en`, { waitUntil: "networkidle" });
await page.click('button:has-text("Answer a few questions")');
const submitted = await page.evaluate(() => {
  const form = document.querySelector('form[action="/api/enquiry"]');
  return [...new FormData(form).keys()];
});
check(
  submitted.some((k) => k.startsWith("answer.")) && !submitted.includes("description") && !submitted.includes("reports"),
  "only the chosen route's fields are submitted",
  submitted.filter((k) => k.startsWith("answer.") || k === "description" || k === "reports").join(",") || "none",
);

// An email is asked for, because email sign-in has to have something to match.
check(await page.locator('input[name="email"]').count() > 0, "the enquiry asks for an email");

// Public pages the patient can now click through to.
for (const [path, needle] of [
  ["/en/hospitals", "Partner hospitals"],
  ["/en/doctors", "Doctors"],
  ["/en/conditions", "Conditions we plan for"],
  ["/en/portal/patient/login", "Send me a code"],
  ["/en/portal/doctor/login", "Partner doctor sign-in"],
  ["/en/portal/doctor/apply", "Apply to refer patients"],
]) {
  const response = await page.goto(BASE + path, { waitUntil: "networkidle" });
  check(response.status() === 200 && (await page.locator(`text=${needle}`).first().isVisible()), `${path} loads`);
}

// A doctor who lands on the sign-in page without an account has to be able to
// get to the application form from there, or the form may as well not exist.
await page.goto(`${BASE}/en/portal/doctor/login`, { waitUntil: "networkidle" });
check(
  (await page.locator('a[href="/en/portal/doctor/apply"]').count()) > 0,
  "the doctor sign-in page links to the application form",
);

// The application form must never write a login — it only ever takes a name.
await page.goto(`${BASE}/en/portal/doctor/apply`, { waitUntil: "networkidle" });
check(
  (await page.locator('input[type="password"]').count()) === 0,
  "the application form never asks for a password",
);
check(
  (await page.locator('select[name="country"] option').count()) > 50,
  "the application form asks which country they practise in",
);

// The homepage cards go to those pages rather than back to the form.
await page.goto(`${BASE}/en`, { waitUntil: "networkidle" });
for (const [href, what] of [
  ["/en/hospitals", "hospital cards"],
  ["/en/doctors", "doctor cards"],
  ["/en/conditions", "cost cards"],
]) {
  check(await page.locator(`a[href="${href}"]`).count() > 0, `${what} link through to ${href}`);
}

// Language follows the country the visitor is browsing from.
for (const [country, expected] of [["UZ", "/uz"], ["RU", "/ru"], ["NG", "/en"], ["KZ", "/ru"]]) {
  const fresh = await browser.newContext({ extraHTTPHeaders: { "x-vercel-ip-country": country } });
  const p = await fresh.newPage();
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  check(new URL(p.url()).pathname.startsWith(expected), `a visitor from ${country} lands on ${expected}`, p.url());
  await fresh.close();
}

await browser.close();
console.log(bad === 0 ? "\nALL CHECKS PASSED" : `\n${bad} CHECK(S) FAILED`);
process.exit(bad === 0 ? 0 : 1);
