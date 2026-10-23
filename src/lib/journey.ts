import "server-only";
import crypto from "node:crypto";
import { getDb, readOr } from "./db";
import { MAX_REPORT_BYTES, storeReports, type ReportUpload } from "./reports";
import { getSettings } from "./settings";
import { saveMessage, type CrmMessage } from "./crm-messages";
import { computeSlots, type Slot } from "./onboarding-rules";
import type { CaseReport, PatientCase, PlanEdit } from "./cases";
import type { Doctor, DoctorSchedule, Hospital } from "./catalogue";
import type { PartnerUser } from "./partner-auth";
import type { Appointment } from "./patient-portal";
import {
  emptyCare,
  type Billing,
  type CareTeam,
  type CaseTask,
  type ChangeReason,
  type CompanionCandidate,
  type DocItem,
  type DocKey,
  type DoctorChangeRequest,
  type FamilyMember,
  type JourneyFields,
  type JourneyItem,
  type PersonalEvent,
  type Provider,
  type ProviderKind,
  type Ride,
  type RidePlace,
  type RideStatus,
} from "./journey-rules";

/**
 * The journey on the database: the providers the desk assigns, and every
 * change the patient or the desk makes to a case's care. Lists inside a case
 * are rewritten whole rather than through positional updates, which keeps to
 * plain operations every MongoDB-compatible store supports; they are short.
 */

export type JourneyCase = PatientCase & JourneyFields & { appointments?: Appointment[] };

const id = () => crypto.randomBytes(6).toString("hex");
const now = () => new Date().toISOString();
const edit = (change: string, via: PlanEdit["via"] = "portal"): PlanEdit => ({ at: now(), via, change });

async function cases() {
  return (await getDb()).collection<JourneyCase>("cases");
}

/** Reads one list on the case, lets `change` rewrite it, and writes it back with a log line. */
async function rewrite<K extends keyof JourneyFields>(
  reference: string,
  field: K,
  change: (current: NonNullable<JourneyFields[K]>) => NonNullable<JourneyFields[K]>,
  log?: PlanEdit,
  empty?: NonNullable<JourneyFields[K]>,
): Promise<void> {
  const collection = await cases();
  const record = await collection.findOne({ _id: reference }, { projection: { [field]: 1 } });
  const current = (record?.[field] ?? empty ?? []) as NonNullable<JourneyFields[K]>;
  await collection.updateOne({ _id: reference }, {
    $set: { [field]: change(current), updatedAt: now() },
    ...(log ? { $push: { planEdits: log } } : {}),
  } as never);
}

// ---------------------------------------------------------------- providers

export async function listProviders(kind?: ProviderKind, activeOnly = false): Promise<Provider[]> {
  return readOr<Provider[]>([], async (db) =>
    db
      .collection<Provider>("providers")
      .find({ ...(kind ? { kind } : {}), ...(activeOnly ? { active: true } : {}) })
      .sort({ kind: 1, name: 1 })
      .toArray(),
  );
}

export async function getProviders(ids: (string | null | undefined)[]): Promise<Map<string, Provider>> {
  const wanted = ids.filter((item): item is string => Boolean(item));
  if (!wanted.length) return new Map();
  const rows = await readOr<Provider[]>([], (db) => db.collection<Provider>("providers").find({ _id: { $in: wanted } }).toArray());
  return new Map(rows.map((row) => [row._id, row]));
}

export async function saveProvider(input: Omit<Provider, "_id" | "createdAt" | "updatedAt"> & { _id?: string | null }): Promise<string> {
  const db = await getDb();
  const key = input._id || `${input.kind}-${id()}`;
  const { _id: _ignored, ...fields } = input;
  void _ignored;
  await db.collection<Provider>("providers").updateOne(
    { _id: key },
    { $set: { ...fields, updatedAt: now() }, $setOnInsert: { createdAt: now() } },
    { upsert: true },
  );
  return key;
}

