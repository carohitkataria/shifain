import "server-only";
import { getDb } from "./db";
import type { Lead, LeadStatus } from "./partners";
import { notifyOps } from "./mailer";
import { getSettings } from "./settings";

export async function createLead(input: {
  name: string;
  phone: string | null;
  email: string | null;
  country: string | null;
  need: string | null;
  source: "telegram" | "whatsapp" | "phone" | "email" | "partner" | "walk-in" | "other";
}): Promise<Lead> {
  const now = new Date().toISOString();
  const record: Lead = {
    _id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name,
    phone: input.phone,
    email: input.email,
    country: input.country,
    need: input.need,
    source: input.source,
    partnerUserId: null,
    status: "new" as LeadStatus,
    caseReference: null,
    note: null,
    createdAt: now,
    updatedAt: now,
  };

  const db = await getDb();
  await db.collection<Lead>("leads").insertOne(record);

  const settings = await getSettings();
  await notifyOps(settings.opsEmail, "New lead from Telegram", [
    `Name: ${input.name}`,
    input.phone ? `Phone: ${input.phone}` : "",
    input.need ? `Need: ${input.need}` : "",
    `Source: ${input.source}`,
    "",
    "Open the admin console to follow up.",
  ].filter(Boolean));

  return record;
}
