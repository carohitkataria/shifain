import "server-only";
import { isAuthenticated } from "./auth";
import { getDb, isDatabaseConfigured } from "./db";
import { currentPartner, type PartnerUser } from "./partner-auth";
import { currentActor } from "./onboarding";
import type { JourneyCase } from "./journey";

/**
 * Who is working a case at the desk: the owner console (shared admin login,
 * every case) or a coordinator (their own login, only the cases assigned to
 * them). Every desk action goes through `deskCase`, so a coordinator can never
 * reach a case that is not theirs by editing a form.
 */
export type DeskActor = { kind: "admin"; name: string } | { kind: "coordinator"; name: string; user: PartnerUser };

export async function deskActor(): Promise<DeskActor | null> {
  if (await isAuthenticated()) return { kind: "admin", name: (await currentActor()) || "Shifain desk" };
  if (!isDatabaseConfigured()) return null;
  const partner = await currentPartner().catch(() => null);
  return partner?.role === "coordinator" ? { kind: "coordinator", name: partner.name, user: partner } : null;
}

export const mayWork = (actor: DeskActor, record: Pick<JourneyCase, "care">) =>
  actor.kind === "admin" || record.care?.coordinatorId === actor.user._id;

export async function deskCase(reference: string): Promise<{ actor: DeskActor; record: JourneyCase } | null> {
  const actor = await deskActor();
  if (!actor || !isDatabaseConfigured()) return null;
  const db = await getDb();
  const record = await db.collection<JourneyCase>("cases").findOne({ _id: reference.trim().toUpperCase() });
  if (!record || !mayWork(actor, record)) return null;
  return { actor, record };
}

/**
 * The desk page a form came from, so an action returns there; never anywhere
 * else. The owner console may come back to any of its pages, drawer open.
 */
export const deskBack = (value: FormDataEntryValue | null, reference: string) => {
  const back = String(value ?? "");
  if (/^\/(admin\/cases|coordinator)\/[A-Z0-9-]+$/.test(back)) return back;
  if (/^\/admin(\/[\w-]+)*(\?[\w=&%.:+-]*)?$/.test(back)) return back;
  return `/coordinator/${reference}`;
};