export async function deleteProvider(key: string): Promise<void> {
  const db = await getDb();
  await db.collection<Provider>("providers").deleteOne({ _id: key });
}

// ---------------------------------------------------------------- the people around a case

export type CareContext = {
  care: CareTeam;
  coordinator: Pick<PartnerUser, "_id" | "name" | "email" | "phone" | "telegram" | "languages"> | null;
  hospital: Hospital | null;
  doctor: Doctor | null;
  driver: Provider | null;
  hotel: Provider | null;
  interpreter: Provider | null;
  doctorVisits: { id: string; date: string; start: string; status: string; doctor: string | null; place: string | null }[];
  messages: CrmMessage[];
};

/** The case's care team, resolved from ids to the records the screens show. */
export async function careContext(record: JourneyCase): Promise<CareContext> {
  const care = { ...emptyCare(), ...(record.care ?? {}) };
  const hospitalId = care.hospitalId ?? record.requested?.hospitalId ?? null;
  const doctorId = care.doctorId ?? record.requested?.doctorId ?? null;
  const [coordinator, hospital, doctor, providers, visits, messages] = await Promise.all([
    care.coordinatorId
      ? readOr(null, (db) =>
          db.collection<PartnerUser>("partner_users").findOne(
            { _id: care.coordinatorId!, role: "coordinator" },
            { projection: { name: 1, email: 1, phone: 1, telegram: 1, languages: 1 } },
          ),
        )
      : null,
    hospitalId ? readOr(null, (db) => db.collection<Hospital>("hospitals").findOne({ _id: hospitalId })) : null,
    doctorId ? readOr(null, (db) => db.collection<Doctor>("doctors").findOne({ _id: doctorId })) : null,
    getProviders([care.driverId, care.hotelId, care.interpreterId]),
    readOr<{ _id: string; date: string; start: string; status: string; doctorId: string; hospitalId: string }[]>([], (db) =>
      db.collection<{ _id: string; date: string; start: string; status: string; doctorId: string; hospitalId: string }>("doctor_appointments").find({ caseId: record._id }).toArray(),
    ),
    portalMessages(record._id),
  ]);
  return {
    care: { ...care, hospitalId, doctorId },
    coordinator,
    hospital,
    doctor,
    driver: care.driverId ? providers.get(care.driverId) ?? null : null,
    hotel: care.hotelId ? providers.get(care.hotelId) ?? null : null,
    interpreter: care.interpreterId ? providers.get(care.interpreterId) ?? null : null,
    doctorVisits: visits.map((visit) => ({
      id: visit._id,
      date: visit.date,
      start: visit.start,
      status: visit.status,
      doctor: doctor && doctor._id === visit.doctorId ? doctor.name : null,
      place: hospital && hospital._id === visit.hospitalId ? hospital.name : null,
    })),
    messages,
  };
}

// ---------------------------------------------------------------- messages

/** The in-app thread between the patient and their care team, oldest first. */
export async function portalMessages(reference: string): Promise<CrmMessage[]> {
  const rows = await readOr<CrmMessage[]>([], (db) =>
    db.collection<CrmMessage>("crm_messages").find({ caseReference: reference, channel: "portal" }).sort({ createdAt: 1 }).limit(300).toArray(),
  );
  return rows;
}

export const MESSAGE_TO = ["coordinator", "doctor", "hotel"] as const;

export async function sendPortalMessage(reference: string, from: { name: string; direction: "inbound" | "outbound" }, text: string, to?: string) {
  const clean = text.trim().slice(0, 2000);
  if (!clean) return;
  await saveMessage({
    channel: "portal",
    direction: from.direction,
    contactType: "patient",
    contactId: null,
    caseReference: reference,
    telegramChatId: null,
    senderName: from.name.slice(0, 80),
    text: clean,
    metadata: to ? { to } : null,
    status: "delivered",
  });
}

// ---------------------------------------------------------------- files

