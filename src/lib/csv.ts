/**
 * One spreadsheet cell. Text a patient typed (a name, a country) that starts
 * with = + - @ or a tab is read by Excel and Sheets as a formula, so it gets a
 * leading apostrophe and stays text. Numbers are written as they are.
 */
export function csvCell(value: unknown): string {
  if (value == null) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
