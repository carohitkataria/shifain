/**
 * How long a recorded voice clip is, read from the file itself rather than
 * from what the browser says — so the chat's one-minute cap holds for any
 * caller, and transcription is only ever paid for short clips.
 *
 * Covers what browsers' MediaRecorder writes: WebM (Chrome, Edge, Firefox,
 * Android), MP4, fragmented or not (Safari, iOS, newer Chrome), and Ogg.
 * Null when the container is something else or cannot be read; callers treat
 * that as "not verifiable". Pure, no dependencies.
 *
 * A clip's timestamps are only what the file claims, so the audio is also
 * counted: each Opus packet in WebM says how long it plays (its TOC byte), and
 * an MP4's sample count bounds how much sound it holds. The longer of the two
 * is the answer, so a file cannot shrink its length by lying about the clock.
 */
export function audioSeconds(data: Uint8Array): number | null {
  try {
    if (data.length >= 4 && data[0] === 0x1a && data[1] === 0x45 && data[2] === 0xdf && data[3] === 0xa3) return webmSeconds(data);
    if (data.length >= 8 && text(data, 4, 4) === "ftyp") return mp4Seconds(data);
    if (data.length >= 4 && text(data, 0, 4) === "OggS") return oggSeconds(data);
  } catch {
    return null;
  }
  return null;
}

const text = (data: Uint8Array, at: number, length: number) => String.fromCharCode(...data.subarray(at, at + length));

// ---------------------------------------------------------------- WebM (EBML)

const SEGMENT = 0x18538067;
const CLUSTER = 0x1f43b675;
const INFO = 0x1549a966;
const BLOCK_GROUP = 0xa0;
const TIMECODE = 0xe7;
const SIMPLE_BLOCK = 0xa3;
const BLOCK = 0xa1;
const TIMECODE_SCALE = 0x2ad7b1;
const DURATION = 0x4489;
/** Elements whose children are read in place; everything else is skipped by its size. */
const TRACKS = 0x1654ae6b;
const TRACK_ENTRY = 0xae;
const CODEC_ID = 0x86;
const TRANSPARENT = new Set([SEGMENT, CLUSTER, INFO, BLOCK_GROUP, TRACKS, TRACK_ENTRY]);

/** Milliseconds of sound in one Opus packet, from its TOC byte (RFC 6716, section 3.1). */
export function opusPacketMs(packet: Uint8Array): number {
  if (packet.length === 0) return 0;
  const toc = packet[0];
  const config = toc >> 3;
  const frameMs =
    config < 12 ? [10, 20, 40, 60][config % 4] : config < 16 ? [10, 20][config % 2] : [2.5, 5, 10, 20][config % 4];
  const code = toc & 0x03;
  const frames = code === 0 ? 1 : code === 3 ? (packet[1] ?? 0) & 0x3f : 2;
  return frames * frameMs;
}

function vint(data: Uint8Array, at: number, keepMarker: boolean): { value: number; length: number; unknown: boolean } {
  const first = data[at];
  if (first === undefined || first === 0) throw new Error("bad vint");
  let length = 1;
  while (length <= 8 && !(first & (0x80 >> (length - 1)))) length++;
  if (length > 8 || at + length > data.length) throw new Error("bad vint");
  let value = keepMarker ? first : first & (0xff >> length);
  let allOnes = value === 0xff >> length;
  for (let i = 1; i < length; i++) {
    value = value * 256 + data[at + i];
    if (data[at + i] !== 0xff) allOnes = false;
  }
  return { value, length, unknown: !keepMarker && allOnes };
}

const uint = (data: Uint8Array, at: number, size: number) => {
  let value = 0;
  for (let i = 0; i < size; i++) value = value * 256 + data[at + i];
  return value;
};

function webmSeconds(data: Uint8Array): number | null {
  let pos = 0;
  let scale = 1_000_000; // nanoseconds per timecode tick, the WebM default
  let declared = 0;
  let cluster = 0;
  let latest = -1;
  let codec = "";
  let soundMs = 0;
  while (pos < data.length) {
    const id = vint(data, pos, true);
    const size = vint(data, pos + id.length, false);
    const body = pos + id.length + size.length;
    if (TRANSPARENT.has(id.value)) {
      pos = body; // read the children in place (MediaRecorder writes unknown sizes)
      continue;
    }
    if (size.unknown || body + size.value > data.length) break; // a cut-off tail: use what was read
    if (id.value === TIMECODE) cluster = uint(data, body, size.value);
    else if (id.value === TIMECODE_SCALE) scale = uint(data, body, size.value) || scale;
    else if (id.value === CODEC_ID) codec = text(data, body, size.value);
    else if (id.value === DURATION) {
      const view = new DataView(data.buffer, data.byteOffset + body, size.value);
      declared = size.value === 4 ? view.getFloat32(0) : view.getFloat64(0);
    } else if (id.value === SIMPLE_BLOCK || id.value === BLOCK) {
      const track = vint(data, body, false);
      const relative = new DataView(data.buffer, data.byteOffset + body + track.length, 2).getInt16(0);
      latest = Math.max(latest, cluster + relative);
      const flags = data[body + track.length + 2];
      const payload = body + track.length + 3;
      // Laced blocks carry several packets; count each as the longest an Opus packet can be.
      soundMs += flags & 0x06 ? ((data[payload] ?? 0) + 1) * 120 : opusPacketMs(data.subarray(payload, body + size.value));
    }
    pos = body + size.value;
  }
  // Only Opus is counted packet by packet; any other codec in WebM is not verifiable.
  if (codec !== "A_OPUS") return null;
  const ticks = Math.max(latest, declared);
  const claimed = ticks >= 0 ? (ticks * scale) / 1e9 : 0;
  const seconds = Math.max(claimed, soundMs / 1000);
  return seconds > 0 ? seconds : null;
}

