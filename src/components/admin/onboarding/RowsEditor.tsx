"use client";

import { useState } from "react";
import { ACCREDITATION_STATUS_LABEL, accreditationStatus } from "@/lib/onboarding-rules";
import { adminField, adminLabel } from "../Panel";
import { AdminIcon } from "../AdminIcon";

export type RowOption = { value: string; label: string; group?: string };

export type RowField = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "textarea" | "file" | "checkbox" | "multiselect" | "accreditation-status" | "url" | "email" | "hidden";
  options?: RowOption[];
  /** Show only options whose `group` equals this other field's value (procedure by specialty). */
  filterBy?: string;
  /** Columns out of 6 on wide screens. */
  span?: 1 | 2 | 3 | 4 | 6;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  accept?: string;
  min?: number;
  max?: number;
  step?: string;
  /** What a newly added row starts with. */
  initialValue?: string;
};

export type RowValue = Record<string, string | string[] | boolean>;

const SPAN: Record<number, string> = {
  1: "sm:col-span-1",
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  6: "sm:col-span-6",
};

const STATUS_TONE: Record<string, string> = {
  valid: "bg-leaf/10 text-leaf",
  expiring: "bg-saffron/15 text-[#9a5a05]",
  expired: "bg-red-50 text-red-700",
  revoked: "bg-red-50 text-red-700",
  incomplete: "bg-surface-muted text-ink-soft",
};

/**
 * A repeatable section of a form — accreditations, packages, qualifications —
 * posted as `name.<n>.<field>` so the server reads rows in the order added.
 * "Add another" appends a blank row; nothing is saved until the form is.
 */
