import "server-only";
import * as patientAppCopy from "./patient-app-copy";
import * as patientCopy from "./patient-copy";
import * as portalCopy from "./portal-copy";
import * as portalPatientCopy from "./portal-patient-copy";
import * as planCopy from "./plan-copy";
import * as intakeCopy from "./intake-copy";
import * as loginCopy from "./patient-login-copy";
import { needsTranslation, sourceKey } from "./page-translation-rules";

/**
 * Every English sentence the patient app and the plan page are written with,
 * read from their copy modules: { en, ru, uz } objects, however deeply nested.
 * Text with a placeholder ("Hello, {name}") is left out — on the page it never
 * appears as written.
 */
export function appTexts(): string[] {
  const found = new Set<string>();
  const seen = new WeakSet<object>();
  const walk = (value: unknown, depth: number) => {
    if (depth > 8 || !value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    const record = value as Record<string, unknown>;
    if (typeof record.en === "string" && (typeof record.ru === "string" || typeof record.uz === "string")) {
      const text = sourceKey(record.en);
      if (text && !text.includes("{") && needsTranslation(text, "fr")) found.add(text);
      return;
    }
    for (const item of Array.isArray(value) ? value : Object.values(record)) walk(item, depth + 1);
  };
  for (const copy of [patientAppCopy, patientCopy, portalCopy, portalPatientCopy, planCopy, intakeCopy, loginCopy]) walk(copy, 0);
  return [...found];
}
