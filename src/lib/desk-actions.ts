"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "./db";
import { deskBack, deskCase, type DeskActor } from "./desk";
import { answerAppointment } from "./patient-portal";
import {
  addCaseFiles,
  addPayment,
  addTask,
  answerDoctorChange,
  removeDocument,
  removeJourneyItem,
  removePayment,
  requestRide,
  saveJourneyItem,
  sendPortalMessage,
  setBilling,
  setCare,
  setDocument,
  setRideStatus,
  updateFamilyMember,
  completeTask,
  type JourneyCase,
} from "./journey";
import {
  DOC_KEYS,
  JOURNEY_KINDS,
  RIDE_PLACES,
  RIDE_STATUSES,
  isIsoDate,
  isTime,
  type CareTeam,
  type DocKey,
  type DocStatus,
  type JourneyKind,
  type JourneyStatus,
  type RidePlace,
  type RideStatus,
} from "./journey-rules";

const text = (formData: FormData, name: string, max = 300) => {
  const value = String(formData.get(name) ?? "").trim().slice(0, max);
  return value || null;
};
const oneOf = <T extends string>(list: readonly T[], value: string | null): T | null => (value && (list as readonly string[]).includes(value) ? (value as T) : null);
const money = (value: string | null) => {
  if (!value) return null;
  const amount = Number(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : null;
};

/**
 * Every desk action: find the case the person may work, run the change, and go
 * back to the desk page it came from with a short "saved" note.
 */
async function work(formData: FormData, change: (record: JourneyCase, actor: DeskActor) => Promise<string | void>) {
  const reference = String(formData.get("reference") ?? "").trim().toUpperCase();
  const found = await deskCase(reference);
  const back = deskBack(formData.get("back"), reference);
  if (!found) redirect("/admin/login");
  const note = (await change(found.record, found.actor)) || "saved";
  revalidatePath(back.split("?")[0]);
  const [path, query = ""] = back.split("?");
  const params = new URLSearchParams(query);
  params.set("done", note);
  redirect(`${path}?${params}#${String(formData.get("anchor") ?? "top")}`);
}

const via = () => "coordinator" as const;

export async function deskCareAction(formData: FormData) {
  await work(formData, async (record, actor) => {
    const patch: Partial<CareTeam> = {
      hospitalId: text(formData, "hospitalId", 120),
      doctorId: text(formData, "doctorId", 120),
      driverId: text(formData, "driverId", 120),
      interpreterId: text(formData, "interpreterId", 120),
      hotelId: text(formData, "hotelId", 120),
      room: text(formData, "room", 40),
      checkIn: isIsoDate(text(formData, "checkIn")) ? text(formData, "checkIn") : null,
      checkOut: isIsoDate(text(formData, "checkOut")) ? text(formData, "checkOut") : null,
      wifi: text(formData, "wifi", 80),
      ward: text(formData, "ward", 80),
    };
    // Only the owner console assigns cases to coordinators.
    if (actor.kind === "admin" && formData.has("coordinatorId")) patch.coordinatorId = text(formData, "coordinatorId", 120);
    await setCare(record._id, patch, via());
    return "care team saved";
  });
}

export async function deskJourneyAction(formData: FormData) {
  await work(formData, async (record) => {
    const kind = oneOf<JourneyKind>(JOURNEY_KINDS, text(formData, "kind")) ?? "other";
    const status = oneOf<JourneyStatus>(["pending", "booked", "done", "cancelled"], text(formData, "status")) ?? "pending";
    const date = text(formData, "date");
    const time = text(formData, "time");
    await saveJourneyItem(record._id, {
      id: text(formData, "id", 40),
      kind,
      title: text(formData, "title", 120) ?? kind,
      status,
      date: isIsoDate(date) ? date : null,
      time: isTime(time) ? time : null,
      place: text(formData, "place", 160),
      detail: text(formData, "detail", 300),
      bring: text(formData, "bring", 200),
    }, via());
    return "journey saved";
  });
}

export async function deskRemoveJourneyAction(formData: FormData) {
  await work(formData, async (record) => {
    const id = text(formData, "id", 40);
    if (id) await removeJourneyItem(record._id, id, via());
    return "removed";
  });
}

export async function deskRideAction(formData: FormData) {
  await work(formData, async (record) => {
    const id = text(formData, "id", 40);
    const status = oneOf<RideStatus>(RIDE_STATUSES, text(formData, "status"));
    if (id && status) await setRideStatus(record._id, id, status, text(formData, "note", 200), text(formData, "driverId", 120), via());
    return "car updated";
  });
}

/** The desk books a car for the patient (an airport pickup, a ride to a scan). */
export async function deskNewRideAction(formData: FormData) {
  await work(formData, async (record) => {
    const to = oneOf<RidePlace>(RIDE_PLACES, text(formData, "to")) ?? "other";
    const date = text(formData, "date");
    const time = text(formData, "time");
    const when = isIsoDate(date) && isTime(time) ? `${date}T${time}` : "now";
    const ride = await requestRide(record._id, {
      to,
      address: text(formData, "address", 200),
      when,
      passengers: Math.min(8, Math.max(1, Number(text(formData, "passengers") ?? 1) || 1)),
      driverId: text(formData, "driverId", 120) ?? record.care?.driverId ?? null,
    });
    await setRideStatus(record._id, ride.id, "assigned", null, null, via());
    return "car booked";
  });
}

export async function deskTaskAction(formData: FormData) {
  await work(formData, async (record) => {
    const title = text(formData, "title", 160);
    if (!title) return "a task needs a title";
    const due = text(formData, "due");
    await addTask(record._id, {
      title,
      detail: text(formData, "detail", 300),
      due: isIsoDate(due) ? due : null,
      owner: text(formData, "owner") === "desk" ? "desk" : "patient",
      section: text(formData, "section", 30),
    }, via());
    return "task added";
  });
}

export async function deskTaskStatusAction(formData: FormData) {
  await work(formData, async (record) => {
    const id = text(formData, "id", 40);
    if (id) await completeTask(record._id, id, text(formData, "status") === "done", via());
    return "task updated";
  });
}

export async function deskChangeAction(formData: FormData) {
  await work(formData, async (record) => {
    const id = text(formData, "id", 40);
    const status = text(formData, "status") === "accepted" ? "accepted" : "declined";
    if (!id) return;
    await answerDoctorChange(record._id, id, status, text(formData, "reply", 400), via());
    const request = (record.requests ?? []).find((item) => item.id === id);
    const doctorId = text(formData, "doctorId", 120) ?? request?.doctorId ?? null;
    if (status === "accepted" && doctorId) await setCare(record._id, { doctorId }, via());
    return `change ${status}`;
  });
}

export async function deskDocumentAction(formData: FormData) {
  await work(formData, async (record) => {
    const key = oneOf<DocKey>(DOC_KEYS, text(formData, "key"));
    const status = oneOf<DocStatus>(["needed", "uploaded", "verified", "issued", "signed", "optional"], text(formData, "status"));
    if (!key) return;
    if (formData.get("remove") === "1") {
      await removeDocument(record._id, key, via());
      return "removed";
    }
    await setDocument(record._id, key, { ...(status ? { status } : {}), note: text(formData, "note", 200) }, via());
    return "document saved";
  });
}

/** Files from the hospital or the desk: reports, prescriptions, bills, or a document on the checklist. */
export async function deskUploadAction(formData: FormData) {
  await work(formData, async (record) => {
    const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
    const kind = oneOf(["report", "prescription", "bill", "document"] as const, text(formData, "kind")) ?? "report";
    const docKey = kind === "document" ? oneOf<DocKey>(DOC_KEYS, text(formData, "docKey")) : null;
    const added = await addCaseFiles(record._id, files, { source: text(formData, "source") === "shifain" ? "shifain" : "hospital", kind, docKey: docKey ?? undefined }, via());
    return added.length ? `${added.length} file${added.length === 1 ? "" : "s"} added` : "no file was added (PDF or image, up to 14 MB)";
  });
}

export async function deskBillingAction(formData: FormData) {
  await work(formData, async (record) => {
    const lines = String(formData.get("lines") ?? "")
      .split("\n")
      .map((line) => line.split("|").map((part) => part.trim()))
      .filter(([label, amount]) => label && money(amount ?? null) != null)
      .map(([label, amount]) => ({ label: label.slice(0, 80), amount: money(amount)! }))
      .slice(0, 12);
    await setBilling(record._id, {
      quote: money(text(formData, "quote")),
      currency: oneOf(["USD", "INR", "EUR"] as const, text(formData, "currency")) ?? "USD",
      dueNote: text(formData, "dueNote", 160),
      lines,
    }, via());
    return "billing saved";
  });
}

export async function deskPaymentAction(formData: FormData) {
  await work(formData, async (record) => {
    if (formData.get("remove")) {
      await removePayment(record._id, String(formData.get("remove")), via());
      return "payment removed";
    }
    const amount = money(text(formData, "amount"));
    if (!amount) return "enter an amount";
    const at = text(formData, "at");
    await addPayment(record._id, { amount, method: text(formData, "method", 40) ?? "card", note: text(formData, "note", 160), at: isIsoDate(at) ? `${at}T12:00:00.000Z` : undefined }, via());
    return "payment recorded";
  });
}

export async function deskReplyAction(formData: FormData) {
  await work(formData, async (record, actor) => {
    const message = text(formData, "text", 2000);
    if (message) await sendPortalMessage(record._id, { name: actor.name, direction: "outbound" }, message);
    return "reply sent";
  });
}

/** Confirms or declines a call the patient asked for, with the agreed time in words. */
export async function deskCallAction(formData: FormData) {
  await work(formData, async (record) => {
    const id = text(formData, "id", 40);
    if (!id) return;
    await answerAppointment(record._id, id, text(formData, "status") === "declined" ? "declined" : "confirmed", text(formData, "slot", 200));
    return "call answered";
  });
}

/** Confirms, completes or cancels a clinic or video visit booked from the doctor's slots. */
export async function deskVisitAction(formData: FormData) {
  await work(formData, async (record) => {
    const id = text(formData, "id", 60);
    const status = oneOf(["confirmed", "completed", "cancelled", "no_show"] as const, text(formData, "status"));
    if (!id || !status) return;
    const db = await getDb();
    await db.collection<{ _id: string; caseId: string; status: string }>("doctor_appointments").updateOne({ _id: id, caseId: record._id }, { $set: { status } });
    return `visit ${status}`;
  });
}

export async function deskFamilyAction(formData: FormData) {
  await work(formData, async (record) => {
    const id = text(formData, "id", 40);
    const passport = oneOf(["missing", "uploaded", "verified"] as const, text(formData, "passport"));
    if (id && passport) await updateFamilyMember(record._id, id, { passport }, via());
    return "family updated";
  });
}
