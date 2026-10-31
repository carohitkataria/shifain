/**
 * The chat's voice-clip length check (src/lib/audio-duration.ts): real
 * browser recordings read right, and a file that lies about its clock is
 * still measured by the sound it holds.
 *
 *   node --experimental-strip-types scripts/test/audio-duration.test.mts
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { audioSeconds, opusPacketMs } from "../../src/lib/audio-duration.ts";

const fixture = async (name: string) => new Uint8Array(await readFile(path.join(import.meta.dirname, "fixtures", name)));
const near = (actual: number | null, expected: number, slack: number, label: string) =>
  assert.ok(actual !== null && Math.abs(actual - expected) <= slack, `${label}: ${actual} is not about ${expected}`);

// Two-second recordings from Chromium's MediaRecorder.
near(audioSeconds(await fixture("clip.webm")), 2, 0.6, "WebM/Opus");
near(audioSeconds(await fixture("clip.mp4")), 2, 0.6, "MP4");

// Opus TOC bytes (RFC 6716): 20 ms CELT, 60 ms SILK, two frames, a counted packet.
assert.equal(opusPacketMs(Uint8Array.of(0x98)), 20);
assert.equal(opusPacketMs(Uint8Array.of(0x18)), 60);
assert.equal(opusPacketMs(Uint8Array.of(0x99)), 40);
assert.equal(opusPacketMs(Uint8Array.of(0x9b, 0x05)), 100);

// ---------------------------------------------------------------- a WebM that says it lasts no time at all
const bytes = (...parts: (number | number[] | Uint8Array)[]) => Uint8Array.from(parts.flatMap((part) => (typeof part === "number" ? [part] : [...part])));
const size = (n: number) => (n < 0x7f ? [0x80 | n] : [0x40 | (n >> 8), n & 0xff]);
const element = (id: number[], body: Uint8Array) => bytes(id, size(body.length), body);
const UNKNOWN = [0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
function webm(codec: string, blocks: number): Uint8Array {
  const header = element([0x1a, 0x45, 0xdf, 0xa3], element([0x42, 0x82], new TextEncoder().encode("webm")));
  const tracks = element([0x16, 0x54, 0xae, 0x6b], element([0xae], element([0x86], new TextEncoder().encode(codec))));
  // Every block stamped at time 0, each holding a 20 ms Opus packet.
  const block = element([0xa3], bytes(0x81, 0x00, 0x00, 0x80, 0x98, 0x00, 0x00));
  const cluster = bytes([0x1f, 0x43, 0xb6, 0x75], UNKNOWN, element([0xe7], bytes(0x00)), ...Array(blocks).fill(block));
  return bytes(header, [0x18, 0x53, 0x80, 0x67], UNKNOWN, tracks, cluster);
}
near(audioSeconds(webm("A_OPUS", 100)), 2, 0.01, "timestamps of zero, 100 packets of 20 ms");
near(audioSeconds(webm("A_OPUS", 4000)), 80, 0.01, "an 80-second clip claiming 0 s is still 80 s");
assert.equal(audioSeconds(webm("A_VORBIS", 100)), null, "another codec cannot be counted: not verifiable");

// ---------------------------------------------------------------- an Ogg whose clock says one second
function page(granule: number, packets: Uint8Array[]): Uint8Array {
  const lacing = packets.flatMap((packet) => [...Array(Math.floor(packet.length / 255)).fill(255), packet.length % 255]);
  const head = new Uint8Array(27);
  head.set(new TextEncoder().encode("OggS"));
  new DataView(head.buffer).setBigInt64(6, BigInt(granule), true);
  head[26] = lacing.length;
  return bytes(head, lacing, ...packets);
}
const opusHead = bytes(new TextEncoder().encode("OpusHead"), 1, 1, 0, 0, 0x80, 0xbb, 0, 0, 0, 0, 0);
const opusTags = bytes(new TextEncoder().encode("OpusTags"), 0, 0, 0, 0, 0, 0, 0, 0);
const sound = (count: number) => Array.from({ length: count }, () => bytes(0x98, 0x01, 0x02));
const pages = [page(0, [opusHead]), page(0, [opusTags])];
for (let i = 0; i < 40; i++) pages.push(page(48_000, sound(100))); // 40 × 100 × 20 ms = 80 s, granule says 1 s
near(audioSeconds(bytes(...pages)), 80, 0.01, "Ogg: the packets, not the granule");
near(audioSeconds(bytes(page(0, [opusHead]), page(0, [opusTags]), page(96_000, sound(100)))), 2, 0.01, "Ogg: an honest two seconds");
assert.equal(audioSeconds(bytes(page(0, [bytes(new TextEncoder().encode("\u0001vorbis"))]), page(48_000, sound(10)))), null, "Ogg without Opus");

// Anything else is not verifiable.
assert.equal(audioSeconds(Uint8Array.of(1, 2, 3, 4, 5, 6, 7, 8, 9)), null);
assert.equal(audioSeconds(new Uint8Array(0)), null);

console.log("audio duration: recordings, Opus packets and lying clocks pass");
