import Link from "next/link";
import { readOr } from "@/lib/db";
import type { DeskActor } from "@/lib/desk";
import { careContext, coordinators, listProviders, type JourneyCase } from "@/lib/journey";
import {
  DOC_KEYS,
  JOURNEY_KINDS,
  RIDE_PLACES,
  RIDE_STATUSES,
  balanceDue,
  calendarEvents,
  contactChannels,
  documentList,
  paidTotal,
  todoList,
  type Provider,
} from "@/lib/journey-rules";
import { COUNTRY_BY_NAME } from "@/lib/countries";
import type { Doctor, Hospital, HospitalDoctorLink } from "@/lib/catalogue";
import {
  deskBillingAction,
  deskCallAction,
  deskCareAction,
  deskChangeAction,
  deskDocumentAction,
  deskFamilyAction,
  deskJourneyAction,
  deskNewRideAction,
  deskPaymentAction,
  deskRemoveJourneyAction,
  deskReplyAction,
  deskRideAction,
  deskTaskAction,
  deskTaskStatusAction,
  deskUploadAction,
  deskVisitAction,
} from "@/lib/desk-actions";

/**
 * One case at the coordinator desk: everything the patient sees in their app,
 * and the controls that change it. The owner console and a coordinator use
 * the same screen; only the owner assigns the coordinator.
 */

const field =
  "w-full min-w-0 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-tint";
const label = "mb-1 block text-xs font-bold uppercase tracking-wider text-ink-soft";
const pill = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold";
const TONE: Record<string, string> = {
  pending: "bg-saffron-tint text-saffron",
  requested: "bg-saffron-tint text-saffron",
  open: "bg-saffron-tint text-saffron",
  needed: "bg-saffron-tint text-saffron",
  uploaded: "bg-brand-tint text-brand",
  booked: "bg-brand-tint text-brand",
  assigned: "bg-brand-tint text-brand",
  "on-the-way": "bg-brand-tint text-brand",
  arrived: "bg-brand-tint text-brand",
  confirmed: "bg-leaf-tint text-leaf",
  done: "bg-leaf-tint text-leaf",
  completed: "bg-leaf-tint text-leaf",
  verified: "bg-leaf-tint text-leaf",
  issued: "bg-leaf-tint text-leaf",
  signed: "bg-leaf-tint text-leaf",
  accepted: "bg-leaf-tint text-leaf",
  cancelled: "bg-surface-muted text-ink-muted",
  declined: "bg-surface-muted text-ink-muted",
  optional: "bg-surface-muted text-ink-muted",
};
const OPEN_LABEL: Record<string, string> = {
  task: "Task",
  document: "Document",
  "family-passport": "Passport needed",
  ride: "Car to",
  call: "Call to confirm",
  "doctor-change": "Doctor change requested",
  balance: "Balance due",
  "missing-report": "Report missing",
};
const Pill = ({ value }: { value: string }) => <span className={`${pill} ${TONE[value] ?? "bg-surface-muted text-ink-soft"}`}>{value}</span>;

