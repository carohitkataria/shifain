import "server-only";
import { cookies } from "next/headers";
import { isAuthenticated } from "./auth";
import { currentPartner } from "./partner-auth";
import { currentPatient, keyedHash, safeEqual } from "./patient-auth";
import { findWebIntake } from "./web-intake";
import { mayViewPlan, viewerOf } from "./access-rules";
import type { PatientCase } from "./cases";
import type { JourneyFields } from "./journey-rules";

/**
 * Whether the person in this browser may see a case's plan. A case number is
 * short and could be guessed, so it is never enough on its own: the plan
 * opens for the signed-in patient (or a family member they invited to see
 * reports), the Shifain team, the partner who referred the case, or the
 * browser that has just opened the case — by the enquiry form or the chat.
 */

/** The cases this browser opened through the enquiry form: a short signed list. */
export const OPENED_COOKIE = "shifain_opened";
const OPENED_MAX = 5;
const OPENED_MAX_AGE = 60 * 60 * 24 * 30;
const CHAT_COOKIE = "shifain_chat";

const signList = (list: string) => keyedHash(`opened:${list}`);

function readOpened(value: string | undefined): string[] {
  if (!value) return [];
  const at = value.lastIndexOf(".");
  if (at <= 0) return [];
  const list = value.slice(0, at);
  return safeEqual(value.slice(at + 1), signList(list)) ? list.split(",").filter(Boolean) : [];
}

/** The cookie value after this browser opened `reference`, keeping the latest few. */
export function openedCookie(current: string | undefined, reference: string): { name: string; value: string; options: { httpOnly: true; sameSite: "lax"; secure: boolean; path: string; maxAge: number } } {
  const list = [reference, ...readOpened(current).filter((item) => item !== reference)].slice(0, OPENED_MAX).join(",");
  return {
    name: OPENED_COOKIE,
    value: `${list}.${signList(list)}`,
    options: { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: OPENED_MAX_AGE },
  };
}

async function openedHere(reference: string): Promise<boolean> {
  const jar = await cookies();
  if (readOpened(jar.get(OPENED_COOKIE)?.value).includes(reference)) return true;
  const chat = jar.get(CHAT_COOKIE)?.value;
  if (!chat) return false;
  const intake = await findWebIntake(chat).catch(() => null);
  return intake?.caseReference === reference;
}

export async function mayViewCase(record: PatientCase & JourneyFields): Promise<boolean> {
  const [team, partner, identity, opened] = await Promise.all([
    isAuthenticated().catch(() => false),
    currentPartner().catch(() => null),
    currentPatient().catch(() => null),
    openedHere(record._id).catch(() => false),
  ]);
  const coordinator = partner?.role === "coordinator" && (record.care?.coordinatorId === partner._id);
  return mayViewPlan({
    viewer: identity ? viewerOf(identity, record) : null,
    team: team || coordinator,
    referrer: Boolean(partner && partner.role !== "coordinator" && record.referredBy === partner._id),
    openedHere: opened,
  });
}
