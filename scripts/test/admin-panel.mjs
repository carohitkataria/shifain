/**
 * Drives the owner console in a real browser: the sidebar, the section
 * visibility controls, and the add/remove that repeatable lists depend on.
 *
 * Needs a running server and a browser:
 *
 *   npm i --no-save playwright-core
 *   ADMIN_PASSWORD=... ADMIN_SECRET=... SHIFAIN_CONTENT_PATH=/tmp/panel.json npm start &
 *   ADMIN_PASSWORD=... node scripts/test/admin-panel.mjs
 *
 * Point SHIFAIN_CONTENT_PATH somewhere disposable — the run edits content.
 */
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3210";
const PASSWORD = process.env.ADMIN_PASSWORD || "test-admin-password";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
/** A server-action navigation swaps the React tree, so wait for it to settle. */
const settle = (page, expected) =>
  page
    .waitForFunction(
      (n) => document.querySelectorAll('button[aria-label^="Remove badge"]').length === n,
      expected,
      { timeout: 10000 },
    )
    .catch(() => undefined);

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

  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL(/\/admin$/), page.click('button[type="submit"]')]);

  // Two brand blocks exist, one per breakpoint; only the visible one counts.
  const owner = await page.locator("text=Owner console").locator("visible=true").count() === 1;
  check(owner, `${width}px  header shows the owner console branding`);

  if (width === 390) await page.click('button[aria-controls="admin-nav"]');

  for (const heading of ["Overview", "Site content", "Patients & partners"]) {
    check(await page.locator(`#admin-nav button:has-text("${heading}")`).count() > 0, `${width}px  sidebar group "${heading}"`);
  }

  // Groups fold away and the choice is remembered.
  const contentGroup = page.locator('#admin-nav button:has-text("Site content")');
  const before = await page.locator('#admin-nav a:has-text("Brand & tagline")').count();
  await contentGroup.click();
  const after = await page.locator('#admin-nav a:has-text("Brand & tagline")').count();
  check(before === 1 && after === 0, `${width}px  a sidebar group folds away`);
  await page.reload({ waitUntil: "networkidle" });
  if (width === 390) await page.click('button[aria-controls="admin-nav"]');
  check(
    await page.locator('#admin-nav a:has-text("Brand & tagline")').count() === 0,
    `${width}px  the folded group is still folded after a reload`,
  );
  await page.locator('#admin-nav button:has-text("Site content")').click();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 0, `${width}px  no horizontal overflow`, `${overflow}px`);
  check(errors.length === 0, `${width}px  no console errors`, errors[0] ?? "");
  await context.close();
}

// The editing flow, in full.
const context = await browser.newContext({ viewport: { width: 1280, height: 950 } });
const page = await context.newPage();
await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
await page.fill('input[name="password"]', PASSWORD);
await Promise.all([page.waitForURL(/\/admin$/), page.click('button[type="submit"]')]);

// Section visibility row on the overview.
check(await page.locator('text=Section visibility').isVisible(), "overview has the section visibility row");
const boxes = await page.locator('#layout-form input[type="checkbox"]').count();
check(boxes > 10, "every section has a visibility checkbox", `${boxes} boxes`);

await page.goto(`${BASE}/admin/hero`, { waitUntil: "networkidle" });
check(await page.locator('button:has-text("Save hero")').first().isVisible(), "the save pill sits beside the page title");

// Add an item to a list, then confirm it survived and can be removed.
const addButton = page.locator('button:has-text("Add badge")').first();
const hasList = await addButton.count() > 0;
check(hasList, "a repeatable list offers an Add button");

if (hasList) {
  const beforeCount = await page.locator('button[aria-label^="Remove badge"]').count();
  // Type into a field first: the add must not discard it.
  const firstInput = page.locator('input[name="hero.badges.0.label.en"]');
  await firstInput.fill("Edited before adding");
  await Promise.all([page.waitForURL(/saved=added/), addButton.click()]);
  await settle(page, beforeCount + 1);

  const afterCount = await page.locator('button[aria-label^="Remove badge"]').count();
  check(afterCount === beforeCount + 1, "Add appends one entry", `${beforeCount} -> ${afterCount}`);
  check(
    (await page.locator('input[name="hero.badges.0.label.en"]').inputValue()) === "Edited before adding",
    "Add saves the edit that was in progress rather than discarding it",
  );

  await Promise.all([
    page.waitForURL(/saved=removed/),
    page.locator(`button[aria-label="Remove badge ${afterCount}"]`).click(),
  ]);
  await settle(page, beforeCount);
  check(
    (await page.locator('button[aria-label^="Remove badge"]').count()) === beforeCount,
    "Remove deletes exactly one entry",
  );
}

// Section visibility on a group page round-trips. Reload between steps: the
// URL already says "saved", so waiting on it again would not wait at all.
// Start each round from the clean URL: a save lands on ?saved=1, so waiting
// for that while already on ?saved=1 would not wait at all.
const setVisible = async (want) => {
  await page.goto(`${BASE}/admin/hero`, { waitUntil: "networkidle" });
  await page.setChecked('input[name="__visible"]', want);
  await Promise.all([
    page.waitForURL(/saved=1/),
    page.locator('button:has-text("Save hero")').first().click(),
  ]);
  await page.goto(`${BASE}/admin/hero`, { waitUntil: "networkidle" });
  return page.isChecked('input[name="__visible"]');
};
check((await setVisible(false)) === false, "hiding a section from its own page sticks");
check((await setVisible(true)) === true, "and showing it again sticks");

// A generated password is handed over in a flash cookie. Rendering that state
// once crashed the page: it cleared the cookie mid-render, which Next.js
// forbids. No database needed to exercise it — just the cookie.
const flash = Buffer.from(
  JSON.stringify({ email: "dr@example.com", password: "not-a-real-password" }),
).toString("base64url");
await context.addCookies([
  { name: "shifain_partner_secret", value: flash, domain: "127.0.0.1", path: "/admin" },
]);
const flashResponse = await page.goto(`${BASE}/admin/access`, { waitUntil: "networkidle" });
check(flashResponse.status() === 200, "the generated-password banner renders", `status ${flashResponse.status()}`);
check(await page.locator("text=not-a-real-password").isVisible(), "it shows the password once");
await page.locator('button:has-text("Done")').click();
const cleared = await page
  .locator("text=not-a-real-password")
  .waitFor({ state: "detached", timeout: 10000 })
  .then(() => true)
  .catch(() => false);
check(cleared, "and Done clears it without a server error");

await page.goto(`${BASE}/admin/cases`, { waitUntil: "networkidle" });
check(await page.locator("h1:has-text('Patient cases')").isVisible(), "the cases page loads");
check(await page.locator("text=MONGODB_URI is not set").isVisible(), "cases says the database is not configured instead of erroring");

await browser.close();
console.log(bad === 0 ? "\nALL CHECKS PASSED" : `\n${bad} CHECK(S) FAILED`);
process.exit(bad === 0 ? 0 : 1);