export function RowsEditor({
  name,
  fields,
  initial,
  addLabel,
  itemLabel,
  empty,
  fileUrl,
}: {
  name: string;
  fields: RowField[];
  initial: RowValue[];
  addLabel: string;
  /** What one row is called, for its heading and the remove button ("Accreditation"). */
  itemLabel: string;
  empty?: string;
  /** Where an already-stored file can be opened. */
  fileUrl?: string;
}) {
  const [rows, setRows] = useState<{ key: number; value: RowValue }[]>(() => initial.map((value, index) => ({ key: index, value })));
  const [next, setNext] = useState(initial.length);

  const update = (key: number, field: string, value: string | string[] | boolean) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, value: { ...row.value, [field]: value } } : row)));

  return (
    <div>
      {rows.length === 0 && empty ? <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-soft">{empty}</p> : null}
      <ol className="space-y-3">
        {rows.map((row, position) => (
          <li key={row.key} className="rounded-xl border border-line bg-surface-muted/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-ink">
                {itemLabel} {position + 1}
              </p>
              <button
                type="button"
                onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-ink-soft transition hover:bg-red-50 hover:text-red-700"
                aria-label={`Remove ${itemLabel.toLowerCase()} ${position + 1}`}
              >
                <AdminIcon name="trash" className="h-4 w-4" />
                Remove
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-6">
              {fields.map((field) => (
                <Field
                  key={field.key}
                  id={`${name}-${row.key}-${field.key}`}
                  name={`${name}.${row.key}.${field.key}`}
                  field={field}
                  row={row.value}
                  fileUrl={fileUrl}
                  onChange={(value) => update(row.key, field.key, value)}
                />
              ))}
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => {
          const fresh = Object.fromEntries(fields.filter((field) => field.initialValue !== undefined).map((field) => [field.key, field.initialValue!]));
          setRows((current) => [...current, { key: next, value: fresh }]);
          setNext((value) => value + 1);
        }}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-full border border-dashed border-brand/40 px-4 text-sm font-bold text-brand-deep transition hover:border-brand hover:bg-brand-tint"
      >
        <AdminIcon name="plus" className="h-4 w-4" />
        {addLabel}
      </button>
    </div>
  );
}

function Field({
  id,
  name,
  field,
  row,
  fileUrl,
  onChange,
}: {
  id: string;
  name: string;
  field: RowField;
  row: RowValue;
  fileUrl?: string;
  onChange: (value: string | string[] | boolean) => void;
}) {
  const value = row[field.key];
  const text = typeof value === "string" ? value : "";
  const span = SPAN[field.span ?? 2];
  const label = (
    <label htmlFor={id} className={adminLabel}>
      {field.label}
      {field.required ? <span className="text-red-600"> *</span> : null}
    </label>
  );
  const hint = field.hint ? <p className="mt-1 text-xs leading-relaxed text-ink-muted">{field.hint}</p> : null;

  if (field.type === "hidden") return text ? <input type="hidden" name={name} value={text} /> : null;

  if (field.type === "accreditation-status") {
    const status = accreditationStatus({
      validFrom: (row.validFrom as string) || null,
      validTo: (row.validTo as string) || null,
      revoked: row.revoked === true || row.revoked === "on",
    });
    return (
      <div className={`min-w-0 ${span}`}>
        <span className={adminLabel}>{field.label}</span>
        <span className={`inline-flex min-h-[42px] items-center rounded-lg px-3 text-sm font-bold ${STATUS_TONE[status]}`} aria-live="polite">
          {ACCREDITATION_STATUS_LABEL[status]}
        </span>
      </div>
    );
  }

  if (field.type === "checkbox") {
    const checked = value === true || value === "on";
    return (
      <label htmlFor={id} className={`flex min-h-[42px] items-center gap-2.5 self-end ${span}`}>
        <input id={id} type="checkbox" name={name} checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-brand" />
        <span className="text-sm font-semibold text-ink">{field.label}</span>
      </label>
    );
  }

  if (field.type === "file") {
    const stored = typeof row[`${field.key}Id`] === "string" ? (row[`${field.key}Id`] as string) : "";
    return (
      <div className={`min-w-0 ${span}`}>
        {label}
        {stored ? <input type="hidden" name={name.replace(/\.[^.]+$/, `.${field.key}Id`)} value={stored} /> : null}
        <input
          id={id}
          type="file"
          name={name}
          accept={field.accept}
          className="block w-full text-sm text-ink file:mr-3 file:min-h-10 file:rounded-full file:border-0 file:bg-brand-tint file:px-4 file:font-semibold file:text-brand-deep"
        />
        {stored && fileUrl ? (
          <a href={`${fileUrl}/${stored}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-semibold text-brand hover:underline">
            View current file
          </a>
        ) : null}
        {hint}
      </div>
    );
  }

  if (field.type === "select" || field.type === "multiselect") {
    const filter = field.filterBy ? (row[field.filterBy] as string) || "" : null;
    const options = (field.options ?? []).filter((option) => filter === null || option.group === filter);
    const multiple = field.type === "multiselect";
    return (
      <div className={`min-w-0 ${span}`}>
        {label}
        <select
          id={id}
          name={name}
          multiple={multiple}
          required={field.required}
          value={multiple ? (Array.isArray(value) ? value : []) : text}
          onChange={(event) =>
            onChange(multiple ? Array.from(event.target.selectedOptions).map((option) => option.value) : event.target.value)
          }
          size={multiple ? Math.min(5, Math.max(3, options.length)) : undefined}
          className={adminField}
        >
          {multiple ? null : (
            <option value="" disabled={field.required}>
              {filter === "" ? "Choose the specialty first" : "Choose…"}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {multiple ? <p className="mt-1 text-xs text-ink-muted">Hold Ctrl (⌘ on Mac) to pick more than one.</p> : null}
        {hint}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className={`min-w-0 ${span}`}>
        {label}
        <textarea id={id} name={name} rows={3} value={text} placeholder={field.placeholder} onChange={(event) => onChange(event.target.value)} className={adminField} />
        {hint}
      </div>
    );
  }

  return (
    <div className={`min-w-0 ${span}`}>
      {label}
      <input
        id={id}
        name={name}
        type={field.type === "url" ? "url" : field.type}
        required={field.required}
        value={text}
        min={field.min}
        max={field.max}
        step={field.step}
        placeholder={field.placeholder}
        inputMode={field.type === "number" ? "decimal" : undefined}
        onChange={(event) => onChange(event.target.value)}
        className={adminField}
      />
      {hint}
    </div>
  );
}
