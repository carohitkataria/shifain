"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isFreshlyVerified as isFresh, ownedCase, requestAppointment, type AppointmentWindow } from "@/lib/patient-portal";
import {
  addCaseFiles,
  addFamilyMember,
  addPersonalEvent,
  addTask,
  bookDoctorSlot,
  cancelRide,
  completeTask,
  removeFamilyMember,
  requestDoctorChange,
  requestRide,
  sayHello,
  sendPortalMessage,
  setEventNote,
  setPreferences,
  updateFamilyMember,
} from "@/lib/journey";
import {
  CHANGE_REASONS,
  CHANNELS,
  DOC_KEYS,
  FAMILY_ACCESS,
  FAMILY_RELATIONS,
  PERSONAL_EVENT_KINDS,
  RIDE_PLACES,
  isIsoDate,
  isTime,
  type ChangeReason,
  type ContactChannel,
  type DocKey,
  type FamilyAccess,
  type RidePlace,
} from "@/lib/journey-rules";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import { audit } from "@/lib/audit";

const SECTIONS = new Set(["", "case", "calendar", "reports", "stay", "companions", "family", "payments", "documents", "notifications", "settings", "tasks", "messages"]);
const text = (formData: FormData, name: string, max = 300) => {
  const value = String(formData.get(name) ?? "").trim().slice(0, max);
  return value || null;
};
const oneOf = <T extends string>(list: readonly T[], value: string | null): T | null => (value && (list as readonly string[]).includes(value) ? (value as T) : null);
const many = <T extends string>(list: readonly T[], values: FormDataEntryValue[]) => [...new Set(values.map(String))].filter((value): value is T => (list as readonly string[]).includes(value));