/** Files on the case: what the patient sends, and what the hospital or desk adds. Stored like the first reports. */
export async function addCaseFiles(
  reference: string,
  files: File[],
  meta: Pick<CaseReport, "source" | "kind" | "docKey">,
  via: PlanEdit["via"],
): Promise<CaseReport[]> {
  const allowed = /^(application\/pdf|image\/(png|jpeg|webp|heic|heif))$/;
  const uploads: (ReportUpload & CaseReport)[] = [];
  for (const file of files.slice(0, 5)) {
    if (!file.size || file.size > MAX_REPORT_BYTES || !allowed.test(file.type)) continue;
    const body = Buffer.from(await file.arrayBuffer());
    uploads.push({ id: id(), filename: file.name.slice(0, 160) || "file", mediaType: file.type, body, bytes: body.byteLength, ...meta });
  }
  if (!uploads.length) return [];
  const settings = await getSettings();
  const stored = await storeReports(reference, uploads, settings.reportRetentionDays);
  if (!stored) return [];
  const added: CaseReport[] = uploads.map(({ body: _body, ...rest }) => {
    void _body;
    return rest;
  });
  const collection = await cases();
  await collection.updateOne({ _id: reference }, {
    $push: {
      reports: { $each: added },
      planEdits: edit(`Added ${added.length} ${meta.kind ?? "report"}${added.length === 1 ? "" : "s"}: ${added.map((file) => file.filename).join(", ")}`, via),
    },
    $set: {
      reportsExpireAt: new Date(Date.now() + settings.reportRetentionDays * 86_400_000).toISOString(),
      updatedAt: now(),
    },
  } as never);
  if (meta.docKey) await setDocument(reference, meta.docKey, { status: meta.source === "patient" ? "uploaded" : "issued", reportId: added[0].id ?? null }, via);
  return added;
}

// ---------------------------------------------------------------- patient actions

export async function requestRide(reference: string, input: { to: RidePlace; address: string | null; when: string; passengers: number; driverId: string | null }) {
  const ride: Ride = { id: id(), ...input, status: "requested", note: null, requestedAt: now(), updatedAt: now() };
  await rewrite(reference, "rides", (rides) => [...rides, ride], edit(`Called the car to ${input.to}${input.when === "now" ? " now" : ` for ${input.when.replace("T", " ")}`}`));
  return ride;
}

export async function cancelRide(reference: string, rideId: string, via: PlanEdit["via"] = "portal") {
  await rewrite(reference, "rides", (rides) =>
    rides.map((ride) => (ride.id === rideId && ride.status !== "completed" ? { ...ride, status: "cancelled" as const, updatedAt: now() } : ride)),
    edit("Cancelled a car", via),
  );
}

export async function addPersonalEvent(reference: string, input: Omit<PersonalEvent, "id" | "createdAt">) {
  const event: PersonalEvent = { ...input, id: id(), createdAt: now() };
  await rewrite(reference, "events", (events) => [...events, event], edit(`Added to calendar: ${input.title} on ${input.date}`));
  if (input.tellDesk) await addTask(reference, { title: `Patient's plan: ${input.title} (${input.date}${input.time ? ` ${input.time}` : ""})`, detail: null, due: input.date, owner: "desk", section: "calendar" }, "portal");
}

export async function setEventNote(reference: string, eventId: string, note: string) {
  const collection = await cases();
  const clean = note.trim().slice(0, 500);
  await collection.updateOne({ _id: reference }, clean ? { $set: { [`eventNotes.${eventId}`]: clean } } : { $unset: { [`eventNotes.${eventId}`]: "" } } as never);
}

export async function requestDoctorChange(reference: string, input: { reasons: ChangeReason[]; doctorId: string | null; note: string | null }) {
  const request: DoctorChangeRequest = { id: id(), kind: "doctor-change", ...input, status: "open", reply: null, createdAt: now(), updatedAt: now() };
  await rewrite(reference, "requests", (requests) => [...requests, request], edit(`Asked to change doctor (${input.reasons.join(", ") || "no reason given"})`));
}

