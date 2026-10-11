import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { IntakeForm } from "@/components/IntakeForm";
import { CopyField } from "@/components/portal/CopyField";
import { getContent } from "@/lib/store";
import { currentPartner } from "@/lib/partner-auth";
import { isDatabaseConfigured } from "@/lib/db";
import { DOCTOR_COPY } from "@/lib/doctor-copy";
import { broadcastsFor, listReferrals, money, payoutsFor, type ReferralStatus } from "@/lib/partners";
import {
  STAGE_ORDER,
  botUsername,
  describeOffer,
  ensureReferralCode,
  partnerCanViewPlan,
  pipelineOf,
  referralLinks,
  resolveOffer,
  shortName,
  telegramLinkPayload,
} from "@/lib/referrals";
import { getSettings } from "@/lib/settings";
import { t } from "@/lib/localize";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { doctorLogoutAction, referPatientAction } from "./actions";

export const dynamic = "force-dynamic";

const STAGE_TONE: Record<ReferralStatus, string> = {
  new: "bg-surface-muted text-ink-soft",
  qualified: "bg-brand-tint text-brand-deep",
  travelled: "bg-saffron-tint text-saffron",
  treated: "bg-leaf-tint text-leaf",
  cancelled: "bg-surface-muted text-ink-muted",
};

