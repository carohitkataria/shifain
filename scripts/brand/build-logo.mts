/**
 * Writes the logo files the site serves, from the approved logo artwork
 * (scripts/brand/shifain-logo-source.webp: mark, "shifain" wordmark and the
 * "Trusted medical journey" strapline on white):
 *
 *   public/brand/shifain-mark(-dark).png       the lotus, aircraft and cross
 *   public/brand/shifain-wordmark(-dark).png   "shifain" with the orange i and green n
 *   public/brand/shifain-logo(-dark).png       the whole logo, strapline included
 *   src/app/icon.png, src/app/apple-icon.png   favicons
 *   public/brand/icon-192.png, icon-512.png    app icons
 *   public/brand/og-image.png                  the link preview
 *
 * The white is taken out so the logo sits on any background. Dark versions
 * turn the purple "shifa" white and lift the mark's colours, for the footer.
 *
 *   node --experimental-strip-types scripts/brand/build-logo.mts
 */
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const out = (...parts: string[]) => path.join(root, ...parts);
const SOURCE = out("scripts/brand/shifain-logo-source.webp");

/** Where each part sits in the source artwork (2000 × 667). */
const BOX = {
  mark: { left: 150, top: 128, width: 595, height: 412 },
  wordmark: { left: 762, top: 164, width: 1046, height: 302 },
  logo: { left: 150, top: 128, width: 1716, height: 412 },
};

type Raw = { data: Buffer; width: number; height: number };

async function load(): Promise<Raw> {
  const { data, info } = await sharp(SOURCE).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** White to transparent; edge pixels keep their true colour. */
function knockOutWhite(src: Raw): Buffer {
  const { data, width, height } = src;
  const rgba = Buffer.alloc(width * height * 4);
  const LOW = 6;
  const HIGH = 44;
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const distance = Math.max(255 - r, 255 - g, 255 - b);
    const alpha = Math.min(1, Math.max(0, (distance - LOW) / (HIGH - LOW)));
    const unmix = (c: number) => (alpha > 0 ? Math.min(255, Math.max(0, Math.round((c - 255 * (1 - alpha)) / alpha))) : 0);
    rgba[j] = unmix(r);
    rgba[j + 1] = unmix(g);
    rgba[j + 2] = unmix(b);
    rgba[j + 3] = Math.round(alpha * 255);
  }
  return rgba;
}

const isPurple = (r: number, g: number, b: number) => b > g + 40 && b >= r;

/** For dark backgrounds: purple letters become white, the mark's colours are lifted. */
function darken(rgba: Buffer, part: "mark" | "wordmark" | "logo", width: number, wordStart: number): Buffer {
  const result = Buffer.from(rgba);
  for (let j = 0; j < result.length; j += 4) {
    const r = result[j];
    const g = result[j + 1];
    const b = result[j + 2];
    const x = (j / 4) % width;
    const inWord = part === "wordmark" || (part === "logo" && x >= wordStart);
    if (inWord && isPurple(r, g, b)) {
      result[j] = result[j + 1] = result[j + 2] = 255;
    } else if (inWord && part === "logo" && Math.abs(r - g) < 40 && b > r && b - r < 70) {
      // The slate strapline, lightened.
      result[j] = 205;
      result[j + 1] = 214;
      result[j + 2] = 230;
    } else if (!inWord) {
      const lift = isPurple(r, g, b) ? 0.38 : 0.12;
      result[j] = Math.round(r + (255 - r) * lift);
      result[j + 1] = Math.round(g + (255 - g) * lift);
      result[j + 2] = Math.round(b + (255 - b) * lift);
    }
  }
  return result;
}

async function crop(rgba: Buffer, src: Raw, box: (typeof BOX)[keyof typeof BOX]): Promise<{ data: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(rgba, { raw: { width: src.width, height: src.height, channels: 4 } })
    .extract(box)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

async function writePng(part: { data: Buffer; width: number; height: number }, file: string, height?: number) {
  let image = sharp(part.data, { raw: { width: part.width, height: part.height, channels: 4 } });
  if (height) image = image.resize({ height });
  const info = await image.png({ compressionLevel: 9, palette: false }).toFile(out(file));
  console.log(`${file}  ${info.width}×${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
  return info;
}

/** The mark centred on a square, for icons. */
async function squareIcon(mark: { data: Buffer; width: number; height: number }, size: number, background: string | null, file: string) {
  const inner = Math.round(size * (background ? 0.8 : 0.96));
  const resized = await sharp(mark.data, { raw: { width: mark.width, height: mark.height, channels: 4 } })
    .resize({ width: inner, height: inner, fit: "inside" })
    .png()
    .toBuffer();
  const info = await sharp({
    create: { width: size, height: size, channels: 4, background: background ?? { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(out(file));
  console.log(`${file}  ${info.width}×${info.height}`);
}

const src = await load();
const clear = knockOutWhite(src);

const mark = await crop(clear, src, BOX.mark);
const wordmark = await crop(clear, src, BOX.wordmark);
const logo = await crop(clear, src, BOX.logo);
const wordStart = BOX.wordmark.left - BOX.logo.left;

// Served at up to ~56px tall in the header; three times that stays sharp on any screen.
await writePng(mark, "public/brand/shifain-mark.png", 240);
await writePng({ ...mark, data: darken(mark.data, "mark", mark.width, 0) }, "public/brand/shifain-mark-dark.png", 240);
await writePng(wordmark, "public/brand/shifain-wordmark.png", 150);
await writePng({ ...wordmark, data: darken(wordmark.data, "wordmark", wordmark.width, 0) }, "public/brand/shifain-wordmark-dark.png", 150);
await writePng(logo, "public/brand/shifain-logo.png", 300);
await writePng({ ...logo, data: darken(logo.data, "logo", logo.width, wordStart) }, "public/brand/shifain-logo-dark.png", 300);

await squareIcon(mark, 64, null, "src/app/icon.png");
await squareIcon(mark, 180, "#ffffff", "src/app/apple-icon.png");
await squareIcon(mark, 192, "#ffffff", "public/brand/icon-192.png");
await squareIcon(mark, 512, "#ffffff", "public/brand/icon-512.png");

const preview = await sharp(logo.data, { raw: { width: logo.width, height: logo.height, channels: 4 } })
  .resize({ width: 1000 })
  .png()
  .toBuffer();
const og = await sharp({ create: { width: 1200, height: 630, channels: 4, background: "#ffffff" } })
  .composite([{ input: preview, gravity: "center" }])
  .png({ compressionLevel: 9 })
  .toFile(out("public/brand/og-image.png"));
console.log(`public/brand/og-image.png  ${og.width}×${og.height}`);
