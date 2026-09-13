import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, Empty, NotConfigured, Saved, Stage, Warn, adminField, adminLabel } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured, readOr } from "@/lib/db";
import { listPartners, listReferrals, money, type Payout, type PayoutStatus } from "@/lib/partners";
import { createPayoutAction, setPayoutStatusAction } from "../partners/actions";

export const dynamic = "force-dynamic";

const TONE: Record<PayoutStatus, "quiet" | "busy" | "good" | "bad"> = {
  draft: "quiet",
  approved: "busy",
  paid: "good",
  cancelled: "bad",
};

/** What you can do to a statement next, in the order money actually moves. */
const MOVES: Record<PayoutStatus, PayoutStatus[]> = {
  draft: ["approved", "cancelled"],
  approved: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
};

const when = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function PayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { saved, error } = await searchParams;

  const [payouts, partners, referrals] = await Promise.all([
    readOr<Payout[]>([], (db) =>
      db.collection<Payout>("payouts").find({}).sort({ createdAt: -1 }).limit(200).toArray(),
    ),
    listPartners(),
    listReferrals({ payoutId: null }),
  ]);

  // Who is owed something right now — the only people worth drawing a statement for.
  const owed = new Map<string, { amount: number; count: number; currency: string }>();
  for (const referral of referrals) {
    const amount = referral.commissionAmount ?? 0;
    if (amount <= 0) continue;
    const row = owed.get(referral.partnerUserId) ?? {
      amount: 0,
      count: 0,
      currency: referral.currency ?? "USD",
    };
    row.amount += amount;
    row.count += 1;
    owed.set(referral.partnerUserId, row);
  }

  const outstanding = [...owed.values()].reduce((sum, row) => sum + row.amount, 0);
  const awaitingPayment = payouts
    .filter((row) => row.status === "draft" || row.status === "approved")
    .reduce((sum, row) => sum + row.amount, 0);
  const paidOut = payouts
    .filter((row) => row.status === "paid")
    .reduce((sum, row) => sum + row.amount, 0);

  return (
    <AdminShell
      title="Commissions & payouts"
      subtitle="Earned commission gathered into statements. A referral can only ever sit on one statement, so nothing gets paid twice."
    >
      {!isDatabaseConfigured() && <NotConfigured />}
      {saved ? <Saved what={saved === "drafted" ? "statement drawn" : undefined} /> : null}
      {error === "nothing" ? (
        <Warn>That partner has nothing unpaid to draw a statement from.</Warn>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <p className="card p-4">
          <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
            Earned, not yet on a statement
          </span>
          <span className="mt-1 block text-2xl font-extrabold text-saffron">{money(outstanding)}</span>
        </p>
        <p className="card p-4">
          <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
            On a statement, unpaid
          </span>
          <span className="mt-1 block text-2xl font-extrabold text-ink">{money(awaitingPayment)}</span>
        </p>
        <p className="card p-4">
          <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">Paid out</span>
          <span className="mt-1 block text-2xl font-extrabold text-leaf">{money(paidOut)}</span>
        </p>
      </div>

      <div className="space-y-6">
        <Card
          title="Ready to draw"
          hint="Everything a partner has earned and not been paid for, gathered in one click."
        >
          {owed.size === 0 ? (
            <p className="text-sm leading-relaxed text-ink-soft">
              Nobody is owed anything at the moment.
            </p>
          ) : (
            <ul className="space-y-3">
              {[...owed.entries()].map(([partnerUserId, row]) => {
                const partner = partners.find((candidate) => candidate._id === partnerUserId);
                return (
                  <li
                    key={partnerUserId}
                    className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg bg-surface-muted p-4"
                  >
                    <span className="min-w-0 flex-1 basis-48">
                      <span className="block font-bold text-ink">
                        {partner?.name ?? partnerUserId}
                      </span>
                      <span className="block text-sm text-ink-soft">
                        {row.count} referral{row.count === 1 ? "" : "s"}
                        {partner?.payoutMethod ? ` · pays via ${partner.payoutMethod}` : " · no payout method on file"}
                      </span>
                    </span>
                    <span className="shrink-0 font-extrabold text-ink">
                      {money(row.amount, row.currency)}
                    </span>
                    <form action={createPayoutAction} className="shrink-0">
                      <input type="hidden" name="partnerUserId" value={partnerUserId} />
                      <button type="submit" className="btn btn-primary !py-2 text-sm">
                        Draw a statement
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {payouts.length === 0 ? (
          <Empty>No statements drawn yet.</Empty>
        ) : (
          <ul className="space-y-3">
            {payouts.map((payout) => (
              <li key={payout._id} className="card p-5">
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="font-extrabold text-ink">{payout.partnerName ?? payout.partnerUserId}</p>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {payout.referralIds.length} referral{payout.referralIds.length === 1 ? "" : "s"} ·
                      drawn {when(payout.createdAt)}
                      {payout.paidAt ? ` · paid ${when(payout.paidAt)}` : ""}
                    </p>
                    {payout.reference ? (
                      <p className="mt-0.5 font-mono text-sm text-ink-soft">{payout.reference}</p>
                    ) : null}
                  </div>
                  <span className="shrink-0 font-extrabold text-ink">
                    {money(payout.amount, payout.currency)}
                  </span>
                  <Stage value={payout.status} tone={TONE[payout.status] ?? "quiet"} />
                </div>

                {MOVES[payout.status]?.length ? (
                  <form
                    action={setPayoutStatusAction}
                    className="mt-4 flex flex-wrap items-end gap-3 border-t border-line pt-4"
                  >
                    <input type="hidden" name="id" value={payout._id} />
                    <label className="min-w-48 flex-1">
                      <span className={adminLabel}>Bank or transfer reference</span>
                      <input
                        name="reference"
                        defaultValue={payout.reference ?? ""}
                        placeholder="Optional — for your own records"
                        className={adminField}
                      />
                    </label>
                    {MOVES[payout.status].map((next) => (
                      <button
                        key={next}
                        type="submit"
                        name="status"
                        value={next}
                        className={`btn !py-2.5 text-sm ${
                          next === "cancelled" ? "btn-secondary !text-red-600" : "btn-primary"
                        }`}
                      >
                        {next === "approved"
                          ? "Approve"
                          : next === "paid"
                            ? "Mark paid"
                            : "Cancel and release"}
                      </button>
                    ))}
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  );
}