export async function addFamilyMember(reference: string, input: Omit<FamilyMember, "id" | "addedAt" | "passport">) {
  const member: FamilyMember = { ...input, id: id(), passport: "missing", addedAt: now() };
  await rewrite(reference, "family", (family) => [...family, member].slice(0, 12), edit(`Added family member ${input.name}`));
}

export async function updateFamilyMember(reference: string, memberId: string, patch: Partial<Omit<FamilyMember, "id" | "addedAt">>, via: PlanEdit["via"] = "portal") {
  await rewrite(reference, "family", (family) => family.map((member) => (member.id === memberId ? { ...member, ...patch } : member)), edit("Updated a family member", via));
}

export async function removeFamilyMember(reference: string, memberId: string) {
  await rewrite(reference, "family", (family) => family.filter((member) => member.id !== memberId), edit("Removed a family member"));
}

export async function setPreferences(reference: string, patch: Record<string, unknown>) {
  const collection = await cases();
  const set: Record<string, unknown> = { updatedAt: now() };
  for (const [key, value] of Object.entries(patch)) set[`preferences.${key}`] = value;
  await collection.updateOne({ _id: reference }, { $set: set } as never);
}

/** A doctor's free slots over the next two weeks, from their weekly rota, less exceptions and bookings. */
export async function freeSlots(doctorId: string, hospitalId: string, from: string): Promise<Slot[]> {
  return readOr<Slot[]>([], async (db) => {
    const [schedules, blackouts, booked] = await Promise.all([
      db.collection<DoctorSchedule>("doctor_schedules").find({ doctorId, hospitalId }).toArray(),
      db.collection<{ doctorId: string; date: string; reason?: string }>("schedule_exceptions").find({ doctorId }).toArray(),
      db.collection<{ doctorId: string; hospitalId: string; date: string; start: string; status: string }>("doctor_appointments").find({ doctorId, date: { $gte: from } }).toArray(),
    ]);
    return computeSlots({ schedules: schedules as never, blackouts: blackouts as never, booked: booked as never, from, days: 14 }).filter((slot) => slot.hospitalId === hospitalId);
  });
}

/** Books a computed slot. It is "requested" until the desk confirms it with the hospital. */
export async function bookDoctorSlot(reference: string, input: { doctorId: string; hospitalId: string; date: string; start: string; end: string | null; consultType: "in_person" | "video" }) {
  const db = await getDb();
  const taken = await db.collection("doctor_appointments").findOne({ doctorId: input.doctorId, hospitalId: input.hospitalId, date: input.date, start: input.start, status: { $in: ["requested", "confirmed"] } });
  if (taken) return false;
  await db.collection("doctor_appointments").insertOne({ _id: `appt-${id()}`, ...input, caseId: reference, status: "requested", createdAt: now() } as never);
  await (await cases()).updateOne({ _id: reference }, { $push: { planEdits: edit(`Booked a ${input.consultType === "video" ? "video" : "clinic"} visit on ${input.date} ${input.start}`) }, $set: { updatedAt: now() } } as never);
  return true;
}

export async function completeTask(reference: string, taskId: string, done: boolean, via: PlanEdit["via"] = "portal") {
  await rewrite(reference, "tasks", (tasks) =>
    tasks.map((task) => (task.id === taskId ? { ...task, status: done ? ("done" as const) : ("open" as const), doneAt: done ? now() : null } : task)),
  edit(`${done ? "Done" : "Reopened"}: a task`, via));
}

// ---------------------------------------------------------------- companions

export async function companionCandidates(): Promise<CompanionCandidate[]> {
  const rows = await readOr<JourneyCase[]>([], async (db) =>
    db
      .collection<JourneyCase>("cases")
      .find({ "preferences.companionsVisible": true, status: { $ne: "closed" } } as never, {
        projection: { patient: 1, locale: 1, preferences: 1, care: 1, journey: 1, requested: 1, plan: 1 },
      })
      .limit(2000)
      .toArray(),
  );
  return rows.map(candidateOf);
}