const fmtDate = (iso: string, locale: Locale) =>
  new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default async function DoctorPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale: raw } = await params;
  const { error } = await searchParams;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  if (!isDatabaseConfigured()) redirect(`/${locale}/portal/doctor/login`);
  const doctor = await currentPartner().catch(() => null);
  if (!doctor || doctor.role !== "doctor") redirect(`/${locale}/portal/doctor/login`);

  const code = await ensureReferralCode(doctor).catch((error) => {
    console.error("[shifain] could not issue referral code", doctor._id, error);
    return null;
  });
  const [content, notices, referrals, payouts, settings, links, offer, partnerBot] = await Promise.all([
    getContent(),
    broadcastsFor(doctor),
    listReferrals({ partnerUserId: doctor._id }),
    payoutsFor(doctor._id),
    getSettings(),
    code ? referralLinks(code) : Promise.resolve(null),
    resolveOffer(doctor, null),
    botUsername("partner"),
  ]);

  const R = DOCTOR_COPY.referral;
  const pipeline = pipelineOf(referrals, doctor.referralStats?.clicks ?? 0);
  const currency = referrals[0]?.currency ?? offer?.currency ?? settings.defaultCurrency;
  const telegramConnect = partnerBot
    ? `https://t.me/${partnerBot}?start=${telegramLinkPayload(doctor._id)}`
    : null;

  return (
    <>
      <Header content={content} locale={locale} path="/portal/doctor" />

      <main className="bg-surface-muted px-4 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-4xl space-y-6">
          {/* Who */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
                {t(DOCTOR_COPY.signInTitle, locale)}
              </p>
              <h1 className="mt-1 truncate text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                {doctor.name}
              </h1>
              {doctor.clinic || doctor.city ? (
                <p className="mt-0.5 text-sm text-ink-soft">
                  {[doctor.clinic, doctor.city, doctor.country].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>
            <form action={doctorLogoutAction}>
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="btn btn-secondary min-h-11 !py-2 text-sm">
                {t(DOCTOR_COPY.signOut, locale)}
              </button>
            </form>
          </div>

          {/* Referral link */}
          {links ? (
          <section
            aria-labelledby="ref-link"
            className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-deep to-brand p-5 text-white shadow-lg shadow-brand/20 sm:p-7"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 basis-64">
                <h2 id="ref-link" className="text-lg font-extrabold sm:text-xl">
                  {t(R.linkTitle, locale)}
                </h2>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/80">{t(R.linkBody, locale)}</p>
              </div>
              <p className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
                {pipeline.clicks} {t(R.visits, locale)}
              </p>
            </div>

            <div className="mt-5">
              <CopyField
                value={links.web}
                label={t(R.linkTitle, locale)}
                copyLabel={t(R.copy, locale)}
                copiedLabel={t(R.copied, locale)}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={links.whatsappShare}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-bold transition-colors hover:bg-white/25"
              >
                <Icon name="chat" className="h-4 w-4" />
                {t(R.shareWhatsapp, locale)}
              </a>
              <a
                href={links.telegramShare}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-bold transition-colors hover:bg-white/25"
              >
                <Icon name="plane" className="h-4 w-4" />
                {t(R.shareTelegram, locale)}
              </a>
              <span className="ml-auto text-sm text-white/80">
                {t(R.code, locale)}: <span className="font-mono font-bold text-white">{code}</span>
              </span>
            </div>

            {links.telegram ? (
              <p className="mt-3 break-all text-xs text-white/70">
                {t(R.telegramBot, locale)}: <span className="font-mono">{links.telegram}</span>
              </p>
            ) : null}

            <p className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-sm">
              <span className="font-bold">{t(R.terms, locale)}:</span> {describeOffer(offer)}
            </p>
          </section>
          ) : null}

          {/* Pipeline */}
          <section aria-labelledby="pipeline" className="card p-5 sm:p-7">
            <h2 id="pipeline" className="text-lg font-extrabold tracking-tight text-ink sm:text-xl">
              {t(R.pipelineTitle, locale)}
            </h2>
            <ol className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STAGE_ORDER.map((stage, index) => (
                <li key={stage} className="rounded-xl border border-line bg-surface-muted/60 p-4">
                  <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] text-white">
                      {index + 1}
                    </span>
                    {t(R.stages[stage], locale)}
                  </span>
                  <span className="mt-2 block text-2xl font-extrabold tabular-nums text-ink">
                    {pipeline.counts[stage]}
                  </span>
                </li>
              ))}
            </ol>

            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5 sm:grid-cols-4">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                  {t(DOCTOR_COPY.earned, locale)}
                </dt>
                <dd className="mt-0.5 text-xl font-extrabold tabular-nums text-ink">
                  {money(pipeline.earned, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-ink-soft">{t(R.awaiting, locale)}</dt>
                <dd className="mt-0.5 text-xl font-extrabold tabular-nums text-saffron">
                  {money(pipeline.pending, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                  {t(DOCTOR_COPY.paid, locale)}
                </dt>
                <dd className="mt-0.5 text-xl font-extrabold tabular-nums text-leaf">
                  {money(pipeline.paid, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-ink-soft">{t(R.conversion, locale)}</dt>
                <dd className="mt-0.5 text-xl font-extrabold tabular-nums text-ink">{pipeline.conversion}%</dd>
              </div>
            </dl>
            <p className="mt-4 text-sm leading-relaxed text-ink-soft">{t(DOCTOR_COPY.commissionNote, locale)}</p>
          </section>

          {/* Telegram */}
          {telegramConnect || doctor.telegramChatId ? (
            <section className="card flex flex-wrap items-center gap-4 p-5 sm:p-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#229ED9]/10 text-[#229ED9]">
                <Icon name="chat" className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1 basis-56">
                <h2 className="font-extrabold text-ink">{t(R.telegramTitle, locale)}</h2>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{t(R.telegramBody, locale)}</p>
              </div>
              {doctor.telegramChatId ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-tint px-3 py-1.5 text-sm font-semibold text-leaf">
                  <Icon name="check" className="h-4 w-4" />
                  {t(R.telegramConnected, locale)}
                </span>
              ) : telegramConnect ? (
                <a
                  href={telegramConnect}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary min-h-11 !py-2 text-sm"
                >
                  {t(R.telegramConnect, locale)}
                </a>
              ) : null}
            </section>
          ) : null}

          {/* Notices */}
          {notices.length > 0 ? (
            <section aria-labelledby="notices">
              <h2 id="notices" className="text-lg font-extrabold tracking-tight text-ink">
                {t(DOCTOR_COPY.notices, locale)}
              </h2>
              <ul className="mt-3 space-y-3">
                {notices.map((notice) => (
                  <li key={notice._id} className={`card p-5 ${notice.pinned ? "border-l-4 border-l-brand" : ""}`}>
                    <p className="font-extrabold text-ink">{notice.title}</p>
                    <p className="mt-1 whitespace-pre-line leading-relaxed text-ink-soft">{notice.body}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Referred patients */}
          <section aria-labelledby="patients">
            <h2 id="patients" className="text-lg font-extrabold tracking-tight text-ink">
              {t(DOCTOR_COPY.dashboardTitle, locale)}
            </h2>

            {referrals.length === 0 ? (
              <p className="card mt-3 p-6 leading-relaxed text-ink-soft">{t(DOCTOR_COPY.empty, locale)}</p>
            ) : (
              <>
                <ul className="mt-3 space-y-3">
                  {referrals.map((item) => {
                    const channel = item.channel ?? "portal";
                    const canView = partnerCanViewPlan(item);
                    const reached = STAGE_ORDER.indexOf(item.status);
                    return (
                      <li key={item._id} className="card p-4 sm:p-5">
                        <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                          <div className="min-w-0 flex-1 basis-48">
                            <p className="truncate font-semibold text-ink">
                              {canView ? item.patientName : shortName(item.patientName)}
                            </p>
                            <p className="mt-0.5 text-sm text-ink-soft">
                              {[item.statedNeed, item.patientCountry].filter(Boolean).join(" · ")}
                              {item.statedNeed || item.patientCountry ? " · " : ""}
                              {fmtDate(item.createdAt, locale)}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${STAGE_TONE[item.status]}`}
                          >
                            {t(R.stages[item.status], locale)}
                          </span>
                        </div>

                        {item.status !== "cancelled" ? (
                          <ol className="mt-3 flex items-center gap-1.5" aria-label={t(R.pipelineTitle, locale)}>
                            {STAGE_ORDER.map((stage, index) => (
                              <li
                                key={stage}
                                aria-current={index === reached ? "step" : undefined}
                                className={`h-1.5 flex-1 rounded-full ${
                                  index <= reached ? "bg-brand" : "bg-line"
                                }`}
                              >
                                <span className="sr-only">{t(R.stages[stage], locale)}</span>
                              </li>
                            ))}
                          </ol>
                        ) : null}

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                          <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-ink-soft">
                            {t(R.channel[channel], locale)}
                          </span>
                          <span className="text-ink-soft">
                            {t(R.commission, locale)}:{" "}
                            <span className="font-semibold text-ink">
                              {item.commissionAmount
                                ? money(item.commissionAmount, item.currency ?? currency)
                                : t(R.pending, locale)}
                            </span>
                          </span>
                          {item.duplicateOf ? (
                            <span className="text-xs font-semibold text-saffron">{t(R.duplicate, locale)}</span>
                          ) : null}
                          {canView ? (
                            <Link
                              href={`/${locale}/plan/${item.caseReference}`}
                              className="ml-auto inline-flex min-h-11 items-center font-semibold text-brand hover:underline"
                            >
                              {t(DOCTOR_COPY.viewPlan, locale)} &rarr;
                            </Link>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {referrals.some((item) => !partnerCanViewPlan(item)) ? (
                  <p className="mt-3 text-sm leading-relaxed text-ink-muted">{t(R.selfReferredNote, locale)}</p>
                ) : null}
              </>
            )}
          </section>

          {/* Payouts */}
          {payouts.length > 0 ? (
            <section aria-labelledby="payouts" className="card p-5 sm:p-7">
              <h2 id="payouts" className="text-lg font-extrabold tracking-tight text-ink">
                {t(R.payoutsTitle, locale)}
              </h2>
              <ul className="mt-3 divide-y divide-line">
                {payouts.map((payout) => (
                  <li key={payout._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                    <span className="min-w-0 flex-1 text-sm text-ink-soft">
                      {fmtDate(payout.createdAt, locale)} · {payout.referralIds.length}
                      {payout.reference ? ` · ${payout.reference}` : ""}
                    </span>
                    <span className="font-semibold tabular-nums text-ink">{money(payout.amount, payout.currency)}</span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        payout.status === "paid"
                          ? "bg-leaf-tint text-leaf"
                          : payout.status === "cancelled"
                            ? "bg-surface-muted text-ink-muted"
                            : "bg-brand-tint text-brand-deep"
                      }`}
                    >
                      {t(R.payoutStatus[payout.status], locale)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Refer a patient */}
          <section id="refer" aria-labelledby="refer-title" className="card scroll-mt-24 p-5 sm:p-7">
            <h2 id="refer-title" className="text-lg font-extrabold tracking-tight text-ink sm:text-xl">
              {t(DOCTOR_COPY.referTitle, locale)}
            </h2>
            <p className="mt-1.5 leading-relaxed text-ink-soft">{t(DOCTOR_COPY.referBody, locale)}</p>

            {error ? (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
                {error === "consent" ? t(R.consentMissing, locale) : t(R.formError, locale)}
              </p>
            ) : null}

            <form action={referPatientAction} className="mt-6 space-y-4">
              <input type="hidden" name="locale" value={locale} />
              <IntakeForm
                locale={locale}
                compact
                treatments={content.specialties.items.map((item) => ({ slug: item.slug, title: item.title }))}
                labels={{
                  name: t(DOCTOR_COPY.patientName, locale),
                  namePlaceholder: "",
                  phone: t(DOCTOR_COPY.patientPhone, locale),
                  phonePlaceholder: "",
                  country: t(DOCTOR_COPY.patientCountry, locale),
                  countryPlaceholder: t(DOCTOR_COPY.patientCountry, locale),
                  treatment: t(DOCTOR_COPY.need, locale),
                  treatmentPlaceholder: t(DOCTOR_COPY.needPlaceholder, locale),
                  reports: t(DOCTOR_COPY.reports, locale),
                  reportsHint: t(DOCTOR_COPY.reportsNote, locale),
                  submit: t(DOCTOR_COPY.submit, locale),
                  privacy: t(DOCTOR_COPY.privacy, locale),
                  emailLabel: t(R.patientEmail, locale),
                  consent: t(R.consent, locale),
                }}
              />
            </form>
          </section>
        </div>
      </main>

      <Footer content={content} locale={locale} />
    </>
  );
}
