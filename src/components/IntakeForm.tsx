"use client";

import { useState } from "react";
import { COUNTRIES, DIAL_BY_NAME } from "@/lib/countries";
import { INTAKE_COPY } from "@/lib/intake-copy";
import { INTAKE_QUESTIONS } from "@/lib/ai/plan-questions";
import { t } from "@/lib/localize";
import type { L } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";

const inputClass =
  "w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint";

/** Title options; the value is what a coordinator reads, empty is allowed. */
const PREFIXES = ["", "Mr", "Mrs", "Ms", "Dr", "Prof"];

function Field({
  label,
  htmlFor,
  className = "",
  children,
}: {
  label: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-soft"
      >
        {label}
      </label>
      {children}
    </div>
  );
}

type Route = "reports" | "description" | "questions";

export type IntakeLabels = {
  name: string;
  namePlaceholder: string;
  phone: string;
  phonePlaceholder: string;
  country: string;
  countryPlaceholder: string;
  treatment: string;
  treatmentPlaceholder: string;
  reports: string;
  reportsHint: string;
  submit: string;
  privacy: string;
};

/**
 * The enquiry. Country comes before the phone number so the dialling code can
 * fill itself in, and there are three ways to tell us what is wrong.
 */
export function IntakeForm({
  locale,
  labels,
  treatments,
  compact = false,
}: {
  locale: Locale;
  labels: IntakeLabels;
  treatments: { slug: string; title: L }[];
  /** The doctor portal already knows who it is asking about. */
  compact?: boolean;
}) {
  void compact;
  const [route, setRoute] = useState<Route>("reports");
  const [dial, setDial] = useState("");

  const onCountry = (name: string) => {
    // Prefilled, never forced: editable for anyone whose number does not
    // match where they live.
    setDial(DIAL_BY_NAME[name] ?? "");
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        <div className="col-span-2 grid grid-cols-[4.5rem_1fr_1fr] gap-2">
          <Field label={t(INTAKE_COPY.prefixLabel, locale)} htmlFor="prefix">
            <select id="prefix" name="prefix" defaultValue="" className={`${inputClass} px-2`}>
              {PREFIXES.map((p) => (
                <option key={p || "none"} value={p}>
                  {p || "—"}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t(INTAKE_COPY.firstNameLabel, locale)} htmlFor="firstName">
            <input
              id="firstName"
              name="firstName"
              required
              autoComplete="given-name"
              className={inputClass}
            />
          </Field>
          <Field label={t(INTAKE_COPY.lastNameLabel, locale)} htmlFor="lastName">
            <input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label={labels.country} htmlFor="country">
          <select
            id="country"
            name="country"
            required
            defaultValue=""
            onChange={(event) => onCountry(event.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              {labels.countryPlaceholder}
            </option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.name}>
                {country.name}
              </option>
            ))}
            <option value="Other">Other</option>
          </select>
        </Field>

        <Field label={labels.phone} htmlFor="phone">
          <div className="flex gap-2">
            <input
              name="dial"
              value={dial}
              onChange={(event) => setDial(event.target.value)}
              inputMode="tel"
              aria-label={t(INTAKE_COPY.dialLabel, locale)}
              placeholder="+"
              className={`${inputClass} w-16 shrink-0 px-2 text-center`}
            />
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel-national"
              placeholder={labels.phonePlaceholder}
              className={`${inputClass} min-w-0 flex-1`}
            />
          </div>
        </Field>

        <Field label={t(INTAKE_COPY.emailLabel, locale)} htmlFor="email">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t(INTAKE_COPY.emailPlaceholder, locale)}
            className={inputClass}
          />
        </Field>

        <Field label={labels.treatment} htmlFor="treatment">
          <select id="treatment" name="treatment" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              {labels.treatmentPlaceholder}
            </option>
            {treatments.map((item) => (
              <option key={item.slug} value={item.slug}>
                {t(item.title, locale)}
              </option>
            ))}
            <option value="other">Other</option>
          </select>
        </Field>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
          {t(INTAKE_COPY.routeTitle, locale)}
        </p>
        <div className="flex flex-wrap gap-2" role="tablist">
          {(["reports", "description", "questions"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={route === option}
              onClick={() => setRoute(option)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                route === option
                  ? "border-brand bg-brand-tint text-brand-deep"
                  : "border-line bg-white text-ink-soft hover:border-brand hover:text-brand-deep"
              }`}
            >
              {t(INTAKE_COPY.routes[option], locale)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink-muted">
          {t(INTAKE_COPY.routeNotes[route], locale)}
        </p>
      </div>

      {/* Every route stays mounted so nothing typed is lost when switching,
          and only the visible one is submitted. */}
      <div hidden={route !== "reports"}>
        <Field label={labels.reports} htmlFor="reports">
          <input
            id="reports"
            name={route === "reports" ? "reports" : ""}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="block w-full cursor-pointer rounded-lg border border-dashed border-brand/40 bg-brand-tint/40 px-3 py-3 text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-brand-deep file:px-3.5 file:py-1.5 file:text-xs file:font-bold file:text-white"
          />
          <p className="mt-1.5 text-xs text-ink-muted">{labels.reportsHint}</p>
          <p className="mt-1.5 text-xs text-ink-muted">{t(INTAKE_COPY.privacyReports, locale)}</p>
        </Field>
      </div>

      <div hidden={route !== "description"}>
        <Field label={t(INTAKE_COPY.descriptionLabel, locale)} htmlFor="description">
          <textarea
            id="description"
            name={route === "description" ? "description" : ""}
            rows={4}
            placeholder={t(INTAKE_COPY.descriptionPlaceholder, locale)}
            className={inputClass}
          />
        </Field>
      </div>

      <div hidden={route !== "questions"} className="grid grid-cols-2 gap-x-3 gap-y-3">
        <p className="col-span-2 text-xs leading-relaxed text-ink-muted">
          {t(INTAKE_COPY.questionsNote, locale)}
        </p>
        {INTAKE_QUESTIONS.map((question) => (
          <Field
            key={question.id}
            label={t(INTAKE_COPY.questions[question.id], locale)}
            htmlFor={`answer-${question.id}`}
          >
            <input
              id={`answer-${question.id}`}
              name={route === "questions" ? `answer.${question.id}` : ""}
              className={inputClass}
            />
          </Field>
        ))}
      </div>

      <button type="submit" className="btn btn-primary w-full">
        {labels.submit}
        <span aria-hidden="true">&rarr;</span>
      </button>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ink-muted">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
          <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
        </svg>
        {labels.privacy}
      </p>
    </>
  );
}