function Card({ id, title, count, children }: { id: string; title: string; count?: number; children: React.ReactNode }) {
  return (
    <section id={id} className="card scroll-mt-20 p-4 sm:p-5">
      <h2 className="flex items-center gap-2 text-base font-extrabold text-ink">
        {title}
        {count ? <span className={`${pill} bg-saffron-tint text-saffron`}>{count}</span> : null}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ProviderSelect({ name, value, options, empty }: { name: string; value: string | null; options: Provider[]; empty: string }) {
  return (
    <select name={name} defaultValue={value ?? ""} className={field}>
      <option value="">{empty}</option>
      {options.map((item) => (
        <option key={item._id} value={item._id}>
          {item.name}
          {item.vehicle?.plate ? ` · ${item.vehicle.plate}` : ""}
          {item.city ? ` · ${item.city}` : ""}
        </option>
      ))}
    </select>
  );
}

export async function CareDesk({ record, actor, back, done }: { record: JourneyCase; actor: DeskActor; back: string; done?: string }) {
  const ctx = await careContext(record);
  const [drivers, hotels, interpreters, team, hospitals, links] = await Promise.all([
    listProviders("driver", true),
    listProviders("hotel", true),
    listProviders("interpreter", true),
    actor.kind === "admin" ? coordinators() : Promise.resolve([]),
    readOr<Hospital[]>([], (db) => db.collection<Hospital>("hospitals").find({ "publication.state": "published" }, { projection: { name: 1, city: 1 } }).sort({ name: 1 }).toArray()),
    ctx.care.hospitalId
      ? readOr<HospitalDoctorLink[]>([], (db) => db.collection<HospitalDoctorLink>("hospital_doctor_map").find({ hospitalId: ctx.care.hospitalId! }).toArray())
      : Promise.resolve([]),
  ]);
  const doctors = links.length
    ? await readOr<Doctor[]>([], (db) => db.collection<Doctor>("doctors").find({ _id: { $in: links.map((link) => link.doctorId) } }, { projection: { name: 1, designation: 1 } }).sort({ name: 1 }).toArray())
    : [];
  const doctorName = (doctorId: string | null) => doctors.find((item) => item._id === doctorId)?.name ?? doctorId ?? "—";

  const hidden = (anchor: string) => (
    <>
      <input type="hidden" name="reference" value={record._id} />
      <input type="hidden" name="back" value={back} />
      <input type="hidden" name="anchor" value={anchor} />
    </>
  );

  const todo = todoList(record);
  const deskTodo = todo.filter((item) => item.owner === "desk");
  const lastOut = [...ctx.messages].reverse().find((message) => message.direction === "outbound")?.createdAt ?? "";
  const unread = ctx.messages.filter((message) => message.direction === "inbound" && message.createdAt > lastOut).length;
  const channels = contactChannels(record.preferences, COUNTRY_BY_NAME.get(record.patient.country)?.code ?? null);
  const events = calendarEvents(record, { doctorVisits: ctx.doctorVisits });
  const billing = record.billing;
  const due = balanceDue(billing);
  const files = record.reports ?? [];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4" id="top">
      {done ? (
        <p role="status" className="rounded-lg bg-leaf/10 px-3 py-2 text-sm font-semibold text-leaf">
          {done}
        </p>
      ) : null}

      {/* Who */}
      <section className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-extrabold text-ink">{record.patient.name}</p>
            <p className="text-sm text-ink-soft">
              {record.patient.country} · {record.patient.phone}
              {record.patient.email ? ` · ${record.patient.email}` : ""}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Reach on: <strong>{channels.main}</strong>
              {channels.channels.length > 1 ? ` (also ${channels.channels.filter((item) => item !== channels.main).join(", ")})` : ""}
              {record.preferences?.homeContact ? ` · Home contact: ${record.preferences.homeContact.name} ${record.preferences.homeContact.phone}` : ""}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {record.statedNeed || "No stated need"}
              {record.requested?.hospitalName ? ` · asked for ${[record.requested.doctorName, record.requested.hospitalName].filter(Boolean).join(" at ")}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`${pill} bg-surface-muted text-ink`}>{record._id}</span>
            <Pill value={record.status} />
            <Link href={`/en/plan/${record._id}`} target="_blank" className="btn btn-secondary !py-1.5 text-sm">
              Plan
            </Link>
          </div>
        </div>
        <nav className="mt-3 flex flex-wrap gap-1.5 text-sm font-semibold" aria-label="Sections">
          {[
            ["open", "Open items"],
            ["messages", `Messages${unread ? ` (${unread})` : ""}`],
            ["care", "Care team"],
            ["journey", "Journey"],
            ["rides", "Cars"],
            ["calls", "Calls & visits"],
            ["tasks", "Tasks"],
            ["documents", "Documents"],
            ["billing", "Billing"],
            ["family", "Family"],
          ].map(([anchor, text]) => (
            <a key={anchor} href={`#${anchor}`} className="rounded-full bg-surface-muted px-3 py-1 text-ink-soft hover:text-brand">
              {text}
            </a>
          ))}
        </nav>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <Card id="open" title="Open items" count={todo.length}>
            {todo.length === 0 ? (
              <p className="text-sm text-ink-soft">Nothing open.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {todo.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="font-semibold text-ink">
                        {OPEN_LABEL[item.kind]}
                        {item.kind === "balance"
                          ? `: ${billing?.currency ?? "USD"} ${Number(item.title).toLocaleString("en-US")}`
                          : item.kind === "doctor-change" || item.kind === "call"
                            ? item.kind === "call"
                              ? ` (${item.title})`
                              : ""
                            : `: ${item.title}`}
                      </span>
                      {item.sub ? <span className="block text-xs text-ink-muted">{item.sub}</span> : null}
                    </span>
                    <span className={`${pill} ${item.owner === "desk" ? "bg-saffron-tint text-saffron" : "bg-brand-tint text-brand"}`}>{item.owner === "desk" ? "desk" : "patient"}</span>
                  </li>
                ))}
              </ul>
            )}
            {deskTodo.length ? <p className="mt-2 text-xs text-ink-muted">{deskTodo.length} waiting on the desk.</p> : null}
          </Card>

          <Card id="messages" title="Messages" count={unread}>
            <ol className="max-h-80 space-y-2 overflow-y-auto pr-1 text-sm">
              {ctx.messages.length === 0 ? <li className="text-ink-soft">No messages yet.</li> : null}
              {ctx.messages.map((message) => (
                <li key={message._id} className={`max-w-[85%] rounded-xl px-3 py-2 ${message.direction === "outbound" ? "ml-auto bg-brand text-white" : "bg-surface-muted text-ink"}`}>
                  <p className="whitespace-pre-line">{message.text}</p>
                  <p className={`mt-1 text-[11px] ${message.direction === "outbound" ? "text-white/75" : "text-ink-muted"}`}>
                    {message.senderName}
                    {(message.metadata as { to?: string } | null)?.to ? ` → ${(message.metadata as { to?: string }).to}` : ""} · {new Date(message.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </li>
              ))}
            </ol>
            <form action={deskReplyAction} className="mt-3 flex gap-2">
              {hidden("messages")}
              <textarea name="text" required rows={2} placeholder="Reply to the patient (they see it in their app)" className={field} />
              <button className="btn btn-primary !px-4 text-sm">Send</button>
            </form>
          </Card>

          <Card id="care" title="Care team">
            <form action={deskCareAction} className="grid gap-3 sm:grid-cols-2">
              {hidden("care")}
              {actor.kind === "admin" ? (
                <label className="sm:col-span-2">
                  <span className={label}>Coordinator</span>
                  <select name="coordinatorId" defaultValue={ctx.care.coordinatorId ?? ""} className={field}>
                    <option value="">Not assigned</option>
                    {team.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.name} · {member.email}
                        {member.status !== "active" ? ` (${member.status})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label>
                <span className={label}>Hospital</span>
                <select name="hospitalId" defaultValue={ctx.care.hospitalId ?? ""} className={field}>
                  <option value="">—</option>
                  {hospitals.map((hospital) => (
                    <option key={hospital._id} value={hospital._id}>
                      {hospital.name}, {hospital.city}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={label}>Treating doctor</span>
                <select name="doctorId" defaultValue={ctx.care.doctorId ?? ""} className={field}>
                  <option value="">—</option>
                  {doctors.map((doctor) => (
                    <option key={doctor._id} value={doctor._id}>
                      {doctor.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className={label}>Driver & vehicle</span>
                <ProviderSelect name="driverId" value={ctx.care.driverId} options={drivers} empty="Not assigned" />
              </label>
              <label>
                <span className={label}>Interpreter</span>
                <ProviderSelect name="interpreterId" value={ctx.care.interpreterId} options={interpreters} empty="Not assigned" />
              </label>
              <label>
                <span className={label}>Hotel</span>
                <ProviderSelect name="hotelId" value={ctx.care.hotelId} options={hotels} empty="Not booked" />
              </label>
              <label>
                <span className={label}>Room</span>
                <input name="room" defaultValue={ctx.care.room ?? ""} className={field} />
              </label>
              <label>
                <span className={label}>Check-in</span>
                <input name="checkIn" type="date" defaultValue={ctx.care.checkIn ?? ""} className={field} />
              </label>
              <label>
                <span className={label}>Check-out</span>
                <input name="checkOut" type="date" defaultValue={ctx.care.checkOut ?? ""} className={field} />
              </label>
              <label>
                <span className={label}>Hotel Wi-Fi</span>
                <input name="wifi" defaultValue={ctx.care.wifi ?? ""} placeholder="Network / password" className={field} />
              </label>
              <label>
                <span className={label}>Ward & bed</span>
                <input name="ward" defaultValue={ctx.care.ward ?? ""} placeholder="Ward 4B, room 412" className={field} />
              </label>
              <div className="sm:col-span-2">
                <button className="btn btn-primary text-sm">Save care team</button>
                <span className="ml-3 text-xs text-ink-muted">Choose the hospital and save first to list its doctors.</span>
              </div>
            </form>
            {(record.requests ?? []).length ? (
              <div className="mt-4 border-t border-line pt-3">
                <h3 className="text-sm font-extrabold text-ink">Doctor change requests</h3>
                <ul className="mt-2 space-y-3 text-sm">
                  {(record.requests ?? []).map((request) => (
                    <li key={request.id} className="rounded-lg bg-surface-muted p-3">
                      <p>
                        <Pill value={request.status} /> {request.reasons.join(", ") || "no reason"}
                        {request.doctorId ? ` · prefers ${doctorName(request.doctorId)}` : ""}
                      </p>
                      {request.note ? <p className="mt-1 text-ink-soft">“{request.note}”</p> : null}
                      {request.reply ? <p className="mt-1 text-ink-soft">Reply: {request.reply}</p> : null}
                      {request.status === "open" ? (
                        <form action={deskChangeAction} className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                          {hidden("care")}
                          <input type="hidden" name="id" value={request.id} />
                          <input name="reply" placeholder="Reply to the patient" className={field} />
                          <button name="status" value="accepted" className="btn btn-primary !py-1.5 text-sm">
                            Accept
                          </button>
                          <button name="status" value="declined" className="btn btn-secondary !py-1.5 text-sm">
                            Decline
                          </button>
                        </form>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>

          <Card id="journey" title="Journey" count={(record.journey ?? []).filter((item) => item.status === "pending").length}>
            <p className="mb-3 text-xs text-ink-muted">Each item shows on the patient&rsquo;s calendar and plan status. The plan&rsquo;s itinerary fills any day not booked here.</p>
            <ul className="space-y-2">
              {[...(record.journey ?? [])]
                .sort((a, b) => `${a.date ?? "9"}${a.time ?? ""}`.localeCompare(`${b.date ?? "9"}${b.time ?? ""}`))
                .map((item) => (
                  <li key={item.id} className="rounded-lg bg-surface-muted p-3 text-sm">
                    <details>
                      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                        <Pill value={item.status} />
                        <strong className="text-ink">{item.title}</strong>
                        <span className="text-ink-muted">
                          {item.kind}
                          {item.date ? ` · ${item.date}${item.time ? ` ${item.time}` : ""}` : ""}
                          {item.place ? ` · ${item.place}` : ""}
                        </span>
                      </summary>
                      <JourneyForm hidden={hidden("journey")} item={item} />
                      <form action={deskRemoveJourneyAction} className="mt-2">
                        {hidden("journey")}
                        <input type="hidden" name="id" value={item.id} />
                        <button className="text-xs font-semibold text-red-600 hover:underline">Remove</button>
                      </form>
                    </details>
                  </li>
                ))}
            </ul>
            <details className="mt-3">
              <summary className="btn btn-secondary cursor-pointer text-sm">Add journey item</summary>
              <JourneyForm hidden={hidden("journey")} />
            </details>
          </Card>
        </div>

        <div className="space-y-4">
          <Card id="rides" title="Cars" count={(record.rides ?? []).filter((ride) => ["requested", "assigned", "on-the-way", "arrived"].includes(ride.status)).length}>
            <ul className="space-y-2 text-sm">
              {(record.rides ?? []).length === 0 ? <li className="text-ink-soft">No cars called yet.</li> : null}
              {[...(record.rides ?? [])].reverse().map((ride) => (
                <li key={ride.id} className="rounded-lg bg-surface-muted p-3">
                  <p className="flex flex-wrap items-center gap-2">
                    <Pill value={ride.status} />
                    <strong>To {ride.to}</strong>
                    <span className="text-ink-muted">
                      {ride.when === "now" ? "now" : ride.when.replace("T", " ")} · {ride.passengers} pax
                      {ride.address ? ` · ${ride.address}` : ""}
                    </span>
                  </p>
                  {ride.status !== "completed" && ride.status !== "cancelled" ? (
                    <form action={deskRideAction} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      {hidden("rides")}
                      <input type="hidden" name="id" value={ride.id} />
                      <select name="status" defaultValue={ride.status} className={field}>
                        {RIDE_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <ProviderSelect name="driverId" value={ride.driverId ?? ctx.care.driverId} options={drivers} empty="Driver" />
                      <button className="btn btn-primary !py-1.5 text-sm">Update</button>
                      <input name="note" placeholder="Note for the patient (e.g. white Innova, gate 2)" defaultValue={ride.note ?? ""} className={`${field} sm:col-span-3`} />
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
            <details className="mt-3">
              <summary className="btn btn-secondary cursor-pointer text-sm">Book a car</summary>
              <form action={deskNewRideAction} className="mt-3 grid gap-2 sm:grid-cols-2">
                {hidden("rides")}
                <select name="to" className={field}>
                  {RIDE_PLACES.map((place) => (
                    <option key={place} value={place}>
                      To {place}
                    </option>
                  ))}
                </select>
                <input name="address" placeholder="Address or note" className={field} />
                <input name="date" type="date" defaultValue={today} className={field} />
                <input name="time" type="time" className={field} />
                <input name="passengers" type="number" min={1} max={8} defaultValue={1} className={field} />
                <ProviderSelect name="driverId" value={ctx.care.driverId} options={drivers} empty="Assigned driver" />
                <button className="btn btn-primary text-sm sm:col-span-2">Book</button>
              </form>
            </details>
          </Card>

          <Card id="calls" title="Calls & visits" count={(record.appointments ?? []).filter((call) => call.status === "requested").length + ctx.doctorVisits.filter((visit) => visit.status === "requested").length}>
            <ul className="space-y-2 text-sm">
              {(record.appointments ?? []).length + ctx.doctorVisits.length === 0 ? <li className="text-ink-soft">No calls or visits asked for.</li> : null}
              {(record.appointments ?? []).map((call) => (
                <li key={call.id} className="rounded-lg bg-surface-muted p-3">
                  <p className="flex flex-wrap items-center gap-2">
                    <Pill value={call.status} />
                    <strong>{call.kind} call</strong>
                    <span className="text-ink-muted">
                      {call.date} · {call.window} · {call.timezone} · {call.language}
                    </span>
                  </p>
                  {call.note ? <p className="mt-1 text-ink-soft">“{call.note}”</p> : null}
                  {call.confirmedSlot ? <p className="mt-1 text-ink-soft">Agreed: {call.confirmedSlot}</p> : null}
                  {call.status === "requested" ? (
                    <form action={deskCallAction} className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                      {hidden("calls")}
                      <input type="hidden" name="id" value={call.id} />
                      <input name="slot" placeholder="Agreed time and link, in the patient's time" className={field} />
                      <button name="status" value="confirmed" className="btn btn-primary !py-1.5 text-sm">
                        Confirm
                      </button>
                      <button name="status" value="declined" className="btn btn-secondary !py-1.5 text-sm">
                        Decline
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
              {ctx.doctorVisits.map((visit) => (
                <li key={visit.id} className="rounded-lg bg-surface-muted p-3">
                  <p className="flex flex-wrap items-center gap-2">
                    <Pill value={visit.status} />
                    <strong>{visit.doctor ?? "Doctor"} visit</strong>
                    <span className="text-ink-muted">
                      {visit.date} {visit.start}
                      {visit.place ? ` · ${visit.place}` : ""}
                    </span>
                  </p>
                  {visit.status === "requested" || visit.status === "confirmed" ? (
                    <form action={deskVisitAction} className="mt-2 flex flex-wrap gap-2">
                      {hidden("calls")}
                      <input type="hidden" name="id" value={visit.id} />
                      {visit.status === "requested" ? (
                        <button name="status" value="confirmed" className="btn btn-primary !py-1.5 text-sm">
                          Confirm with hospital
                        </button>
                      ) : (
                        <button name="status" value="completed" className="btn btn-primary !py-1.5 text-sm">
                          Completed
                        </button>
                      )}
                      <button name="status" value="cancelled" className="btn btn-secondary !py-1.5 text-sm">
                        Cancel
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>

          <Card id="tasks" title="Tasks" count={(record.tasks ?? []).filter((task) => task.status === "open").length}>
            <ul className="divide-y divide-line text-sm">
              {(record.tasks ?? []).map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className={`font-semibold ${task.status === "done" ? "text-ink-muted line-through" : "text-ink"}`}>{task.title}</span>
                    <span className="block text-xs text-ink-muted">
                      for {task.owner}
                      {task.due ? ` · due ${task.due}` : ""}
                      {task.detail ? ` · ${task.detail}` : ""}
                    </span>
                  </span>
                  <form action={deskTaskStatusAction}>
                    {hidden("tasks")}
                    <input type="hidden" name="id" value={task.id} />
                    <button name="status" value={task.status === "done" ? "open" : "done"} className="btn btn-secondary !px-3 !py-1 text-xs">
                      {task.status === "done" ? "Reopen" : "Done"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
            <form action={deskTaskAction} className="mt-3 grid gap-2 sm:grid-cols-2">
              {hidden("tasks")}
              <input name="title" required placeholder="Task (e.g. Sign treatment consent)" className={`${field} sm:col-span-2`} />
              <input name="detail" placeholder="Detail (optional)" className={field} />
              <input name="due" type="date" className={field} />
              <select name="owner" className={field}>
                <option value="patient">For the patient</option>
                <option value="desk">For the desk</option>
              </select>
              <select name="section" className={field}>
                <option value="">Opens…</option>
                {["documents", "reports", "payments", "family", "calendar", "stay", "settings"].map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
              <button className="btn btn-primary text-sm sm:col-span-2">Add task</button>
            </form>
          </Card>

          <Card id="documents" title="Documents & files" count={documentList(record).filter((doc) => doc.status === "uploaded").length}>
            <ul className="divide-y divide-line text-sm">
              {documentList(record).map((doc) => (
                <li key={doc.key} className="py-2">
                  <form action={deskDocumentAction} className="grid items-center gap-2 sm:grid-cols-[7rem_8rem_1fr_auto_auto]">
                    {hidden("documents")}
                    <input type="hidden" name="key" value={doc.key} />
                    <strong className="capitalize text-ink">{doc.key}</strong>
                    <select name="status" defaultValue={doc.status} className={field}>
                      {["needed", "uploaded", "verified", "issued", "signed", "optional"].map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <input name="note" defaultValue={doc.note ?? ""} placeholder="Note" className={field} />
                    <button className="btn btn-secondary !py-1.5 text-xs">Save</button>
                    {doc.key !== "passport" ? (
                      <button name="remove" value="1" className="text-xs font-semibold text-red-600 hover:underline">
                        Remove
                      </button>
                    ) : (
                      <span />
                    )}
                  </form>
                </li>
              ))}
            </ul>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-semibold text-brand">Add a document line</summary>
              <form action={deskDocumentAction} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                {hidden("documents")}
                <select name="key" className={field}>
                  {DOC_KEYS.filter((key) => !documentList(record).some((doc) => doc.key === key)).map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
                <select name="status" defaultValue="needed" className={field}>
                  {["needed", "issued", "optional"].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <button className="btn btn-secondary text-sm">Add</button>
              </form>
            </details>

            <form action={deskUploadAction} encType="multipart/form-data" className="mt-4 grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
              {hidden("documents")}
              <span className={`${label} sm:col-span-2`}>Upload for the patient</span>
              <select name="kind" className={field}>
                <option value="report">Hospital report</option>
                <option value="prescription">Prescription</option>
                <option value="bill">Bill / receipt</option>
                <option value="document">Document (checklist)</option>
              </select>
              <select name="docKey" className={field}>
                <option value="">For document…</option>
                {DOC_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
              <select name="source" className={field}>
                <option value="hospital">From the hospital</option>
                <option value="shifain">From Shifain</option>
              </select>
              <input name="files" type="file" multiple accept="application/pdf,image/*" required className="text-sm" />
              <button className="btn btn-primary text-sm sm:col-span-2">Upload</button>
            </form>
            {files.length ? (
              <ul className="mt-3 space-y-1 text-sm">
                {files.map((file, index) => (
                  <li key={file.id ?? index} className="flex flex-wrap items-center gap-2">
                    {file.id ? (
                      <a href={`/api/admin/report/${record._id}/${record._id}-${file.id}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
                        {file.filename}
                      </a>
                    ) : (
                      <span>{file.filename}</span>
                    )}
                    <span className="text-xs text-ink-muted">
                      {file.source ?? "patient"} · {file.kind ?? "report"}
                      {file.docKey ? ` · ${file.docKey}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>

          <Card id="billing" title="Billing">
            <p className="text-sm text-ink-soft">
              {billing?.quote != null ? (
                <>
                  Quote <strong>{billing.currency} {billing.quote.toLocaleString("en-US")}</strong> · paid {paidTotal(billing).toLocaleString("en-US")} · balance <strong>{due?.toLocaleString("en-US")}</strong>
                </>
              ) : (
                "No confirmed quote yet. The patient sees the plan's estimate until you set one."
              )}
            </p>
            <form action={deskBillingAction} className="mt-3 grid gap-2 sm:grid-cols-3">
              {hidden("billing")}
              <label>
                <span className={label}>Confirmed quote</span>
                <input name="quote" inputMode="decimal" defaultValue={billing?.quote ?? ""} className={field} />
              </label>
              <label>
                <span className={label}>Currency</span>
                <select name="currency" defaultValue={billing?.currency ?? "USD"} className={field}>
                  {["USD", "INR", "EUR"].map((currency) => (
                    <option key={currency}>{currency}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className={label}>Balance due</span>
                <input name="dueNote" defaultValue={billing?.dueNote ?? ""} placeholder="At admission" className={field} />
              </label>
              <label className="sm:col-span-3">
                <span className={label}>Breakdown · one per line: label | amount</span>
                <textarea name="lines" rows={4} defaultValue={(billing?.lines ?? []).map((line) => `${line.label} | ${line.amount}`).join("\n")} className={field} />
              </label>
              <button className="btn btn-primary text-sm sm:col-span-3">Save billing</button>
            </form>
            <ul className="mt-3 divide-y divide-line text-sm">
              {(billing?.payments ?? []).map((payment) => (
                <li key={payment.id} className="flex items-center justify-between gap-3 py-1.5">
                  <span>
                    <strong>{payment.amount.toLocaleString("en-US")}</strong> · {payment.method} · {payment.at.slice(0, 10)}
                    {payment.note ? ` · ${payment.note}` : ""}
                  </span>
                  <form action={deskPaymentAction}>
                    {hidden("billing")}
                    <button name="remove" value={payment.id} className="text-xs font-semibold text-red-600 hover:underline">
                      Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
            <form action={deskPaymentAction} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              {hidden("billing")}
              <input name="amount" required inputMode="decimal" placeholder="Amount received" className={field} />
              <input name="method" placeholder="Method (card, transfer)" className={field} />
              <input name="at" type="date" defaultValue={today} className={field} />
              <button className="btn btn-secondary text-sm">Record</button>
            </form>
          </Card>

          <Card id="family" title="Family">
            {(record.family ?? []).length === 0 ? (
              <p className="text-sm text-ink-soft">No family members added by the patient.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {(record.family ?? []).map((member) => (
                  <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      <strong>{member.name}</strong> · {member.relation}
                      {member.travelling ? " · travelling" : ""}
                      <span className="block text-xs text-ink-muted">
                        {[member.phone, member.email].filter(Boolean).join(" · ")} · sees {member.access.join(", ") || "nothing"}
                      </span>
                    </span>
                    <form action={deskFamilyAction} className="flex gap-2">
                      {hidden("family")}
                      <input type="hidden" name="id" value={member.id} />
                      <select name="passport" defaultValue={member.passport} className={field}>
                        {["missing", "uploaded", "verified"].map((status) => (
                          <option key={status} value={status}>
                            passport {status}
                          </option>
                        ))}
                      </select>
                      <button className="btn btn-secondary !py-1.5 text-xs">Save</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card id="calendar" title="Patient's calendar">
            <ul className="space-y-1 text-sm">
              {events.slice(0, 30).map((event) => (
                <li key={event.id} className="flex gap-2">
                  <span className="w-28 flex-none text-ink-muted">
                    {event.date ?? event.status ?? "—"} {event.time ?? ""}
                  </span>
                  <span className="text-ink">
                    {event.title} <span className="text-xs text-ink-muted">· {event.source}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function JourneyForm({ hidden, item }: { hidden: React.ReactNode; item?: { id: string; kind: string; title: string; status: string; date: string | null; time: string | null; place: string | null; detail: string | null; bring: string | null } }) {
  return (
    <form action={deskJourneyAction} className="mt-3 grid gap-2 sm:grid-cols-2">
      {hidden}
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <select name="kind" defaultValue={item?.kind ?? "admission"} className={field}>
        {JOURNEY_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {kind}
          </option>
        ))}
      </select>
      <select name="status" defaultValue={item?.status ?? "booked"} className={field}>
        {["pending", "booked", "done", "cancelled"].map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <input name="title" required defaultValue={item?.title ?? ""} placeholder="Title (e.g. Surgery, Land · DEL T3)" className={`${field} sm:col-span-2`} />
      <input name="date" type="date" defaultValue={item?.date ?? ""} className={field} />
      <input name="time" type="time" defaultValue={item?.time ?? ""} className={field} />
      <input name="place" defaultValue={item?.place ?? ""} placeholder="Where" className={field} />
      <input name="detail" defaultValue={item?.detail ?? ""} placeholder="With whom / detail" className={field} />
      <input name="bring" defaultValue={item?.bring ?? ""} placeholder="What to bring" className={`${field} sm:col-span-2`} />
      <button className="btn btn-primary text-sm sm:col-span-2">{item ? "Save" : "Add"}</button>
    </form>
  );
}
