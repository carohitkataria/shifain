"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRIES, DIAL_BY_NAME } from "@/lib/countries";
import { INTAKE_COPY, WIZARD_COPY as W } from "@/lib/intake-copy";
import { INTAKE_QUESTIONS } from "@/lib/ai/plan-questions";
import { t } from "@/lib/localize";
import type { L } from "@/lib/content-types";
import type { Locale } from "@/lib/i18n";

type Route = "reports" | "description" | "questions";
type Errors = Partial<Record<"need" | "other" | "condition" | "firstName" | "country" | "phone" | "email", string>>;

const MAX_FILES = 10;
const MAX_BYTES = 25 * 1024 * 1024;
const CORE_QUESTIONS = new Set(["problem", "diagnosis", "age", "conditions"]);

const field =
  "w-full min-w-0 min-h-12 rounded-xl border border-line bg-white px-3.5 text-base text-ink placeholder:text-ink-muted transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint aria-[invalid=true]:border-red-500 sm:text-sm";
const labelCls = "mb-1.5 block text-sm font-semibold text-ink";

const fmtSize = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

function FieldError({ id, text }: { id: string; text?: string }) {
  if (!text) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm font-medium text-red-600">
      {text}
    </p>
  );
}

/**
 * The homepage plan request, as three short steps: what they need, what is
 * wrong, and how to reach them. Contact details come last — by then the
 * patient has already invested in the answer. Posts the same fields as the
 * single-page intake form, so the server path is unchanged.
 */