// ---------------------------------------------------------------- MP4 (ISO BMFF)

const CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "stbl", "moof", "traf", "mvex", "edts"]);

function mp4Seconds(data: Uint8Array): number | null {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let movie = 0; // mvhd duration in seconds
  let mediaScale = 0;
  let sampleTicks = 0; // stts and trun durations, in the track's timescale
  let defaultDuration = 0;
  let samples = 0;
  let codec = "";

  const walk = (start: number, end: number) => {
    let pos = start;
    while (pos + 8 <= end) {
      let size = view.getUint32(pos);
      const type = text(data, pos + 4, 4);
      let header = 8;
      if (size === 1) {
        size = Number(view.getBigUint64(pos + 8));
        header = 16;
      } else if (size === 0) size = end - pos;
      if (size < header || pos + size > end) break;
      const body = pos + header;
      if (CONTAINERS.has(type)) walk(body, pos + size);
      else if (type === "stsd") codec = text(data, body + 12, 4); // the first sample entry's format
      else if (type === "mvhd") {
        const v1 = data[body] === 1;
        const scale = view.getUint32(body + (v1 ? 20 : 12));
        const duration = v1 ? Number(view.getBigUint64(body + 24)) : view.getUint32(body + 16);
        if (scale) movie = Math.max(movie, duration / scale);
      } else if (type === "mdhd") {
        const v1 = data[body] === 1;
        mediaScale = view.getUint32(body + (v1 ? 20 : 12)) || mediaScale;
      } else if (type === "stts") {
        const entries = view.getUint32(body + 4);
        for (let i = 0; i < entries; i++) {
          samples += view.getUint32(body + 8 + i * 8);
          sampleTicks += view.getUint32(body + 8 + i * 8) * view.getUint32(body + 12 + i * 8);
        }
      } else if (type === "trex") {
        defaultDuration = view.getUint32(body + 12) || defaultDuration;
      } else if (type === "tfhd") {
        const flags = view.getUint32(body) & 0xffffff;
        let at = body + 8; // version/flags, track id
        if (flags & 0x01) at += 8; // base data offset
        if (flags & 0x02) at += 4; // sample description index
        if (flags & 0x08) defaultDuration = view.getUint32(at);
      } else if (type === "trun") {
        const flags = view.getUint32(body) & 0xffffff;
        const count = view.getUint32(body + 4);
        samples += count;
        let at = body + 8;
        if (flags & 0x01) at += 4; // data offset
        if (flags & 0x04) at += 4; // first sample flags
        const perSample = ((flags & 0x100) ? 4 : 0) + ((flags & 0x200) ? 4 : 0) + ((flags & 0x400) ? 4 : 0) + ((flags & 0x800) ? 4 : 0);
        for (let i = 0; i < count; i++) {
          sampleTicks += flags & 0x100 ? view.getUint32(at + i * perSample) : defaultDuration;
        }
      }
      pos += size;
    }
  };
  walk(0, data.length);
  const fromSamples = mediaScale ? sampleTicks / mediaScale : 0;
  // What the samples can hold: AAC frames are 1024 samples at no more than 48 kHz; Opus packets 20 ms or more.
  const counted = codec === "mp4a" ? (samples * 1024) / 48_000 : codec === "Opus" ? samples * 0.02 : null;
  if (counted === null) return null;
  const seconds = Math.max(movie, fromSamples, counted);
  return seconds > 0 ? seconds : null;
}

// ---------------------------------------------------------------- Ogg (Opus, Vorbis)

function oggSeconds(data: Uint8Array): number | null {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let granule = 0;
  let soundMs = 0;
  let packets = 0;
  let opus = false;
  let packet: number[] = [];
  let pos = 0;
  // Page by page: the segment table splits the body into packets (a lacing value under 255 ends one).
  while (pos + 27 <= data.length && text(data, pos, 4) === "OggS") {
    granule = Math.max(granule, Number(view.getBigInt64(pos + 6, true)));
    const segments = data[pos + 26];
    let body = pos + 27 + segments;
    for (let i = 0; i < segments; i++) {
      const lacing = data[pos + 27 + i];
      packet.push(...data.subarray(body, body + lacing));
      body += lacing;
      if (lacing < 255) {
        const bytes = Uint8Array.from(packet);
        if (packets === 0) opus = text(bytes, 0, 8) === "OpusHead";
        else if (packets > 1) soundMs += opusPacketMs(bytes); // after OpusHead and OpusTags
        packets++;
        packet = [];
      }
    }
    pos = body;
  }
  if (!opus) return null;
  // The granule position counts samples at 48 kHz; the packets say what they really hold.
  const seconds = Math.max(granule / 48_000, soundMs / 1000);
  return seconds > 0 ? seconds : null;
}
