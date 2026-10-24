/**
 * Drives the owner console in a real browser: the section rail, a drawer
 * opened from the address bar, and the website editor's draft and sections.
 *
 * Needs a running server and a browser:
 *
 *   npm i --no-save playwright-core
 *   ADMIN_PASSWORD=... ADMIN_SECRET=... MONGODB_URI=<a disposable database> npm start &
 *   ADMIN_PASSWORD=... node scripts/test/admin-panel.mjs
 *
 * Point MONGODB_URI somewhere disposable — the run saves a homepage draft.
 */
import { chromium } from "playwright-core";

// localhost, not 127.0.0.1: Next aliases the loopback IP to "localhost" in
// its own redirects, and a page served from one spelling fetching the other is
// a cross-origin request as far as the browser is concerned.
const BASE = process.env.BASE_URL || "http://localhost:3210";
const PASSWORD = process.env.ADMIN_PASSWORD || "test-admin-password";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;

const check = (ok, label, extra = "") => {
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${extra ? ` :: ${extra}` : ""}`);
};

const SECTIONS = ["Home", "Cases", "Care desk", "Catalogue", "Partners", "Providers", "Website", "Reports", "Settings"];

for (const width of [390, 1280]) {
  const context = await browser.newContext({ viewport: { width, height: 950 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto(`${BASE}/admin/login`);
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL((url) => !url.pathname.endsWith("/login")), page.click('button[type="submit"]')]);

  if (width >= 768) {
    for (const name of SECTIONS) check((await page.locator(`aside[aria-label="Main sections"] a[title="${name}"]`).count()) === 1, `${width}px  rail has ${name}`);
  } else {
    check(await page.locator('nav[aria-label="Main"] >> text=More').isVisible(), `${width}px  bottom bar has More`);
    await page.click('nav[aria-label="Main"] >> text=More');
    for (const name of SECTIONS) check((await page.locator(`#console-drawer a:has-text("${name}")`).count()) > 0, `${width}px  More sheet has ${name}`);
  }

  await page.goto(`${BASE}/admin?d=notifs`);
  check((await page.locator("#drawer-title").textContent()) === "Notifications", `${width}px  a drawer opens from the address bar`);
  await page.keyboard.press("Escape");
  await page.waitForURL((url) => !url.search.includes("d="));
  check(true, `${width}px  Escape closes it`);

  await page.goto(`${BASE}/admin/website`);
  await page.click('button:has-text("Sections"), button:has(svg) >> nth=-1').catch(() => undefined);
  await page.locator('button[aria-label^="Show "][role="switch"]').first().click();
  await page.waitForSelector("text=/unpublished change/", { timeout: 10000 }).catch(() => undefined);
  check((await page.locator("text=/unpublished change/").count()) > 0, `${width}px  hiding a section is an unpublished change`);
  await page.locator('button[aria-label^="Show "][role="switch"]').first().click();

  check(errors.length === 0, `${width}px  no page errors`, errors.join(" | "));
  await context.close();
}

await browser.close();
if (bad) {
  console.error(`${bad} check(s) failed`);
  process.exit(1);
}
console.log("console checks passed");