export function candidateOf(record: JourneyCase): CompanionCandidate {
  const flightIn = (record.journey ?? []).find((item) => item.kind === "flight-in" && item.date);
  const flightOut = (record.journey ?? []).find((item) => item.kind === "flight-out" && item.date);
  return {
    reference: record._id,
    firstName: `${record.patient.name.split(/\s+/)[0] ?? ""} ${(record.patient.name.split(/\s+/)[1] ?? "").slice(0, 1)}${record.patient.name.split(/\s+/)[1] ? "." : ""}`.trim(),
    country: record.patient.country,
    locale: record.locale,
    visible: Boolean((record.preferences as { companionsVisible?: boolean } | undefined)?.companionsVisible),
    hotelId: record.care?.hotelId ?? null,
    hospitalId: record.care?.hospitalId ?? record.requested?.hospitalId ?? null,
    city: record.preferences?.city ?? record.plan?.destinationCity ?? null,
    from: flightIn?.date ?? record.care?.checkIn ?? null,
    to: flightOut?.date ?? record.care?.checkOut ?? null,
  };
}

export type Hello = { _id: string; from: string; to: string; at: string };

export async function helloes(reference: string): Promise<Hello[]> {
  return readOr<Hello[]>([], (db) => db.collection<Hello>("companion_hellos").find({ $or: [{ from: reference }, { to: reference }] }).toArray());
}

/** A hello between two patients. Once both have said it, the desk is asked to introduce them; numbers are never shared here. */
export async function sayHello(from: string, to: string) {
  const db = await getDb();
  await db.collection<Hello>("companion_hellos").updateOne({ _id: `${from}>${to}` }, { $setOnInsert: { from, to, at: now() } }, { upsert: true });
  const back = await db.collection<Hello>("companion_hellos").findOne({ _id: `${to}>${from}` });
  if (back) {
    await addTask(from, { title: `Introduce to ${to} — both said hello in Companions`, detail: null, due: null, owner: "desk", section: "companions" }, "portal");
  }
}

// ---------------------------------------------------------------- desk actions

export async function setCare(reference: string, patch: Partial<CareTeam>, via: PlanEdit["via"]) {
  const collection = await cases();
  const set: Record<string, unknown> = { updatedAt: now(), "care.updatedAt": now() };
  for (const [key, value] of Object.entries(patch)) set[`care.${key}`] = value;
  await collection.updateOne({ _id: reference }, { $set: set, $push: { planEdits: edit(`Care team updated: ${Object.keys(patch).join(", ")}`, via) } } as never);
}

export async function saveJourneyItem(reference: string, input: Omit<JourneyItem, "id" | "updatedAt"> & { id?: string | null }, via: PlanEdit["via"]) {
  const item: JourneyItem = { ...input, id: input.id || id(), updatedAt: now() };
  await rewrite(reference, "journey", (journey) =>
    journey.some((existing) => existing.id === item.id) ? journey.map((existing) => (existing.id === item.id ? item : existing)) : [...journey, item],
    edit(`${input.id ? "Updated" : "Added"} ${item.kind}: ${item.title}${item.date ? ` (${item.date})` : ""} — ${item.status}`, via),
  );
}

export async function removeJourneyItem(reference: string, itemId: string, via: PlanEdit["via"]) {
  await rewrite(reference, "journey", (journey) => journey.filter((item) => item.id !== itemId), edit("Removed a journey item", via));
}

export async function setRideStatus(reference: string, rideId: string, status: RideStatus, note: string | null, driverId: string | null, via: PlanEdit["via"]) {
  await rewrite(reference, "rides", (rides) =>
    rides.map((ride) => (ride.id === rideId ? { ...ride, status, note: note ?? ride.note, driverId: driverId ?? ride.driverId, updatedAt: now() } : ride)),
    edit(`Car ${status}`, via),
  );
}

