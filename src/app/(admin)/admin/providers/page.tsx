import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isAuthenticated } from "@/lib/auth";
import { readOr } from "@/lib/db";
import { listProviders } from "@/lib/journey";
import type { Provider, ProviderKind } from "@/lib/journey-rules";
import type { Hospital } from "@/lib/catalogue";
import { CIcon } from "@/components/console/CIcon";
import { Av, Empty, Note, Pill, Tabs, btn, initialsOf } from "@/components/console/ui";
import { allCases, isHere } from "@/lib/console";
import { indiaToday } from "@/lib/patient-app";
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

const TONE_OF: Record<ProviderKind, "amber" | "teal" | "brand"> = { driver: "amber", hotel: "teal", interpreter: "brand" };

const digits = (value: string) => value.replace(/[^\d]/g, "");

/** The drivers, hotels and interpreters the desk assigns to a patient's trip. */
export default async function ProvidersPage({ searchParams }: { searchParams: Promise<{ kind?: string; saved?: string; error?: string }> }) {
  if (!(await isAuthenticated())) redirect("/admin/login");
  const query = await searchParams;
  const kind = (KINDS.find((item) => item.kind === query.kind)?.kind ?? "driver") as ProviderKind;
  const [items, everyone, hospitals, cases] = await Promise.all([
    listProviders(kind),
    listProviders(),
    readOr<Hospital[]>([], (db) => db.collection<Hospital>("hospitals").find({ "publication.state": "published" }, { projection: { name: 1, city: 1 } }).sort({ name: 1 }).toArray()),
    allCases(),
  ]);
  const meta = KINDS.find((item) => item.kind === kind)!;
  const today = indiaToday();
  const live = cases.filter((record) => record.status !== "closed");
  const load = (item: Provider) => {
    if (item.kind === "hotel") return { label: "Guests now", value: live.filter((record) => record.care?.hotelId === item._id && isHere(record)).length };
    if (item.kind === "interpreter") return { label: "Patients", value: live.filter((record) => record.care?.interpreterId === item._id).length };
    return {
      label: "Jobs today",
      value: live.reduce((sum, record) => sum + (record.rides ?? []).filter((ride) => ride.driverId === item._id && ride.status !== "cancelled" && (ride.when === "now" ? ride.requestedAt.slice(0, 10) : ride.when.slice(0, 10)) === today).length, 0),
    };
  };

  return (
    <AdminShell
      title="Providers"
      subtitle="Drivers, hotels and interpreters on the ground"
      action={
        <details className="relative">
          <summary className={`${btn.primary} cursor-pointer list-none`}>
            <CIcon name="plus" size={16} />
            Add {meta.one}
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-[min(92vw,640px)] rounded-2xl border border-line bg-white p-4 shadow-xl">
            <ProviderForm kind={kind} hospitals={hospitals} />
          </div>
        </details>
      }
    >
      {query.saved ? <div className="mb-4"><Note tone="green" icon="check">Saved.</Note></div> : null}
      {query.error ? <div className="mb-4"><Note tone="red" icon="alert">A name is required.</Note></div> : null}
      <Tabs items={KINDS.map((item) => ({ label: item.label, href: `/admin/providers?kind=${item.kind}`, on: item.kind === kind, muted: everyone.filter((one) => one.kind === item.kind).length }))} />

      {items.length === 0 ? <Empty>No {meta.label.toLowerCase()} yet. Add the first one.</Empty> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const work = load(item);
          const sub =
            item.kind === "driver"
              ? [[item.vehicle?.colour, item.vehicle?.model].filter(Boolean).join(" "), item.vehicle?.plate].filter(Boolean).join(" · ")
              : item.kind === "hotel"
                ? [item.address, item.distanceKm != null ? `${item.distanceKm} km to hospital` : null].filter(Boolean).join(" · ")
                : item.languages.join(", ");
          return (
            <div key={item._id} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(30,32,50,.04),0_6px_20px_rgba(30,32,50,.05)]">
              <div className="flex items-center gap-3">
                <Av text={initialsOf(item.name)} size="lg" tone={TONE_OF[item.kind]} />
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-[14px]">{item.name}</b>
                  <small className="block truncate text-xs text-ink-muted">{sub || item.city || "—"}</small>
                </div>
                <Pill tone={item.active ? "green" : "grey"}>{item.active ? (item.kind === "hotel" ? "Partner" : "Active") : "Inactive"}</Pill>
              </div>
              <dl className="grid grid-cols-[110px_1fr] gap-y-1 text-[13px]">
                <dt className="font-semibold text-ink-muted">{item.kind === "hotel" ? "City" : "Languages"}</dt>
                <dd>{item.kind === "hotel" ? item.city ?? "—" : item.languages.join(", ") || "—"}</dd>
                <dt className="font-semibold text-ink-muted">{work.label}</dt>
                <dd>{work.value}</dd>
              </dl>
              <div className="flex flex-wrap gap-1.5">
                {item.phone ? (
                  <a href={`tel:${item.phone.replace(/[^\d+]/g, "")}`} className={`${btn.ghost} ${btn.sm}`}>
                    <CIcon name="phone" size={14} />
                    Call
                  </a>
                ) : null}
                {item.whatsapp || item.phone ? (
                  <a href={`https://wa.me/${digits(item.whatsapp ?? item.phone ?? "")}`} target="_blank" rel="noopener noreferrer" className={`${btn.ghost} ${btn.sm} !text-emerald-600`}>
                    <CIcon name="wa" size={14} />
                    WhatsApp
                  </a>
                ) : null}
                {item.telegram ? (
                  <a href={`https://t.me/${item.telegram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className={`${btn.ghost} ${btn.sm} !text-[#229ED9]`}>
                    <CIcon name="tg" size={14} />
                    Telegram
                  </a>
                ) : null}
              </div>
              <details>
                <summary className="cursor-pointer text-xs font-bold text-brand">Edit</summary>
                <div className="mt-3">
                  <ProviderForm kind={kind} item={item} hospitals={hospitals} />
                  <form action={deleteProviderAction} className="mt-3">
                    <input type="hidden" name="id" value={item._id} />
                    <input type="hidden" name="kind" value={kind} />
                    <button className="text-sm font-semibold text-red-600 hover:underline">Delete</button>
                  </form>
                </div>
              </details>
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}
