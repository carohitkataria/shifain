import Link from "next/link";
import { Icon } from "./Icon";
import { TelegramGlyph } from "./TelegramGlyph";
import { PLAN_COPY } from "@/lib/plan-copy";
import { contentLocale, type Locale } from "@/lib/i18n";
import { t } from "@/lib/localize";
import type { PatientCase } from "@/lib/cases";

/**
 * Under every state of the plan page — reading, coordinator, ready — so the
 * patient is never left at a dead end: what happens next and when, and two
 * ways to follow the case (Telegram, their account).
 */
export function PlanNextSteps({ record, locale, telegram }: { record: Pick<PatientCase, "_id" | "patient" | "locale">; locale: Locale; telegram: string | null }) {
  const N = PLAN_COPY.next;
  const spoken = N.language[contentLocale(locale)];
  const email = record.patient.email;
  // Signing in: by email code when we have the address, otherwise the case reference with the phone.
  const signIn = email
    ? `/${locale}/portal/patient/login?otp=email&email=${encodeURIComponent(email)}`
    : `/${locale}/portal/patient/login?with=reference&ref=${encodeURIComponent(record._id)}`;

  return (
    <section className="card mt-6 p-6 sm:p-8" aria-labelledby="next-title">
      <h2 id="next-title" className="text-lg font-extrabold text-ink">
        {t(N.title, locale)}
      </h2>
      <ol className="mt-4 space-y-3">
        {N.steps.map((step, index) => (
          <li key={index} className="flex gap-3">
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-brand-tint text-sm font-bold text-brand-deep">{index + 1}</span>
            <span className="pt-0.5 leading-relaxed text-ink-soft">{t(step, locale).replace("{language}", t(spoken, locale))}</span>
          </li>
        ))}
      </ol>

      <h3 className="mt-7 text-sm font-bold uppercase tracking-[0.14em] text-ink-soft">{t(N.follow, locale)}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {telegram ? (
          <a href={telegram} target="_blank" rel="noopener noreferrer" className="flex min-h-14 items-center gap-3 rounded-xl bg-[#229ed9] px-4 py-3 text-white transition hover:bg-[#1b8bc0]">
            <TelegramGlyph className="h-6 w-6 flex-none" />
            <span>
              <span className="block font-bold">{t(N.telegram, locale)}</span>
              <span className="block text-xs text-white/85">{t(N.telegramHint, locale)}</span>
            </span>
          </a>
        ) : null}
        <Link href={signIn} className="flex min-h-14 items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-ink transition hover:border-brand">
          <Icon name="clipboard" className="h-6 w-6 flex-none text-brand" />
          <span>
            <span className="block font-bold">{t(N.account, locale)}</span>
            <span className="block text-xs text-ink-muted">{t(N.accountHint, locale)}</span>
          </span>
        </Link>
      </div>
      <p className="mt-4 text-sm text-ink-muted">
        {email ? `${t(N.emailed, locale).replace("{email}", email)} ` : ""}
        {t(N.keepRef, locale)}
      </p>
    </section>
  );
}