export async function addTask(reference: string, input: Pick<CaseTask, "title" | "detail" | "due" | "owner" | "section">, via: PlanEdit["via"]) {
  const task: CaseTask = { ...input, id: id(), status: "open", createdAt: now(), doneAt: null };
  await rewrite(reference, "tasks", (tasks) => [...tasks, task], edit(`Task: ${input.title}`, via));
}

export async function answerDoctorChange(reference: string, requestId: string, status: "accepted" | "declined", reply: string | null, via: PlanEdit["via"]) {
  await rewrite(reference, "requests", (requests) =>
    requests.map((request) => (request.id === requestId ? { ...request, status, reply, updatedAt: now() } : request)),
    edit(`Doctor change ${status}`, via),
  );
}

export async function setDocument(reference: string, key: DocKey, patch: Partial<Omit<DocItem, "key" | "updatedAt">>, via: PlanEdit["via"]) {
  await rewrite(reference, "documents", (documents) => {
    const existing = documents.find((doc) => doc.key === key) ?? { key, status: "needed" as const, reportId: null, note: null, updatedAt: now() };
    const next = { ...existing, ...patch, updatedAt: now() };
    return [...documents.filter((doc) => doc.key !== key), next];
  }, edit(`Document ${key}: ${patch.status ?? "updated"}`, via));
}

export async function removeDocument(reference: string, key: DocKey, via: PlanEdit["via"]) {
  await rewrite(reference, "documents", (documents) => documents.filter((doc) => doc.key !== key), edit(`Document ${key} removed`, via));
}

export async function setBilling(reference: string, patch: Partial<Omit<Billing, "payments">>, via: PlanEdit["via"]) {
  const collection = await cases();
  const set: Record<string, unknown> = { updatedAt: now() };
  for (const [key, value] of Object.entries(patch)) set[`billing.${key}`] = value;
  const record = await collection.findOne({ _id: reference }, { projection: { billing: 1 } });
  if (!record?.billing) {
    set["billing.payments"] = [];
    if (!("currency" in patch)) set["billing.currency"] = "USD";
  }
  await collection.updateOne({ _id: reference }, { $set: set, $push: { planEdits: edit("Billing updated", via) } } as never);
}

export async function addPayment(reference: string, input: { amount: number; method: string; note: string | null; at?: string }, via: PlanEdit["via"]) {
  const payment = { id: id(), amount: input.amount, method: input.method, note: input.note, at: input.at || now() };
  const collection = await cases();
  const record = await collection.findOne({ _id: reference }, { projection: { billing: 1 } });
  const billing: Billing = record?.billing ?? { quote: null, currency: "USD", lines: [], payments: [], dueNote: null };
  await collection.updateOne({ _id: reference }, {
    $set: { billing: { ...billing, payments: [...billing.payments, payment] }, updatedAt: now() },
    $push: { planEdits: edit(`Payment received: ${input.amount}`, via) },
  } as never);
}

export async function removePayment(reference: string, paymentId: string, via: PlanEdit["via"]) {
  const collection = await cases();
  const record = await collection.findOne({ _id: reference }, { projection: { billing: 1 } });
  if (!record?.billing) return;
  await collection.updateOne({ _id: reference }, {
    $set: { "billing.payments": record.billing.payments.filter((payment) => payment.id !== paymentId), updatedAt: now() },
    $push: { planEdits: edit("Payment removed", via) },
  } as never);
}

/** Cases on one coordinator's desk, newest first. */
export async function casesForCoordinator(coordinatorId: string): Promise<JourneyCase[]> {
  return readOr<JourneyCase[]>([], async (db) =>
    db.collection<JourneyCase>("cases").find({ "care.coordinatorId": coordinatorId } as never).sort({ updatedAt: -1 }).limit(300).toArray(),
  );
}

export async function coordinators(): Promise<Pick<PartnerUser, "_id" | "name" | "email" | "status">[]> {
  return readOr([], async (db) =>
    db.collection<PartnerUser>("partner_users").find({ role: "coordinator" }, { projection: { name: 1, email: 1, status: 1 } }).sort({ name: 1 }).toArray(),
  );
}
