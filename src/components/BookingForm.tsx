"use client";

import { useState } from "react";
import { COUNTRIES, DIAL_BY_NAME } from "@/lib/countries";
import { BOOKING_COPY as B } from "@/lib/directory-copy";
import { INTAKE_COPY } from "@/lib/intake-copy";
import { t } from "@/lib/localize";
import type { Locale } from "@/lib/i18n";

const field =
  "w-full min-w-0 min-h-11 rounded-xl border border-line bg-white px-3.5 text-base text-ink placeholder:text-ink-muted transition-colors focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint sm:text-sm";
const labelCls = "mb-1 block text-sm font-semibold text-ink";

/**
 * Booking from a hospital or doctor page. It opens a case like the homepage
 * form does, carrying which hospital and doctor the patient asked for, so the
 * patient books through Shifain rather than the hospital's own switchboard.
 */
export function BookingForm({
  locale,
  from,
  hospitalId,
  doctorId,
  specialties,
}: {
  locale: Locale;
  /** This page's path, so a rejected form comes back here. */
  from: string;
  hospitalId?: string | null;
  doctorId?: string | null;
  /** The specialties offered here, as the patient sees them. */
  specialties: string[];
}) {
  const [dial, setDial] = useState("");
  const [sending, setSending] = useState(false);
  const [hasFiles, setHasFiles] = useState(false);

  return (
    <form action="/api/enquiry" method="post" encType="multipart/form-data" onSubmit={() => setSending(true)} className="space-y-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="from" value={from} />
      {hospitalId ? <input type="hidden" name="hospitalId" value={hospitalId} /> : null}
      {doctorId ? <input type="hidden" name="doctorId" value={doctorId} /> : null}

      <div>
        <label htmlFor="book-name" className={labelCls}>
          {t(B.name, locale)}
        </label>
        <input id="book-name" name="firstName" required autoComplete="name" className={field} />
      </div>

      <div>
        <label htmlFor="book-country" className={labelCls}>
          {t(B.country, locale)}
        </label>
        <select
          id="book-country"
          name="country"
          required
          defaultValue=""
          autoComplete="country-name"
          onChange={(event) => setDial(DIAL_BY_NAME[event.target.value] ?? dial)}
          className={field}
        >
          <option value="" disabled>
            {t(B.countryPlaceholder, locale)}
          </option>
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.name}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="book-phone" className={labelCls}>
          {t(B.phone, locale)}
        </label>
        <div className="flex gap-2">
          <input
            name="dial"
            value={dial}
            onChange={(event) => setDial(event.target.value)}
            aria-label={t(INTAKE_COPY.dialLabel, locale)}
            placeholder="+"
            inputMode="tel"
            className={`${field} !w-20 flex-none`}
          />
          <input id="book-phone" name="phone" type="tel" required minLength={5} autoComplete="tel-national" inputMode="tel" className={field} />
        </div>
      </div>

      <div>
        <label htmlFor="book-email" className={labelCls}>
          {t(B.email, locale)}
        </label>
        <input id="book-email" name="email" type="email" autoComplete="email" className={field} />
      </div>

      {specialties.length ? (
        <div>
          <label htmlFor="book-need" className={labelCls}>
            {t(B.need, locale)}
          </label>
          <select id="book-need" name="treatment" defaultValue="" className={field}>
            <option value="">{t(B.needPlaceholder, locale)}</option>
            {specialties.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div>
        <label htmlFor="book-problem" className={labelCls}>
          {t(B.problem, locale)}
        </label>
        <textarea
          id="book-problem"
          name="description"
          rows={3}
          required={!hasFiles}
          aria-describedby="book-problem-hint"
          className={`${field} min-h-24 py-2.5`}
        />
        <p id="book-problem-hint" className="mt-1 text-xs text-ink-muted">
          {t(B.problemHint, locale)}
        </p>
      </div>

      <div>
        <label htmlFor="book-reports" className={labelCls}>
          {t(B.reports, locale)}
        </label>
        <input
          id="book-reports"
          name="reports"
          type="file"
          multiple
          accept="application/pdf,image/*"
          onChange={(event) => setHasFiles(Boolean(event.target.files?.length))}
          aria-describedby="book-reports-hint"
          className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-brand-tint file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand hover:file:bg-violet-soft"
        />
        <p id="book-reports-hint" className="mt-1 text-xs text-ink-muted">
          {t(B.reportsHint, locale)}
        </p>
      </div>

      <button type="submit" disabled={sending} className="btn btn-primary w-full disabled:opacity-70">
        {sending ? t(B.sending, locale) : t(B.submit, locale)}
      </button>
      <p className="text-center text-xs text-ink-muted">{t(B.privacy, locale)}</p>
    </form>
  );
}

/** The booking form in its card, as it sits beside a hospital or doctor profile. */
export function BookingPanel({ subject, ...form }: Parameters<typeof BookingForm>[0] & { subject: string }) {
  return (
    <section
      id="book"
      aria-labelledby="book-title"
      className="scroll-mt-24 overflow-hidden rounded-[1.25rem] bg-white shadow-[0_18px_40px_-24px_rgba(76,29,149,0.45)] ring-1 ring-violet-line"
    >
      <div className="bg-gradient-to-br from-violet to-brand-deep px-5 py-5 text-white">
        <h2 id="book-title" className="text-xl font-extrabold leading-tight">
          {t(B.title, form.locale)}
        </h2>
        <p className="mt-0.5 text-sm font-semibold text-white/90">{subject}</p>
        <p className="mt-2 text-sm text-white/85">{t(B.lead, form.locale)}</p>
      </div>
      <div className="p-5">
        <BookingForm {...form} />
      </div>
    </section>
  );
}
