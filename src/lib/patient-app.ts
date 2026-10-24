import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { getContent } from "./store";
import { loadPortal, type PortalData } from "./patient-portal";
import { careContext, freeSlots, type CareContext, type JourneyCase } from "./journey";
import {
  calendarEvents,
  contactChannels,
  notificationFeed,
  planTiles,
  todoList,
  type CalendarEvent,
  type ContactChannel,
  type FeedItem,
  type PlanTile,
  type TodoItem,
} from "./journey-rules";
import { COUNTRY_BY_NAME } from "./countries";
import { getSettings } from "./settings";
import { readOr } from "./db";
import type { Doctor, HospitalDoctorLink } from "./catalogue";
import type { Slot } from "./onboarding-rules";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./i18n";
import type { L, SiteContent } from "./content-types";
import { t } from "./localize";

export const SEEN_COOKIE = "shifain_seen";

export type AppProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ case?: string; done?: string; error?: string; tab?: string; day?: string; f?: string; to?: string; set?: string }>;
};

export type AppData = {
  locale: Locale;
  content: SiteContent;
  portal: PortalData;
  query: Awaited<AppProps["searchParams"]>;
  record: JourneyCase | null;
  ctx: CareContext | null;
  today: string;
  todo: TodoItem[];
  events: CalendarEvent[];
  tiles: PlanTile[];
  feed: FeedItem[];
  unread: number;
  channels: { channels: ContactChannel[]; main: ContactChannel };
  retentionDays: number;
  /** The plan's condition and treatment, in the reader's language. */
  names: { disease: string | null; treatment: string | null };
};

/** Today in India, where the treatment happens, as YYYY-MM-DD. */
export const indiaToday = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
export const indiaNow = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(11, 16);

/** Everything an app screen reads, once per request. */
export const loadApp = cache(async (props: AppProps): Promise<AppData> => {
  const { locale: raw } = await props.params;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const query = await props.searchParams;
  const [content, portal] = await Promise.all([getContent(), loadPortal(locale, query.case)]);
  return buildApp(locale, content, portal, query);
});

/** The same, for a page that already loaded the portal (the older screens inside the app frame). */
export async function buildApp(locale: Locale, content: SiteContent, portal: PortalData, query: AppData["query"]): Promise<AppData> {
  const settings = await getSettings();
  const record = portal.active as JourneyCase | null;
  const ctx = record ? await careContext(record) : null;
  const today = indiaToday();

  const plan = record?.plan;
  const [disease, treatment] = await Promise.all([
    plan?.diseaseCode ? readOr(null, (db) => db.collection<{ _id: string; name: L }>("diseases").findOne({ _id: plan.diseaseCode! })) : null,
    plan?.recommendedTreatmentCode ? readOr(null, (db) => db.collection<{ _id: string; name: L }>("treatments").findOne({ _id: plan.recommendedTreatmentCode! })) : null,
  ]);
  const desk = (ctx?.messages ?? []).filter((message) => message.direction === "outbound").map((message) => ({ at: message.createdAt, text: message.text }));
  const feed = record ? notificationFeed(record, desk) : [];
  const seen = (await cookies()).get(SEEN_COOKIE)?.value ?? "";
  const countryCode = record ? COUNTRY_BY_NAME.get(record.patient.country)?.code ?? null : COUNTRY_BY_NAME.get(portal.account?.country ?? "")?.code ?? null;

  return {
    locale,
    content,
    portal,
    query,
    record,
    ctx,
    today,
    todo: record ? todoList(record) : [],
    events: record ? calendarEvents(record, { doctorVisits: ctx?.doctorVisits }) : [],
    tiles: record ? planTiles(record, { driver: ctx?.driver?.name, hotel: ctx?.hotel?.name, interpreter: ctx?.interpreter?.name }) : [],
    feed,
    unread: feed.filter((item) => item.at > seen).length,
    channels: contactChannels(record?.preferences?.channels?.length ? record.preferences : portal.account ?? undefined, countryCode),
    retentionDays: settings.reportRetentionDays,
    names: { disease: disease ? t(disease.name, locale) : null, treatment: treatment ? t(treatment.name, locale) : null },
  };
}

/** The doctor's bookable slots and the others at the same hospital and specialty (for "change doctor"). */
export async function doctorOptions(ctx: CareContext | null): Promise<{ slots: Slot[]; peers: Pick<Doctor, "_id" | "name" | "designation" | "experienceYears">[] }> {
  const doctorId = ctx?.care.doctorId;
  const hospitalId = ctx?.care.hospitalId;
  if (!doctorId || !hospitalId) return { slots: [], peers: [] };
  const [slots, links] = await Promise.all([
    freeSlots(doctorId, hospitalId, indiaToday()),
    readOr<HospitalDoctorLink[]>([], (db) => db.collection<HospitalDoctorLink>("hospital_doctor_map").find({ hospitalId }).toArray()),
  ]);
  const specialty = links.find((link) => link.doctorId === doctorId)?.specialtyCode ?? ctx?.doctor?.specialtyCode ?? null;
  const peerIds = links.filter((link) => link.doctorId !== doctorId && (!specialty || link.specialtyCode === specialty)).map((link) => link.doctorId);
  const peers = peerIds.length
    ? await readOr<Pick<Doctor, "_id" | "name" | "designation" | "experienceYears">[]>([], (db) =>
        db
          .collection<Doctor>("doctors")
          .find({ _id: { $in: peerIds }, consentToList: true, "publication.state": "published" }, { projection: { name: 1, designation: 1, experienceYears: 1 } })
          .sort({ experienceYears: -1 })
          .limit(8)
          .toArray(),
      )
    : [];
  return { slots: slots.slice(0, 60), peers };
}

export const initials = (name: string) =>
  name
    .replace(/^Dr\.?\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "S";

export const telHref = (value: string) => `tel:${value.replace(/[^\d+]/g, "")}`;
export const waHref = (value: string) => `https://wa.me/${value.replace(/\D/g, "")}`;
export const tgHref = (value: string) => (/^\+?\d[\d\s-]{5,}$/.test(value) ? `https://t.me/+${value.replace(/\D/g, "")}` : `https://t.me/${value.replace(/^@/, "")}`);
export const mapsHref = (query: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