function localeOf(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Every patient action: check the signed-in person may change this case (the
 * patient; a family member only where noted), make the change, and return to
 * the screen it came from with a short note for the toast.
 */
async function act(
  formData: FormData,
  change: (reference: string, who: { name: string; family: boolean }) => Promise<string | void>,
  familyMay = false,
  /** A sensitive action (family, contact details, payment links): needs a recent sign-in, and is logged. */
  sensitive?: string,
) {
  const locale = localeOf(formData);
  const reference = String(formData.get("reference") ?? "").trim().toUpperCase();
  const back = String(formData.get("section") ?? "");
  const section = SECTIONS.has(back) ? back : "";
  const owned = await ownedCase(reference, familyMay ? "calendar" : undefined);
  if (!owned || (!familyMay && owned.viewer.role !== "patient")) redirect(`/${locale}/portal/patient/login`);
  if (sensitive) {
    const fresh = await isFresh();
    await audit({ session: "web", method: `action:${sensitive}`, reference: owned.record._id, result: fresh ? "ok" : "needs-code", ip: null });
    if (!fresh) redirect(`/${locale}/portal/patient/login?error=fresh`);
  }
  const name = owned.viewer.role === "family" ? owned.viewer.member.name : owned.record.patient.name;
  const done = (await change(owned.record._id, { name, family: owned.viewer.role === "family" })) || "saved";
  const path = `/${locale}/portal/patient${section ? `/${section}` : ""}`;
  const tab = /^[a-z]{2,12}$/.test(String(formData.get("tab") ?? "")) ? `&tab=${formData.get("tab")}` : "";
  revalidatePath(path);
  redirect(`${path}?case=${encodeURIComponent(owned.record._id)}${tab}&done=${encodeURIComponent(done)}`);
}

export async function rideAction(formData: FormData) {
  await act(formData, async (reference) => {
    const to = oneOf<RidePlace>(RIDE_PLACES, text(formData, "to")) ?? "hospital";
    const later = text(formData, "when") === "later";
    const date = text(formData, "date");
    const time = text(formData, "time");
    const when = later && isIsoDate(date) && isTime(time) ? `${date}T${time}` : "now";
    await requestRide(reference, {
      to,
      address: text(formData, "address", 200),
      when,
      passengers: Math.min(8, Math.max(1, Number(text(formData, "passengers") ?? 1) || 1)),
      driverId: null,
    });
    return "ride";
  });
}

export async function cancelRideAction(formData: FormData) {
  await act(formData, async (reference) => {
    const id = text(formData, "id", 40);
    if (id) await cancelRide(reference, id);
    return "cancelled";
  });
}

export async function eventAction(formData: FormData) {
  await act(formData, async (reference) => {
    const date = text(formData, "date");
    const time = text(formData, "time");
    const title = text(formData, "title", 120);
    if (!title || !isIsoDate(date)) return "missing";
    await addPersonalEvent(reference, {
      kind: oneOf(PERSONAL_EVENT_KINDS, text(formData, "kind")) ?? "note",
      title,
      date: date!,
      time: isTime(time) ? time : null,
      tellDesk: formData.get("tellDesk") === "on",
    });
    return "saved";
  });
}

/** A note on any calendar entry; family members who see the calendar may keep one too. */
export async function eventNoteAction(formData: FormData) {
  await act(formData, async (reference) => {
    const id = text(formData, "id", 60);
    if (id && /^[a-z]-[\w-]+$/.test(id)) await setEventNote(reference, id, text(formData, "note", 500) ?? "");
    return "saved";
  }, true);
}

export async function changeDoctorAction(formData: FormData) {
  await act(formData, async (reference) => {
    await requestDoctorChange(reference, {
      reasons: many<ChangeReason>(CHANGE_REASONS, formData.getAll("reasons")),
      doctorId: text(formData, "doctorId", 120),
      note: text(formData, "note", 500),
    });
    return "change";
  });
}

export async function messageAction(formData: FormData) {
  await act(formData, async (reference, who) => {
    const message = text(formData, "text", 2000);
    if (!message) return "missing";
    await sendPortalMessage(reference, { name: who.name, direction: "inbound" }, message, oneOf(["coordinator", "doctor", "hotel"] as const, text(formData, "to")) ?? "coordinator");
    return "sent";
  }, true);
}

export async function familyAddAction(formData: FormData) {
  await act(formData, async (reference) => {
    const name = text(formData, "name", 80);
    if (!name) return "missing";
    const email = text(formData, "email", 200)?.toLowerCase() ?? null;
    await addFamilyMember(reference, {
      name,
      relation: oneOf(FAMILY_RELATIONS, text(formData, "relation")) ?? "other",
      phone: text(formData, "phone", 30),
      email: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
      travelling: formData.get("travelling") === "on",
      access: many<FamilyAccess>(FAMILY_ACCESS, formData.getAll("access")),
    });
    return "saved";
  }, false, "portal-family-add");
}

export async function familyUpdateAction(formData: FormData) {
  await act(formData, async (reference) => {
    const id = text(formData, "id", 40);
    if (!id) return;
    if (formData.get("remove") === "1") {
      await removeFamilyMember(reference, id);
      return "removed";
    }
    await updateFamilyMember(reference, id, {
      access: many<FamilyAccess>(FAMILY_ACCESS, formData.getAll("access")),
      travelling: formData.get("travelling") === "on",
    });
    return "saved";
  }, false, "portal-family-change");
}

export async function channelsAction(formData: FormData) {
  await act(formData, async (reference) => {
    const channels = many<ContactChannel>(CHANNELS, formData.getAll("channels"));
    const main = oneOf<ContactChannel>(CHANNELS, text(formData, "main"));
    const list = channels.length ? channels : main ? [main] : ["email" as const];
    await setPreferences(reference, { channels: list, mainChannel: main && list.includes(main) ? main : list[0] });
    return "saved";
  });
}

export async function privacyAction(formData: FormData) {
  await act(formData, async (reference) => {
    await setPreferences(reference, { companionsVisible: text(formData, "companions") === "on" });
    return "saved";
  });
}

export async function homeContactAction(formData: FormData) {
  await act(formData, async (reference) => {
    const name = text(formData, "name", 80);
    const phone = text(formData, "phone", 30);
    await setPreferences(reference, { homeContact: name && phone ? { name, phone, relation: text(formData, "relation", 40) } : null });
    return "saved";
  }, false, "portal-contact-change");
}

/**
 * Book the doctor: a computed slot becomes a visit the desk confirms; with no
 * rota on file, a day and time of day becomes a call request instead.
 */
export async function bookAction(formData: FormData) {
  await act(formData, async (reference) => {
    const slot = text(formData, "slot", 80);
    const how = oneOf(["in_person", "video", "call"] as const, text(formData, "consult")) ?? "in_person";
    const consult = how === "in_person" ? "in_person" : "video";
    const doctorId = text(formData, "doctorId", 120);
    const hospitalId = text(formData, "hospitalId", 120);
    if (slot && doctorId && hospitalId) {
      const [date, start, end] = slot.split("|");
      if (!isIsoDate(date) || !isTime(start)) return "missing";
      const ok = await bookDoctorSlot(reference, { doctorId, hospitalId, date, start, end: isTime(end) ? end : null, consultType: consult });
      return ok ? "booked" : "taken";
    }
    const date = text(formData, "date");
    const window = oneOf<AppointmentWindow>(["morning", "afternoon", "evening"], text(formData, "window")) ?? "morning";
    if (!isIsoDate(date)) return "missing";
    await requestAppointment(reference, {
      kind: "doctor",
      date: date!,
      window,
      timezone: text(formData, "timezone", 60) ?? "Asia/Kolkata",
      language: text(formData, "language", 8) ?? "en",
      note: [{ in_person: "In person", video: "Video", call: "Phone call" }[how], text(formData, "note", 400)].filter(Boolean).join(" — "),
    });
    return "booked";
  });
}

export async function uploadAction(formData: FormData) {
  await act(formData, async (reference) => {
    const files = formData.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
    const docKey = oneOf<DocKey>(DOC_KEYS, text(formData, "docKey"));
    const familyId = text(formData, "familyId", 40);
    const added = await addCaseFiles(reference, files, { source: "patient", kind: docKey || familyId ? "document" : "report", docKey: docKey ?? undefined }, "portal");
    if (added.length && familyId) await updateFamilyMember(reference, familyId, { passport: "uploaded" });
    return added.length ? "uploaded" : "upload-failed";
  });
}

export async function taskDoneAction(formData: FormData) {
  await act(formData, async (reference) => {
    const id = text(formData, "id", 40);
    if (id) await completeTask(reference, id, true);
    return "saved";
  });
}

/** No card form here: the coordinator sends a secure payment link on the patient's main channel. */
export async function payAction(formData: FormData) {
  await act(formData, async (reference) => {
    await addTask(reference, { title: "Send the patient a payment link", detail: "Asked from the app", due: null, owner: "desk", section: "payments" }, "portal");
    return "pay";
  }, false, "portal-payment-link");
}

export async function helloAction(formData: FormData) {
  await act(formData, async (reference) => {
    const to = text(formData, "to", 40)?.toUpperCase();
    if (to && to !== reference) await sayHello(reference, to);
    return "hello";
  });
}

/** The patient's gender, from the translator's settings, so their translated words are read in a matching voice. */
export async function saveGenderAction(gender: string): Promise<boolean> {
  if (gender !== "male" && gender !== "female") return false;
  const { currentPatient } = await import("@/lib/patient-auth");
  const { getDb } = await import("@/lib/db");
  const identity = await currentPatient().catch(() => null);
  if (!identity || identity.kind !== "email") return false;
  const db = await getDb();
  const result = await db.collection<{ _id: string; gender?: string; updatedAt: string }>("patient_accounts").updateOne({ _id: identity.email }, { $set: { gender, updatedAt: new Date().toISOString() } });
  return result.matchedCount > 0;
}
