import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Empty, NotConfigured, Stage } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured, readOr } from "@/lib/db";
import { listPartners, money, type Referral } from "@/lib/partners";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function PartnersPage() {
  if (!(await isAuthenticated())) redirect("/admin/login");

  const [partners, referrals, settings] = await Promise.all([
    listPartners(),
    readOr<Referral[]>([], (db) => db.collection<Referral>("referrals").find({}).toArray()),
    getSettings(),
  ]);

  const byPartner = new Map<string, { count: number; earned: number; owed: number }>();
  for (const referral of referrals) {
    const row = byPartner.get(referral.partnerUserId) ?? { count: 0, earned: 0, owed: 0 };
    row.count += 1;
    row.earned += referral.commissionAmount ?? 0;
    if (!referral.payoutId) row.owed += referral.commissionAmount ?? 0;
    byPartner.set(referral.partnerUserId, row);
  }

  return (
    <AdminShell
      title="Partners"
      subtitle="Referring doctors, hospitals and agents"
    >
      {!isDatabaseConfigured() && <NotConfigured />}

      {partners.length === 0 ? (
        <Empty>
          No partners yet. Approve an application, or create a login directly under Partner logins.
        </Empty>
      ) : (
        <ul className="space-y-3">
          {partners.map((partner) => {
            const stats = byPartner.get(partner._id) ?? { count: 0, earned: 0, owed: 0 };
            return (
              <li key={partner._id}>
                <Link
                  href={`/admin/partners/${partner._id}`}
                  className="card link-card flex flex-wrap items-center gap-x-4 gap-y-3 p-5"
                >
                  <span className="min-w-0 flex-1 basis-56">
                    <span className="block font-extrabold text-ink">{partner.name}</span>
                    <span className="mt-0.5 block text-sm text-ink-soft">
                      {partner.clinic ? `${partner.clinic} · ` : ""}
                      {[partner.city, partner.country].filter(Boolean).join(", ") || "Location not set"}
                    </span>
                    <span className="mt-0.5 block text-sm text-ink-soft">{partner.email}</span>
                  </span>

                  <span className="shrink-0 text-right">
                    <span className="block text-sm text-ink-soft">
                      {stats.count} referral{stats.count === 1 ? "" : "s"}
                    </span>
                    <span className="block font-semibold text-ink">
                      {money(stats.earned, settings.defaultCurrency)} earned
                    </span>
                    {stats.owed > 0 ? (
                      <span className="block text-sm font-semibold text-saffron">
                        {money(stats.owed, settings.defaultCurrency)} unpaid
                      </span>
                    ) : null}
                  </span>

                  <Stage
                    value={partner.status}
                    tone={partner.status === "active" ? "good" : "quiet"}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AdminShell>
  );
}
