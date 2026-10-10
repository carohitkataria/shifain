import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdminShell, Notice, SaveButton } from "@/components/admin/AdminShell";
import { Card, Stage, adminField, adminLabel } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import type { PartnerUser } from "@/lib/partner-auth";
import { listOffers, money, type Payout, type Referral } from "@/lib/partners";
import { regenerateReferralCodeAction, savePartnerProfileAction, setPartnerCredentialsAction } from "../actions";
import { STAGE_LABEL, ensureReferralCode, referralLinks } from "@/lib/referrals";
import { createPayoutAction } from "../actions";

export const dynamic = "force-dynamic";

const REFERRAL_TONE = {
  new: "quiet", qualified: "busy", travelled: "busy", treated: "good", cancelled: "quiet",
} as const;

export default async function PartnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  if (!isDatabaseConfigured()) notFound();

  const { id } = await params;
  const { saved, error } = await searchParams;

  const db = await getDb();
  const partner = await db.collection<PartnerUser>("partner_users").findOne({ _id: id });
  if (!partner) notFound();

  const [offers, referrals, payouts, settings] = await Promise.all([
    listOffers(),
    db.collection<Referral>("referrals").find({ partnerUserId: id }).sort({ createdAt: -1 }).toArray(),
    db.collection<Payout>("payouts").find({ partnerUserId: id }).sort({ createdAt: -1 }).toArray(),
    getSettings(),
  ]);

  const code = partner.status === "active" ? await ensureReferralCode(partner).catch(() => null) : null;
  const links = code ? await referralLinks(code) : null;

  const owed = referrals
    .filter((row) => !row.payoutId)
    .reduce((sum, row) => sum + (row.commissionAmount ?? 0), 0);

  return (
    <AdminShell
      title={partner.name}
      subtitle={`${partner.email} · ${partner.role}`}
      action={<SaveButton form="partner-form">Save partner</SaveButton>}
    >
      <Link href="/admin/partners" className="mb-6 inline-block text-sm font-bold text-brand hover:underline">
        &larr; All partners
      </Link>

      {saved === "password" ? (
        <Notice>Password set — hand it to the partner now; it is not shown again.</Notice>
      ) : saved === "code" ? (
        <Notice>New referral code issued. The old link no longer credits this partner.</Notice>
      ) : saved === "status" ? (
        <Notice>Account status updated.</Notice>
      ) : saved ? (
        <Notice>Saved.</Notice>
      ) : null}
      {error === "short" ? (
        <p role="alert" className="mb-6 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
          A password needs at least 8 characters.
        </p>
      ) : null}

      <form id="partner-form" action={savePartnerProfileAction} className="space-y-5">
        <input type="hidden" name="id" value={partner._id} />

        <Card title="Who they are" hint="Used to target broadcasts and to know which market a referral came from.">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block min-w-0">
              <span className={adminLabel}>Name</span>
              <input name="name" defaultValue={partner.name} className={adminField} />
            </label>
            <label className="block min-w-0">
              <span className={adminLabel}>Clinic or hospital</span>
              <input name="clinic" defaultValue={partner.clinic ?? ""} className={adminField} />
            </label>
            <label className="block min-w-0">
              <span className={adminLabel}>Country</span>
              <input name="country" defaultValue={partner.country ?? ""} className={adminField} />
            </label>
            <label className="block min-w-0">
              <span className={adminLabel}>City</span>
              <input name="city" defaultValue={partner.city ?? ""} className={adminField} />
            </label>
            <label className="block min-w-0 sm:col-span-2">
              <span className={adminLabel}>Specialty</span>
              <input name="specialty" defaultValue={partner.specialty ?? ""} className={adminField} />
            </label>
          </div>
        </Card>

        <Card
          title="What they earn"
          hint="The offer a new referral from them opens under. Changing it never rewrites a referral already agreed."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block min-w-0">
              <span className={adminLabel}>Referral offer</span>
              <select name="offerId" defaultValue={partner.offerId ?? ""} className={adminField}>
                <option value="">Use the default offer</option>
                {offers.map((offer) => (
                  <option key={offer._id} value={offer._id}>
                    {offer.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0">
              <span className={adminLabel}>Payout method</span>
              <input
                name="payoutMethod"
                defaultValue={partner.payoutMethod ?? ""}
                placeholder="Bank transfer, Wise…"
                className={adminField}
              />
            </label>
            <label className="block min-w-0">
              <span className={adminLabel}>Payout details</span>
              <input
                name="payoutDetails"
                defaultValue={partner.payoutDetails ?? ""}
                placeholder="Account reference"
                className={adminField}
              />
            </label>
          </div>
        </Card>

        <div className="flex justify-end pt-2">
          <SaveButton form="partner-form">Save partner</SaveButton>
        </div>
      </form>

      <div className="mt-5">
        <Card
          title="Referral link"
          hint="Patients who start from this link or code on the website, website chat or Telegram are credited to this partner automatically."
        >
          {links ? (
            <div className="space-y-3 text-sm">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-base font-bold text-ink">{links.code}</span>
                <span className="text-ink-soft">{partner.referralStats?.clicks ?? 0} link visits</span>
                <span className={partner.telegramChatId ? "font-semibold text-leaf" : "text-ink-muted"}>
                  {partner.telegramChatId ? "Telegram connected" : "Telegram not connected"}
                </span>
              </p>
              <p className="break-all font-mono text-ink-soft">{links.web}</p>
              {links.telegram ? <p className="break-all font-mono text-ink-soft">{links.telegram}</p> : null}
              <form action={regenerateReferralCodeAction}>
                <input type="hidden" name="id" value={partner._id} />
                <button type="submit" className="btn btn-secondary !py-2 text-sm">
                  Issue a new code
                </button>
              </form>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">A code is issued once the account is active.</p>
          )}
        </Card>
      </div>

      <form action={setPartnerCredentialsAction} className="mt-5">
        <input type="hidden" name="id" value={partner._id} />
        <Card
          title="Sign-in credentials"
          hint="The partner signs in at /portal/doctor with their email and this password. Setting a new one replaces the old immediately; hand it over directly, as it is never shown again."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block min-w-0">
              <span className={adminLabel}>Email (their username)</span>
              <input value={partner.email} disabled className={`${adminField} opacity-70`} />
            </label>
            <label className="block min-w-0">
              <span className={adminLabel}>New password</span>
              <input
                name="password"
                type="text"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className={adminField}
              />
            </label>
            <label className="block min-w-0">
              <span className={adminLabel}>Account status</span>
              <select name="status" defaultValue={partner.status} className={adminField}>
                <option value="active">Active — can sign in</option>
                <option value="suspended">Suspended — blocked</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="submit" className="btn btn-primary !py-2.5 text-sm">
              Set credentials
            </button>
          </div>
        </Card>
      </form>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-xl font-extrabold tracking-tight text-ink">Their referrals</h2>
          {owed > 0 ? (
            <form action={createPayoutAction}>
              <input type="hidden" name="partnerUserId" value={partner._id} />
              <button type="submit" className="btn btn-primary !py-2.5 text-sm">
                Draw a statement for {money(owed, settings.defaultCurrency)}
              </button>
            </form>
          ) : null}
        </div>

        {referrals.length === 0 ? (
          <p className="card mt-4 p-6 text-ink-soft">Nothing referred yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {referrals.map((referral) => (
              <li key={referral._id} className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                <span className="min-w-0 flex-1 basis-48">
                  <span className="block font-semibold text-ink">
                    {referral.patientName ?? referral.caseReference}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-muted">{referral.caseReference}</span>
                </span>
                <Stage value={STAGE_LABEL[referral.status]} tone={REFERRAL_TONE[referral.status]} />
                <span className="shrink-0 text-sm font-semibold text-ink">
                  {referral.commissionAmount
                    ? money(referral.commissionAmount, referral.currency ?? settings.defaultCurrency)
                    : "—"}
                </span>
                <span className="shrink-0 text-xs text-ink-muted">
                  {referral.payoutId ? "on a statement" : "unpaid"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {payouts.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl font-extrabold tracking-tight text-ink">Their statements</h2>
          <ul className="mt-4 space-y-2">
            {payouts.map((payout) => (
              <li key={payout._id} className="card flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                <span className="min-w-0 flex-1 basis-48 text-sm text-ink-soft">
                  {payout.createdAt.slice(0, 10)} · {payout.referralIds.length} referrals
                </span>
                <span className="shrink-0 font-semibold text-ink">
                  {money(payout.amount, payout.currency)}
                </span>
                <Stage value={payout.status} tone={payout.status === "paid" ? "good" : "busy"} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AdminShell>
  );
}
