/**
 * The request-safety rules from the November audit: who is asking, where
 * redirects may go, what a CSV cell may contain, what a file really is, and
 * how sign-in slows down. All pure, so no server is needed.
 */
import assert from "node:assert/strict";
import { clientIpFrom, isAllowedHost, publicOriginFrom } from "../../src/lib/request-meta.ts";
import { csvCell } from "../../src/lib/csv.ts";
import { declaredTooLarge, sniffMediaType, trustedMediaType } from "../../src/lib/upload-guard.ts";
import { recentHits, recordHit, slowdownMs } from "../../src/lib/rate-limit.ts";

const headers = (values: Record<string, string>) => ({ get: (name: string) => values[name.toLowerCase()] ?? null });

// ---- client address: Cloudflare's header first; never the caller's own first X-Forwarded-For value
assert.equal(clientIpFrom(headers({ "true-client-ip": "203.0.113.7", "x-forwarded-for": "1.1.1.1, 203.0.113.7" }), {}), "203.0.113.7");
assert.equal(clientIpFrom(headers({ "cf-connecting-ip": "198.51.100.4" }), {}), "198.51.100.4");
assert.equal(clientIpFrom(headers({ "x-forwarded-for": "6.6.6.6, 198.51.100.9" }), {}), "198.51.100.9"); // the proxy's entry, not the forged one
assert.equal(clientIpFrom(headers({ "x-forwarded-for": "6.6.6.6, 198.51.100.9, 10.0.0.2" }), { TRUSTED_PROXY_HOPS: "1" }), "198.51.100.9");
assert.equal(clientIpFrom(headers({ "true-client-ip": "<script>" }), {}), "unknown"); // junk is not an address
assert.equal(clientIpFrom(headers({}), {}), "unknown");

// ---- hosts: a forged X-Forwarded-Host never becomes a redirect target
assert.ok(isAllowedHost("shifain.com", {}));
assert.ok(isAllowedHost("www.shifain.com", {}));
assert.ok(isAllowedHost("shifain-preview.onrender.com", {}));
assert.ok(isAllowedHost("localhost:3000", {}));
assert.ok(!isAllowedHost("evil.example", {}));
assert.ok(!isAllowedHost("shifain.com.evil.example", {}));
assert.ok(!isAllowedHost("evilshifain.com", {}));
assert.ok(isAllowedHost("care.example.org", { ALLOWED_HOSTS: "care.example.org" }));
assert.equal(publicOriginFrom(headers({ "x-forwarded-host": "evil.example", host: "shifain-preview.onrender.com" }), "http://localhost:10000", {}), "https://shifain-preview.onrender.com");
assert.equal(publicOriginFrom(headers({ "x-forwarded-host": "evil.example", host: "evil.example" }), "http://localhost:10000", {}), "http://localhost:10000");
assert.equal(publicOriginFrom(headers({ "x-forwarded-host": "evil.example" }), "http://x", { BASE_URL: "https://shifain.com/" }), "https://shifain.com");
assert.equal(publicOriginFrom(headers({ host: "shifain.com", "x-forwarded-proto": "http" }), "http://x", {}), "https://shifain.com"); // never downgraded

// ---- CSV: text that a spreadsheet would run as a formula stays text
assert.equal(csvCell("=HYPERLINK(\"http://x\")"), "\"'=HYPERLINK(\"\"http://x\"\")\"");
assert.equal(csvCell("+998 90 123"), "'+998 90 123");
assert.equal(csvCell("@sum"), "'@sum");
assert.equal(csvCell("-1+2"), "'-1+2");
assert.equal(csvCell(-1500), "-1500"); // a number is a number
assert.equal(csvCell("Aziz, Karimov"), "\"Aziz, Karimov\"");
assert.equal(csvCell(null), "");

// ---- files: the bytes decide the type
const bytes = (...values: (number | string)[]) => new Uint8Array(values.flatMap((value) => (typeof value === "string" ? [...value].map((c) => c.charCodeAt(0)) : [value])));
assert.equal(sniffMediaType(bytes("%PDF-1.7")), "application/pdf");
assert.equal(sniffMediaType(bytes(0x89, "PNG", 0x0d, 0x0a, 0x1a, 0x0a)), "image/png");
assert.equal(sniffMediaType(bytes(0xff, 0xd8, 0xff, 0xe0)), "image/jpeg");
assert.equal(sniffMediaType(bytes("RIFF", 0, 0, 0, 0, "WEBP")), "image/webp");
assert.equal(sniffMediaType(bytes(0, 0, 0, 24, "ftypheic")), "image/heic");
assert.equal(sniffMediaType(bytes("<html><script>")), null); // an "x.pdf" that is a web page
assert.equal(trustedMediaType(bytes("MZ")), "application/octet-stream");
assert.ok(declaredTooLarge(headers({ "content-length": "50000000" }), 27 * 1024 * 1024));
assert.ok(!declaredTooLarge(headers({ "content-length": "1000" }), 27 * 1024 * 1024));
assert.ok(!declaredTooLarge(headers({}), 1)); // no header: the framework's own cap applies

// ---- sign-in: guessing slows down; nobody is locked out
assert.equal(slowdownMs(0), 0);
assert.equal(slowdownMs(5), 0);
assert.equal(slowdownMs(6), 300);
assert.equal(slowdownMs(100), 3000);
recordHit("test-fail", 60_000);
recordHit("test-fail", 60_000);
assert.equal(recentHits("test-fail", 60_000), 2);
assert.equal(recentHits("never-seen", 60_000), 0);

console.log("request safety: client address, allowed hosts, CSV cells, file signatures, sign-in slowdown pass");
