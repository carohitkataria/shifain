/**
 * A reply on its way to a Cyrillic Uzbek page. The assistant writes Uzbek in
 * Latin; the screen shows it in Cyrillic, but the voice is made from the
 * Latin text — `speech` is set before this runs and is never converted,
 * because the voices read Uzbek from Latin. Pure, tested in
 * scripts/test/voice-engine.test.mts.
 */
import { toUzCyrillic } from "../uz-cyrillic";

export function forScreen(payload: Record<string, unknown>, cyrillic: boolean): Record<string, unknown> {
  if (!cyrillic) return payload;
  const out: Record<string, unknown> = { ...payload };
  if (typeof out.reply === "string") out.reply = toUzCyrillic(out.reply);
  if (Array.isArray(out.suggestions)) out.suggestions = out.suggestions.map((item) => (typeof item === "string" ? toUzCyrillic(item) : item));
  if (Array.isArray(out.links))
    out.links = out.links.map((link) =>
      link && typeof link === "object" && typeof (link as { label?: unknown }).label === "string"
        ? { ...link, label: toUzCyrillic((link as { label: string }).label) }
        : link,
    );
  return out;
}
