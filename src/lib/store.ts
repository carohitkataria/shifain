import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { defaultContent } from "./default-content";
import type { SiteContent } from "./content-types";

const CONTENT_PATH =
  process.env.SHIFAIN_CONTENT_PATH || path.join(process.cwd(), "content", "homepage.json");

type Plain = Record<string, unknown>;

const isPlainObject = (value: unknown): value is Plain =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Overlays stored content on top of the defaults. Keys the code knows about but
 * the stored file predates keep their default value, so shipping a new field
 * never blanks the live homepage.
 */
function merge<T>(base: T, override: unknown): T {
  if (Array.isArray(base)) {
    return (Array.isArray(override) ? override : base) as T;
  }
  if (isPlainObject(base)) {
    if (!isPlainObject(override)) return base;
    const out: Plain = { ...base };
    for (const key of Object.keys(base as Plain)) {
      if (key in override) out[key] = merge((base as Plain)[key], override[key]);
    }
    return out as T;
  }
  return (override === undefined ? base : override) as T;
}

/**
 * Reads the published homepage content, falling back to the shipped defaults.
 * The result is always a deep copy: callers edit it in place before publishing,
 * and `defaultContent` is a shared module object that must stay pristine.
 */
export async function getContent(): Promise<SiteContent> {
  try {
    const raw = await fs.readFile(CONTENT_PATH, "utf8");
    return structuredClone(merge(defaultContent, JSON.parse(raw)));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code !== "ENOENT") {
      console.error("[shifain] could not read content store, using defaults:", error);
    }
    return structuredClone(defaultContent);
  }
}

/** Publishes new homepage content to the store. */
export async function saveContent(content: SiteContent): Promise<void> {
  const next: SiteContent = {
    ...content,
    version: (content.version ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(CONTENT_PATH), { recursive: true });
  await fs.writeFile(CONTENT_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
}

/** Restores the shipped defaults by removing the stored overlay. */
export async function resetContent(): Promise<void> {
  await fs.rm(CONTENT_PATH, { force: true });
}

export { CONTENT_PATH };
