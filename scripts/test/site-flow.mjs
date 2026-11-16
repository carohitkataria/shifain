/**
 * Drives the parts of the public site a patient actually touches: the
 * three-step plan form in the hero, the pages they click through to, the
 * legal pages, missing pages, and the safety rules around them (headers,
 * redirects, the form's consent and spam field).
 *
 *   npm run build && npm start &      (or npm run dev)
 *   BASE_URL=http://localhost:3000 node scripts/test/site-flow.mjs
 *
 * Playwright: uses the installed `playwright` (or playwright-core with CHROME_PATH).
 */
let chromium;
try {
  // PLAYWRIGHT_MODULE: a path to a global install (ES modules ignore NODE_PATH).
  ({ chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright"));
} catch {
  ({ chromium } = await import("playwright-core"));
}

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
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && !/favicon|DevTools/.test(m.text()) && errors.push(m.text()));
  await page.goto(`${BASE}/en`, { waitUntil: "networkidle" });
  const form = page.locator("#quote-form");

  // Step 1: nothing chosen is refused with a reason.
  await form.getByRole("button", { name: /Continue/ }).click();
  check(await form.getByText(/Choose a treatment/).isVisible(), `${width}px  step 1 says why it cannot continue`);
  await form.getByText("Orthopaedics", { exact: true }).click();
  await form.getByRole("button", { name: /Continue/ }).click();

  // Step 2: three ways to tell us, and an empty step's error is scrolled into view.
  for (const route of ["reports", "description", "questions"]) {
    check((await form.locator(`input[name="route-choice"][value="${route}"]`).count()) === 1, `${width}px  route "${route}" offered`);
  }
  await form.locator('input[name="route-choice"][value="description"]').locator("xpath=..").click();
  await form.getByRole("button", { name: /Continue/ }).click();
  await page.waitForTimeout(700);
  const errorBox = await page.locator("#err-condition").boundingBox();
  check(Boolean(errorBox) && errorBox.y > 0 && errorBox.y + errorBox.height < 900 - 80, `${width}px  the step 2 error is on screen, clear of the chat button`, JSON.stringify(errorBox));
  await page.fill("#description", "My knee hurts on stairs; my doctor says I need a replacement.");
  await form.getByRole("button", { name: /Continue/ }).click();

  // Step 3: the country fills the dialling code; consent is required.
  await page.selectOption("#country", "Uzbekistan");
  check((await page.inputValue('input[name="dial"]')) === "+998", `${width}px  choosing Uzbekistan fills +998`);
  await page.fill("#firstName", "TEST Flow");
  await page.fill("#phone", "90 123 45 67");
  await form.getByRole("button", { name: /Get|Send|plan/i }).last().click();
  check(await page.locator("#err-consent").isVisible(), `${width}px  sending without consent is refused`);
  check((await page.locator('#quote-form input[name="consent"]').count()) === 1, `${width}px  the form links consent to the privacy policy`, String(await page.locator('#quote-form a[href$="/privacy"]').count()));
  const trap = await page.locator('#quote-form input[name="website"]').boundingBox();
  check(Boolean(trap) && trap.x + trap.width < 0, `${width}px  the spam field is there and off screen`, JSON.stringify(trap));

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 0, `${width}px  homepage has no horizontal overflow`, `${overflow}px`);
  check(errors.length === 0, `${width}px  no console errors`, errors[0] ?? "");
  await context.close();
}

const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

// Pages the patient can click through to, including the legal pages the footer links.
for (const [path, needle] of [
  ["/en/hospitals", "Hospitals"],
  ["/en/doctors", "Doctors"],
  ["/en/treatments", "Cardiac care"],
  ["/en/conditions", "Conditions"],
  ["/en/faq", "Frequently asked questions"],
  ["/en/privacy", "Privacy policy"],
  ["/en/terms", "Terms of use"],
  ["/ru/privacy", "Политика конфиденциальности"],
  ["/en/portal/patient/login", "Welcome back"],
  ["/en/portal/doctor/login", "sign"],
]) {
  const response = await page.goto(BASE + path, { waitUntil: "networkidle" });
  check(response.status() === 200 && (await page.getByText(needle, { exact: false }).first().isVisible()), `${path} loads`);
}
await page.goto(`${BASE}/en`, { waitUntil: "networkidle" });
for (const href of ["/en/privacy", "/en/terms"]) {
  check((await page.locator(`footer a[href="${href}"]`).count()) > 0, `the footer links ${href}`);
}
check((await page.locator('footer a[href*="/portal/hospital"]').count()) === 0, "no 'Hospital login' while the hospital portal is not open");

// The treatments page draws icons, never their names.
await page.goto(`${BASE}/en/treatments`, { waitUntil: "networkidle" });
const cardText = await page.locator("main").innerText();
check(!/\n(heart|ribbon|bone|brain)\n/.test(`\n${cardText}\n`), "treatment cards show icons, not icon names");

// Missing pages are 404, branded, in the visitor's language.
for (const [path, needle] of [["/en/no-such-page", "find that page"], ["/ru/no-such-page", "Такой страницы нет"], ["/wp-login.php", ""]]) {
  const response = await page.goto(BASE + path, { waitUntil: "networkidle" });
  check(response.status() === 404, `${path} is a 404`, String(response.status()));
  if (needle) check(await page.getByText(needle).first().isVisible(), `${path} says so in its language`);
}

// Security headers on every response.
const headers = (await page.request.get(`${BASE}/en`)).headers();
for (const name of ["strict-transport-security", "x-frame-options", "x-content-type-options", "referrer-policy", "content-security-policy", "permissions-policy"]) {
  check(Boolean(headers[name]), `header ${name}`, headers[name] ?? "missing");
}

// A forged host never becomes a redirect target.
const forged = await page.request.get(`${BASE}/`, { headers: { "x-forwarded-host": "evil.example" }, maxRedirects: 0 });
check(!/evil\.example/.test(forged.headers().location ?? ""), "a forged X-Forwarded-Host is not followed", forged.headers().location ?? "");

// The sitemap lists the pages with their language versions.
const sitemap = await page.request.get(`${BASE}/sitemap.xml`);
check(sitemap.ok() && /hreflang/.test(await sitemap.text()), "sitemap.xml exists with hreflang links");

// Health check answers.
const health = await page.request.get(`${BASE}/api/health`);
check([200, 503].includes(health.status()) && "ok" in (await health.json()), "/api/health answers", String(health.status()));

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
