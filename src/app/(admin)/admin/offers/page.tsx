import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, Empty, NotConfigured, Saved, Stage, adminField, adminLabel } from "@/components/admin/Panel";
import { isAuthenticated } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { listOffers, money, type ReferralOffer } from "@/lib/partners";
import { deleteOfferAction, saveOfferAction } from "../partners/actions";

export const dynamic = "force-dynamic";

const KINDS = [
  { value: "percent-of-treatment", label: "Percent of the treatment bill (paid once treated)" },
  { value: "flat-per-travelled", label: "Flat amount once the patient travels" },
  { value: "flat-per-referral", label: "Flat amount once the referral qualifies" },
] as const;

const TONE = { active: "good", draft: "warn", retired: "quiet" } as const;

/** What an offer pays, said the way a partner would ask it. */
function terms(offer: ReferralOffer): string {
  const base =
    offer.kind === "percent-of-treatment"
      ? `${offer.value}% of the treatment bill, once treated`
      : offer.kind === "flat-per-travelled"
        ? `${money(offer.value, offer.currency)} once the patient travels`
        : `${money(offer.value, offer.currency)} per qualified referral`;

  const limits = [
    offer.minTreatmentValue ? `on bills over ${money(offer.minTreatmentValue, offer.currency)}` : null,
    offer.capAmount ? `capped at ${money(offer.capAmount, offer.currency)}` : null,
  ].filter(Boolean);

  return limits.length ? `${base} — ${limits.join(", ")}` : base;
}

function OfferForm({ offer }: { offer?: ReferralOffer }) {
  const formId = offer ? `offer-${offer._id}` : "offer-new";
  return (
    <form id={formId} action={saveOfferAction} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="id" value={offer?._id ?? ""} />

      <label className="sm:col-span-2">
        <span className={adminLabel}>Name</span>
        <input
          name="name"
          required
          defaultValue={offer?.name ?? ""}
          placeholder="Standard referral — 8% of treatment"
          className={adminField}
        />
      </label>

      <label className="sm:col-span-2">
        <span className={adminLabel}>What the partner is told</span>
        <textarea
          name="description"
          rows={2}
          defaultValue={offer?.description ?? ""}
          placeholder="Shown on the doctor portal. Plain words, no small print."
          className={adminField}
        />
      </label>

      <label className="sm:col-span-2">
        <span className={adminLabel}>How it pays</span>
        <select name="kind" defaultValue={offer?.kind ?? "percent-of-treatment"} className={adminField}>
          {KINDS.map((kind) => (
            <option key={kind.value} value={kind.value}>
              {kind.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span className={adminLabel}>Value (percent, or amount)</span>
        <input
          name="value"
          type="number"
          step="0.01"
          min="0"
          defaultValue={offer?.value ?? ""}
          className={adminField}
        />
      </label>

      <label>
        <span className={adminLabel}>Currency</span>
        <input
          name="currency"
          maxLength={3}
          defaultValue={offer?.currency ?? "USD"}
          className={adminField}
        />
      </label>

      <label>
        <span className={adminLabel}>Applies to</span>
        <select name="appliesTo" defaultValue={offer?.appliesTo ?? "all"} className={adminField}>
          <option value="all">Every treatment</option>
          <option value="specialty">Certain specialties</option>
          <option value="treatment">Certain treatments</option>
        </select>
      </label>

      <label>
        <span className={adminLabel}>Codes, if narrowed</span>
        <input
          name="appliesToCodes"
          defaultValue={offer?.appliesToCodes?.join(", ") ?? ""}
          placeholder="cardiology, oncology"
          className={adminField}
        />
      </label>

      <label>
        <span className={adminLabel}>Minimum bill (optional)</span>
        <input
          name="minTreatmentValue"
          type="number"
          step="1"
          min="0"
          defaultValue={offer?.minTreatmentValue ?? ""}
          className={adminField}
        />
      </label>

      <label>
        <span className={adminLabel}>Cap per referral (optional)</span>
        <input
          name="capAmount"
          type="number"
          step="1"
          min="0"
          defaultValue={offer?.capAmount ?? ""}
          className={adminField}
        />
      </label>

      <label>
        <span className={adminLabel}>Runs from (optional)</span>
        <input name="validFrom" type="date" defaultValue={offer?.validFrom ?? ""} className={adminField} />
      </label>

      <label>
        <span className={adminLabel}>Runs until (optional)</span>
        <input name="validUntil" type="date" defaultValue={offer?.validUntil ?? ""} className={adminField} />
      </label>

      <label>
        <span className={adminLabel}>Status</span>
        <select name="status" defaultValue={offer?.status ?? "draft"} className={adminField}>
          <option value="draft">Draft — not offered yet</option>
          <option value="active">Active</option>
          <option value="retired">Retired</option>
        </select>
      </label>

      <label className="flex items-center gap-2.5 self-end pb-2.5">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={offer?.isDefault ?? false}
          className="h-4 w-4 accent-[color:var(--brand)]"
        />
        <span className="text-sm font-semibold text-ink">
          Default — new referrals earn under this
        </span>
      </label>

      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button type="submit" className="btn btn-primary !py-2.5 text-sm">
          {offer ? "Save offer" : "Create offer"}
        </button>
      </div>
    </form>
  );
}

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const { saved, error } = await searchParams;

  const offers = await listOffers();
  const hasDefault = offers.some((offer) => offer.isDefault && offer.status === "active");

  return (
    <AdminShell
      title="Referral offers"
      subtitle="What a partner earns for sending us a patient. One offer is the default; individual partners can be moved onto another from their profile."
    >
      {!isDatabaseConfigured() && <NotConfigured />}
      {saved ? <Saved what={saved === "deleted" ? "offer removed" : undefined} /> : null}
      {error === "name" ? (
        <p role="alert" className="mb-6 rounded-lg bg-saffron/15 px-3.5 py-2.5 text-sm font-semibold text-ink">
          An offer needs a name.
        </p>
      ) : null}

      {offers.length > 0 && !hasDefault ? (
        <p className="mb-6 rounded-lg bg-saffron/15 px-3.5 py-2.5 text-sm font-semibold text-ink">
          No active default offer. Referrals arriving from the doctor portal will open with nothing
          attached until one is set.
        </p>
      ) : null}

      <div className="space-y-6">
        {offers.length === 0 ? (
          <Empty>No offers yet. The first one below becomes what every referral earns.</Empty>
        ) : (
          <ul className="space-y-4">
            {offers.map((offer) => (
              <li key={offer._id} className="card p-6">
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="font-extrabold text-ink">
                      {offer.name}
                      {offer.isDefault ? (
                        <span className="ml-2 rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-deep">
                          Default
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-soft">{terms(offer)}</p>
                    {offer.description ? (
                      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{offer.description}</p>
                    ) : null}
                  </div>
                  <Stage value={offer.status} tone={TONE[offer.status] ?? "quiet"} />
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-bold text-brand">Edit</summary>
                  <div className="mt-4 border-t border-line pt-4">
                    <OfferForm offer={offer} />
                    <form action={deleteOfferAction} className="mt-3">
                      <input type="hidden" name="id" value={offer._id} />
                      <button type="submit" className="btn btn-secondary !py-2.5 text-sm !text-red-600">
                        Delete this offer
                      </button>
                    </form>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}

        <Card
          title="New offer"
          hint="Commission is worked out from these terms every time a referral changes — nothing is typed in by hand."
        >
          <OfferForm />
        </Card>
      </div>
    </AdminShell>
  );
}
