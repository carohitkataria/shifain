/**
 * Checks on an upload before it costs memory or is trusted. Pure, so it is
 * tested without a server.
 *
 * - A request whose declared size is already over the limit is refused
 *   before its body is read.
 * - A file's type is taken from its first bytes, not from what the browser
 *   (or a script) claims: a "PDF" that is not one is stored as a plain file,
 *   so it is never shown inline or sent to the AI as a document.
 */

/** True when the declared body size is over the limit (no header: left to the framework's own cap). */
export function declaredTooLarge(headers: { get(name: string): string | null }, limitBytes: number): boolean {
  const declared = Number(headers.get("content-length") ?? "");
  return Number.isFinite(declared) && declared > limitBytes;
}

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  bytes.length >= offset + signature.length && signature.every((value, index) => bytes[offset + index] === value);

const ascii = (bytes: Uint8Array, from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));

/** The type the file's own bytes show, or null when it is none of the kinds patients send. */
export function sniffMediaType(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf"; // %PDF-
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a") return "image/gif";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  if (ascii(bytes, 4, 8) === "ftyp") {
    const brand = ascii(bytes, 8, 12);
    if (/^(heic|heix|hevc|hevx|heim|heis)$/.test(brand)) return "image/heic";
    if (/^(mif1|msf1)$/.test(brand)) return "image/heif";
  }
  return null;
}

/** What to store and treat the file as: its sniffed type, else a plain download. */
export function trustedMediaType(bytes: Uint8Array): string {
  return sniffMediaType(bytes) ?? "application/octet-stream";
}
