import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAuthenticated } from "@/lib/auth";
import { readOr } from "@/lib/db";
import { listProviders } from "@/lib/journey";
import type { Provider, ProviderKind } from "@/lib/journey-rules";
import type { Hospital } from "@/lib/catalogue";
import { deleteProviderAction, saveProviderAction } from "./actions";

export const dynamic = "force-dynamic";

const field =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint";
const label = "mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft";
const KINDS: { kind: ProviderKind; label: string; one: string }[] = [
  { kind: "driver", label: "Drivers & vehicles", one: "driver" },
  { kind: "hotel", label: "Hotels", one: "hotel" },
  { kind: "interpreter", label: "Interpreters", one: "interpreter" },
];

function ProviderForm({ kind, item, hospitals }: { kind: ProviderKind; item?: Provider; hospitals: Hospital[] }) {
  return (
    <form action={saveProviderAction} className="grid gap-3 sm:grid-cols-3">
      <input type="hidden" name="kind" value={kind} />
      {item ? <input type="hidden" name="id" value={item._id} /> : null}
      <label className="sm:col-span-2">
        <span className={label}>{kind === "hotel" ? "Hotel name" : "Name"}</span>
        <input name="name" required defaultValue={item?.name ?? ""} className={field} />
      </label>
      <label>
        <span className={label}>City</span>
        <input name="city" defaultValue={item?.city ?? ""} placeholder="Gurgaon" className={field} />
      </label>
      <label>
        <span className={label}>Phone</span>
        <input name="phone" defaultValue={item?.phone ?? ""} placeholder="+91…" className={field} />
      </label>
      <label>
        <span className={label}>Telegram</span>
        <input name="telegram" defaultValue={item?.telegram ?? ""} placeholder="username or phone" className={field} />
      </label>
      <label>
        <span className={label}>WhatsApp</span>
        <input name="whatsapp" defaultValue={item?.whatsapp ?? ""} placeholder="+91…" className={field} />
      </label>
      {kind === "driver" ? (
        <>
          <label>
            <span className={label}>Vehicle</span>
            <input name="model" defaultValue={item?.vehicle?.model ?? ""} placeholder="Toyota Innova" className={field} />
          </label>
          <label>
            <span className={label}>Number plate</span>
            <input name="plate" defaultValue={item?.vehicle?.plate ?? ""} placeholder="HR26 AB 1234" className={field} />
          </label>
          <label>
            <span className={label}>Colour · seats</span>
            <span className="flex gap-2">
              <input name="colour" defaultValue={item?.vehicle?.colour ?? ""} placeholder="White" className={field} />
              <input name="seats" type="number" min={1} max={20} defaultValue={item?.vehicle?.seats ?? ""} className={`${field} !w-20`} />
            </span>
          </label>
        </>
      ) : null}
      {kind === "hotel" ? (
        <>
          <label className="sm:col-span-3">
            <span className={label}>Address</span>
            <input name="address" defaultValue={item?.address ?? ""} className={field} />
          </label>
          <label>
            <span className={label}>Km to hospital</span>
            <input name="distanceKm" inputMode="decimal" defaultValue={item?.distanceKm ?? ""} className={field} />
          </label>
          <label>
            <span className={label}>Check-in time</span>
            <input name="checkInTime" type="time" defaultValue={item?.checkInTime ?? "12:00"} className={field} />
          </label>
          <label>
            <span className={label}>Check-out time</span>
            <input name="checkOutTime" type="time" defaultValue={item?.checkOutTime ?? "11:00"} className={field} />
          </label>
          <fieldset className="sm:col-span-3">
            <legend className={label}>Near these hospitals</legend>
            <div className="flex flex-wrap gap-3 text-sm">
              {hospitals.map((hospital) => (
                <label key={hospital._id} className="flex items-center gap-1.5">
                  <input type="checkbox" name="hospitalIds" value={hospital._id} defaultChecked={item?.hospitalIds.includes(hospital._id)} />
                  {hospital.name}, {hospital.city}
                </label>
              ))}
            </div>
          </fieldset>
        </>
      ) : null}
      <label className={kind === "hotel" ? "sm:col-span-2" : "sm:col-span-2"}>
        <span className={label}>Languages (comma separated)</span>
        <input name="languages" defaultValue={item?.languages.join(", ") ?? ""} placeholder="English, Russian, Uzbek" className={field} />
      </label>
      <label>
        <span className={label}>Status</span>
        <select name="active" defaultValue={item?.active === false ? "off" : "on"} className={field}>
          <option value="on">Active</option>
          <option value="off">Inactive</option>
        </select>
      </label>
      <label className="sm:col-span-3">
        <span className={label}>Note (desk only)</span>
        <input name="note" defaultValue={item?.note ?? ""} className={field} />
      </label>
      <div className="sm:col-span-3">
        <button className="btn btn-primary text-sm">{item ? "Save" : "Add"}</button>
      </div>
    </form>
  );
}

/** The drivers, hotels and interpreters the desk assigns to a patient's trip. */
export default async function ProvidersPage({ searchParams }: { searchParams: Promise<{ kind?: string; saved?: string; error?: string }> }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const query = await searchParams;
  const kind = (KINDS.find((item) => item.kind === query.kind)?.kind ?? "driver") as ProviderKind;
  const [items, hospitals] = await Promise.all([
    listProviders(kind),
    readOr<Hospital[]>([], (db) => db.collection<Hospital>("hospitals").find({ "publication.state": "published" }, { projection: { name: 1, city: 1 } }).sort({ name: 1 }).toArray()),
  ]);
  const meta = KINDS.find((item) => item.kind === kind)!;

  return (
    <AdminShell title="Service providers" subtitle="Assigned to a patient from their case's care desk">
      {query.saved ? <p className="mb-4 rounded-lg bg-leaf/10 px-3 py-2 text-sm font-semibold text-leaf">Saved.</p> : null}
      {query.error ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">A name is required.</p> : null}
      <nav className="mb-4 flex flex-wrap gap-2" aria-label="Kinds">
        {KINDS.map((item) => (
          <Link
            key={item.kind}
            href={`/admin/providers?kind=${item.kind}`}
            aria-current={item.kind === kind ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ${item.kind === kind ? "bg-brand text-white ring-brand" : "bg-white text-ink-soft ring-line hover:text-brand"}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <section className="card p-5">
        <h2 className="text-base font-extrabold text-ink">Add a {meta.one}</h2>
        <div className="mt-3">
          <ProviderForm kind={kind} hospitals={hospitals} />
        </div>
      </section>

      <ul className="mt-4 space-y-3">
        {items.length === 0 ? <li className="card p-5 text-sm text-ink-soft">None yet.</li> : null}
        {items.map((item) => (
          <li key={item._id} className="card p-4">
            <details>
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                <span>
                  <strong className="text-ink">{item.name}</strong>
                  <span className="ml-2 text-sm text-ink-soft">
                    {[item.vehicle?.model, item.vehicle?.plate, item.city, item.phone, item.languages.join(", ")].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${item.active ? "bg-leaf-tint text-leaf" : "bg-surface-muted text-ink-muted"}`}>
                  {item.active ? "active" : "inactive"}
                </span>
              </summary>
              <div className="mt-4">
                <ProviderForm kind={kind} item={item} hospitals={hospitals} />
                <form action={deleteProviderAction} className="mt-3">
                  <input type="hidden" name="id" value={item._id} />
                  <input type="hidden" name="kind" value={kind} />
                  <button className="text-sm font-semibold text-red-600 hover:underline">Delete</button>
                </form>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </AdminShell>
  );
}
