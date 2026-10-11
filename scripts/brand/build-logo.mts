/**
 * Writes the logo files the site serves, from the vector artwork in
 * src/components/brand-art.ts:
 *
 *   public/brand/*.svg      mark, wordmark and stacked logo, light and dark
 *   src/app/icon.svg        the favicon
 *   PNGs (with --png)       apple-icon, app icons and the link preview image,
 *                           rendered with Playwright's Chromium
 *
 *   node --experimental-strip-types scripts/brand/build-logo.mts [--png]
 */
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import {
  BRAND_COLOURS as C,
  IN_BANDS,
  IN_X,
  MARK_PATHS,
  MARK_VIEWBOX,
  WORDMARK_IN,
  WORDMARK_SHIFA,
  WORDMARK_VIEWBOX,
} from "../../src/components/brand-art.ts";

const root = process.cwd();
const out = (...parts: string[]) => path.join(root, ...parts);

type Tone = "light" | "dark";

function markBody(tone: Tone): string {
  const blue = tone === "dark" ? C.blueOnDark : C.blue;
  return [
    `<path fill="#fff" d="${MARK_PATHS.white}"/>`,
    `<path fill="${blue}" d="${MARK_PATHS.blue}"/>`,
    `<path fill="${C.green}" d="${MARK_PATHS.green}"/>`,
    `<path fill="${C.orange}" d="${MARK_PATHS.orange}"/>`,
  ].join("");
}

function wordBody(tone: Tone): string {
  const shifa = tone === "dark" ? "#fff" : C.blue;
  const { top, orangeEnd, whiteEnd, bottom } = IN_BANDS;
  const width = IN_X.end - IN_X.start;
  return [
    `<defs><clipPath id="shifain-in"><path d="${WORDMARK_IN}"/></clipPath></defs>`,
    `<path fill="${shifa}" d="${WORDMARK_SHIFA}"/>`,
    `<g clip-path="url(#shifain-in)">`,
    `<rect x="${IN_X.start}" y="${top}" width="${width}" height="${orangeEnd - top}" fill="${C.orange}"/>`,
    `<rect x="${IN_X.start}" y="${orangeEnd}" width="${width}" height="${whiteEnd - orangeEnd}" fill="#fff"/>`,
    `<rect x="${IN_X.start}" y="${whiteEnd}" width="${width}" height="${bottom - whiteEnd}" fill="${C.green}"/>`,
    `</g>`,
    // Only the white band needs an edge, and only on a light background.
    tone === "light"
      ? `<g clip-path="url(#shifain-in)"><path d="${WORDMARK_IN}" fill="none" stroke="${C.rim}" stroke-width="7"/></g>`
      : "",
  ].join("");
}

const box = (viewBox: string) => viewBox.split(" ").map(Number);

function svg(viewBox: string, body: string, title = "ShifaIn"): string {
  const [, , w, h] = box(viewBox);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${Math.round(w)}" height="${Math.round(h)}" role="img" aria-label="${title}"><title>${title}</title>${body}</svg>\n`;
}

/** Mark above wordmark, centred, as on the sign. */
function stackedViewBox(): { viewBox: string; markShift: number } {
  const [mx, my, mw] = box(MARK_VIEWBOX);
  const [wx, wy, ww, wh] = box(WORDMARK_VIEWBOX);
  // Centre the mark over the wordmark.
  const markShift = wx + ww / 2 - (mx + mw / 2);
  return { viewBox: `${wx} ${my} ${ww} ${wy + wh - my}`, markShift };
}

/** Mark beside wordmark, for headers. The wordmark is scaled to sit on the mark's lower half. */
function horizontal(tone: Tone): string {
  const [mx, my, mw, mh] = box(MARK_VIEWBOX);
  const [wx, wy, ww, wh] = box(WORDMARK_VIEWBOX);
  const scale = (mh * 0.62) / wh;
  const gap = mh * 0.12;
  const x = mx + mw + gap;
  const y = my + mh - wh * scale - mh * 0.06;
  const width = mw + gap + ww * scale;
  return svg(
    `${mx} ${my} ${width.toFixed(1)} ${mh}`,
    markBody(tone) + `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(4)}) translate(${-wx} ${-wy})">${wordBody(tone)}</g>`,
  );
}

/** The mark alone on a square, for icons. */
function squareMark(size: number, background: string | null, padding = 0.12): string {
  const [mx, my, mw, mh] = box(MARK_VIEWBOX);
  const side = Math.max(mw, mh) / (1 - padding * 2);
  const ox = mx - (side - mw) / 2;
  const oy = my - (side - mh) / 2;
  const bg = background ? `<rect x="${ox}" y="${oy}" width="${side}" height="${side}" fill="${background}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ox.toFixed(1)} ${oy.toFixed(1)} ${side.toFixed(1)} ${side.toFixed(1)}" width="${size}" height="${size}">${bg}${markBody("light")}</svg>\n`;
}

await mkdir(out("public", "brand"), { recursive: true });
const files: Record<string, string> = {
  "public/brand/shifain-mark.svg": svg(MARK_VIEWBOX, markBody("light")),
  "public/brand/shifain-mark-dark.svg": svg(MARK_VIEWBOX, markBody("dark")),
  "public/brand/shifain-wordmark.svg": svg(WORDMARK_VIEWBOX, wordBody("light")),
  "public/brand/shifain-wordmark-dark.svg": svg(WORDMARK_VIEWBOX, wordBody("dark")),
  "public/brand/shifain-logo-horizontal.svg": horizontal("light"),
  "public/brand/shifain-logo-horizontal-dark.svg": horizontal("dark"),
  "src/app/icon.svg": squareMark(64, null, 0.04),
};
{
  const { viewBox, markShift } = stackedViewBox();
  files["public/brand/shifain-logo.svg"] = svg(viewBox, `<g transform="translate(${markShift.toFixed(1)} 0)">${markBody("light")}</g>${wordBody("light")}`);
  files["public/brand/shifain-logo-dark.svg"] = svg(viewBox, `<g transform="translate(${markShift.toFixed(1)} 0)">${markBody("dark")}</g>${wordBody("dark")}`);
}
for (const [file, body] of Object.entries(files)) {
  await writeFile(out(file), body);
  console.log(`${file}  ${(body.length / 1024).toFixed(1)} KB`);
}

if (process.argv.includes("--png")) {
  // Playwright is not a dependency of the site; a global install works too (NODE_PATH).
  const { chromium } = (await import("playwright").catch(() => createRequire(import.meta.url)("playwright"))) as typeof import("playwright");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const shoot = async (html: string, w: number, h: number, file: string) => {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<html><body style="margin:0">${html}</body></html>`);
    await page.screenshot({ path: out(file), clip: { x: 0, y: 0, width: w, height: h } });
    console.log(file);
  };
  const icon = (size: number) => squareMark(size, "#ffffff", 0.14).replace("<svg ", '<svg style="display:block" ');
  await shoot(icon(180), 180, 180, "src/app/apple-icon.png");
  await shoot(icon(192), 192, 192, "public/brand/icon-192.png");
  await shoot(icon(512), 512, 512, "public/brand/icon-512.png");
  const logo = files["public/brand/shifain-logo.svg"].replace("<svg ", '<svg style="height:430px;width:auto;display:block" ');
  await shoot(
    `<div style="width:1200px;height:630px;display:flex;align-items:center;justify-content:center;background:#fff">${logo}</div>`,
    1200,
    630,
    "public/brand/og-image.png",
  );
  await browser.close();
}
