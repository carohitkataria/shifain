import { CONTENT_LOCALES as LOCALES, type ContentLocale as Locale } from "./i18n";
import type { L } from "./content-types";

/** Keys that identify a record rather than describe it — not editable copy. */
const STRUCTURAL_KEYS = new Set(["id", "slug", "version", "updatedAt", "sections"]);

/** Keys whose copy runs long enough to deserve a textarea. */
const LONG_KEYS = new Set([
  "body", "answer", "detail", "quote", "disclaimer", "about", "footnote", "subtitle",
  "totalNote", "priceBody", "translatorBody", "doctorBody", "hospitalBody", "reportsHint",
  "privacy", "freeNote", "highlight",
]);

export type EditorNode =
  | { kind: "list"; path: string; label: string; itemNoun: string; items: EditorNode[] }
  | { kind: "localized"; path: string; label: string; value: L; multiline: boolean }
  | { kind: "text"; path: string; label: string; value: string; multiline: boolean }
  | { kind: "number"; path: string; label: string; value: number }
  | { kind: "boolean"; path: string; label: string; value: boolean }
  | { kind: "group"; label: string; children: EditorNode[] };

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A localized string is an object holding exactly the supported locales. */
export function isLocalized(value: unknown): value is L {
  if (!isPlainObject(value)) return false;
  const keys = Object.keys(value);
  if (keys.length !== LOCALES.length) return false;
  return LOCALES.every((locale) => typeof value[locale as Locale] === "string");
}

/** "hospitalLogin" -> "Hospital login" */
export function humanize(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** "Body paragraphs" -> "paragraph", for the "Add …" button. */
function singular(label: string): string {
  const word = label.toLowerCase().split(" ").pop() ?? "item";
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ses") || word.endsWith("xes")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/** A short hint that tells one item in a list apart from the next. */
function itemLabel(value: unknown, index: number): string {
  if (isPlainObject(value)) {
    if (typeof value.name === "string" && value.name) return value.name;
    for (const key of ["title", "label", "question"]) {
      const candidate = value[key];
      if (isLocalized(candidate) && candidate.en) return candidate.en;
    }
  }
  if (typeof value === "string" && value) return value;
  return `Item ${index + 1}`;
}

/** Walks a content branch and describes every field an editor should render. */
export function buildEditor(value: unknown, label: string, path = ""): EditorNode | null {
  if (isLocalized(value)) {
    const key = path.split(".").pop() ?? "";
    return { kind: "localized", path, label, value, multiline: LONG_KEYS.has(key) };
  }

  if (Array.isArray(value)) {
    const items = value
      .map((item, index) =>
        buildEditor(item, itemLabel(item, index), path ? `${path}.${index}` : String(index)),
      )
      .filter((node): node is EditorNode => node !== null);
    // An empty list still renders, so the last entry can be added back.
    return { kind: "list", path, label, itemNoun: singular(label), items };
  }

  if (isPlainObject(value)) {
    const children = Object.entries(value)
      .filter(([key]) => !STRUCTURAL_KEYS.has(key))
      .map(([key, child]) => buildEditor(child, humanize(key), path ? `${path}.${key}` : key))
      .filter((node): node is EditorNode => node !== null);
    return children.length ? { kind: "group", label, children } : null;
  }

  if (typeof value === "string") {
    const key = path.split(".").pop() ?? "";
    return { kind: "text", path, label, value, multiline: LONG_KEYS.has(key) };
  }
  if (typeof value === "number") return { kind: "number", path, label, value };
  if (typeof value === "boolean") return { kind: "boolean", path, label, value };

  return null;
}

/** Writes a dotted path (`hero.badges.0.label.en`) into a content tree. */
export function setAtPath(target: unknown, path: string, value: string | number | boolean): void {
  const segments = path.split(".");
  let node: Record<string, unknown> = target as Record<string, unknown>;

  for (let i = 0; i < segments.length - 1; i += 1) {
    const next = node[segments[i]];
    if (!isPlainObject(next) && !Array.isArray(next)) return;
    node = next as Record<string, unknown>;
  }

  const last = segments[segments.length - 1];
  if (!(last in node)) return;

  const current = node[last];
  if (typeof current === "number") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) node[last] = parsed;
    return;
  }
  if (typeof current === "boolean") {
    node[last] = value === true || value === "on" || value === "true";
    return;
  }
  if (typeof current === "string") {
    node[last] = String(value);
  }
}

/** Every boolean field in a branch, so unchecked checkboxes can be cleared. */
export function collectBooleanPaths(node: EditorNode, out: string[] = []): string[] {
  if (node.kind === "group") {
    node.children.forEach((child) => collectBooleanPaths(child, out));
  } else if (node.kind === "list") {
    node.items.forEach((child) => collectBooleanPaths(child, out));
  } else if (node.kind === "boolean") {
    out.push(node.path);
  }
  return out;
}

/** Walks to the array a dotted path points at. */
function listAt(target: unknown, path: string): unknown[] | null {
  let node: unknown = target;
  for (const segment of path.split(".")) {
    if (!isPlainObject(node) && !Array.isArray(node)) return null;
    node = (node as Record<string, unknown>)[segment];
  }
  return Array.isArray(node) ? node : null;
}

/** A copy of `sample` with its copy blanked, ready for someone to fill in. */
function blankCopy(sample: unknown): unknown {
  if (isLocalized(sample)) return Object.fromEntries(LOCALES.map((locale) => [locale, ""]));
  if (Array.isArray(sample)) return sample.map(blankCopy);
  if (isPlainObject(sample)) {
    return Object.fromEntries(
      Object.entries(sample).map(([key, value]) => [
        key,
        // An id has to stay unique, and structure (icons, order) is a better
        // starting point than nothing — so only the prose is cleared.
        key === "id" ? `x${Math.random().toString(36).slice(2, 9)}` : blankCopy(value),
      ]),
    );
  }
  if (typeof sample === "string") return "";
  return sample;
}

/** Appends an entry to a list, shaped like the ones already there. */
export function addListItem(target: unknown, path: string): boolean {
  const list = listAt(target, path);
  if (!list) return false;
  list.push(list.length > 0 ? blankCopy(list[list.length - 1]) : "");
  return true;
}

/** Removes one entry from a list. */
export function removeListItem(target: unknown, path: string, index: number): boolean {
  const list = listAt(target, path);
  if (!list || index < 0 || index >= list.length) return false;
  list.splice(index, 1);
  return true;
}
