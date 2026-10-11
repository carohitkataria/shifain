import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Empty, NotConfigured, Saved, Stage, Warn, adminField, adminLabel } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { listOffers, listPartners, listReferrals, money, type ReferralChannel, type ReferralStatus } from "@/lib/partners";
import { CHANNEL_LABEL, STAGE_LABEL } from "@/lib/referrals";
import { getSettings } from "@/lib/settings";
import { saveReferralAction } from "../partners/actions";

export const dynamic = "force-dynamic";

const STATUSES: ReferralStatus[] = ["new", "qualified", "travelled", "treated", "cancelled"];
const CHANNELS = Object.keys(CHANNEL_LABEL) as ReferralChannel[];

const TONE: Record<ReferralStatus, "busy" | "warn" | "good" | "quiet" | "bad"> = {
  new: "quiet",
  qualified: "busy",
  travelled: "warn",
  treated: "good",
  cancelled: "bad",
};

/** The stage each status is waiting on, so the ledger reads as a queue. */
const NEXT: Record<ReferralStatus, string> = {
  new: "Waiting on a first conversation",
  qualified: "Fit confirmed — waiting to travel",
  travelled: "In India — waiting on treatment",
  treated: "Done. Commission earned.",
  cancelled: "Closed, nothing owed",
};

