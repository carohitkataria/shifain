import { Hint, adminField, adminLabel } from "../Panel";

const SPAN: Record<number, string> = {
  1: "sm:col-span-1",
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  6: "sm:col-span-6",
};

type Common = {
  label: string;
  name: string;
  /** Help that sits behind a "?" on the label instead of a paragraph on the page. */
  hint?: string;
  required?: boolean;
  /** Columns out of 6 on wide screens. */
  span?: 1 | 2 | 3 | 4 | 6;
};

function Label({ label, hint, required, htmlFor }: { label: string; hint?: string; required?: boolean; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className={`${adminLabel} flex items-center`}>
      {label}
      {required ? <span className="ml-0.5 text-red-600" aria-hidden="true">*</span> : null}
      {hint ? <Hint text={hint} /> : null}
    </label>
  );
}

export function TextField({
  label,
  name,
  hint,
  required,
  span = 2,
  defaultValue,
  type = "text",
  placeholder,
  min,
  max,
  step,
  list,
  autoComplete,
}: Common & {
  defaultValue?: string | number | null;
  type?: "text" | "number" | "email" | "tel" | "url" | "date";
  placeholder?: string;
  min?: number;
  max?: number;
  step?: string;
  list?: string;
  autoComplete?: string;
}) {
  const id = `f-${name}`;
  return (
    <div className={`min-w-0 ${SPAN[span]}`}>
      <Label label={label} hint={hint} required={required} htmlFor={id} />
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        list={list}
        autoComplete={autoComplete ?? "off"}
        inputMode={type === "number" ? "decimal" : undefined}
        className={adminField}
      />
    </div>
  );
}

export function SelectField({
  label,
  name,
  hint,
  required,
  span = 2,
  defaultValue,
  options,
  placeholder = "Choose…",
}: Common & { defaultValue?: string | null; options: { value: string; label: string }[]; placeholder?: string }) {
  const id = `f-${name}`;
  return (
    <div className={`min-w-0 ${SPAN[span]}`}>
      <Label label={label} hint={hint} required={required} htmlFor={id} />
      <select id={id} name={name} required={required} defaultValue={defaultValue ?? ""} className={adminField}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AreaField({
  label,
  name,
  hint,
  span = 6,
  defaultValue,
  rows = 4,
  placeholder,
}: Common & { defaultValue?: string | null; rows?: number; placeholder?: string }) {
  const id = `f-${name}`;
  return (
    <div className={`min-w-0 ${SPAN[span]}`}>
      <Label label={label} hint={hint} htmlFor={id} />
      <textarea id={id} name={name} rows={rows} defaultValue={defaultValue ?? ""} placeholder={placeholder} className={adminField} />
    </div>
  );
}

/** A grid of tick boxes from a master list. */
export function CheckGrid({
  legend,
  name,
  options,
  checked,
  hint,
  columns = "sm:grid-cols-2 lg:grid-cols-3",
}: {
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  checked: string[];
  hint?: string;
  columns?: string;
}) {
  const on = new Set(checked);
  return (
    <fieldset>
      <legend className={`${adminLabel} flex items-center`}>
        {legend}
        {hint ? <Hint text={hint} /> : null}
      </legend>
      <div className={`grid gap-1 ${columns}`}>
        {options.map((option) => (
          <label key={option.value} className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm text-ink hover:bg-surface-muted">
            <input type="checkbox" name={name} value={option.value} defaultChecked={on.has(option.value)} className="h-5 w-5 flex-none accent-brand" />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A titled group of fields inside a step. */
export function FieldGroup({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h3 className="flex items-center font-extrabold text-ink">
        {title}
        {hint ? <Hint text={hint} /> : null}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export const grid6 = "grid gap-4 sm:grid-cols-6";