export function PlanRequestForm({
  locale,
  treatments,
  labels,
  defaults,
}: {
  locale: Locale;
  treatments: { slug: string; title: L }[];
  labels: { submit: string; country: string; countryPlaceholder: string; phone: string; privacy: string };
  /** A signed-in patient's details, so they are not typed twice. */
  defaults?: { firstName?: string; lastName?: string; country?: string; dial?: string; phone?: string; email?: string };
}) {
  const [step, setStep] = useState(0);
  const [need, setNeed] = useState("");
  const [other, setOther] = useState("");
  const [route, setRoute] = useState<Route>("reports");
  const [files, setFiles] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  const [answered, setAnswered] = useState(false);
  const [dial, setDial] = useState(defaults?.dial ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const reportsRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const firstRender = useRef(true);

  // The named file input carries exactly the files listed, and only when the
  // reports route is the one chosen.
  useEffect(() => {
    if (!reportsRef.current) return;
    const transfer = new DataTransfer();
    if (route === "reports") files.forEach((file) => transfer.items.add(file));
    reportsRef.current.files = transfer.files;
  }, [files, route]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const overLimit = files.length > MAX_FILES || totalBytes > MAX_BYTES;

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list);
    setFiles((current) => {
      const seen = new Set(current.map((f) => `${f.name}:${f.size}`));
      return [...current, ...incoming.filter((f) => !seen.has(`${f.name}:${f.size}`))];
    });
    setErrors((e) => ({ ...e, condition: undefined }));
    if (pickerRef.current) pickerRef.current.value = "";
  };

  const validate = (index: number): Errors => {
    const next: Errors = {};
    if (index === 0) {
      if (!need) next.need = t(W.needError, locale);
      else if (need === "other" && !other.trim()) next.other = t(W.otherError, locale);
    }
    if (index === 1) {
      const hasSomething =
        route === "reports" ? files.length > 0 : route === "description" ? description.trim().length > 0 : answered;
      if (overLimit && route === "reports") next.condition = t(W.tooMany, locale);
      else if (!hasSomething) next.condition = t(W.conditionError, locale);
    }
    if (index === 2 && formRef.current) {
      const data = new FormData(formRef.current);
      if (!String(data.get("firstName") ?? "").trim()) next.firstName = t(W.nameError, locale);
      if (!String(data.get("country") ?? "").trim()) next.country = t(W.countryError, locale);
      if (String(data.get("phone") ?? "").replace(/\D/g, "").length < 5) next.phone = t(W.phoneError, locale);
      const email = String(data.get("email") ?? "").trim();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = t(W.emailError, locale);
    }
    return next;
  };

  const focusFirstError = (found: Errors) => {
    const order: (keyof Errors)[] = ["need", "other", "condition", "firstName", "country", "phone", "email"];
    const key = order.find((k) => found[k]);
    if (!key) return;
    const target = formRef.current?.querySelector<HTMLElement>(`[data-field="${key}"]`);
    target?.focus({ preventScroll: true });
    (target?.closest("label") ?? target)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const goNext = () => {
    const found = validate(step);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstError(found);
      return;
    }
    setStep((s) => Math.min(2, s + 1));
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (step < 2) {
      event.preventDefault();
      goNext();
      return;
    }
    const found = { ...validate(0), ...validate(1), ...validate(2) };
    setErrors(found);
    if (Object.keys(found).length > 0) {
      event.preventDefault();
      if (found.need || found.other) setStep(0);
      else if (found.condition) setStep(1);
      else focusFirstError(found);
      return;
    }
    setSubmitting(true);
  };

  const treatmentValue = need === "other" ? other.trim() : need === "unsure" ? "" : need;
  const coreQuestions = INTAKE_QUESTIONS.filter((q) => CORE_QUESTIONS.has(q.id));
  const moreQuestions = INTAKE_QUESTIONS.filter((q) => !CORE_QUESTIONS.has(q.id));

  return (
    <form
      ref={formRef}
      action="/api/enquiry"
      method="post"
      encType="multipart/form-data"
      noValidate
      onSubmit={onSubmit}
      className="flex flex-col"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="treatment" value={treatmentValue} />
      <input ref={reportsRef} type="file" name="reports" multiple hidden tabIndex={-1} aria-hidden="true" />

      {/* Progress */}
      <div className="mt-5">
        <p className="sr-only" aria-live="polite">
          {t(W.step, locale)} {step + 1} / 3 — {t(W.stepNames[step], locale)}
        </p>
        <ol className="grid grid-cols-3 gap-2" aria-hidden="true">
          {W.stepNames.map((name, index) => (
            <li key={index}>
              <span
                className={`block h-1.5 rounded-full transition-colors duration-300 ${
                  index <= step ? "bg-brand" : "bg-line"
                }`}
              />
              <span
                className={`mt-1.5 block text-xs font-semibold ${index === step ? "text-brand-deep" : "text-ink-muted"}`}
              >
                {index + 1}. {t(name, locale)}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <h3
        ref={headingRef}
        tabIndex={-1}
        className="mt-5 text-lg font-extrabold leading-snug text-ink outline-none"
      >
        {t(W.titles[step], locale)}
      </h3>

      {/* Step 1 — what they need */}
      <div hidden={step !== 0} className="mt-3">
        <fieldset>
          <legend className="sr-only">{t(W.titles[0], locale)}</legend>
          <div
            className="grid grid-cols-2 gap-2"
            aria-describedby={errors.need ? "err-need" : undefined}
          >
            {[
              ...treatments.map((item) => ({ value: item.slug, label: t(item.title, locale) })),
              { value: "other", label: t(W.somethingElse, locale) },
              { value: "unsure", label: t(W.notSure, locale) },
            ].map((option, index) => (
              <label
                key={option.value}
                className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${
                  need === option.value
                    ? "border-brand bg-brand-tint text-brand-deep"
                    : "border-line bg-white text-ink hover:border-brand/50"
                }`}
              >
                <input
                  type="radio"
                  name="need-choice"
                  value={option.value}
                  checked={need === option.value}
                  data-field={index === 0 ? "need" : undefined}
                  onChange={() => {
                    setNeed(option.value);
                    setErrors((e) => ({ ...e, need: undefined }));
                  }}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    need === option.value ? "border-brand" : "border-line"
                  }`}
                >
                  {need === option.value ? <span className="h-2 w-2 rounded-full bg-brand" /> : null}
                </span>
                <span className="min-w-0 leading-tight">{option.label}</span>
              </label>
            ))}
          </div>
          <FieldError id="err-need" text={errors.need} />
        </fieldset>

        {need === "other" ? (
          <div className="mt-3">
            <label htmlFor="need-other" className={labelCls}>
              {t(W.otherLabel, locale)}
            </label>
            <input
              id="need-other"
              data-field="other"
              value={other}
              onChange={(e) => {
                setOther(e.target.value);
                setErrors((x) => ({ ...x, other: undefined }));
              }}
              placeholder={t(W.otherPlaceholder, locale)}
              aria-invalid={Boolean(errors.other)}
              aria-describedby={errors.other ? "err-other" : undefined}
              className={field}
            />
            <FieldError id="err-other" text={errors.other} />
          </div>
        ) : null}
      </div>

      {/* Step 2 — the condition */}
      <div hidden={step !== 1} className="mt-3 space-y-3">
        <fieldset>
          <legend className="sr-only">{t(INTAKE_COPY.routeTitle, locale)}</legend>
          <div className="space-y-2">
            {(["reports", "description", "questions"] as const).map((option, index) => (
              <label
                key={option}
                className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${
                  route === option ? "border-brand bg-brand-tint" : "border-line bg-white hover:border-brand/50"
                }`}
              >
                <input
                  type="radio"
                  name="route-choice"
                  value={option}
                  checked={route === option}
                  data-field={index === 0 ? "condition" : undefined}
                  onChange={() => {
                    setRoute(option);
                    setErrors((e) => ({ ...e, condition: undefined }));
                  }}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    route === option ? "border-brand" : "border-line"
                  }`}
                >
                  {route === option ? <span className="h-2 w-2 rounded-full bg-brand" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                    {t(INTAKE_COPY.routes[option], locale)}
                    {option === "reports" ? (
                      <span className="rounded-full bg-leaf-tint px-2 py-0.5 text-[11px] font-bold text-leaf">
                        {t(W.recommended, locale)}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-ink-soft">{t(W.routeHints[option], locale)}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {route === "reports" ? (
          <div>
            <input
              ref={pickerRef}
              id="report-picker"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
              onChange={(e) => addFiles(e.target.files)}
              className="sr-only"
            />
            {files.length > 0 ? (
              <ul className="mb-2 space-y-1.5">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}`}
                    className="flex items-center gap-3 rounded-lg bg-surface-muted px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate text-ink">{file.name}</span>
                    <span className="shrink-0 text-xs text-ink-muted">{fmtSize(file.size)}</span>
                    <button
                      type="button"
                      onClick={() => setFiles((list) => list.filter((_, i) => i !== index))}
                      className="min-h-9 shrink-0 rounded-md px-2 text-xs font-bold text-brand hover:bg-brand-tint"
                      aria-label={`${t(W.remove, locale)} ${file.name}`}
                    >
                      {t(W.remove, locale)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <label
              htmlFor="report-picker"
              className="flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand/40 bg-brand-tint/40 px-4 py-4 text-center transition-colors hover:border-brand hover:bg-brand-tint"
            >
              <span className="text-sm font-bold text-brand-deep">
                {files.length > 0 ? `+ ${t(W.addMore, locale)}` : `+ ${t(W.addFiles, locale)}`}
              </span>
              <span className="text-xs text-ink-soft">{t(W.fileHint, locale)}</span>
            </label>
            <p className="mt-2 text-xs leading-relaxed text-ink-muted">{t(INTAKE_COPY.privacyReports, locale)}</p>
          </div>
        ) : null}

        <div hidden={route !== "description"}>
          <label htmlFor="description" className={labelCls}>
            {t(INTAKE_COPY.descriptionLabel, locale)}
          </label>
          <textarea
            id="description"
            name={route === "description" ? "description" : undefined}
            rows={4}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setErrors((x) => ({ ...x, condition: undefined }));
            }}
            placeholder={t(INTAKE_COPY.descriptionPlaceholder, locale)}
            className={`${field} py-3`}
          />
        </div>

        <div
          hidden={route !== "questions"}
          onInput={(e) => {
            const root = e.currentTarget;
            setAnswered(
              Array.from(root.querySelectorAll<HTMLInputElement>("input")).some((input) => input.value.trim()),
            );
            setErrors((x) => ({ ...x, condition: undefined }));
          }}
          className="space-y-3"
        >
          <p className="text-xs leading-relaxed text-ink-muted">{t(INTAKE_COPY.questionsNote, locale)}</p>
          {coreQuestions.map((q) => (
            <div key={q.id}>
              <label htmlFor={`answer-${q.id}`} className={labelCls}>
                {t(INTAKE_COPY.questions[q.id], locale)}
              </label>
              <input
                id={`answer-${q.id}`}
                name={route === "questions" ? `answer.${q.id}` : undefined}
                inputMode={q.id === "age" ? "numeric" : undefined}
                className={field}
              />
            </div>
          ))}
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-brand">
              {t(W.moreQuestions, locale)}
            </summary>
            <div className="mt-2 space-y-3">
              {moreQuestions.map((q) => (
                <div key={q.id}>
                  <label htmlFor={`answer-${q.id}`} className={labelCls}>
                    {t(INTAKE_COPY.questions[q.id], locale)}
                  </label>
                  <input
                    id={`answer-${q.id}`}
                    name={route === "questions" ? `answer.${q.id}` : undefined}
                    className={field}
                  />
                </div>
              ))}
            </div>
          </details>
        </div>

        <FieldError id="err-condition" text={errors.condition} />
      </div>

      {/* Step 3 — contact */}
      <div hidden={step !== 2} className="mt-3 space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <div className="min-w-0">
            <label htmlFor="firstName" className={labelCls}>
              {t(INTAKE_COPY.firstNameLabel, locale)}
            </label>
            <input
              id="firstName"
              name="firstName"
              data-field="firstName"
              autoComplete="given-name"
              defaultValue={defaults?.firstName}
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby={errors.firstName ? "err-firstName" : undefined}
              onInput={() => setErrors((x) => ({ ...x, firstName: undefined }))}
              className={field}
            />
          </div>
          <div className="min-w-0">
            <label htmlFor="lastName" className={labelCls}>
              {t(INTAKE_COPY.lastNameLabel, locale)}
            </label>
            <input id="lastName" name="lastName" autoComplete="family-name" defaultValue={defaults?.lastName} className={field} />
          </div>
        </div>
        <FieldError id="err-firstName" text={errors.firstName} />

        <div>
          <label htmlFor="country" className={labelCls}>
            {labels.country}
          </label>
          <select
            id="country"
            name="country"
            data-field="country"
            defaultValue={defaults?.country ?? ""}
            autoComplete="country-name"
            aria-invalid={Boolean(errors.country)}
            aria-describedby={errors.country ? "err-country" : undefined}
            onChange={(e) => {
              setDial(DIAL_BY_NAME[e.target.value] ?? "");
              setErrors((x) => ({ ...x, country: undefined }));
            }}
            className={field}
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
          <FieldError id="err-country" text={errors.country} />
        </div>

        <div>
          <label htmlFor="phone" className={labelCls}>
            {labels.phone}
          </label>
          <div className="flex gap-2">
            <input
              name="dial"
              value={dial}
              onChange={(e) => setDial(e.target.value)}
              inputMode="tel"
              aria-label={t(INTAKE_COPY.dialLabel, locale)}
              placeholder="+"
              className={`${field.replace("w-full ", "")} w-20 shrink-0 px-2 text-center`}
            />
            <input
              id="phone"
              name="phone"
              type="tel"
              data-field="phone"
              inputMode="tel"
              autoComplete="tel-national"
              defaultValue={defaults?.phone}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "err-phone" : "phone-note"}
              onInput={() => setErrors((x) => ({ ...x, phone: undefined }))}
              className={`${field.replace("w-full ", "")} flex-1`}
            />
          </div>
          <FieldError id="err-phone" text={errors.phone} />
          <p id="phone-note" className="mt-1.5 text-xs text-ink-muted">
            {t(W.contactNote, locale)}
          </p>
        </div>

        <div>
          <label htmlFor="email" className={labelCls}>
            {t(INTAKE_COPY.emailLabel, locale)}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            data-field="email"
            autoComplete="email"
            inputMode="email"
            defaultValue={defaults?.email}
            placeholder={t(INTAKE_COPY.emailPlaceholder, locale)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "err-email" : undefined}
            onInput={() => setErrors((x) => ({ ...x, email: undefined }))}
            className={field}
          />
          <FieldError id="err-email" text={errors.email} />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 flex items-center gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => {
              setErrors({});
              setStep((s) => s - 1);
            }}
            className="min-h-12 shrink-0 rounded-xl px-4 text-sm font-bold text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
          >
            &larr; {t(W.back, locale)}
          </button>
        ) : null}
        {step < 2 ? (
          // Separate keys: reusing one element would turn this click into a submit
          // the moment the step changes, validating the contact step unasked.
          <button key="next" type="button" onClick={goNext} className="btn btn-primary min-h-12 flex-1 whitespace-nowrap !px-4">
            {t(W.next, locale)}
            <span aria-hidden="true">&rarr;</span>
          </button>
        ) : (
          <button
            key="submit"
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="btn btn-accent min-h-12 flex-1 whitespace-nowrap !px-4 disabled:opacity-80"
          >
            {submitting ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
                {t(W.submitting, locale)}
              </>
            ) : (
              <>
                {labels.submit}
                <span aria-hidden="true">&rarr;</span>
              </>
            )}
          </button>
        )}
      </div>

      <ul className="mt-5 grid gap-2 border-t border-line pt-4 text-[13px] text-ink-soft sm:grid-cols-3 sm:gap-3">
        {W.trust.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-leaf" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{t(item, locale)}</span>
          </li>
        ))}
      </ul>
    </form>
  );
}
