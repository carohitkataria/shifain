"use client";

/** Ticks every row checkbox that belongs to the same bulk form. */
export function SelectAll({ form, label }: { form: string; label: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      className="h-5 w-5 accent-brand"
      onChange={(event) => {
        document
          .querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name="ids"][form="${form}"]`)
          .forEach((box) => {
            box.checked = event.target.checked;
          });
      }}
    />
  );
}