export default async function ReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; status?: string; partner?: string; channel?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { saved, error, status, partner, channel } = await searchParams;

  const filter: Record<string, unknown> = {};
  if (status && STATUSES.includes(status as ReferralStatus)) filter.status = status;
  if (partner) filter.partnerUserId = partner;
  if (channel && CHANNELS.includes(channel as ReferralChannel)) {
    // Rows from before channels existed all came through the portal.
    filter.channel = channel === "portal" ? { $in: ["portal", null] } : channel;
  }

  const [referrals, offers, partners, settings] = await Promise.all([
    listReferrals(filter),
    listOffers(),
    listPartners(),
    getSettings(),
  ]);

  const earned = referrals.reduce((sum, row) => sum + (row.commissionAmount ?? 0), 0);
  const unpaid = referrals
    .filter((row) => !row.payoutId)
    .reduce((sum, row) => sum + (row.commissionAmount ?? 0), 0);

  const query = (next: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { status, partner, channel, ...next };
    for (const [key, value] of Object.entries(merged)) if (value) params.set(key, value);
    const search = params.toString();
    return search ? `/admin/referrals?${search}` : "/admin/referrals";
  };

  const back = query({});
  const duplicates = referrals.filter((row) => row.duplicateOf && row.status !== "cancelled").length;

  return (
    <AdminShell
      title="Referrals"
      subtitle="Every patient a partner sent, how they arrived, and what it earns"
    >
      {!isDatabaseConfigured() && <NotConfigured />}
      {saved ? <Saved /> : null}
      {error === "settled" ? (
        <Warn>
          That referral is already on a payout statement, so its numbers are fixed. Cancel the payout
          first if it genuinely needs changing.
        </Warn>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <p className="card p-4">
          <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">Referrals</span>
          <span className="mt-1 block text-2xl font-extrabold text-ink">{referrals.length}</span>
        </p>
        <p className="card p-4">
          <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">Commission earned</span>
          <span className="mt-1 block text-2xl font-extrabold text-ink">{money(earned, settings.defaultCurrency)}</span>
        </p>
        <p className="card p-4">
          <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">Not yet paid</span>
          <span className="mt-1 block text-2xl font-extrabold text-saffron">{money(unpaid, settings.defaultCurrency)}</span>
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href={query({ status: undefined })}
          className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
            status ? "bg-surface-muted text-ink-soft" : "bg-brand text-white"
          }`}
        >
          All stages
        </Link>
        {STATUSES.map((value) => (
          <Link
            key={value}
            href={query({ status: value })}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
              status === value ? "bg-brand text-white" : "bg-surface-muted text-ink-soft"
            }`}
          >
            {STAGE_LABEL[value]}
          </Link>
        ))}
      </div>

      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-ink-soft">Arrived via:</span>
        <Link
          href={query({ channel: undefined })}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${channel ? "bg-surface-muted text-ink-soft" : "bg-ink text-white"}`}
        >
          any
        </Link>
        {CHANNELS.map((value) => (
          <Link
            key={value}
            href={query({ channel: value })}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              channel === value ? "bg-ink text-white" : "bg-surface-muted text-ink-soft"
            }`}
          >
            {CHANNEL_LABEL[value]}
          </Link>
        ))}
      </div>

      {duplicates > 0 ? (
        <Warn>
          {duplicates} referral{duplicates === 1 ? " is" : "s are"} flagged as a possible duplicate — the
          same patient was referred earlier by another partner. Decide who earns it before it reaches a
          payout.
        </Warn>
      ) : null}

      {referrals.length === 0 ? (
        <Empty>
          Nothing here yet. A referral opens by itself the moment a partner sends a case in from the
          doctor portal.
        </Empty>
      ) : (
        <ul className="space-y-3">
          {referrals.map((referral) => (
            <li key={referral._id} id={referral._id} className="card scroll-mt-24 p-5">
              <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1 basis-56">
                  <p className="font-extrabold text-ink">
                    {referral.patientName ?? "Patient"}{" "}
                    <span className="font-mono text-sm font-normal text-ink-soft">
                      {referral.caseReference}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    From{" "}
                    <Link href={`/admin/partners/${referral.partnerUserId}`} className="font-semibold text-brand hover:underline">
                      {referral.partnerName ?? referral.partnerUserId}
                    </Link>{" "}
                    · {NEXT[referral.status] ?? ""}
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="rounded-full bg-surface-muted px-2 py-0.5 font-semibold text-ink-soft">
                      {CHANNEL_LABEL[referral.channel ?? "portal"]}
                    </span>
                    {referral.statedNeed ? (
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 font-semibold text-ink-soft">
                        {referral.statedNeed}
                      </span>
                    ) : null}
                    {referral.patientCountry ? (
                      <span className="rounded-full bg-surface-muted px-2 py-0.5 font-semibold text-ink-soft">
                        {referral.patientCountry}
                      </span>
                    ) : null}
                    {referral.duplicateOf ? (
                      <span className="rounded-full bg-saffron-tint px-2 py-0.5 font-bold text-saffron">
                        Possible duplicate of {referral.duplicateOf.slice(0, 12)}…
                      </span>
                    ) : null}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <span className="block font-semibold text-ink">
                    {money(referral.commissionAmount ?? 0, referral.currency ?? settings.defaultCurrency)}
                  </span>
                  <span className="block text-sm text-ink-soft">
                    {referral.payoutId ? "On a payout" : "Unpaid"}
                  </span>
                </div>

                <Stage value={STAGE_LABEL[referral.status]} tone={TONE[referral.status] ?? "quiet"} />
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-bold text-brand">
                  {referral.payoutId ? "View" : "Update"}
                </summary>
                <form
                  action={saveReferralAction}
                  className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-2"
                >
                  <input type="hidden" name="id" value={referral._id} />
                  <input type="hidden" name="back" value={back} />

                  {referral.history?.length ? (
                    <ol className="space-y-1.5 border-l-2 border-line pl-4 text-sm sm:col-span-2">
                      {referral.history.map((event, index) => (
                        <li key={`${event.at}-${index}`} className="text-ink-soft">
                          <span className="font-semibold text-ink">{STAGE_LABEL[event.status]}</span> ·{" "}
                          {new Date(event.at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
                          {event.by === "admin" ? "coordinator" : event.by === "case-sync" ? "case confirmed" : event.by === "system" ? "automatic" : "partner"}
                          {event.note ? ` — ${event.note}` : ""}
                        </li>
                      ))}
                    </ol>
                  ) : null}

                  <label>
                    <span className={adminLabel}>Stage</span>
                    <select
                      name="status"
                      defaultValue={referral.status}
                      disabled={Boolean(referral.payoutId)}
                      className={adminField}
                    >
                      {STATUSES.map((value) => (
                        <option key={value} value={value}>
                          {STAGE_LABEL[value]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className={adminLabel}>Offer it earns under</span>
                    <select
                      name="offerId"
                      defaultValue={referral.offerId ?? ""}
                      disabled={Boolean(referral.payoutId)}
                      className={adminField}
                    >
                      <option value="">None</option>
                      {offers.map((offer) => (
                        <option key={offer._id} value={offer._id}>
                          {offer.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className={adminLabel}>Treatment value</span>
                    <input
                      name="treatmentValue"
                      type="number"
                      step="1"
                      min="0"
                      defaultValue={referral.treatmentValue ?? ""}
                      disabled={Boolean(referral.payoutId)}
                      className={adminField}
                    />
                  </label>

                  <label>
                    <span className={adminLabel}>Currency</span>
                    <input
                      name="currency"
                      maxLength={3}
                      defaultValue={referral.currency ?? settings.defaultCurrency}
                      disabled={Boolean(referral.payoutId)}
                      className={adminField}
                    />
                  </label>

                  <label className="sm:col-span-2">
                    <span className={adminLabel}>Note</span>
                    <textarea
                      name="note"
                      rows={2}
                      defaultValue={referral.note ?? ""}
                      disabled={Boolean(referral.payoutId)}
                      className={adminField}
                    />
                  </label>

                  {referral.payoutId ? (
                    <p className="text-sm text-ink-soft sm:col-span-2">
                      Settled on payout <span className="font-mono">{referral.payoutId}</span>.
                    </p>
                  ) : (
                    <div className="sm:col-span-2">
                      <button type="submit" className="btn btn-primary !py-2.5 text-sm">
                        Save and recalculate
                      </button>
                    </div>
                  )}
                </form>
              </details>
            </li>
          ))}
        </ul>
      )}

      {partners.length > 0 ? (
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-ink-soft">By partner:</span>
          <Link href={query({ partner: undefined })} className="text-sm font-semibold text-brand">
            everyone
          </Link>
          {partners.map((row) => (
            <Link
              key={row._id}
              href={query({ partner: row._id })}
              className={`text-sm font-semibold ${partner === row._id ? "text-ink" : "text-brand"}`}
            >
              {row.name}
            </Link>
          ))}
        </div>
      ) : null}
    </AdminShell>
  );
}
